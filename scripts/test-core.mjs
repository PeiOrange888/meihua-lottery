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
vm.runInContext(`${configSource}\n${logicSource}\nglobalThis.__coreTest = { Core, BAGUA, WEN_WANG_64, GUA_BY_TRIGRAMS, GUA_BY_YAO, GUA_64 };`, context);

const { Core, BAGUA, WEN_WANG_64, GUA_BY_TRIGRAMS, GUA_BY_YAO, GUA_64 } = context.__coreTest;

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

console.log('Core algorithm tests passed.');
