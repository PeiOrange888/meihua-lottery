import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUTPUT_DIR = path.resolve('tmp/visual-check');
const TARGET = './index.html';

const WAIT = "then(()=>new Promise(resolve=>setTimeout(resolve,800)))";
const SSQ_DETAIL_SCRIPT = `Promise.resolve().then(()=>document.querySelector("#btn-ssq").click()).${WAIT}.then(()=>document.querySelector("#ssq-detail").previousElementSibling.click()).then(()=>true)`;
const DLT_DETAIL_SCRIPT = `Promise.resolve().then(()=>document.querySelector("#btn-dlt").click()).${WAIT}.then(()=>document.querySelector("#dlt-detail").previousElementSibling.click()).then(()=>true)`;
const EXPANDED_LISTS_SCRIPT = `Promise.resolve().${WAIT}.then(()=>document.querySelectorAll("[data-list-toggle]").forEach(button=>button.click())).then(()=>true)`;

const CASES = [
  {
    name: 'desktop-home',
    args: ['screenshot', TARGET, path.join(OUTPUT_DIR, 'desktop-home.png'), '--width', '1200', '--height', '900', '--wait', '1200']
  },
  {
    name: 'desktop-ssq',
    args: ['clickshot', TARGET, '#btn-ssq', path.join(OUTPUT_DIR, 'desktop-ssq.png'), '--width', '1200', '--height', '1100', '--wait', '1200', '--wait-after', '900']
  },
  {
    name: 'desktop-dlt',
    args: ['clickshot', TARGET, '#btn-dlt', path.join(OUTPUT_DIR, 'desktop-dlt.png'), '--width', '1200', '--height', '1100', '--wait', '1200', '--wait-after', '900']
  },
  {
    name: 'mobile-home',
    args: ['screenshot', TARGET, path.join(OUTPUT_DIR, 'mobile-home.png'), '--width', '390', '--height', '900', '--wait', '1200']
  },
  {
    name: 'desktop-ssq-detail',
    args: ['scriptshot', TARGET, SSQ_DETAIL_SCRIPT, path.join(OUTPUT_DIR, 'desktop-ssq-detail.png'), '--width', '1200', '--height', '1100', '--wait', '1200', '--wait-after', '700']
  },
  {
    name: 'desktop-dlt-detail',
    args: ['scriptshot', TARGET, DLT_DETAIL_SCRIPT, path.join(OUTPUT_DIR, 'desktop-dlt-detail.png'), '--width', '1200', '--height', '1100', '--wait', '1200', '--wait-after', '700']
  },
  {
    name: 'desktop-expanded-lists',
    args: ['scriptshot', TARGET, EXPANDED_LISTS_SCRIPT, path.join(OUTPUT_DIR, 'desktop-expanded-lists.png'), '--width', '1200', '--height', '1100', '--wait', '1500', '--wait-after', '700']
  }
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} ${args.join(' ')} failed with ${code}\n${stderr || stdout}`));
    });
  });
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const item of CASES) {
    const output = await run('codex-browser', item.args);
    results.push({ name: item.name, output });
    console.log(`${item.name}: ${output}`);
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), target: TARGET, results }, null, 2)}\n`
  );
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
