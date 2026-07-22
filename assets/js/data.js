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
    data: { qiguaCount: null, ssq: { period:'', records:[], result:null, history:[] }, dlt: { period:'', records:[], result:null, history:[] } },
    saveTimer: null,
    pendingRecords: [],
    saveInFlight: null,
    outboxKey: 'meihua_prediction_outbox_v1',

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

    persistOutbox() {
        try {
            localStorage.setItem(this.outboxKey, JSON.stringify(this.pendingRecords));
        } catch(e) { console.error('保存待同步记录失败:', e); }
    },

    recordExists(type, record) {
        const id = String(record.id || '');
        if (!id) return false;
        const branch = this.data[type] || {};
        return (branch.records || []).some(item => String(item.id || item.key || '') === id) ||
            (branch.history || []).some(group => (group.records || []).some(item => String(item.id || item.key || '') === id));
    },

    restoreOutbox() {
        let stored = [];
        try {
            const value = JSON.parse(localStorage.getItem(this.outboxKey) || '[]');
            stored = Array.isArray(value) ? value : [];
        } catch(e) {}

        const seen = new Set(this.pendingRecords.map(item => `${item.type}:${this.keyForRecord(item.record, '')}`));
        stored.forEach(item => {
            if (!item || !['ssq', 'dlt'].includes(item.type) || !item.record?.id) return;
            const key = `${item.type}:${this.keyForRecord(item.record, '')}`;
            if (seen.has(key) || this.recordExists(item.type, item.record)) return;
            seen.add(key);
            this.pendingRecords.push({ type: item.type, record: item.record });
            this.data[item.type].records.push(item.record);
        });
        this.persistOutbox();
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
            if (!res.ok) throw new Error(`数据请求失败: ${res.status}`);
            const d = await res.json();
            if (d) {
                if (d.ssq) this.data.ssq = this.normalizeBranch(d.ssq);
                if (d.dlt) this.data.dlt = this.normalizeBranch(d.dlt);
                this.data.qiguaCount = Math.max(Number(d.qigua_count) || 0, this.countPredictions());
            } else this.data.qiguaCount = 0;
        } catch(e) { console.error('加载数据失败:', e); }
        this.restoreOutbox();
        if (this.pendingRecords.length > 0) this.scheduleSave();
    },

    scheduleSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), CONFIG.SAVE_DELAY);
    },

    async save() {
        if (this.saveInFlight) return this.saveInFlight;
        if (this.pendingRecords.length === 0) return;

        const run = async () => {
            try {
                const pending = [...this.pendingRecords];
                const results = await Promise.allSettled(pending.map(item => this.persistItem(item)));
                const savedItems = pending.filter((_, index) => results[index]?.status === 'fulfilled' && results[index].value === true);
                if (savedItems.length > 0) {
                    const savedSet = new Set(savedItems);
                    this.pendingRecords = this.pendingRecords.filter(item => !savedSet.has(item));
                    this.persistOutbox();
                    const current = Number(this.data.qiguaCount);
                    this.data.qiguaCount = (Number.isFinite(current) ? current : 0) + savedItems.length;
                    globalThis.UI?.setCount?.(this.data.qiguaCount);
                    await this.refreshCount();
                }
                if (this.pendingRecords.length > 0) this.scheduleSave();
            } catch(e) {
                console.error('保存数据失败:', e);
                this.scheduleSave();
            }
        };

        this.saveInFlight = run().finally(() => {
            this.saveInFlight = null;
        });
        return this.saveInFlight;
    },

    async persistItem(item) {
        const key = this.keyForRecord(item.record, Date.now());
        const updates = {
            [`${item.type}/records/${key}`]: item.record,
            qigua_count: { '.sv': { increment: 1 } }
        };
        try {
            const response = await fetch(CONFIG.FIREBASE_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (response.ok) return true;
        } catch(e) {}

        // A lost response may still mean the atomic write committed. Verify before retrying.
        try {
            const response = await fetch(this.recordUrl(item.type, item.record, key));
            if (!response.ok) return false;
            const existing = await response.json();
            return String(existing?.id || '') === String(item.record.id);
        } catch(e) { return false; }
    },

    async refreshCount() {
        try {
            const response = await fetch(this.countUrl());
            if (!response.ok) return;
            const value = Number(await response.json());
            if (!Number.isFinite(value)) return;
            this.data.qiguaCount = value;
            globalThis.UI?.setCount?.(value);
        } catch(e) {}
    },

    addRecord(type, record) {
        this.data[type].records.push(record);
        this.pendingRecords.push({ type, record });
        this.persistOutbox();
        this.scheduleSave();
    }
};

// ============================================
