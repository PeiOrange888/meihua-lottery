// 应用
// ============================================
const App = {
    async init() {
        if (location.protocol !== 'file:') {
            const script = document.createElement('script');
            script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
            script.async = true; document.head.appendChild(script);
        } else { document.getElementById('busuanzi_value_site_pv').textContent = '--'; document.getElementById('busuanzi_value_site_uv').textContent = '--'; }

        await Store.load();
        UI.setCount(Store.data.qiguaCount);
        const user = User.get();
        document.getElementById('user-nickname').textContent = `当前身份：${user.nickname}`;
        UI.setPeriod('ssq', Store.data.ssq.period||'--');
        UI.setPeriod('dlt', Store.data.dlt.period||'--');
        UI.renderRecords('ssq'); UI.renderRecords('dlt');
        await this._updateLottery('ssq'); await this._updateLottery('dlt');
        setInterval(() => { this._updateLottery('ssq'); this._updateLottery('dlt'); }, 30*60*1000);
    },

    async _updateLottery(type) {
        try {
            await Core.checkPeriod(type);
        } catch(e) {
            console.error('开奖结算检查失败:', e);
            const [period, result] = await Promise.all([
                Api.getPeriod(type),
                Api.getResult(type)
            ]);
            if (period) Store.data[type].period = period;
            if (result) Store.data[type].result = result;
        }
        UI.setPeriod(type, Store.data[type].period || '--');
        UI.renderLotteryResult(type);
        UI.renderRecords(type);
    },

    async doQiGua(type) {
        const btnId = type === 'ssq' ? 'btn-ssq' : 'btn-dlt';
        UI.setLoading(btnId, true);
        try {
            // 检查当前时辰是否已有预测
            const now = new Date();
            const cached = this._checkShichenCache(type, now);
            if (cached) {
                // 显示缓存的结果
                UI.setTime(cached.gua);
                UI.renderResult(type, cached.gua, cached.lottery);
                UI.showResult?.();
                UI.renderRecords(type);
                UI.showToast('本时辰已起卦，卦象相同');
                return;
            }

            const count = Store.incCount(); UI.setCount(count);
            const g = Core.calcGua(); const l = Core.genLottery(g);

            // 缓存本时辰的预测结果
            this._saveShichenCache(type, now, g, l);

            UI.setTime(g);
            UI.renderResult(type, g, l);
            UI.showResult?.();
            const user = User.get();
            const record = {
                id: `p_${Date.now()}`,
                time: Date.now(),
                user: user,
                period: Store.data[type].period,
                status: 'pending',
                red: type==='ssq' ? l.red : l.front,
                blue: type==='ssq' ? [l.blue] : l.back
            };
            Store.addRecord(type, record);
            UI.renderRecords(type);
        } finally { UI.setLoading(btnId, false); }
    },

    _getShichenKey(date) {
        const p = Core.beijingParts(date);
        const lunar = Core.lunarParts(date);
        const hourBranch = Core.hourBranch(p.h);
        return `${lunar.lunarYear}_${lunar.lunarMonth}_${lunar.lunarDay}_${hourBranch}`;
    },

    _checkShichenCache(type, date) {
        const key = `shichen_${type}_${this._getShichenKey(date)}`;
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const data = JSON.parse(cached);
                // 验证缓存是否在同一时辰内
                const cachedKey = this._getShichenKey(new Date(data.timestamp));
                const currentKey = this._getShichenKey(date);
                if (cachedKey === currentKey) {
                    return { gua: data.gua, lottery: data.lottery };
                }
            }
        } catch(e) {}
        return null;
    },

    _saveShichenCache(type, date, gua, lottery) {
        const key = `shichen_${type}_${this._getShichenKey(date)}`;
        try {
            const data = {
                timestamp: date.getTime(),
                gua: gua,
                lottery: lottery
            };
            localStorage.setItem(key, JSON.stringify(data));
            // 清理旧的缓存（保留最近3天）
            this._cleanOldCache(type);
        } catch(e) {}
    },

    _cleanOldCache(type) {
        try {
            const now = Date.now();
            const threeDays = 3 * 24 * 60 * 60 * 1000;
            const prefix = `shichen_${type}_`;
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data && data.timestamp && now - data.timestamp > threeDays) {
                            keysToRemove.push(key);
                        }
                    } catch(e) {}
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch(e) {}
    },

    doQiYun() {
        const key = `qiyun_v2_${new Date().toISOString().slice(0,10)}`;
        const cached = localStorage.getItem(key);
        if (cached) { UI.renderQiYun(JSON.parse(cached)); return; }
        const g = Core.calcGua(); const reading = Core.calcGuaReading(g);
        localStorage.setItem(key, JSON.stringify(reading));
        UI.renderQiYun(reading);
    }
};

document.getElementById('btn-ssq').addEventListener('click', () => App.doQiGua('ssq'));
document.getElementById('btn-dlt').addEventListener('click', () => App.doQiGua('dlt'));
document.getElementById('btn-qiyun').addEventListener('click', () => App.doQiYun());
document.querySelectorAll('[data-history-range]').forEach(btn => {
    btn.addEventListener('click', () => UI.setHistoryRange(btn.dataset.historyRange));
});
document.addEventListener('click', event => {
    const btn = event.target.closest('[data-list-toggle]');
    if (!btn) return;
    UI.toggleList(btn.dataset.listToggle, btn.dataset.listType);
});
document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App; window.UI = UI;
