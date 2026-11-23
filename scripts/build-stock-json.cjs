#!/usr/bin/env node
/**
 * build-stock-json.cjs — turns a BPPI "Stock Register Report" .xlsx into data/stock.json.
 *
 * Layout it understands (BPPI stock register, as downloaded from the shop's OneDrive):
 *   row 1-4 : shop header (name, address, GST, report title)
 *   row 6   : column headers — Drug Type | Drug Group | ... | Drug Category | Hsn Code |
 *             Drug Code | Drug Name | UOM | Batch No | Expiry Date | Qty | MRP | ... | Rate
 *   row 7+  : one row per batch. The same medicine can appear in several batches;
 *             batches are summed into one entry per Drug Code.
 *
 * Usage: node build-stock-json.cjs "<path to StockReport ....xlsx>" [--source "display name"]
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'stock.json');

const file = process.argv[2];
const srcArg = process.argv.indexOf('--source');
const sourceName = srcArg > 0 ? process.argv[srcArg + 1] : (file ? path.basename(file) : '');
if (!file) { console.error('Usage: node build-stock-json.cjs "<StockReport.xlsx>"'); process.exit(1); }

const clean = v => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(t => t.text).join('');
    if (v.result != null) return v.result;
    if (v.text != null) return v.text;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return '';
  }
  return v;
};
const text = v => String(clean(v)).replace(/\s+/g, ' ').trim();
const num = v => {
  const n = Number(String(clean(v)).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
// The BPPI register names a medicine by its salt ("Metformin Hydrochloride Tablets IP 500 mg").
// A customer often knows only the salt, so index the words before the dose form too.
const genericOf = name => {
  const m = name.match(/^(.*?)\b(tablets?|tabelts?|capsules?|syrup|suspension|injection|infusion|drops?|ointment|cream|lotion|gel|spray|inhalation|inhaler|respules?|rotacaps?|sachet|solution|suppositor\w*|pessar\w*|granules|emulsion|liniment|patch|serum|expectorant|liquid|powder|mouthwash|soap|facewash)\b/i);
  return (m ? m[1] : name).replace(/\s+/g, ' ').trim();
};
const isoDate = v => {
  const c = clean(v);
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) return c.slice(0, 10);
  const d = new Date(c);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
};

// ---- OTC detection: the shop's non-prescription, non-tablet range ----
// A medicine is "OTC" for the website when its name reads like a device, dressing,
// personal-care or hygiene item rather than a dose form you swallow or inject.
const OTC_WORDS = [
  'thermometer', 'oximeter', 'glucometer', 'nebulizer', 'nebuliser', 'vaporizer',
  'sphygmomanometer', 'blood pressure instrument', 'weighing scale', 'face mask',
  'gloves', 'bandage', 'gauze', 'cotton ball', 'cotton roll', 'zig zag cotton',
  'absorbent cotton', 'antiseptic', 'mouthwash', 'sanitizer', 'hand rub', 'soap',
  'facewash', 'face wash', 'hygiene wash', 'toothpaste', 'first aid', 'crepe',
  'adhesive tape', 'adhesive plaster', 'micropore', 'paper tape', 'hot water bag',
  'ice gel', 'knee support', 'knee cap', 'elbow support', 'lumbar', 'lumbo-sacral',
  'cervical collar', 'cervical pillow', 'arm sling', 'pregnancy test', 'test kit',
  'test strip', 'syringe', 'needle', 'urine collecting', 'catheter', 'diaper',
  'sanitary napkin', 'condom', 'kavach', 'suraksha', 'swabhiman', 'suvidha',
  'isopropyl alcohol', 'spirit', 'nicotine', 'chewing gum', 'chyawanprash',
  'poshan', 'malt based food', 'strips', 'sterile gauze', 'surgical blade',
  'scissors', 'stethoscope', 'spacer', 'respirator', 'steam', 'sitz bath', 'enema',
  'mouthwash', 'gauze', 'toothpaste', 'facewash', 'hygiene wash', 'cotton',
];
// A dose form in the name means it is a medicine, whatever else the name says.
const DOSE_FORMS = /\b(tablets?|tabelts?|capsules?|syrup|suspension|injection|infusion|drops?|ointment|cream|lotion|gel|spray|inhalation|inhaler|respules?|rotacaps?|sachet|solution|suppositor\w*|pessar\w*|granules|emulsion|liniment|patch|serum|pen|expectorant|liquid|powder|strips?)\b/i;
const isOTC = (name, group) => {
  const t = (name + ' ' + group).toLowerCase();
  if (DOSE_FORMS.test(t)) return false;
  return OTC_WORDS.some(w => t.includes(w));
};

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets.find(w => /stock/i.test(w.name)) || wb.worksheets[0];

  // locate the header row by finding "Drug Name" / "Drug Code"
  let headerRow = 0, cols = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const row = ws.getRow(r);
    const found = {};
    row.eachCell({ includeEmpty: false }, (c, i) => {
      const h = text(c.value).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!h) return;
      if (found[h] == null) found[h] = i;
    });
    if (found['drugname'] || found['drugcode']) {
      headerRow = r;
      cols = {
        code: found['drugcode'],
        name: found['drugname'],
        group: found['druggroup'],
        type: found['drugtype'],
        category: found['drugcategory'],
        hsn: found['hsncode'],
        uom: found['uom'],
        batch: found['batchno'],
        expiry: found['expirydate'],
        qty: found['qty'] ?? found['quantity'] ?? found['stock'],
        mrp: found['mrp'],
        rate: found['rate'],
      };
      break;
    }
  }
  if (!headerRow || !cols.name) throw new Error('Could not find the "Drug Name" header row in this file.');

  const byCode = new Map();
  let batches = 0;
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = text(row.getCell(cols.name).value);
    if (!name) continue;
    const code = text(row.getCell(cols.code).value);
    const qty = cols.qty ? num(row.getCell(cols.qty).value) : null;
    const mrp = cols.mrp ? num(row.getCell(cols.mrp).value) : null;
    const exp = cols.expiry ? isoDate(row.getCell(cols.expiry).value) : '';
    const group = cols.group ? text(row.getCell(cols.group).value) : '';
    const uom = cols.uom ? text(row.getCell(cols.uom).value) : '';
    batches++;

    const key = code || name.toLowerCase();
    const prev = byCode.get(key);
    if (prev) {
      prev.qty = (prev.qty || 0) + (qty || 0);
      prev.batches += 1;
      if (exp && (!prev.expiry || exp > prev.expiry)) prev.expiry = exp;
      if (mrp != null && (prev.mrp == null || mrp > prev.mrp)) prev.mrp = mrp;
    } else {
      byCode.set(key, {
        code, name, composition: name, generic: genericOf(name), group, uom,
        qty: qty || 0, mrp, expiry: exp, batches: 1,
        category: isOTC(name, group) ? 'OTC' : 'Medicine',
      });
    }
  }

  const items = [...byCode.values()].map((it, i) => {
    const avail = it.qty > 0;
    return {
      id: it.code ? 'c' + it.code : 'n' + i,
      code: it.code,
      name: it.name,
      composition: it.composition,
      generic: it.generic,
      group: it.group,
      pack: it.uom,
      status: avail ? 'Available' : 'Not Available',
      qty: it.qty,
      mrp: it.mrp,
      expiry: it.expiry,
      batches: it.batches,
      category: it.category,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const data = {
    source: sourceName,
    sourcePath: file,
    updatedAt: new Date().toISOString(),
    reportRows: batches,
    count: items.length,
    available: items.filter(i => i.status === 'Available').length,
    otc: items.filter(i => i.category === 'OTC').length,
    items,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data));
  console.log(`Built data/stock.json from "${sourceName}" — ${items.length} medicines (${data.available} available), ${data.otc} OTC items, from ${batches} batch rows.`);
})().catch(e => { console.error('Build failed:', e.message); process.exit(1); });
