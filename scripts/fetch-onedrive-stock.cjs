#!/usr/bin/env node
/**
 * fetch-onedrive-stock.cjs — pulls the NEWEST "StockReport*.xlsx" from the shop's OneDrive
 * month folder, saves it in downloads/, and rebuilds data/stock.json from it.
 *
 * Needs the OneDrive connector (abacus-connectors_OneDrive_Tool). This script is normally
 * driven by the agent (see README), which downloads the file through the connector and then
 * runs scripts/build-stock-json.cjs on it. Run it on its own only when a fresh file is
 * already sitting in downloads/.
 *
 * Month folder ids live in MONTH_FOLDERS; add the new year's ids each January.
 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MONTH_FOLDERS = {
  jan: 'D81E6B3F304E5BE8!sf53ac1c4911b4a439f7ee3b34935becd',
  feb: 'D81E6B3F304E5BE8!s7a56ad2f6d7c4742893bd72a362ca119',
  march: 'D81E6B3F304E5BE8!s31ea5efe5795490f91009b2290d746c4',
  apr: 'D81E6B3F304E5BE8!s5280e04b6da747a3ae2d39d7eb10db0c',
  may: 'D81E6B3F304E5BE8!se4bb583146274459b32daf97d006a41f',
  june: 'D81E6B3F304E5BE8!sde1587ae10164283971e0349e781ffcf',
  july: 'D81E6B3F304E5BE8!s971c94035e394d90b2973077caa0bd4f',
  august: 'D81E6B3F304E5BE8!s930959b0038b4de79e879e59bd7cfff0',
  sep: 'D81E6B3F304E5BE8!sc8a1903d26694af9b2cdce46fcf26ddb',
  oct: 'D81E6B3F304E5BE8!s8f3e9212c0a54c0b8bc4109cecba44f6',
  nov: 'D81E6B3F304E5BE8!s3fb0416c8f134f7c8f10c1c3e339c461',
};

const dl = path.join(ROOT, 'downloads');
fs.mkdirSync(dl, { recursive: true });
const files = fs.readdirSync(dl)
  .filter(f => /^StockReport.*\.xlsx$/i.test(f) && !f.startsWith('~$'))
  .map(f => ({ f, m: fs.statSync(path.join(dl, f)).mtimeMs }))
  .sort((a, b) => b.m - a.m);
if (!files.length) { console.error('No StockReport*.xlsx in downloads/. Download the newest report through the OneDrive connector first.'); process.exit(2); }
const newest = files[0].f;
console.log('Newest report:', newest);
execFileSync(process.execPath, [path.join(__dirname, 'build-stock-json.cjs'), path.join(dl, newest)], { stdio: 'inherit' });
