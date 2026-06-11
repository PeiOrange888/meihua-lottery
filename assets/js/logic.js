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
    guiCang(n, max) { const r = Math.round(n) % max; return r === 0 ? max : r; },

    getRelation(ti, yong) {
        const tw = WUXING[ti], yw = WUXING[yong];
        if (SHENG[tw] === yw) return { type: '体生用', desc: `体${tw}生用${yw}` };
        if (KE[tw] === yw) return { type: '体克用', desc: `体${tw}克用${yw}` };
        if (SHENG[yw] === tw) return { type: '用生体', desc: `体${tw}被用${yw}生` };
        if (KE[yw] === tw) return { type: '用克体', desc: `体${tw}被用${yw}克` };
        return { type: '比和', desc: `体${tw}比用${yw}` };
    },

    calcGua() {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
        const h = now.getHours(), min = now.getMinutes(), s = now.getSeconds();
        const sum1 = y+m+d, sum2 = y+m+d+h+min+s;
        const shang = this.guiCang(sum1, 8), xia = this.guiCang(sum2, 8);
        const dong = this.guiCang(sum2, 6), dz = this.guiCang(h*3600+min*60+s, 12);
        const benXu = (shang-1)*8+xia, benGua = GUA_64[benXu]||GUA_64[1];
        let ti, yong;
        if (dong <= 3) { ti = shang; yong = xia; } else { ti = xia; yong = shang; }
        const rel = this.getRelation(ti, yong);
        const yao = [...benGua.yao]; yao[dong-1] = yao[dong-1] === 1 ? 0 : 1;
        const bShang = yao.slice(0,3), bXia = yao.slice(3,6);
        const bShangNum = TRI_TO_NUM[bShang.join('')]||1, bXiaNum = TRI_TO_NUM[bXia.join('')]||1;
        const bianXu = (bShangNum-1)*8+bXiaNum, bianGua = GUA_64[bianXu]||GUA_64[1];
        const hShang = TRI_TO_NUM[benGua.yao.slice(2,5).join('')]||1, hXia = TRI_TO_NUM[benGua.yao.slice(1,4).join('')]||1;
        const huXu = (hShang-1)*8+hXia, huGua = GUA_64[huXu]||GUA_64[1];
        return { y,m,d,h,min,s, shang,xia,dong,dz, benXu,benGua,ti,yong,rel, bianXu,bianGua, hShang,hXia,huXu,huGua };
    },

    genLottery(g) {
        const coeff = { '体生用':0.7, '体克用':1.3, '用生体':1.1, '用克体':0.9, '比和':1.0 };
        const c = coeff[g.rel.type]||1.0;
        const calc = (base, max) => {
            let r;
            if (g.rel.type === '比和') r = Math.round((g.ti*g.yong+base)*c);
            else if (g.rel.type === '体生用' || g.rel.type === '用生体') r = Math.round((g.ti+g.yong+base)*c);
            else r = Math.round((Math.abs(g.ti-g.yong)+base)*c);
            return this.guiCang(r, max);
        };
        const adjust = (arr, max) => {
            const result = [];
            for (let v of arr) {
                let attempts = 0;
                while (result.includes(v) && attempts < max) {
                    const step = Math.floor(Math.random()*11)+5;
                    v += Math.random()>0.5 ? step : -step;
                    while (v > max) v -= max; while (v < 1) v += max; attempts++;
                }
                result.push(v);
            }
            for (let i = 1; i < result.length; i++) {
                if (Math.abs(result[i]-result[i-1]) <= 2) {
                    for (let j = 0; j < result.length; j++) {
                        if (j !== i && Math.abs(result[j]-result[i-1]) > 3 && Math.abs(result[j]-result[i]) > 3) {
                            [result[i],result[j]] = [result[j],result[i]]; break;
                        }
                    }
                }
            }
            return result.sort((a,b) => a-b);
        };
        const redCand = [this.guiCang(g.benXu,33), this.guiCang(g.bianXu,33), calc(g.dong,33), this.guiCang(g.hShang*g.hXia,33), this.guiCang(g.shang*10+g.xia,33), this.guiCang(g.bianXu*c,33)];
        const red = adjust(redCand,33).slice(0,6), blue = calc(g.dong+g.dz,16);
        const frontCand = [this.guiCang(g.benXu,35), this.guiCang(g.bianXu,35), calc(g.dong,35), this.guiCang(g.hShang*g.hXia+g.dz,35), this.guiCang(g.dong*g.dz*c,35)];
        const front = adjust(frontCand,35).slice(0,5);
        let backA = this.guiCang(g.hShang+g.dong,12), backB = this.guiCang(g.hXia+g.dz,12);
        if (backA === backB) { backB++; if (backB > 12) backB = 1; }
        return { red, blue, front, back: [backA,backB].sort((a,b)=>a-b) };
    },

    calcQiYun(g) {
        let score = 50; const r = g.rel.type;
        if (r === '用生体') score += 30; else if (r === '体克用') score += 15; else if (r === '比和') score += 10;
        else if (r === '体生用') score -= 15; else if (r === '用克体') score -= 30;
        const month = new Date().getMonth()+1;
        const season = month>=3&&month<=5?'木':month>=6&&month<=8?'火':month>=9&&month<=11?'金':'水';
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
        else if (mRed===4||(mRed===3&&mBlue===2)) prize={level:6,name:'六等奖'};
        else if ((mRed===3&&mBlue===1)||(mRed===2&&mBlue===2)) prize={level:7,name:'七等奖'};
        else if (mRed===3||(mRed===1&&mBlue===2)||(mRed===2&&mBlue===1)) prize={level:8,name:'八等奖'};
        else if (mBlue===2||(mRed===1&&mBlue===1)||mRed===2) prize={level:9,name:'九等奖'};
        return {mRed,mBlue,prize};
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
            records: (group.records || []).filter(record => this.isWinner(record) && this.inRange(record, range))
        })).filter(group => group.records.length > 0);
    },

    settledGroups(type, range) {
        return (Store.data[type].history || []).map(group => ({
            ...group,
            records: (group.records || []).filter(record => (record.match || record.matchResult) && this.inRange(record, range))
        })).filter(group => group.records.length > 0);
    }
};

// ============================================
