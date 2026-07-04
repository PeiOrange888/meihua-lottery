import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const LOTTERY_API = 'https://api.huiniao.top/interface/home/lotteryHistory';
const FIREBASE_URL = 'https://meihua-abb40-default-rtdb.firebaseio.com/lottery.json';
const DATA_VERSION = 2;
const MAX_HISTORY = 120;
const DRY_RUN = process.argv.includes('--dry-run');

const TYPES = ['ssq', 'dlt'];
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

// 初始化 Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

if (!serviceAccount && !DRY_RUN) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT environment variable is required');
  process.exit(1);
}

const app = serviceAccount
  ? initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://meihua-abb40-default-rtdb.firebaseio.com'
  })
  : null;

const db = app ? getDatabase(app) : null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
      lastError = new Error(`${options?.method || 'GET'} ${url} failed: ${response.status}`);
      if (!RETRY_STATUSES.has(response.status)) throw lastError;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await sleep(attempt * 1500);
  }
  throw lastError;
}

function parseResult(type, item) {
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
}

async function getResults(type, limit = 40) {
  const data = await fetchJson(`${LOTTERY_API}?type=${type}&page=1&limit=${limit}`);
  const list = data.code === 1 && data.data?.data?.list ? data.data.data.list : [];
  return list.map(item => parseResult(type, item)).filter(Boolean);
}

function normalizeRecords(value) {
  const records = Array.isArray(value)
    ? value.filter(Boolean)
    : value && typeof value === 'object'
      ? Object.entries(value)
        .filter(([, record]) => record)
        .map(([key, record]) => typeof record === 'object' ? { key, ...record } : record)
      : [];
  return records.sort((a, b) => (a.time || a.timestamp || 0) - (b.time || b.timestamp || 0));
}

function comparePeriod(a, b) {
  const na = Number(String(a || '').replace(/\D/g, ''));
  const nb = Number(String(b || '').replace(/\D/g, ''));
  if (!na || !nb) return 0;
  return na - nb;
}

function normalizeHistory(value) {
  const groups = normalizeRecords(value).map(group => ({
    ...group,
    records: normalizeRecords(group.records)
  }));
  return groups.sort((a, b) => comparePeriod(b.period, a.period));
}

function normalizeBranch(branch = {}) {
  return {
    period: branch.period || '',
    records: normalizeRecords(branch.records),
    result: branch.result || null,
    history: normalizeHistory(branch.history)
  };
}

function keyForRecord(record, fallback) {
  return String(record.id || record.key || fallback).replace(/[.#$/[\]]/g, '_');
}

function recordsById(records = []) {
  return records.reduce((acc, record, index) => {
    if (!record) return acc;
    acc[keyForRecord(record, index)] = record;
    return acc;
  }, {});
}

function historyByPeriod(history = []) {
  return history.reduce((acc, group, index) => {
    if (!group) return acc;
    const periodKey = String(group.period || index).replace(/[.#$/[\]]/g, '_');
    acc[periodKey] = {
      ...group,
      records: recordsById(group.records || [])
    };
    return acc;
  }, {});
}

async function writeBranchUpdate(type, branch, pendingWrites, settledKeys) {
  const ref = db.ref(`lottery/${type}`);
  await ref.update({
    schemaVersion: DATA_VERSION,
    updatedAt: Date.now(),
    period: branch.period || '',
    result: branch.result || null,
    history: historyByPeriod(branch.history || [])
  });

  await Promise.all([
    ...pendingWrites.map(({ key, record }) => ref.child(`records/${key}`).set(record)),
    ...settledKeys.map(key => ref.child(`records/${key}`).remove())
  ]);
}

function matchSSQ(rec, res) {
  if (!res || !rec) return null;
  const red = Array.isArray(rec.red) ? rec.red : Array.isArray(rec.redBalls) ? rec.redBalls : [];
  const blue = Array.isArray(rec.blue) ? rec.blue : Array.isArray(rec.blueBalls) ? rec.blueBalls : [];
  const mRed = red.filter(r => res.red.includes(r)).length;
  const mBlue = blue[0] === res.blue[0] ? 1 : 0;
  let prize = null;
  if (mRed === 6 && mBlue === 1) prize = { level: 1, name: '一等奖' };
  else if (mRed === 6) prize = { level: 2, name: '二等奖' };
  else if (mRed === 5 && mBlue === 1) prize = { level: 3, name: '三等奖' };
  else if (mRed === 5 || (mRed === 4 && mBlue === 1)) prize = { level: 4, name: '四等奖' };
  else if (mRed === 4 || (mRed === 3 && mBlue === 1)) prize = { level: 5, name: '五等奖' };
  else if (mBlue === 1) prize = { level: 6, name: '六等奖' };
  return { mRed, mBlue, prize };
}

function matchDLT(rec, res) {
  if (!res || !rec) return null;
  const red = Array.isArray(rec.red) ? rec.red : Array.isArray(rec.redBalls) ? rec.redBalls : [];
  const blue = Array.isArray(rec.blue) ? rec.blue : Array.isArray(rec.blueBalls) ? rec.blueBalls : [];
  const mRed = red.filter(r => res.red.includes(r)).length;
  const mBlue = blue.filter(b => res.blue.includes(b)).length;
  let prize = null;
  if (mRed === 5 && mBlue === 2) prize = { level: 1, name: '一等奖' };
  else if (mRed === 5 && mBlue === 1) prize = { level: 2, name: '二等奖' };
  else if (mRed === 5) prize = { level: 3, name: '三等奖' };
  else if (mRed === 4 && mBlue === 2) prize = { level: 4, name: '四等奖' };
  else if (mRed === 4 && mBlue === 1) prize = { level: 5, name: '五等奖' };
  else if (mRed === 3 && mBlue === 2) prize = { level: 6, name: '六等奖' };
  else if (mRed === 4) prize = { level: 7, name: '七等奖' };
  else if ((mRed === 3 && mBlue === 1) || (mRed === 2 && mBlue === 2)) prize = { level: 8, name: '八等奖' };
  else if ((mRed === 3 && mBlue === 0) || (mRed === 1 && mBlue === 2) || (mRed === 2 && mBlue === 1) || (mRed === 0 && mBlue === 2)) prize = { level: 9, name: '九等奖' };
  return { mRed, mBlue, prize };
}

function matchRecord(type, record, result) {
  return type === 'ssq' ? matchSSQ(record, result) : matchDLT(record, result);
}

function sameMatch(a, b) {
  return (a?.mRed || 0) === (b?.mRed || 0)
    && (a?.mBlue || 0) === (b?.mBlue || 0)
    && (a?.prize?.level || null) === (b?.prize?.level || null)
    && (a?.prize?.name || null) === (b?.prize?.name || null);
}

function refreshHistory(branch, type, resultsByPeriod) {
  let refreshed = 0;
  branch.history = branch.history.map(group => {
    const result = resultsByPeriod[group.period] || group.result;
    if (result?.period && result.period !== group.result?.period) refreshed++;
    const records = (group.records || []).map(record => {
      const match = matchRecord(type, record, result);
      if (!match) return record;
      const current = record.match || record.matchResult;
      if (!sameMatch(current, match)) refreshed++;
      return { ...record, match };
    });
    return { ...group, result, records };
  });
  return refreshed;
}

function mergeHistory(branch, group) {
  const existing = branch.history.find(h => h.period === group.period);
  if (existing) {
    existing.result = group.result;
    const ids = new Set((existing.records || []).map(r => r.id));
    group.records.forEach(record => {
      if (!ids.has(record.id)) existing.records.push(record);
    });
  } else {
    branch.history.unshift(group);
  }
  branch.history.sort((a, b) => comparePeriod(b.period, a.period));
  if (branch.history.length > MAX_HISTORY) branch.history.length = MAX_HISTORY;
}

async function settleType(dbSnapshot, type) {
  const branch = normalizeBranch(dbSnapshot[type]);
  const previousPeriod = branch.period;
  const results = await getResults(type, 40);
  const latest = results[0];
  if (!latest) return { type, settled: 0, pending: branch.records.length, changed: false };

  branch.period = latest.nextPeriod || branch.period || latest.period;
  branch.result = latest;

  const resultsByPeriod = {};
  results.forEach(result => { resultsByPeriod[result.period] = result; });

  const pending = [];
  const pendingWrites = [];
  const settledKeys = [];
  const groups = {};
  branch.records.forEach((record, index) => {
    const recordPeriod = record.period || previousPeriod || branch.period;
    const normalized = { ...record, period: recordPeriod, status: record.status || 'pending' };
    const recordKey = keyForRecord(normalized, index);
    const result = resultsByPeriod[recordPeriod];
    if (result && comparePeriod(recordPeriod, latest.period) <= 0) {
      const match = type === 'ssq' ? matchSSQ(normalized, result) : matchDLT(normalized, result);
      const settled = { ...normalized, status: 'settled', match };
      if (!groups[recordPeriod]) groups[recordPeriod] = { period: recordPeriod, records: [], result };
      groups[recordPeriod].records.push(settled);
      settledKeys.push(recordKey);
    } else {
      pending.push(normalized);
      pendingWrites.push({ key: recordKey, record: normalized });
    }
  });

  Object.values(groups).forEach(group => mergeHistory(branch, group));
  const settled = Object.values(groups).reduce((sum, group) => sum + group.records.length, 0);
  branch.records = pending;
  const refreshed = refreshHistory(branch, type, resultsByPeriod);

  if (!DRY_RUN) {
    await writeBranchUpdate(type, branch, pendingWrites, settledKeys);
  }

  return { type, settled, refreshed, pending: pending.length, changed: settled > 0 || refreshed > 0 };
}

async function main() {
  // 读取当前数据
  const dbData = db
    ? (await db.ref('lottery').once('value')).val() || {}
    : await fetchJson(FIREBASE_URL);

  const results = [];
  for (const type of TYPES) {
    results.push(await settleType(dbData, type));
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, results }, null, 2));

  // 关闭连接
  if (app) {
    await deleteApp(app);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
