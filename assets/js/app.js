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
        await Core.checkPeriod('ssq'); await Core.checkPeriod('dlt');
        UI.setPeriod('ssq', Store.data.ssq.period||'--');
        UI.setPeriod('dlt', Store.data.dlt.period||'--');
        UI.renderRecords('ssq'); UI.renderRecords('dlt');
        await this._updateLottery('ssq'); await this._updateLottery('dlt');
        setInterval(() => { this._updateLottery('ssq'); this._updateLottery('dlt'); }, 30*60*1000);
    },

    async _updateLottery(type) {
        await Core.checkPeriod(type);
        const previousResultPeriod = Store.data[type].result?.period;
        const result = Store.data[type].result || await Api.getResult(type);
        UI.setPeriod(type, Store.data[type].period || '--');
        if (result) {
            Store.data[type].result = result;
            if (previousResultPeriod !== result.period) Store.scheduleSave(type);
            UI.renderLotteryResult(type);
            UI.renderRecords(type);
        }
    },

    async doQiGua(type) {
        const btnId = type === 'ssq' ? 'btn-ssq' : 'btn-dlt';
        UI.setLoading(btnId, true);
        try {
            const count = Store.incCount(); UI.setCount(count);
            const g = Core.calcGua(); const l = Core.genLottery(g);
            UI.setTime(g);
            UI.$('result-section').classList.remove('hidden');
            UI.renderResult(type, g, l);
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

    doQiYun() {
        const key = `qiyun_${new Date().toISOString().slice(0,10)}`;
        const cached = localStorage.getItem(key);
        if (cached) { UI.renderQiYun(JSON.parse(cached)); return; }
        const g = Core.calcGua(); const score = Core.calcQiYun(g);
        localStorage.setItem(key, JSON.stringify(score));
        UI.renderQiYun(score);
    }
};

document.getElementById('btn-ssq').addEventListener('click', () => App.doQiGua('ssq'));
document.getElementById('btn-dlt').addEventListener('click', () => App.doQiGua('dlt'));
document.getElementById('btn-qiyun').addEventListener('click', () => App.doQiYun());
document.querySelectorAll('[data-history-range]').forEach(btn => {
    btn.addEventListener('click', () => UI.setHistoryRange(btn.dataset.historyRange));
});
document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App; window.UI = UI;
