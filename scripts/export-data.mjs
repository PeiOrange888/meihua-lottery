import fs from 'node:fs/promises';
import path from 'node:path';

const FIREBASE_URL = 'https://meihua-abb40-default-rtdb.firebaseio.com/lottery.json';
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`Export failed: ${response.status}`);
      if (!RETRY_STATUSES.has(response.status)) throw lastError;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await sleep(attempt * 1500);
  }
  throw lastError;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

async function main() {
  const response = await fetchWithRetry(FIREBASE_URL);
  const data = await response.json();
  const backupDir = path.resolve('backups');
  const backupPath = path.join(backupDir, `lottery-${timestamp()}.json`);

  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(backupPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(`Exported Firebase data to ${backupPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
