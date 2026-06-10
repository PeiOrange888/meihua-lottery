// UI
// ============================================
const UI = {
    historyRange: 'all',

    $(id) { return document.getElementById(id); },

    balls(arr, type, small = false, matched = null) {
        if (!arr || !Array.isArray(arr)) return '';
        const cls = small ? `ball ball-${type} ball-small` : `ball ball-${type}`;
        return arr.map(n => {
            const isMatch = matched && matched.includes(n);
            return `<div class="${cls}${isMatch?' matched':''}">${n}</div>`;
        }).join('');
    },

    renderResult(type, g, l) {
        if (type === 'ssq') {
            this.$('ssq-red').innerHTML = this.balls(l.red, 'red');
            this.$('ssq-blue').innerHTML = this.balls([l.blue], 'blue');
            this.$('ssq-info').innerHTML = `<p><strong>本卦：</strong>${g.benGua.name}（第${g.benXu}卦）</p><p><strong>变卦：</strong>${g.bianGua.name}（第${g.bianXu}卦）</p><p><strong>动爻：</strong>第${g.dong}爻</p><p><strong>体用：</strong>${g.rel.desc}</p>`;
            this.$('ssq-detail').innerHTML = `<div class="space-y-2"><p><strong>【双色球推导】</strong></p><p>① 主卦卦序：${g.benXu} → 归藏：${Core.guiCang(g.benXu,33)}</p><p>② 变卦卦序：${g.bianXu} → 归藏：${Core.guiCang(g.bianXu,33)}</p><p>③ 体用${g.rel.type}：(${g.ti} ${this.getOp(g.rel.type)} ${g.yong}) + ${g.dong} → 蓝球</p><p>④ 互卦上卦：${g.hShang} → 归藏：${Core.guiCang(g.hShang,33)}</p><p>⑤ 互卦下卦：${g.hXia} → 归藏：${Core.guiCang(g.hXia,33)}</p><p class="mt-4"><strong>最终：</strong>红球 ${l.red.join(', ')} + 蓝球 ${l.blue}</p></div>`;
        } else {
            this.$('dlt-front').innerHTML = this.balls(l.front, 'red');
            this.$('dlt-back').innerHTML = this.balls(l.back, 'blue');
            this.$('dlt-info').innerHTML = `<p><strong>本卦：</strong>${g.benGua.name}（第${g.benXu}卦）</p><p><strong>变卦：</strong>${g.bianGua.name}（第${g.bianXu}卦）</p><p><strong>动爻：</strong>第${g.dong}爻</p><p><strong>体用：</strong>${g.rel.desc}</p>`;
            this.$('dlt-detail').innerHTML = `<div class="space-y-2"><p><strong>【大乐透推导】</strong></p><p>① 主卦卦序：${g.benXu} → 归藏：${Core.guiCang(g.benXu,35)}</p><p>② 变卦卦序：${g.bianXu} → 归藏：${Core.guiCang(g.bianXu,35)}</p><p>③ 体用${g.rel.type}：(${g.ti} ${this.getOp(g.rel.type)} ${g.yong}) + ${g.dong}</p><p>④ 动爻×时辰：${g.dong} × ${g.dz} = ${g.dong*g.dz}</p><p>⑤ 时辰+动爻：${g.dz} + ${g.dong} = ${g.dz+g.dong}</p><p class="mt-4"><strong>最终：</strong>前区 ${l.front.join(', ')} + 后区 ${l.back.join(', ')}</p></div>`;
        }
    },

    renderRecords(type) {
        const data = Store.data[type];
        const el = this.$(`${type}-records`);
        const records = data.records;
        if (records.length === 0) {
            el.innerHTML = '<p class="text-center py-4 text-secondary">暂无预测</p>';
            el.classList.remove('record-scroll'); return;
        }
        el.classList.toggle('record-scroll', records.length >= 3);
        const user = User.get();
        const html = records.map((r, i) => {
            const t = new Date(r.time||r.timestamp).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
            const red = Array.isArray(r.red) ? r.red : Array.isArray(r.redBalls) ? r.redBalls : [];
            const blue = Array.isArray(r.blue) ? r.blue : Array.isArray(r.blueBalls) ? r.blueBalls : [];
            const nick = r.user?.nickname || '匿名';
            const isSelf = r.user?.id === user.id;
            const nameStyle = isSelf ? 'color:var(--accent-cinnabar);font-weight:600' : 'color:var(--text-secondary)';
            const periodText = r.period ? `第${r.period}期` : '待开奖';
            return `<div class="record-item">
                <span class="text-sm" style="${nameStyle}">${nick}</span>
                <div class="flex-1">${this.balls(red,'red',true)} + ${this.balls(blue,'blue',true)}</div>
                <span class="text-sm text-secondary">${t}</span>
                <span class="prize-badge prize-none">${periodText}</span>
            </div>`;
        }).join('');
        el.innerHTML = records.length >= 3 ? html + html : html;
        this.renderHistory(type);
    },

    renderHistory(type) {
        const el = this.$(`${type}-history`);
        const winningHistory = Core.winningGroups(type, this.historyRange);
        if (winningHistory.length === 0) {
            const rangeText = this.historyRange === 'all' ? '' : `（近${this.historyRange}天）`;
            el.innerHTML = `<p class="text-center text-secondary">暂无中奖记录${rangeText}</p>`;
            return;
        }
        
        const user = User.get();
        el.innerHTML = winningHistory.map(h => {
            const resRed = Array.isArray(h.result?.red) ? h.result.red : Array.isArray(h.result?.redBalls) ? h.result.redBalls : [];
            const resBlue = Array.isArray(h.result?.blue) ? h.result.blue : Array.isArray(h.result?.blueBalls) ? h.result.blueBalls : [];
            const resultHtml = h.result ? `<p class="text-sm mb-4 text-secondary">开奖：${resRed.join(',')} + ${resBlue.join(',')} (${h.result.date})</p>` : '';
            const recordsHtml = h.records.map((r, i) => {
                const t = new Date(r.time||r.timestamp).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
                const prize = r.match?.prize || r.matchResult?.prize;
                const red = Array.isArray(r.red) ? r.red : Array.isArray(r.redBalls) ? r.redBalls : [];
                const blue = Array.isArray(r.blue) ? r.blue : Array.isArray(r.blueBalls) ? r.blueBalls : [];
                const matched = r.match || r.matchResult;
                const matchDetail = matched && matched.prize ? `（${matched.mRed||0}+${matched.mBlue||0}）` : '';
                const nick = r.user?.nickname || '匿名';
                const nameStyle = r.user?.id === user.id ? 'color:var(--accent-cinnabar);font-weight:600' : 'color:var(--text-secondary)';
                return `<div class="record-item">
                    <span class="text-sm" style="${nameStyle}">${nick}</span>
                    <div class="flex-1">${this.balls(red,'red',true,resRed)} + ${this.balls(blue,'blue',true,resBlue)}</div>
                    <span class="text-sm text-secondary">${t}</span>
                    ${prize ? `<span class="prize-badge prize-${prize.level}">${prize.name}${matchDetail}</span>` : '<span class="text-secondary">-</span>'}
                </div>`;
            }).join('');
            return `<div style="margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-ink)">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
                    <span style="font-weight:600">第 ${h.period} 期</span>
                    <span class="text-sm text-secondary">${h.result?'已开奖':'未开奖'}</span>
                </div>${resultHtml}<div>${recordsHtml}</div></div>`;
        }).join('');
    },

    setHistoryRange(range) {
        this.historyRange = range;
        document.querySelectorAll('[data-history-range]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.historyRange === range);
        });
        this.renderHistory('ssq');
        this.renderHistory('dlt');
    },

    renderLotteryResult(type) {
        const data = Store.data[type];
        const el = this.$(`${type}-result`);
        if (data.result) {
            const red = Array.isArray(data.result.red) ? data.result.red : Array.isArray(data.result.redBalls) ? data.result.redBalls : [];
            const blue = Array.isArray(data.result.blue) ? data.result.blue : Array.isArray(data.result.blueBalls) ? data.result.blueBalls : [];
            el.innerHTML = `<strong>最近开奖：</strong>${this.balls(red,'red',true)} + ${this.balls(blue,'blue',true)} <span class="text-secondary">第${data.result.period}期 ${data.result.date}</span>`;
        } else { el.innerHTML = '开奖结果：待更新'; }
    },

    renderQiYun(score) {
        const level = QIYUN_LEVELS.find(l => score >= l.min) || QIYUN_LEVELS[4];
        this.$('qiyun-display').innerHTML = `<div class="qiyun-card qiyun-${level.color}">
            <div style="font-size:1.5rem;font-weight:700">${level.name}</div>
            <div style="font-size:1.25rem;font-weight:700;margin-top:0.25rem">${score}分</div>
            <p style="margin-top:0.5rem">${level.desc}</p>
            <p style="font-size:0.875rem;margin-top:0.25rem;opacity:0.8">${level.advice}</p></div>`;
    },

    setTime(g) { this.$('time-display').textContent = `${g.y}年${g.m}月${g.d}日 ${g.h}时${g.min}分${g.s}秒`; },
    setPeriod(type, period) { this.$(`${type}-period`).textContent = `预测期号：${period}`; },
    setCount(n) { this.$('qigua-count').textContent = n; },

    setLoading(id, loading) {
        const btn = this.$(id);
        if (loading) { btn.disabled = true; btn.classList.add('loading'); }
        else { btn.disabled = false; btn.classList.remove('loading'); }
    },

    toggleDetail(type) {
        const el = this.$(`${type}-detail`);
        const btn = el.previousElementSibling;
        if (el.classList.contains('hidden')) { el.classList.remove('hidden'); btn.textContent = '[ 收起推导 ]'; }
        else { el.classList.add('hidden'); btn.textContent = '[ 查看详细推导 ]'; }
    },

    getOp(rel) {
        if (rel === '比和') return '×';
        if (rel === '体生用' || rel === '用生体') return '+';
        return '-';
    }
};

// ============================================
