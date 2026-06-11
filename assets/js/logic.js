// API
// ============================================
const Api = {
    parseResult(type, item) {
        if (!item) return null;
        if (type === 'dlt') {
            return {
                period: item.code,
                nextPeriod: item.next_code,
                date: item.day,
                red: [item.one, item.two, item.three, item.four, item.five].map(Number),
                blue: [item.six, item.seven].map(Number)
            };
        }
        return {
            period: item.code,
            nextPeriod: item.next_code,
            date: item.day,
            red: [item.one, item.two, item.three, item.four, item.five, item.six].map(Number),
            blue: [Number(item.seven)]
        };
    },

    async getLatest(type) {
        try {
            const res = await fetch(`${CONFIG.LOTTERY_API}?type=${type}&page=1&limit=1`);
            const d = await res.json();
            return d.code === 1 && d.data.last ? this.parseResult(type, d.data.last) : null;
        } catch(e) { return null; }
    },

    async getPeriod(type) {
        try {
            const res = await fetch(`${CONFIG.LOTTERY_API}?type=${type}&page=1&limit=1`);
            const d = await res.json();
            if (d.code === 1 && d.data.last) return d.data.last.next_code || d.data.last.code;
            return null;
        } catch(e) { return type === 'ssq' ? '2026058' : '26056'; }
    },

    async getResult(type) {
        try {
            const res = await fetch(`${CONFIG.LOTTERY_API}?type=${type}&page=1&limit=1`);
            const d = await res.json();
            if (d.code === 1 && d.data.last) return this.parseResult(type, d.data.last);
        } catch(e) {}
        return null;
    },

    async getResults(type, limit = 30) {
        try {
            const res = await fetch(`${CONFIG.LOTTERY_API}?type=${type}&page=1&limit=${limit}`);
            const d = await res.json();
            const list = d.code === 1 && d.data?.data?.list ? d.data.data.list : [];
            return list.map(item => this.parseResult(type, item)).filter(Boolean);
        } catch(e) {
            return [];
        }
    }
};

// ============================================
// 核心逻辑
// ============================================
const Core = {
    guiCang(n, max) {
        const value = Math.round(Number(n) || 0);
        const r = ((value % max) + max) % max;
        return r === 0 ? max : r;
    },

    parseChineseNumber(text) {
        const source = String(text || '').replace(/[年月日\s]/g, '').replace(/^闰/, '').replace(/^初/, '');
        if (/^\d+$/.test(source)) return Number(source);
        const digits = { '零':0, '〇':0, '一':1, '二':2, '两':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
        if (source === '正') return 1;
        if (source === '冬') return 11;
        if (source === '腊') return 12;
        if (source === '十') return 10;
        if (source.startsWith('廿')) return 20 + (digits[source.slice(1)] || 0);
        if (source.startsWith('卅')) return 30 + (digits[source.slice(1)] || 0);
        const tenIndex = source.indexOf('十');
        if (tenIndex >= 0) {
            const left = source.slice(0, tenIndex);
            const right = source.slice(tenIndex + 1);
            return (left ? digits[left] : 1) * 10 + (right ? digits[right] : 0);
        }
        return digits[source] || 0;
    },

    beijingParts(date = new Date()) {
        const fmt = new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        });
        const parts = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
        return {
            y: parts.year,
            m: parts.month,
            d: parts.day,
            h: parts.hour === 24 ? 0 : parts.hour,
            min: parts.minute,
            s: parts.second
        };
    },

    lunarParts(date = new Date()) {
        try {
            const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
            const parts = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
            const monthText = parts.month || '';
            const lunarYear = Number(parts.relatedYear || parts.year);
            const lunarMonth = this.parseChineseNumber(monthText);
            const lunarDay = this.parseChineseNumber(parts.day);
            if (!lunarYear || !lunarMonth || !lunarDay) throw new Error('Invalid lunar date');
            return {
                lunarYear,
                lunarMonth,
                lunarDay,
                isLeapMonth: monthText.startsWith('闰'),
                lunarText: `${lunarYear}年${monthText}${parts.day}`
            };
        } catch(e) {
            const p = this.beijingParts(date);
            return {
                lunarYear: p.y,
                lunarMonth: p.m,
                lunarDay: p.d,
                isLeapMonth: false,
                isFallback: true,
                lunarText: `公历${p.y}年${p.m}月${p.d}日`
            };
        }
    },

    yearBranch(lunarYear) {
        return this.guiCang(Number(lunarYear) - 2020 + 1, 12);
    },

    hourBranch(hour) {
        return Math.floor(((hour + 1) % 24) / 2) + 1;
    },

    trigramNum(yao) {
        return TRI_TO_NUM[yao.join('')] || 1;
    },

    getGua(upper, lower) {
        return GUA_BY_TRIGRAMS[`${upper}-${lower}`] || GUA_64[1];
    },

    getGuaByYao(yao) {
        return GUA_BY_YAO[yao.join('')] || this.getGua(this.trigramNum(yao.slice(3,6)), this.trigramNum(yao.slice(0,3)));
    },

    getRelation(ti, yong) {
        const tw = WUXING[ti], yw = WUXING[yong];
        if (SHENG[tw] === yw) return { type: '体生用', desc: `体${tw}生用${yw}` };
        if (KE[tw] === yw) return { type: '体克用', desc: `体${tw}克用${yw}` };
        if (SHENG[yw] === tw) return { type: '用生体', desc: `体${tw}被用${yw}生` };
        if (KE[yw] === tw) return { type: '用克体', desc: `体${tw}被用${yw}克` };
        return { type: '比和', desc: `体${tw}比用${yw}` };
    },

    calcGua(date = new Date()) {
        const gregorian = this.beijingParts(date);
        const lunar = this.lunarParts(date);
        const yearBranch = this.yearBranch(lunar.lunarYear);
        const hourBranch = this.hourBranch(gregorian.h);
        const sum1 = yearBranch + lunar.lunarMonth + lunar.lunarDay;
        const sum2 = sum1 + hourBranch;
        const shang = this.guiCang(sum1, 8), xia = this.guiCang(sum2, 8);
        const dong = this.guiCang(sum2, 6), dz = hourBranch;
        const benGua = this.getGua(shang, xia), benXu = benGua.seq;
        let ti, yong;
        if (dong <= 3) { ti = shang; yong = xia; } else { ti = xia; yong = shang; }
        const rel = this.getRelation(ti, yong);
        const yao = [...benGua.yao]; yao[dong-1] = yao[dong-1] === 1 ? 0 : 1;
        const bianGua = this.getGuaByYao(yao), bianXu = bianGua.seq;
        const hXia = this.trigramNum(benGua.yao.slice(1,4));
        const hShang = this.trigramNum(benGua.yao.slice(2,5));
        const huGua = this.getGua(hShang, hXia), huXu = huGua.seq;
        return {
            ...gregorian,
            ...lunar,
            yearBranch,
            hourBranch,
            shang,
            xia,
            dong,
            dz,
            sum1,
            sum2,
            benXu,
            benGua,
            ti,
            yong,
            rel,
            bianXu,
            bianGua,
            hShang,
            hXia,
            huXu,
            huGua
        };
    },

    genLottery(g) {
        const coeff = { '体生用':0.7, '体克用':1.3, '用生体':1.1, '用克体':0.9, '比和':1.0 };
        const bias = { '体生用':-2, '体克用':3, '用生体':2, '用克体':-3, '比和':0 };
        const c = coeff[g.rel.type]||1.0;
        const b = bias[g.rel.type]||0;
        const entry = (label, raw, max, formula) => ({ label, raw: Math.round(raw), max, value: this.guiCang(raw, max), formula });
        const unique = (entries, max) => {
            const used = new Set();
            return entries.map((item, index) => {
                let value = item.value;
                let step = this.guiCang(item.raw + g.benXu + g.bianXu + g.huXu + g.dong + index + 1, max - 1);
                let attempts = 0;
                const original = value;
                while (used.has(value) && attempts < max) {
                    value = this.guiCang(value + step, max);
                    step = this.guiCang(step + g.dong + index + 1, max - 1);
                    attempts++;
                }
                used.add(value);
                return { ...item, value, original, adjusted: value !== original };
            });
        };
        const tiYongRaw = Math.round((g.ti * 8 + g.yong + g.dong + g.dz + g.huXu) * c + b);
        const relationRaw = Math.round((g.bianXu + g.huXu + g.ti * g.yong + b * g.dong) * c);
        const redTrace = unique([
            entry('本卦序', g.benXu, 33, `${g.benGua.name}第${g.benXu}卦`),
            entry('变卦序', g.bianXu, 33, `${g.bianGua.name}第${g.bianXu}卦`),
            entry('互卦序', g.huXu, 33, `${g.huGua.name}第${g.huXu}卦`),
            entry('体用数', tiYongRaw, 33, `(${g.ti}×8+${g.yong}+动爻${g.dong}+时辰${g.dz}+互卦${g.huXu})×${c}+${b}`),
            entry('上下卦组合', g.shang * 10 + g.xia + g.lunarDay, 33, `${g.shang}×10+${g.xia}+农历日${g.lunarDay}`),
            entry('生克调整', relationRaw, 33, `(变卦${g.bianXu}+互卦${g.huXu}+体用${g.ti}×${g.yong}+${b}×动爻${g.dong})×${c}`)
        ], 33);
        const blueTrace = entry('蓝球', g.dong + g.dz + g.ti + g.yong + b, 16, `动爻${g.dong}+时辰${g.dz}+体${g.ti}+用${g.yong}+${b}`);
        const frontTrace = unique([
            entry('本卦序', g.benXu, 35, `${g.benGua.name}第${g.benXu}卦`),
            entry('变卦序', g.bianXu, 35, `${g.bianGua.name}第${g.bianXu}卦`),
            entry('互卦序', g.huXu, 35, `${g.huGua.name}第${g.huXu}卦`),
            entry('体用数', tiYongRaw + g.lunarMonth, 35, `体用数${tiYongRaw}+农历月${g.lunarMonth}`),
            entry('动爻时辰', Math.round((g.dong * g.dz + g.hShang * g.hXia + b) * c), 35, `(动爻${g.dong}×时辰${g.dz}+互卦${g.hShang}×${g.hXia}+${b})×${c}`)
        ], 35);
        const backTrace = unique([
            entry('互上动爻', g.hShang + g.dong + b, 12, `互卦上${g.hShang}+动爻${g.dong}+${b}`),
            entry('互下时辰', g.hXia + g.dz + g.ti + b, 12, `互卦下${g.hXia}+时辰${g.dz}+体${g.ti}+${b}`)
        ], 12);
        return {
            red: redTrace.map(item => item.value).sort((a,b) => a-b),
            blue: blueTrace.value,
            front: frontTrace.map(item => item.value).sort((a,b) => a-b),
            back: backTrace.map(item => item.value).sort((a,b) => a-b),
            trace: {
                ssq: { red: redTrace, blue: blueTrace },
                dlt: { front: frontTrace, back: backTrace },
                relationCoeff: c,
                relationBias: b
            }
        };
    },

    calcQiYun(g) {
        let score = 50; const r = g.rel.type;
        if (r === '用生体') score += 30; else if (r === '体克用') score += 15; else if (r === '比和') score += 10;
        else if (r === '体生用') score -= 15; else if (r === '用克体') score -= 30;
        const month = g.lunarMonth || this.lunarParts(new Date()).lunarMonth;
        const season = month>=1&&month<=3?'木':month>=4&&month<=6?'火':month>=7&&month<=9?'金':'水';
        if (WUXING[g.ti] === season) score += 10;
        return Math.max(0, Math.min(100, score));
    },

    matchSSQ(rec, res) {
        if (!res || !rec) return null;
        const red = Array.isArray(rec.red) ? rec.red : Array.isArray(rec.redBalls) ? rec.redBalls : [];
        const blue = Array.isArray(rec.blue) ? rec.blue : Array.isArray(rec.blueBalls) ? rec.blueBalls : [];
        const resRed = Array.isArray(res.red) ? res.red : Array.isArray(res.redBalls) ? res.redBalls : [];
        const resBlue = Array.isArray(res.blue) ? res.blue : Array.isArray(res.blueBalls) ? res.blueBalls : [];
        const mRed = red.filter(r => resRed.includes(r)).length;
        const mBlue = blue[0] === resBlue[0] ? 1 : 0;
        let prize = null;
        if (mRed===6&&mBlue===1) prize={level:1,name:'一等奖'};
        else if (mRed===6) prize={level:2,name:'二等奖'};
        else if (mRed===5&&mBlue===1) prize={level:3,name:'三等奖'};
        else if (mRed===5||(mRed===4&&mBlue===1)) prize={level:4,name:'四等奖'};
        else if (mRed===4||(mRed===3&&mBlue===1)) prize={level:5,name:'五等奖'};
        else if (mBlue===1) prize={level:6,name:'六等奖'};
        return {mRed,mBlue,prize};
    },

    matchDLT(rec, res) {
        if (!res || !rec) return null;
        const red = Array.isArray(rec.red) ? rec.red : Array.isArray(rec.redBalls) ? rec.redBalls : [];
        const blue = Array.isArray(rec.blue) ? rec.blue : Array.isArray(rec.blueBalls) ? rec.blueBalls : [];
        const resRed = Array.isArray(res.red) ? res.red : Array.isArray(res.redBalls) ? res.redBalls : [];
        const resBlue = Array.isArray(res.blue) ? res.blue : Array.isArray(res.blueBalls) ? res.blueBalls : [];
        const mRed = red.filter(r => resRed.includes(r)).length;
        const mBlue = blue.filter(b => resBlue.includes(b)).length;
        let prize = null;
        if (mRed===5&&mBlue===2) prize={level:1,name:'一等奖'};
        else if (mRed===5&&mBlue===1) prize={level:2,name:'二等奖'};
        else if (mRed===5) prize={level:3,name:'三等奖'};
        else if (mRed===4&&mBlue===2) prize={level:4,name:'四等奖'};
        else if (mRed===4&&mBlue===1) prize={level:5,name:'五等奖'};
        else if (mRed===3&&mBlue===2) prize={level:6,name:'六等奖'};
        else if (mRed===4) prize={level:7,name:'七等奖'};
        else if ((mRed===3&&mBlue===1)||(mRed===2&&mBlue===2)) prize={level:8,name:'八等奖'};
        else if ((mRed===3&&mBlue===0)||(mRed===1&&mBlue===2)||(mRed===2&&mBlue===1)||(mRed===0&&mBlue===2)) prize={level:9,name:'九等奖'};
        return {mRed,mBlue,prize};
    },

    matchRecord(type, record, result) {
        if (!result) return record.match || record.matchResult || null;
        return type === 'ssq' ? this.matchSSQ(record, result) : this.matchDLT(record, result);
    },

    withFreshMatch(type, record, result) {
        const match = this.matchRecord(type, record, result);
        return match ? { ...record, match } : record;
    },

    comparePeriod(a, b) {
        const na = Number(String(a || '').replace(/\D/g, ''));
        const nb = Number(String(b || '').replace(/\D/g, ''));
        if (!na || !nb) return 0;
        return na - nb;
    },

    mergeHistory(data, group) {
        const existing = data.history.find(h => h.period === group.period);
        if (existing) {
            existing.result = group.result;
            const ids = new Set((existing.records || []).map(r => r.id));
            group.records.forEach(record => {
                if (!ids.has(record.id)) existing.records.push(record);
            });
        } else {
            data.history.unshift(group);
        }
        data.history.sort((a, b) => this.comparePeriod(b.period, a.period));
        if (data.history.length > CONFIG.MAX_HISTORY) data.history.length = CONFIG.MAX_HISTORY;
    },

    async checkPeriod(type) {
        const latest = await Api.getLatest(type);
        if (!latest) return;

        const data = Store.data[type];
        const previousPeriod = data.period;
        const nextPeriod = latest.nextPeriod || await Api.getPeriod(type);
        const targetPeriod = nextPeriod || data.period || latest.period;
        const periodChanged = data.period !== targetPeriod;
        const resultChanged = data.result?.period !== latest.period;
        data.period = targetPeriod;
        data.result = latest;

        if (!data.records.length) {
            if (periodChanged || resultChanged) Store.scheduleSave(type);
            return;
        }

        const results = await Api.getResults(type, 40);
        const resultsByPeriod = {};
        results.forEach(result => { resultsByPeriod[result.period] = result; });

        const pending = [];
        const groups = {};
        data.records.forEach(record => {
            const recordPeriod = record.period || previousPeriod || data.period;
            const normalized = { ...record, period: recordPeriod, status: record.status || 'pending' };
            const result = resultsByPeriod[recordPeriod];
            if (result && this.comparePeriod(recordPeriod, latest.period) <= 0) {
                const match = type === 'ssq' ? this.matchSSQ(normalized, result) : this.matchDLT(normalized, result);
                const settled = { ...normalized, status: 'settled', match };
                if (!groups[recordPeriod]) groups[recordPeriod] = { period: recordPeriod, records: [], result };
                groups[recordPeriod].records.push(settled);
            } else {
                pending.push(normalized);
            }
        });

        Object.values(groups).forEach(group => this.mergeHistory(data, group));
        const settledCount = Object.values(groups).reduce((sum, group) => sum + group.records.length, 0);
        data.records = pending;
        if (!data.records.length) data.period = nextPeriod || data.period;
        if (periodChanged || resultChanged || settledCount > 0) Store.scheduleSave(type);
    },

    isWinner(record) {
        return !!(record.match?.prize || record.matchResult?.prize);
    },

    inRange(record, range) {
        if (range === 'all') return true;
        const days = Number(range);
        if (!days) return true;
        const time = record.time || record.timestamp;
        return time && Date.now() - time <= days * 24 * 60 * 60 * 1000;
    },

    winningGroups(type, range) {
        return (Store.data[type].history || []).map(group => ({
            ...group,
            records: (group.records || [])
                .map(record => this.withFreshMatch(type, record, group.result))
                .filter(record => this.isWinner(record) && this.inRange(record, range))
        })).filter(group => group.records.length > 0);
    },

    settledGroups(type, range) {
        return (Store.data[type].history || []).map(group => ({
            ...group,
            records: (group.records || [])
                .map(record => this.withFreshMatch(type, record, group.result))
                .filter(record => (record.match || record.matchResult) && this.inRange(record, range))
        })).filter(group => group.records.length > 0);
    }
};

// ============================================
