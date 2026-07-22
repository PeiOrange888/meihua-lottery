import fs from 'node:fs';
import vm from 'node:vm';

const configSource = fs.readFileSync('assets/js/config.js', 'utf8');
const logicSource = fs.readFileSync('assets/js/logic.js', 'utf8');
const dataSource = fs.readFileSync('assets/js/data.js', 'utf8');
const appSource = fs.readFileSync('assets/js/app.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

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

assert(indexSource.includes('历史预测'), 'Page must label settled prediction section as 历史预测');
assert(!indexSource.includes('结算明细'), 'Page must not show the old 结算明细 label');
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
const fixedLottery = Core.genLottery(fixed);
assert(
  JSON.stringify({ red: fixedLottery.red, blue: fixedLottery.blue, front: fixedLottery.front, back: fixedLottery.back })
    === JSON.stringify({ red: [1, 13, 24, 26, 29, 33], blue: 4, front: [2, 4, 6, 12, 31], back: [2, 10] }),
  'Deterministic shuffle golden vector changed without an algorithm version update'
);

for (let i = 0; i < 72; i++) {
  const date = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + i * 11 * 60 * 60 * 1000);
  const gua = Core.calcGua(date);
  const first = Core.genLottery(gua);
  const second = Core.genLottery(gua);
  const reading = Core.calcGuaReading(gua);

  assert(JSON.stringify(first) === JSON.stringify(second), 'Lottery generation must be deterministic');
  assert(first.trace.algorithm === 'deterministic-shuffle-v1', 'Lottery generation must use deterministic pool shuffling');
  assert(!('relationCoeff' in first.trace) && !('relationBias' in first.trace), 'Lottery trace must not depend on qi yun coefficients');
  assert(first.red.length === 6 && unique(first.red) && inRange(first.red, 1, 33), 'SSQ red balls invalid');
  assert(inRange([first.blue], 1, 16), 'SSQ blue ball invalid');
  assert(first.front.length === 5 && unique(first.front) && inRange(first.front, 1, 35), 'DLT front balls invalid');
  assert(first.back.length === 2 && unique(first.back) && inRange(first.back, 1, 12), 'DLT back balls invalid');
  assert(Number.isInteger(reading.score) && reading.score >= 0 && reading.score <= 100, 'Gua reading score invalid');
  assert(reading.level && reading.summary && reading.factors.length === 3, 'Gua reading structure invalid');
}

for (const { domain, max, count } of [
  { domain: 'ssq:red', max: 33, count: 6 },
  { domain: 'ssq:blue', max: 16, count: 1 },
  { domain: 'dlt:front', max: 35, count: 5 },
  { domain: 'dlt:back', max: 12, count: 2 }
]) {
  const occurrences = Array(max + 1).fill(0);
  for (let seedIndex = 0; seedIndex < 4096; seedIndex++) {
    const first = Core.seededSelection(`distribution-${seedIndex}`, domain, max, count);
    const second = Core.seededSelection(`distribution-${seedIndex}`, domain, max, count);
    assert(JSON.stringify(first) === JSON.stringify(second), `${domain} selection must be deterministic`);
    assert(first.values.length === count && unique(first.values), `${domain} selection must be unique`);
    assert(inRange(first.values, 1, max), `${domain} selection must stay in range`);
    first.values.forEach(value => occurrences[value]++);
  }
  const usedCounts = occurrences.slice(1);
  assert(usedCounts.every(Boolean), `${domain} selection must cover its complete number pool`);
  assert(Math.max(...usedCounts) / Math.min(...usedCounts) < 1.2, `${domain} selection distribution is excessively skewed`);
}

const sharedSeed = 'same-gua-seed';
assert(
  JSON.stringify(Core.seededSelection(sharedSeed, 'ssq:red', 33, 6).values)
    !== JSON.stringify(Core.seededSelection(sharedSeed, 'dlt:front', 33, 6).values),
  'Lottery pools must use independent domain seeds'
);

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

function createStoreTestContext(fetchImpl, storage = new Map()) {
  const timers = [];
  const storeContext = {
    console,
    Date,
    Intl,
    fetch: fetchImpl,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    setTimeout: fn => { timers.push(fn); return timers.length; },
    clearTimeout: () => {}
  };
  vm.createContext(storeContext);
  vm.runInContext(`${configSource}\n${logicSource}\n${dataSource}\nglobalThis.__storeTest = { Store, User };`, storeContext);
  return storeContext.__storeTest;
}

function createAppTestContext() {
  const elements = new Map();
  const storage = new Map();
  const element = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: '',
        innerHTML: '',
        disabled: false,
        dataset: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
          contains() { return false; }
        },
        appendChild() {},
        addEventListener() {},
        closest() { return null; },
        previousElementSibling: { textContent: '' }
      });
    }
    return elements.get(id);
  };
  const appContext = {
    console,
    Date,
    Intl,
    fetch: async () => ({ ok: true, json: async () => null }),
    location: { protocol: 'https:' },
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
      key: index => Array.from(storage.keys())[index] || null,
      get length() { return storage.size; }
    },
    setInterval: () => 1,
    setTimeout: fn => {
      fn();
      return 1;
    },
    clearTimeout: () => {},
    document: {
      head: element('head'),
      createElement: tag => element(tag),
      getElementById: element,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    window: {}
  };
  appContext.UI = {
    setCount() {},
    setPeriod() {},
    renderRecords() {},
    renderLotteryResult() {},
    setLoading() {},
    setTime() {},
    renderResult() {},
    showToast() {},
    $: element
  };
  vm.createContext(appContext);
  vm.runInContext(`${configSource}\n${logicSource}\n${dataSource}\n${appSource}\nglobalThis.__appTest = { App, Api, Store, UI, SiteStats, localStorage };`, appContext);
  return appContext.__appTest;
}

{
  const writes = [];
  const { Store } = createStoreTestContext(async (url, options = {}) => {
    writes.push({ url, options });
    return {
      ok: true,
      json: async () => ({ name: 'firebase-generated-record-key' })
    };
  });
  const record = {
    id: 'p_test_record',
    time: 1,
    user: { id: 'u1', nickname: '测试居士' },
    period: '2026066',
    status: 'pending',
    red: [1, 2, 3, 4, 5, 6],
    blue: [7]
  };

  Store.addRecord('ssq', record);
  await Store.save();

  assert(writes.length === 2, 'Adding one record must persist the record and refresh the shared count');
  const atomicWrite = writes.find(write => write.url.endsWith('/lottery.json') && write.options.method === 'PATCH');
  const countRead = writes.find(write => write.url.endsWith('/lottery/qigua_count.json') && !write.options?.method);
  assert(atomicWrite, 'Predictions and count must use one atomic Firebase update');
  const updates = JSON.parse(atomicWrite.options.body);
  assert(updates['ssq/records/p_test_record']?.id === 'p_test_record', 'Atomic update must contain the prediction record');
  assert(updates.qigua_count?.['.sv']?.increment === 1, 'Atomic update must increment the shared count');
  assert(countRead, 'Successful persistence must refresh the displayed count');
  assert(!writes.some(write => write.url.endsWith('/lottery/ssq.json')), 'Predictions must not replace the whole lottery type branch');
}

{
  const { Store } = createStoreTestContext(async () => ({
    ok: true,
    json: async () => ({
      qigua_count: 1,
      ssq: {
        records: {
          r1: { id: 'r1', time: 1 }
        },
        history: {
          '2026065': {
            period: '2026065',
            records: {
              h1: { id: 'h1', time: 2 },
              h2: { id: 'h2', time: 3 }
            }
          }
        }
      },
      dlt: {
        records: {
          r2: { id: 'r2', time: 4 }
        },
        history: {}
      }
    })
  }));

  await Store.load();

  assert(Store.data.qiguaCount === 4, 'Qigua count must be derived from stored prediction records');
}

console.log('Store persistence tests passed.');

{
  const storage = new Map();
  let allowWrite = false;
  const record = {
    id: 'p_outbox_record',
    time: 1,
    user: { id: 'u1', nickname: '测试居士' },
    period: '2026066',
    status: 'pending',
    red: [1, 2, 3, 4, 5, 6],
    blue: [7]
  };
  const { Store } = createStoreTestContext(async (url, options = {}) => {
    if (options.method === 'PATCH' && !allowWrite) return { ok: false, status: 503, json: async () => null };
    if (options.method === 'PATCH') return { ok: true, json: async () => null };
    return { ok: false, status: 503, json: async () => null };
  }, storage);
  Store.addRecord('ssq', record);
  await Store.save();
  assert(Store.pendingRecords.length === 1, 'Failed atomic writes must remain pending');
  assert(storage.get('meihua_prediction_outbox_v1').includes('p_outbox_record'), 'Pending records must survive in the local outbox');

  const restored = createStoreTestContext(async () => ({ ok: true, json: async () => null }), storage).Store;
  await restored.load();
  assert(restored.pendingRecords[0]?.record.id === 'p_outbox_record', 'Pending outbox records must restore after reload');
  allowWrite = true;
  await restored.save();
  assert(restored.pendingRecords.length === 0, 'Restored records must clear from the outbox after a successful retry');
}

console.log('Store outbox recovery tests passed.');

{
  const { SiteStats } = createAppTestContext();
  const [pageViews, visitors] = SiteStats.elements();
  SiteStats.finish();
  assert(pageViews.textContent === '--' && visitors.textContent === '--', 'Unavailable visitor statistics must not display a false zero');
  assert(pageViews.dataset.statsState === 'unavailable', 'Unavailable visitor statistics must expose a fallback state');

  pageViews.textContent = '1,234';
  visitors.textContent = '456';
  SiteStats.finish();
  assert(pageViews.dataset.statsState === 'ready', 'Loaded visitor statistics must expose a ready state');
}

console.log('Site statistics fallback tests passed.');

{
  const { App, Api, Store, UI } = createAppTestContext();
  const rendered = [];
  Store.data.dlt = {
    period: '26069',
    result: { period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' },
    records: [
      { id: 'pending-26068', period: '26068', status: 'pending', red: [7, 8, 9, 10, 11], blue: [3, 4], time: 1 },
      { id: 'pending-26069', period: '26069', status: 'pending', red: [6, 7, 8, 9, 10], blue: [5, 6], time: 2 }
    ],
    history: []
  };
  Store.scheduleSave = () => {};
  UI.renderRecords = type => rendered.push(type);
  Api.getLatest = async () => ({ period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' });
  Api.getPeriod = async () => '26069';
  Api.getResult = async () => ({ period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' });
  Api.getResults = async () => [
    { period: '26068', nextPeriod: '26069', red: [7, 8, 9, 10, 11], blue: [3, 4], date: '2026-06-20' }
  ];

  await App._updateLottery('dlt');

  assert(Store.data.dlt.records.length === 1, 'App lottery refresh must settle closed pending records locally');
  assert(Store.data.dlt.records[0].period === '26069', 'App lottery refresh must keep current-period pending records');
  const settledGroup = Store.data.dlt.history.find(group => group.period === '26068');
  assert(settledGroup?.records[0]?.status === 'settled', 'App lottery refresh must expose settled records in history');
  assert(rendered.includes('dlt'), 'App lottery refresh must render updated records after settlement');
}

console.log('App refresh settlement tests passed.');

{
  const { App, localStorage } = createAppTestContext();
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const key = `shichen_ssq_${App._getShichenKey(now)}`;
  localStorage.setItem(key, JSON.stringify({ timestamp: now.getTime(), gua: {}, lottery: {} }));
  assert(App._checkShichenCache('ssq', now) === null, 'Unversioned lottery cache must be invalidated');
  assert(localStorage.getItem(key) === null, 'Invalid lottery cache must be removed');

  App._saveShichenCache('ssq', now, { benXu: 1 }, { red: [1, 2, 3, 4, 5, 6], blue: 7 });
  const cached = App._checkShichenCache('ssq', now);
  assert(cached?.gua?.benXu === 1, 'Current algorithm cache must remain reusable within the shichen');
}

console.log('App algorithm cache tests passed.');

{
  const { App, Store, UI } = createAppTestContext();
  const addedRecords = [];
  const counts = [];
  const toasts = [];

  Store.data.ssq = { period: '2026070', records: [], result: null, history: [] };
  Store.data.qiguaCount = 0;
  Store.addRecord = (type, record) => {
    Store.data[type].records.push(record);
    addedRecords.push({ type, record });
  };
  UI.setCount = count => counts.push(`render:${count}`);
  UI.renderRecords = () => {};
  UI.setTime = () => {};
  UI.renderResult = () => {};
  UI.showToast = message => toasts.push(message);

  await App.doQiGua('ssq');
  await App.doQiGua('ssq');

  assert(addedRecords.length === 1, 'Same shichen repeat prediction must not add duplicate records');
  assert(Store.data.qiguaCount === 0, 'Same shichen repeat prediction must not increment an unsaved qigua count');
  assert(toasts.includes('本时辰已起卦，卦象相同'), 'Same shichen repeat prediction must show cached-result toast');
}

console.log('App shichen cache tests passed.');
