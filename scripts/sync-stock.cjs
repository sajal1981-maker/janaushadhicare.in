#!/usr/bin/env node
/**
 * sync-stock.cjs — picks the NEWEST .xlsx / .xlsm / .csv file from the stock folder
 * and turns it into data/stock.json, which the website reads for live stock search.
 *
 * Run:   "$ABACUSAI_BOT_NODE" scripts/sync-stock.cjs
 * Cron:  scheduled by the AbacusAI Bot routine "Stock sync" every day at 00:00
 *
 * Configuration (first one found wins):
 *   1. environment variable  STOCK_FOLDER
 *   2. file                 stock-folder.txt   (a single line: the folder path)
 *   3. default              ~/Documents/JanaushadhiStock
 *
 * Column names are matched loosely, so any of these headers work
 * (case-insensitive, extra spaces ignored):
 *   code        : code | medicine code | item code | drug code | product code | id | sno
 *   name        : name | medicine name | product name | item name | drug name | description
 *   composition : composition | salt | generic name | formula | content | molecule
 *   status      : status | availability | available | stock status
 *   quantity    : quantity | qty | stock | stock qty | available qty | units | balance
 *   mrp         : mrp | price | mrp (rs) | rate | mrp₹ | mrp(rs.) | selling price
 *   category    : category | type | group | segment | product type
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'stock.json');

function resolveFolder() {
  if (process.env.STOCK_FOLDER && process.env.STOCK_FOLDER.trim()) {
    return process.env.STOCK_FOLDER.trim();
  }
  const cfg = path.join(ROOT, 'stock-folder.txt');
  if (fs.existsSync(cfg)) {
    const line = fs.readFileSync(cfg, 'utf8').split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (line) return line.replace(/^~(?=$|\/)/, os.homedir());
  }
  return path.join(os.homedir(), 'Documents', 'JanaushadhiStock');
}

const EXTS = new Set(['.xlsx', '.xlsm', '.csv']);

function newestFile(folder) {
  if (!fs.existsSync(folder)) return null;
  const files = fs.readdirSync(folder)
    .filter(f => EXTS.has(path.extname(f).toLowerCase()))
    .filter(f => !f.startsWith('~$')) // Excel lock files
    .map(f => {
      const full = path.join(folder, f);
      const st = fs.statSync(full);
      return { full, name: f, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] || null;
}

const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELD_ALIASES = {
  code: ['code', 'medicinecode', 'itemcode', 'drugcode', 'productcode', 'productid', 'sku', 'sno', 'slno', 'id'],
  name: ['name', 'medicinename', 'productname', 'itemname', 'drugname', 'description', 'particulars'],
  composition: ['composition', 'salt', 'saltcomposition', 'genericname', 'formula', 'content', 'molecule', 'ingredients'],
  status: ['status', 'availability', 'available', 'stockstatus'],
  quantity: ['quantity', 'qty', 'stock', 'stockqty', 'availableqty', 'availablequantity', 'units', 'balance', 'instock'],
  mrp: ['mrp', 'price', 'mrp rs', 'mrp₹', 'rate', 'sellingprice', 'mrp rupees', 'mrprupees', 'mrp rs.', 'price rs', 'pricers'],
  category: ['category', 'type', 'group', 'segment', 'producttype', 'division'],
};

function mapHeader(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[field] != null) continue;
      if (aliases.includes(n)) { map[field] = i; return; }
    }
  });
  return map;
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[₹,\s]/g, '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function text(v) {
  return v == null ? '' : String(v).replace(/\s+/g, ' ').trim();
}

function statusOf(rawStatus, qty) {
  const s = norm(rawStatus);
  if (s) {
    if (['notavailable', 'na', 'outofstock', 'no', 'nil', 'unavailable', 'oos'].includes(s)) return 'Not Available';
    if (['available', 'yes', 'instock', 'y'].includes(s)) return (qty != null && qty <= 0) ? 'Not Available' : 'Available';
    if (s.startsWith('not')) return 'Not Available';
  }
  if (qty == null) return 'Available';
  return qty > 0 ? 'Available' : 'Not Available';
}

function categoryOf(raw) {
  const s = norm(raw);
  if (!s) return 'Medicine';
  if (['otc', 'otcproduct', 'otcproducts', 'otc item', 'otcitems', 'nonprescription'].includes(s)) return 'OTC';
  if (['medicine', 'medicines', 'drug', 'drugs', 'generic', 'tablet', 'syrup', 'injection'].includes(s)) return 'Medicine';
  if (s.includes('surgical') || s.includes('device') || s.includes('equipment')) return 'Surgical';
  if (s.includes('wellness') || s.includes('supplement') || s.includes('nutrition')) return 'Wellness';
  return text(raw);
}

function slugId(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

function parseCsv(buf) {
  const raw = buf.toString('utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (q) {
      if (c === '"' && raw[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c === '\r') { /* skip */ }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function readSheet(file) {
  if (path.extname(file).toLowerCase() === '.csv') return parseCsv(fs.readFileSync(file));
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  // prefer a sheet named like stock/medicines, else the first sheet
  const sheets = wb.worksheets;
  const pick = sheets.find(ws => /stock|medicin|product|item/i.test(ws.name)) || sheets[0];
  const rows = [];
  pick.eachRow({ includeEmpty: false }, r => {
    const vals = [];
    r.eachCell({ includeEmpty: true }, (cell, col) => {
      let v = cell.value;
      if (v && typeof v === 'object') {
        if (v.result != null) v = v.result;            // formula
        else if (v.richText) v = v.richText.map(t => t.text).join('');
        else if (v.text != null) v = v.text;           // hyperlink
        else if (v instanceof Date) v = v.toISOString().slice(0, 10);
      }
      vals[col - 1] = v;
    });
    rows.push(vals);
  });
  return rows;
}

function build(rows, sourceName) {
  if (!rows.length) throw new Error('The sheet is empty.');
  // find the header row within the first 10 rows
  let headerIdx = 0, map = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const m = mapHeader(rows[i] || []);
    if (m.name != null || m.code != null) { headerIdx = i; map = m; break; }
  }
  if (map.name == null && map.code == null) {
    throw new Error('Could not find a name/code column. Expected headers like "Code", "Medicine Name", "Composition", "Status", "Quantity", "MRP".');
  }

  const items = [];
  const seen = new Set();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = text(map.name != null ? r[map.name] : '');
    const code = text(map.code != null ? r[map.code] : '');
    const composition = text(map.composition != null ? r[map.composition] : '');
    if (!name && !code) continue;
    const qty = map.quantity != null ? num(r[map.quantity]) : null;
    const mrp = map.mrp != null ? num(r[map.mrp]) : null;
    const status = statusOf(map.status != null ? r[map.status] : '', qty);
    const category = categoryOf(map.category != null ? r[map.category] : '');
    const id = code ? slugId(code) : slugId(name);
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, code, name, composition, status, qty, mrp, category });
  }
  if (!items.length) throw new Error('No medicine rows found under the header row.');

  return {
    source: sourceName,
    updatedAt: new Date().toISOString(),
    count: items.length,
    available: items.filter(i => i.status === 'Available').length,
    items,
  };
}

(async () => {
  const folder = resolveFolder();
  console.log('Stock folder :', folder);
  const file = newestFile(folder);
  if (!file) {
    console.error('No .xlsx / .xlsm / .csv file found in that folder. Nothing was changed.');
    process.exit(2);
  }
  console.log('Newest file  :', file.name, '(' + new Date(file.mtime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ')');
  const rows = await readSheet(file.full);
  const data = build(rows, file.name);

  // keep a copy of the exact file used, so every number on the site can be traced
  const snapDir = path.join(ROOT, 'data', 'snapshots');
  fs.mkdirSync(snapDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(file.full, path.join(snapDir, stamp + '__' + file.name));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1));

  console.log('Wrote        :', path.relative(ROOT, OUT));
  console.log('Items        :', data.count, '| Available:', data.available);
})().catch(err => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
