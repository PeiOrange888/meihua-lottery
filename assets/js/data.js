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
    dirtyMeta: false,
    dirtyTypes: new Set(),

    normalizeRecords(value) {
        const records = Array.isArray(value) ? value.filter(Boolean) :
            value && typeof value === 'object' ? Object.values(value).filter(Boolean) : [];
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

    recordsById(records = []) {
        return records.reduce((acc, record, index) => {
            if (!record) return acc;
            acc[this.keyForRecord(record, index)] = record;
            return acc;
        }, {});
    },

    historyByPeriod(history = []) {
        return history.reduce((acc, group, index) => {
            if (!group) return acc;
            const periodKey = String(group.period || index).replace(/[.#$/[\]]/g, '_');
            acc[periodKey] = {
                ...group,
                records: this.recordsById(group.records || [])
            };
            return acc;
        }, {});
    },

    serializeBranch(branch) {
        return {
            schemaVersion: CONFIG.DATA_VERSION,
            updatedAt: Date.now(),
            period: branch.period || '',
            records: this.recordsById(branch.records || []),
            result: branch.result || null,
            history: this.historyByPeriod(branch.history || [])
        };
    },

    async load() {
        try {
            const res = await fetch(CONFIG.FIREBASE_URL);
            const d = await res.json();
            if (d) {
                this.data.qiguaCount = d.qigua_count || 0;
                if (d.ssq) this.data.ssq = this.normalizeBranch(d.ssq);
                if (d.dlt) this.data.dlt = this.normalizeBranch(d.dlt);
            }
        } catch(e) { console.error('加载数据失败:', e); }
    },

    scheduleSave(type = null) {
        if (type) this.dirtyTypes.add(type);
        else {
            this.dirtyMeta = true;
            this.dirtyTypes.add('ssq');
            this.dirtyTypes.add('dlt');
        }
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), CONFIG.SAVE_DELAY);
    },

    scheduleMetaSave() {
        this.dirtyMeta = true;
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), CONFIG.SAVE_DELAY);
    },

    async save() {
        if (!this.dirtyMeta && this.dirtyTypes.size === 0) return;
        try {
            const writes = [];
            if (this.dirtyMeta) {
                writes.push(fetch(CONFIG.FIREBASE_URL, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schema_version: CONFIG.DATA_VERSION,
                        updated_at: Date.now(),
                        qigua_count: this.data.qiguaCount
                    })
                }));
            }
            this.dirtyTypes.forEach(type => {
                writes.push(fetch(CONFIG.FIREBASE_URL.replace('.json', `/${type}.json`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.serializeBranch(this.data[type]))
                }));
            });
            const results = await Promise.all(writes);
            if (results.every(res => res.ok)) {
                this.dirtyMeta = false;
                this.dirtyTypes.clear();
            }
        } catch(e) { console.error('保存数据失败:', e); }
    },

    addRecord(type, record) {
        this.data[type].records.push(record);
        this.scheduleSave(type);
    },

    incCount() {
        this.data.qiguaCount++;
        this.scheduleMetaSave();
        return this.data.qiguaCount;
    }
};

// ============================================
