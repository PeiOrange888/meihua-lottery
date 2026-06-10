    (function() {
'use strict';

// ============================================
// 配置
// ============================================
const CONFIG = {
    FIREBASE_URL: 'https://meihua-abb40-default-rtdb.firebaseio.com/lottery.json',
    LOTTERY_API: 'https://api.huiniao.top/interface/home/lotteryHistory',
    DATA_VERSION: 2,
    SAVE_DELAY: 1000,
    MAX_HISTORY: 120
};

// ============================================
// 常量
// ============================================
const WUXING = { 1:'金', 2:'金', 3:'火', 4:'木', 5:'木', 6:'水', 7:'土', 8:'土' };
const SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };
const KE = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
const TRI_TO_NUM = { '111':1, '011':2, '101':3, '001':4, '110':5, '010':6, '100':7, '000':8 };

const GUA_64 = {
    1:{name:'乾为天',yao:[1,1,1,1,1,1]}, 2:{name:'坤为地',yao:[0,0,0,0,0,0]},
    3:{name:'水雷屯',yao:[0,1,0,1,0,0]}, 4:{name:'山水蒙',yao:[1,0,0,1,0,0]},
    5:{name:'水天需',yao:[1,1,1,0,1,0]}, 6:{name:'天水讼',yao:[0,1,0,1,1,1]},
    7:{name:'地水师',yao:[0,1,0,0,0,0]}, 8:{name:'水地比',yao:[0,0,0,0,1,0]},
    9:{name:'风天小畜',yao:[0,1,1,1,1,0]}, 10:{name:'天泽履',yao:[0,1,1,1,0,1]},
    11:{name:'地天泰',yao:[1,1,1,0,0,0]}, 12:{name:'天地否',yao:[0,0,0,1,1,1]},
    13:{name:'天火同人',yao:[0,1,0,1,1,1]}, 14:{name:'火天大有',yao:[1,1,1,0,1,0]},
    15:{name:'地山谦',yao:[0,0,1,0,0,0]}, 16:{name:'雷地豫',yao:[0,0,0,0,1,0]},
    17:{name:'泽雷随',yao:[0,1,0,0,1,0]}, 18:{name:'山风蛊',yao:[0,1,0,0,0,1]},
    19:{name:'地泽临',yao:[0,1,0,0,0,0]}, 20:{name:'风地观',yao:[0,0,0,1,1,0]},
    21:{name:'火雷噬嗑',yao:[0,1,0,0,1,0]}, 22:{name:'山火贲',yao:[0,1,0,1,0,0]},
    23:{name:'山地剥',yao:[0,0,0,1,0,0]}, 24:{name:'地雷复',yao:[0,1,0,0,0,0]},
    25:{name:'天雷无妄',yao:[0,1,0,1,1,1]}, 26:{name:'山雷颐',yao:[0,1,0,1,0,0]},
    27:{name:'山泽损',yao:[0,1,0,1,0,0]}, 28:{name:'风雷益',yao:[0,1,0,1,1,0]},
    29:{name:'泽天夬',yao:[1,1,1,1,0,1]}, 30:{name:'天风姤',yao:[0,1,1,1,1,1]},
    31:{name:'泽地萃',yao:[0,0,0,0,1,0]}, 32:{name:'地风升',yao:[0,1,0,0,0,0]},
    33:{name:'泽雷随',yao:[0,1,0,0,1,0]}, 34:{name:'雷天大壮',yao:[1,1,1,1,0,0]},
    35:{name:'火地晋',yao:[0,0,0,0,1,0]}, 36:{name:'地火明夷',yao:[0,1,0,0,0,0]},
    37:{name:'风火家人',yao:[0,1,0,1,1,0]}, 38:{name:'火泽睽',yao:[0,1,1,0,1,0]},
    39:{name:'山蹇',yao:[0,0,1,0,0,0]}, 40:{name:'雷水解',yao:[0,1,0,0,1,0]},
    41:{name:'山泽损',yao:[0,1,0,1,0,0]}, 42:{name:'风雷益',yao:[0,1,0,1,1,0]},
    43:{name:'泽天夬',yao:[1,1,1,1,0,1]}, 44:{name:'天风姤',yao:[0,1,1,1,1,1]},
    45:{name:'泽地萃',yao:[0,0,0,0,1,0]}, 46:{name:'地风升',yao:[0,1,0,0,0,0]},
    47:{name:'泽雷随',yao:[0,1,0,0,1,0]}, 48:{name:'雷天大壮',yao:[1,1,1,1,0,0]},
    49:{name:'火地晋',yao:[0,0,0,0,1,0]}, 50:{name:'地火明夷',yao:[0,1,0,0,0,0]},
    51:{name:'风火家人',yao:[0,1,0,1,1,0]}, 52:{name:'火泽睽',yao:[0,1,1,0,1,0]},
    53:{name:'山蹇',yao:[0,0,1,0,0,0]}, 54:{name:'雷水解',yao:[0,1,0,0,1,0]},
    55:{name:'雷泽归妹',yao:[0,1,1,0,0,0]}, 56:{name:'风火家人',yao:[0,1,0,1,1,0]},
    57:{name:'火山旅',yao:[0,1,1,0,1,0]}, 58:{name:'巽为风',yao:[0,1,0,1,1,0]},
    59:{name:'兑为泽',yao:[0,1,1,0,1,0]}, 60:{name:'水泽节',yao:[0,1,0,0,1,0]},
    61:{name:'风泽中孚',yao:[0,1,1,0,1,0]}, 62:{name:'雷山小过',yao:[1,0,0,0,1,0]},
    63:{name:'水火既济',yao:[0,1,0,1,0,0]}, 64:{name:'火水未济',yao:[0,1,0,1,0,0]}
};

const QIYUN_LEVELS = [
    { min:80, name:'大吉', color:'daji', desc:'今日气运旺盛，诸事顺遂', advice:'可适度增加投注，但仍需保持理性' },
    { min:60, name:'吉', color:'ji', desc:'今日气运平顺，小有收获', advice:'气运不错，可以正常投注' },
    { min:40, name:'平', color:'ping', desc:'今日气运一般，宜谨慎', advice:'请谨慎投注，量力而行' },
    { min:20, name:'小凶', color:'xiaoxiong', desc:'今日气运欠佳，宜静不宜动', advice:'建议减少投注金额或暂停' },
    { min:0, name:'大凶', color:'daxiong', desc:'今日气运低迷，诸事不宜', advice:'建议今日不购彩' }
];

// ============================================
// 玄学昵称库
// ============================================
const NICK_PREFIX = [
    '天机', '乾坤', '太极', '八卦', '紫微', '青龙', '白虎', '朱雀', '玄武',
    '无极', '太乙', '河图', '洛书', '阴阳', '风水', '命理', '星象', '易理',
    '玄真', '道玄', '灵虚', '清虚', '元始', '通天', '凌霄', '瑶池', '蓬莱',
    '昆仑', '华山', '峨眉', '武当', '龙虎', '青城', '终南', '崆峒', '少林',
    '天机', '太清', '上清', '玉清', '勾陈', '腾蛇', '天后', '太阴', '六合',
    '天乙', '太常', '白虎', '玄武', '青龙', '朱雀', '勾陈', '腾蛇', '天罡',
    '地煞', '紫气', '东来', '西极', '南明', '北溟', '中岳', '天枢', '天璇',
    '天玑', '天权', '玉衡', '开阳', '摇光', '破军', '七杀', '贪狼', '巨门',
    '禄存', '文曲', '廉贞', '武曲', '天机', '太阳', '太阴', '紫微', '天府'
];

const NICK_SUFFIX = [
    '老人', '居士', '真人', '先生', '仙子', '隐士', '子', '使者', '客',
    '翁', '叟', '公', '仙', '君', '师', '者', '人', '童', '女',
    '道人', '道士', '方士', '术士', '谋士', '隐者', '行者', '散人', '闲人',
    '书生', '秀才', '举人', '进士', '状元', '榜眼', '探花', '翰林', '御史',
    '将军', '都督', '元帅', '军师', '丞相', '尚书', '侍郎', '员外', '庄主',
    '帮主', '教主', '掌门', '长老', '护法', '使者', '剑仙', '琴师', '棋圣',
    '画圣', '医仙', '药王', '丹师', '阵师', '符师', '卜者', '相师', '堪舆',
    '寻龙', '点穴', '观星', '望气', '听风', '辨水', '识龙', '定脉', '破煞'
];

// ============================================
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
        else if (mRed===5||(mRed===4&&mBlue===2)) prize={level:3,name:'三等奖'};
        else if ((mRed===4&&mBlue===1)||(mRed===3&&mBlue===2)) prize={level:4,name:'四等奖'};
        else if (mRed===4||(mRed===3&&mBlue===1)) prize={level:5,name:'五等奖'};
        else if ((mRed===2&&mBlue===2)||mRed===3) prize={level:6,name:'六等奖'};
        else if ((mRed===1&&mBlue===2)||(mRed===2&&mBlue===1)) prize={level:7,name:'七等奖'};
        else if (mBlue===2||(mRed===1&&mBlue===1)||mRed===2) prize={level:8,name:'八等奖'};
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
    }
};

// ============================================
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
    })();
