import fs from 'node:fs';
import vm from 'node:vm';

const configSource = fs.readFileSync('assets/js/config.js', 'utf8');
const logicSource = fs.readFileSync('assets/js/logic.js', 'utf8');

const context = {
  console,
  Date,
  Intl,
  Store: {
    data: {
      ssq: { history: [] },
      dlt: { history: [] }
    }
  }
};

vm.createContext(context);
vm.runInContext(`${configSource}\n${logicSource}\nglobalThis.__coreTest = { Api, Core, BAGUA, WEN_WANG_64, GUA_BY_TRIGRAMS, GUA_BY_YAO, GUA_64 };`, context);

const { Api, Core, BAGUA, WEN_WANG_64, GUA_BY_TRIGRAMS, GUA_BY_YAO, GUA_64 } = context.__coreTest;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function inRange(values, min, max) {
  return values.every(value => Number.isInteger(value) && value >= min && value <= max);
}

assert(!logicSource.includes('Math.random'), 'Core logic must not use Math.random');
assert(WEN_WANG_64.length === 64, 'Wen Wang table must contain 64 hexagrams');
assert(unique(WEN_WANG_64.map(gua => gua.seq)), 'Hexagram sequences must be unique');
assert(unique(WEN_WANG_64.map(gua => gua.name)), 'Hexagram names must be unique');
assert(unique(WEN_WANG_64.map(gua => gua.yao.join(''))), 'Hexagram yao structures must be unique');

for (const gua of WEN_WANG_64) {
  const expectedYao = [...BAGUA[gua.lower].yao, ...BAGUA[gua.upper].yao].join('');
  assert(gua.yao.join('') === expectedYao, `${gua.name} yao structure mismatch`);
  assert(GUA_BY_TRIGRAMS[`${gua.upper}-${gua.lower}`] === gua, `${gua.name} trigram lookup mismatch`);
  assert(GUA_BY_YAO[gua.yao.join('')] === gua, `${gua.name} yao lookup mismatch`);
  assert(GUA_64[gua.seq] === gua, `${gua.name} sequence lookup mismatch`);
}

assert(GUA_BY_TRIGRAMS['1-1'].name === '乾为天', 'Known gua 1/1 mismatch');
assert(GUA_BY_TRIGRAMS['8-8'].name === '坤为地', 'Known gua 8/8 mismatch');
assert(GUA_BY_TRIGRAMS['6-4'].name === '水雷屯', 'Known gua 6/4 mismatch');
assert(GUA_BY_TRIGRAMS['3-6'].name === '火水未济', 'Known gua 3/6 mismatch');

assert(Core.matchSSQ(
  { red: [1, 2, 3, 4, 5, 6], blue: [7] },
  { red: [8, 9, 10, 11, 12, 13], blue: [7] }
).prize.name === '六等奖', 'SSQ blue-only match must be sixth prize');

assert(Core.matchDLT(
  { red: [1, 2, 3, 4, 5], blue: [1, 2] },
  { red: [1, 8, 9, 10, 11], blue: [1, 12] }
).prize === null, 'DLT 1+1 must not be a prize');

assert(Core.matchDLT(
  { red: [1, 2, 3, 4, 5], blue: [1, 2] },
  { red: [1, 2, 3, 10, 11], blue: [1, 2] }
).prize.name === '六等奖', 'DLT 3+2 must be sixth prize');

const fixed = Core.calcGua(new Date('2026-06-11T12:34:56+08:00'));
assert(fixed.lunarText === '2026年四月26', 'Fixed date lunar conversion mismatch');
assert(fixed.benGua.name === '风雷益', 'Fixed date ben gua mismatch');
assert(fixed.bianGua.name === '风泽中孚', 'Fixed date bian gua mismatch');
assert(fixed.huGua.name === '山地剥', 'Fixed date hu gua mismatch');

for (let i = 0; i < 72; i++) {
  const date = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + i * 11 * 60 * 60 * 1000);
  const gua = Core.calcGua(date);
  const first = Core.genLottery(gua);
  const second = Core.genLottery(gua);
  const reading = Core.calcGuaReading(gua);

  assert(JSON.stringify(first) === JSON.stringify(second), 'Lottery generation must be deterministic');
  assert(!('relationCoeff' in first.trace) && !('relationBias' in first.trace), 'Lottery trace must not depend on qi yun coefficients');
  assert(first.red.length === 6 && unique(first.red) && inRange(first.red, 1, 33), 'SSQ red balls invalid');
  assert(inRange([first.blue], 1, 16), 'SSQ blue ball invalid');
  assert(first.front.length === 5 && unique(first.front) && inRange(first.front, 1, 35), 'DLT front balls invalid');
  assert(first.back.length === 2 && unique(first.back) && inRange(first.back, 1, 12), 'DLT back balls invalid');
  assert(Number.isInteger(reading.score) && reading.score >= 0 && reading.score <= 100, 'Gua reading score invalid');
  assert(reading.level && reading.summary && reading.factors.length === 3, 'Gua reading structure invalid');
}

context.Store.data.dlt = {
  period: '26069',
  result: { period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' },
  records: [
    { id: 'pending-26067', period: '26067', status: 'pending', red: [1, 2, 3, 4, 5], blue: [1, 2], time: 1 },
    { id: 'pending-26069', period: '26069', status: 'pending', red: [6, 7, 8, 9, 10], blue: [5, 6], time: 2 }
  ],
  history: [
    {
      period: '26066',
      result: { period: '26065', red: [31, 32, 33, 34, 35], blue: [11, 12], date: 'wrong' },
      records: [
        { id: 'old-26066', period: '26066', status: 'settled', red: [1, 2, 3, 4, 5], blue: [1, 2], time: 3, match: { mRed: 0, mBlue: 0, prize: null } }
      ]
    }
  ]
};
context.Store.scheduleSave = type => { context.Store.lastSavedType = type; };

Api.getLatest = async () => ({ period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' });
Api.getPeriod = async () => '26069';
Api.getResults = async () => [
  { period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' },
  { period: '26067', nextPeriod: '26068', red: [1, 2, 3, 10, 11], blue: [1, 2], date: '2026-06-18' },
  { period: '26066', nextPeriod: '26067', red: [1, 2, 10, 11, 12], blue: [1, 9], date: '2026-06-16' }
];

await Core.checkPeriod('dlt');

assert(context.Store.data.dlt.records.length === 1, 'Settled DLT records must be removed from pending records');
assert(context.Store.data.dlt.records[0].period === '26069', 'Future DLT records must remain pending');
const settledGroup = context.Store.data.dlt.history.find(group => group.period === '26067');
assert(settledGroup, 'Settled DLT period must be added to history');
assert(settledGroup.records[0].match.prize.name === '六等奖', 'Settled DLT 3+2 record must be sixth prize');
const repairedGroup = context.Store.data.dlt.history.find(group => group.period === '26066');
assert(repairedGroup.result.period === '26066', 'Existing history group result must match its own period');
assert(repairedGroup.records[0].match.mRed === 2 && repairedGroup.records[0].match.mBlue === 1, 'Existing history matches must be recalculated after result repair');

console.log('Core algorithm tests passed.');
