// UI
// ============================================
const UI = {
    historyRange: 'all',
    expanded: {
        history: { ssq: false, dlt: false },
        settled: { ssq: false, dlt: false }
    },
    limits: {
        history: { groups: 2, records: 3 },
        settled: { groups: 3, records: 4 }
    },

    $(id) { return document.getElementById(id); },

    balls(arr, type, small = false, matched = null) {
        if (!arr || !Array.isArray(arr)) return '';
        const cls = small ? `ball ball-${type} ball-small` : `ball ball-${type}`;
        return arr.map(n => {
            const isMatch = matched && matched.includes(n);
            return `<div class="${cls}${isMatch?' matched':''}">${n}</div>`;
        }).join('');
    },

    traceLine(item) {
        if (!item) return '';
        const base = item.original ?? item.value;
        const adjusted = item.adjusted ? `，去重调整为 ${item.value}` : '';
        return `<p>${item.label}：${item.formula} → 归藏${item.max} = ${base}${adjusted}</p>`;
    },

    traceList(items) {
        return (items || []).map(item => this.traceLine(item)).join('');
    },

    compactGroups(groups, mode, type) {
        const expanded = this.expanded[mode][type];
        const limits = this.limits[mode];
        const totalGroups = groups.length;
        const totalRecords = groups.reduce((sum, group) => sum + (group.records || []).length, 0);
        const visibleGroups = expanded ? groups : groups.slice(0, limits.groups).map(group => ({
            ...group,
            records: (group.records || []).slice(0, limits.records)
        }));
        const visibleRecords = visibleGroups.reduce((sum, group) => sum + (group.records || []).length, 0);
        return { expanded, visibleGroups, totalGroups, totalRecords, hiddenRecords: Math.max(0, totalRecords - visibleRecords) };
    },

    renderExpandControl(mode, type, compact) {
        if (compact.totalGroups <= this.limits[mode].groups && compact.hiddenRecords === 0) return '';
        const label = compact.expanded ? '收起' : `展开全部${compact.hiddenRecords ? `（还有 ${compact.hiddenRecords} 条）` : ''}`;
        return `<button class="list-toggle text-sm" data-list-toggle="${mode}" data-list-type="${type}">${label}</button>`;
    },

    renderResult(type, g, l) {
        const dateLabel = g.isFallback ? '兜底日期' : '农历';
        const guaInfo = `<p><strong>起卦：</strong>北京时间 ${g.y}年${g.m}月${g.d}日 ${g.h}时，${dateLabel}${g.lunarText}，年支数${g.yearBranch}，时辰数${g.dz}</p><p><strong>本卦：</strong>${g.benGua.name}（第${g.benXu}卦，${BAGUA[g.shang].name}上${BAGUA[g.xia].name}下）</p><p><strong>变卦：</strong>${g.bianGua.name}（第${g.bianXu}卦）</p><p><strong>互卦：</strong>${g.huGua.name}（第${g.huXu}卦）</p><p><strong>动爻：</strong>第${g.dong}爻</p><p><strong>体用：</strong>${g.rel.desc}</p>`;
        if (type === 'ssq') {
            this.$('ssq-red').innerHTML = this.balls(l.red, 'red');
            this.$('ssq-blue').innerHTML = this.balls([l.blue], 'blue');
            this.$('ssq-info').innerHTML = guaInfo;
            this.$('ssq-detail').innerHTML = `<div class="space-y-2"><p><strong>【双色球推导】</strong></p>${this.traceList(l.trace?.ssq?.red)}${this.traceLine(l.trace?.ssq?.blue)}<p class="mt-4"><strong>最终：</strong>红球 ${l.red.join(', ')} + 蓝球 ${l.blue}</p></div>`;
        } else {
            this.$('dlt-front').innerHTML = this.balls(l.front, 'red');
            this.$('dlt-back').innerHTML = this.balls(l.back, 'blue');
            this.$('dlt-info').innerHTML = guaInfo;
            this.$('dlt-detail').innerHTML = `<div class="space-y-2"><p><strong>【大乐透推导】</strong></p>${this.traceList(l.trace?.dlt?.front)}${this.traceList(l.trace?.dlt?.back)}<p class="mt-4"><strong>最终：</strong>前区 ${l.front.join(', ')} + 后区 ${l.back.join(', ')}</p></div>`;
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
        this.renderSettlements(type);
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
        const compact = this.compactGroups(winningHistory, 'history', type);
        const groupsHtml = compact.visibleGroups.map(h => {
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
            return `<div class="history-group">
                <div class="history-head">
                    <span class="history-period">第 ${h.period} 期</span>
                    <span class="text-sm text-secondary">${h.result?'已开奖':'未开奖'}</span>
                </div>${resultHtml}<div>${recordsHtml}</div></div>`;
        }).join('');
        el.innerHTML = `${groupsHtml}${this.renderExpandControl('history', type, compact)}`;
    },

    renderSettlements(type) {
        const el = this.$(`${type}-settled`);
        const settledHistory = Core.settledGroups(type, this.historyRange);
        if (settledHistory.length === 0) {
            const rangeText = this.historyRange === 'all' ? '' : `（近${this.historyRange}天）`;
            el.innerHTML = `<p class="text-center text-secondary">暂无结算明细${rangeText}</p>`;
            return;
        }

        const user = User.get();
        const compact = this.compactGroups(settledHistory, 'settled', type);
        const groupsHtml = compact.visibleGroups.map(h => {
            const resRed = Array.isArray(h.result?.red) ? h.result.red : Array.isArray(h.result?.redBalls) ? h.result.redBalls : [];
            const resBlue = Array.isArray(h.result?.blue) ? h.result.blue : Array.isArray(h.result?.blueBalls) ? h.result.blueBalls : [];
            const recordsHtml = h.records.map(r => {
                const t = new Date(r.time||r.timestamp).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
                const red = Array.isArray(r.red) ? r.red : Array.isArray(r.redBalls) ? r.redBalls : [];
                const blue = Array.isArray(r.blue) ? r.blue : Array.isArray(r.blueBalls) ? r.blueBalls : [];
                const matched = r.match || r.matchResult || {};
                const prize = matched.prize;
                const nick = r.user?.nickname || '匿名';
                const nameStyle = r.user?.id === user.id ? 'color:var(--accent-cinnabar);font-weight:600' : 'color:var(--text-secondary)';
                const badge = prize
                    ? `<span class="prize-badge prize-${prize.level}">${prize.name}（${matched.mRed||0}+${matched.mBlue||0}）</span>`
                    : `<span class="prize-badge prize-none">未中奖（${matched.mRed||0}+${matched.mBlue||0}）</span>`;
                return `<div class="record-item">
                    <span class="text-sm" style="${nameStyle}">${nick}</span>
                    <div class="flex-1">${this.balls(red,'red',true,resRed)} + ${this.balls(blue,'blue',true,resBlue)}</div>
                    <span class="text-sm text-secondary">${t}</span>
                    ${badge}
                </div>`;
            }).join('');
            return `<div class="history-group">
                <div class="history-head">
                    <span class="history-period">第 ${h.period} 期</span>
                    <span class="text-sm text-secondary">开奖：${resRed.join(',')} + ${resBlue.join(',')}</span>
                </div><div>${recordsHtml}</div></div>`;
        }).join('');
        el.innerHTML = `${groupsHtml}${this.renderExpandControl('settled', type, compact)}`;
    },

    setHistoryRange(range) {
        this.historyRange = range;
        this.expanded.history.ssq = false;
        this.expanded.history.dlt = false;
        this.expanded.settled.ssq = false;
        this.expanded.settled.dlt = false;
        document.querySelectorAll('[data-history-range]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.historyRange === range);
        });
        this.renderHistory('ssq');
        this.renderHistory('dlt');
        this.renderSettlements('ssq');
        this.renderSettlements('dlt');
    },

    toggleList(mode, type) {
        this.expanded[mode][type] = !this.expanded[mode][type];
        if (mode === 'history') this.renderHistory(type);
        else this.renderSettlements(type);
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

    renderQiYun(reading) {
        const score = typeof reading === 'number' ? reading : reading.score;
        const level = typeof reading === 'number'
            ? QIYUN_LEVELS.find(l => score >= l.min) || QIYUN_LEVELS[4]
            : reading.level;
        const detail = typeof reading === 'number' ? '' : `<div class="qiyun-detail">
            <p class="qiyun-summary">${reading.summary}</p>
            <div class="qiyun-meta">
                <span>体：${reading.ti.name}${reading.ti.element}</span>
                <span>用：${reading.yong.name}${reading.yong.element}</span>
                <span>时令：农历${reading.season.month}月属${reading.season.element}</span>
            </div>
            <div class="qiyun-factors">
                ${reading.factors.map(item => `<p>${item}</p>`).join('')}
            </div>
        </div>`;
        this.$('qiyun-display').innerHTML = `<div class="qiyun-card qiyun-${level.color}">
            <div class="qiyun-title">${level.name}</div>
            <div class="qiyun-score">${score}分</div>
            <p style="margin-top:0.5rem">${level.desc}</p>
            ${detail}
            <p class="qiyun-advice">${reading.advice || level.advice}</p></div>`;
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
        if (el.classList.contains('hidden')) { el.classList.remove('hidden'); btn.textContent = '收起推导'; }
        else { el.classList.add('hidden'); btn.textContent = '查看详细推导'; }
    },

    getOp(rel) {
        if (rel === '比和') return '×';
        if (rel === '体生用' || rel === '用生体') return '+';
        return '-';
    }
};

// ============================================
