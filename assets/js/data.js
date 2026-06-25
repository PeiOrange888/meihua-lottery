// 用户身份
// ============================================
const User = {
    identity: null,
    get() {
        if (this.identity) return this.identity;
        try {
            const cached = localStorage.getItem('meihua_user');
            if (cached) {
                this.identity = JSON.parse(cached);
                return this.identity;
            }
        } catch(e) {}
        
        const nickname = NICK_PREFIX[Math.floor(Math.random() * NICK_PREFIX.length)] + 
                        NICK_SUFFIX[Math.floor(Math.random() * NICK_SUFFIX.length)];
        this.identity = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            nickname: nickname,
            created: Date.now()
        };
        localStorage.setItem('meihua_user', JSON.stringify(this.identity));
        return this.identity;
    }
};

// ============================================
// 数据存储
// ============================================
const Store = {
    data: { qiguaCount: 0, ssq: { period:'', records:[], result:null, history:[] }, dlt: { period:'', records:[], result:null, history:[] } },
    saveTimer: null,
    pendingRecords: [],
    pendingCountIncrement: 0,
    saveInFlight: null,

    normalizeRecords(value) {
        const records = Array.isArray(value) ? value.filter(Boolean) :
            value && typeof value === 'object' ? Object.entries(value)
                .filter(([, record]) => record)
                .map(([key, record]) => typeof record === 'object' ? { key, ...record } : record) : [];
        return records.sort((a, b) => (a.time || a.timestamp || 0) - (b.time || b.timestamp || 0));
    },

    normalizeHistory(value) {
        const groups = this.normalizeRecords(value).map(group => ({
            ...group,
            records: this.normalizeRecords(group.records)
        }));
        return groups.sort((a, b) => Core.comparePeriod(b.period, a.period));
    },

    normalizeBranch(branch = {}) {
        return {
            period: branch.period || '',
            records: this.normalizeRecords(branch.records),
            result: branch.result || null,
            history: this.normalizeHistory(branch.history)
        };
    },

    keyForRecord(record, fallback) {
        return String(record.id || record.key || fallback).replace(/[.#$/[\]]/g, '_');
    },

    countBranch(branch) {
        const pending = (branch.records || []).length;
        const settled = (branch.history || []).reduce((sum, group) => sum + ((group.records || []).length), 0);
        return pending + settled;
    },

    countPredictions() {
        return this.countBranch(this.data.ssq) + this.countBranch(this.data.dlt);
    },

    recordUrl(type, record, fallback) {
        const key = this.keyForRecord(record, fallback);
        return CONFIG.FIREBASE_URL.replace('.json', `/${type}/records/${key}.json`);
    },

    countUrl() {
        return CONFIG.FIREBASE_URL.replace('.json', '/qigua_count.json');
    },

    async load() {
        try {
            const res = await fetch(CONFIG.FIREBASE_URL);
            const d = await res.json();
            if (d) {
                if (d.ssq) this.data.ssq = this.normalizeBranch(d.ssq);
                if (d.dlt) this.data.dlt = this.normalizeBranch(d.dlt);
                this.data.qiguaCount = Math.max(Number(d.qigua_count) || 0, this.countPredictions());
            }
        } catch(e) { console.error('加载数据失败:', e); }
    },

    scheduleSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), CONFIG.SAVE_DELAY);
    },

    async save() {
        if (this.saveInFlight) return this.saveInFlight;
        if (this.pendingRecords.length === 0 && this.pendingCountIncrement === 0) return;

        const run = async () => {
            try {
                const pending = [...this.pendingRecords];
                const writes = pending.map((item, index) =>
                    fetch(this.recordUrl(item.type, item.record, index), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.record)
                    })
                );
                const results = await Promise.allSettled(writes);
                const savedItems = pending.filter((_, index) => results[index]?.status === 'fulfilled' && results[index].value?.ok);
                if (savedItems.length > 0) {
                    const savedSet = new Set(savedItems);
                    this.pendingRecords = this.pendingRecords.filter(item => !savedSet.has(item));
                    this.pendingCountIncrement += savedItems.length;
                }

                while (this.pendingCountIncrement > 0) {
                    const response = await fetch(this.countUrl(), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ '.sv': { increment: 1 } })
                    });
                    if (!response.ok) break;
                    this.pendingCountIncrement--;
                }

                if (this.pendingRecords.length > 0 || this.pendingCountIncrement > 0) {
                    this.scheduleSave();
                }
            } catch(e) {
                console.error('保存数据失败:', e);
            }
        };

        this.saveInFlight = run().finally(() => {
            this.saveInFlight = null;
        });
        return this.saveInFlight;
    },

    addRecord(type, record) {
        this.data[type].records.push(record);
        this.pendingRecords.push({ type, record });
        this.scheduleSave();
    },

    incCount() {
        this.data.qiguaCount++;
        return this.data.qiguaCount;
    }
};

// ============================================
