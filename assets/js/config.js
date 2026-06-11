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
const BAGUA = {
    1:{name:'乾', symbol:'☰', yao:[1,1,1], wuxing:'金'},
    2:{name:'兑', symbol:'☱', yao:[1,1,0], wuxing:'金'},
    3:{name:'离', symbol:'☲', yao:[1,0,1], wuxing:'火'},
    4:{name:'震', symbol:'☳', yao:[1,0,0], wuxing:'木'},
    5:{name:'巽', symbol:'☴', yao:[0,1,1], wuxing:'木'},
    6:{name:'坎', symbol:'☵', yao:[0,1,0], wuxing:'水'},
    7:{name:'艮', symbol:'☶', yao:[0,0,1], wuxing:'土'},
    8:{name:'坤', symbol:'☷', yao:[0,0,0], wuxing:'土'}
};

const WUXING = Object.fromEntries(Object.entries(BAGUA).map(([num, gua]) => [num, gua.wuxing]));
const SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };
const KE = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
const TRI_TO_NUM = Object.fromEntries(Object.entries(BAGUA).map(([num, gua]) => [gua.yao.join(''), Number(num)]));

const WEN_WANG_64 = [
    {seq:1,name:'乾为天',upper:1,lower:1}, {seq:2,name:'坤为地',upper:8,lower:8},
    {seq:3,name:'水雷屯',upper:6,lower:4}, {seq:4,name:'山水蒙',upper:7,lower:6},
    {seq:5,name:'水天需',upper:6,lower:1}, {seq:6,name:'天水讼',upper:1,lower:6},
    {seq:7,name:'地水师',upper:8,lower:6}, {seq:8,name:'水地比',upper:6,lower:8},
    {seq:9,name:'风天小畜',upper:5,lower:1}, {seq:10,name:'天泽履',upper:1,lower:2},
    {seq:11,name:'地天泰',upper:8,lower:1}, {seq:12,name:'天地否',upper:1,lower:8},
    {seq:13,name:'天火同人',upper:1,lower:3}, {seq:14,name:'火天大有',upper:3,lower:1},
    {seq:15,name:'地山谦',upper:8,lower:7}, {seq:16,name:'雷地豫',upper:4,lower:8},
    {seq:17,name:'泽雷随',upper:2,lower:4}, {seq:18,name:'山风蛊',upper:7,lower:5},
    {seq:19,name:'地泽临',upper:8,lower:2}, {seq:20,name:'风地观',upper:5,lower:8},
    {seq:21,name:'火雷噬嗑',upper:3,lower:4}, {seq:22,name:'山火贲',upper:7,lower:3},
    {seq:23,name:'山地剥',upper:7,lower:8}, {seq:24,name:'地雷复',upper:8,lower:4},
    {seq:25,name:'天雷无妄',upper:1,lower:4}, {seq:26,name:'山天大畜',upper:7,lower:1},
    {seq:27,name:'山雷颐',upper:7,lower:4}, {seq:28,name:'泽风大过',upper:2,lower:5},
    {seq:29,name:'坎为水',upper:6,lower:6}, {seq:30,name:'离为火',upper:3,lower:3},
    {seq:31,name:'泽山咸',upper:2,lower:7}, {seq:32,name:'雷风恒',upper:4,lower:5},
    {seq:33,name:'天山遁',upper:1,lower:7}, {seq:34,name:'雷天大壮',upper:4,lower:1},
    {seq:35,name:'火地晋',upper:3,lower:8}, {seq:36,name:'地火明夷',upper:8,lower:3},
    {seq:37,name:'风火家人',upper:5,lower:3}, {seq:38,name:'火泽睽',upper:3,lower:2},
    {seq:39,name:'水山蹇',upper:6,lower:7}, {seq:40,name:'雷水解',upper:4,lower:6},
    {seq:41,name:'山泽损',upper:7,lower:2}, {seq:42,name:'风雷益',upper:5,lower:4},
    {seq:43,name:'泽天夬',upper:2,lower:1}, {seq:44,name:'天风姤',upper:1,lower:5},
    {seq:45,name:'泽地萃',upper:2,lower:8}, {seq:46,name:'地风升',upper:8,lower:5},
    {seq:47,name:'泽水困',upper:2,lower:6}, {seq:48,name:'水风井',upper:6,lower:5},
    {seq:49,name:'泽火革',upper:2,lower:3}, {seq:50,name:'火风鼎',upper:3,lower:5},
    {seq:51,name:'震为雷',upper:4,lower:4}, {seq:52,name:'艮为山',upper:7,lower:7},
    {seq:53,name:'风山渐',upper:5,lower:7}, {seq:54,name:'雷泽归妹',upper:4,lower:2},
    {seq:55,name:'雷火丰',upper:4,lower:3}, {seq:56,name:'火山旅',upper:3,lower:7},
    {seq:57,name:'巽为风',upper:5,lower:5}, {seq:58,name:'兑为泽',upper:2,lower:2},
    {seq:59,name:'风水涣',upper:5,lower:6}, {seq:60,name:'水泽节',upper:6,lower:2},
    {seq:61,name:'风泽中孚',upper:5,lower:2}, {seq:62,name:'雷山小过',upper:4,lower:7},
    {seq:63,name:'水火既济',upper:6,lower:3}, {seq:64,name:'火水未济',upper:3,lower:6}
].map(gua => ({
    ...gua,
    yao: [...BAGUA[gua.lower].yao, ...BAGUA[gua.upper].yao],
    upperName: BAGUA[gua.upper].name,
    lowerName: BAGUA[gua.lower].name
}));

const GUA_BY_TRIGRAMS = Object.fromEntries(WEN_WANG_64.map(gua => [`${gua.upper}-${gua.lower}`, gua]));
const GUA_BY_YAO = Object.fromEntries(WEN_WANG_64.map(gua => [gua.yao.join(''), gua]));
const GUA_64 = Object.fromEntries(WEN_WANG_64.map(gua => [gua.seq, gua]));

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
