#!/usr/bin/env node
/** Builds sample-stock/Stock_Master_SAMPLE.xlsx — a demo file in the exact column format
 *  the sync script expects. Replace it with your real stock register. */
const path = require('path');
const ExcelJS = require('exceljs');

const rows = [
  ['Code', 'Medicine Name', 'Composition', 'Status', 'Quantity', 'MRP', 'Category'],
  ['PMBJP-001', 'Paracetamol Tablets IP 500 mg', 'Paracetamol 500 mg', 'Available', 240, 10.5, 'Medicine'],
  ['PMBJP-002', 'Paracetamol Tablets IP 650 mg', 'Paracetamol 650 mg', 'Available', 120, 14.0, 'Medicine'],
  ['PMBJP-003', 'Ibuprofen Tablets IP 400 mg', 'Ibuprofen 400 mg', 'Available', 60, 12.5, 'Medicine'],
  ['PMBJP-004', 'Diclofenac Sodium Tablets IP 50 mg', 'Diclofenac Sodium 50 mg', 'Available', 90, 9.0, 'Medicine'],
  ['PMBJP-005', 'Amoxicillin Capsules IP 500 mg', 'Amoxicillin 500 mg', 'Not Available', 0, 62.0, 'Medicine'],
  ['PMBJP-006', 'Amoxicillin + Clavulanic Acid Tablets', 'Amoxicillin 500 mg + Clavulanic Acid 125 mg', 'Available', 30, 120.0, 'Medicine'],
  ['PMBJP-007', 'Azithromycin Tablets IP 500 mg', 'Azithromycin 500 mg', 'Available', 25, 48.0, 'Medicine'],
  ['PMBJP-008', 'Cefixime Tablets IP 200 mg', 'Cefixime 200 mg', 'Not Available', 0, 55.0, 'Medicine'],
  ['PMBJP-009', 'Metformin Hydrochloride Tablets IP 500 mg', 'Metformin Hydrochloride 500 mg', 'Available', 200, 8.5, 'Medicine'],
  ['PMBJP-010', 'Glimepiride Tablets IP 2 mg', 'Glimepiride 2 mg', 'Available', 80, 16.0, 'Medicine'],
  ['PMBJP-011', 'Amlodipine Tablets IP 5 mg', 'Amlodipine 5 mg', 'Available', 150, 6.0, 'Medicine'],
  ['PMBJP-012', 'Telmisartan Tablets IP 40 mg', 'Telmisartan 40 mg', 'Available', 100, 22.0, 'Medicine'],
  ['PMBJP-013', 'Atorvastatin Tablets IP 10 mg', 'Atorvastatin 10 mg', 'Available', 70, 18.0, 'Medicine'],
  ['PMBJP-014', 'Pantoprazole Tablets IP 40 mg', 'Pantoprazole 40 mg', 'Available', 110, 20.0, 'Medicine'],
  ['PMBJP-015', 'Ranitidine Tablets IP 150 mg', 'Ranitidine 150 mg', 'Not Available', 0, 7.0, 'Medicine'],
  ['PMBJP-016', 'Ondansetron Tablets IP 4 mg', 'Ondansetron 4 mg', 'Available', 45, 11.0, 'Medicine'],
  ['PMBJP-017', 'Cetirizine Tablets IP 10 mg', 'Cetirizine 10 mg', 'Available', 160, 5.5, 'Medicine'],
  ['PMBJP-018', 'Levocetirizine Tablets IP 5 mg', 'Levocetirizine 5 mg', 'Available', 95, 9.5, 'Medicine'],
  ['PMBJP-019', 'Montelukast Tablets IP 10 mg', 'Montelukast 10 mg', 'Available', 40, 34.0, 'Medicine'],
  ['PMBJP-020', 'Salbutamol Inhaler', 'Salbutamol 100 mcg per actuation', 'Available', 18, 92.0, 'Medicine'],
  ['PMBJP-021', 'Iron + Folic Acid Tablets', 'Ferrous Fumarate 152 mg + Folic Acid 1.5 mg', 'Available', 130, 12.0, 'Medicine'],
  ['PMBJP-022', 'Calcium + Vitamin D3 Tablets', 'Calcium Carbonate 500 mg + Vitamin D3 250 IU', 'Available', 85, 19.0, 'Medicine'],
  ['PMBJP-023', 'Vitamin B Complex Tablets', 'Vitamin B1, B2, B6, B12, Nicotinamide', 'Available', 75, 15.0, 'Medicine'],
  ['PMBJP-024', 'ORS Powder (Orange)', 'Oral Rehydration Salts 20.5 g', 'Available', 140, 8.0, 'Medicine'],
  ['PMBJP-025', 'Albendazole Tablets IP 400 mg', 'Albendazole 400 mg', 'Available', 55, 13.0, 'Medicine'],
  ['PMBJP-026', 'Cough Syrup (Terbutaline + Guaiphenesin)', 'Terbutaline 1.25 mg + Guaiphenesin 50 mg per 5 ml', 'Not Available', 0, 42.0, 'Medicine'],
  ['PMBJP-027', 'Dextrose 5% IV Infusion 500 ml', 'Dextrose 5% w/v', 'Available', 24, 38.0, 'Medicine'],
  ['PMBJP-028', 'Ringer Lactate IV Infusion 500 ml', 'Sodium Lactate 0.32 g per 100 ml', 'Available', 20, 41.0, 'Medicine'],
  ['PMBJP-029', 'Thyroxine Sodium Tablets IP 50 mcg', 'Thyroxine Sodium 50 mcg', 'Available', 60, 26.0, 'Medicine'],
  ['PMBJP-030', 'Sertraline Tablets IP 50 mg', 'Sertraline 50 mg', 'Not Available', 0, 30.0, 'Medicine'],
  ['OTC-101', 'Digital Thermometer', 'Flexible tip, 1 second reading', 'Available', 12, 145.0, 'OTC'],
  ['OTC-102', 'Blood Pressure Monitor (Upper Arm)', 'Automatic, cuff 22–42 cm', 'Available', 6, 1350.0, 'OTC'],
  ['OTC-103', 'Glucometer Kit with 25 Strips', 'Blood glucose monitoring system', 'Available', 8, 640.0, 'OTC'],
  ['OTC-104', 'Pulse Oximeter (Fingertip)', 'SpO2 + pulse rate, OLED display', 'Available', 15, 520.0, 'OTC'],
  ['OTC-105', 'Nebulizer Machine (Compressor)', 'For home respiratory therapy', 'Available', 4, 1180.0, 'OTC'],
  ['OTC-106', 'Surgical Face Mask (Pack of 50)', '3-ply, ear loop, melt-blown filter', 'Available', 40, 95.0, 'OTC'],
  ['OTC-107', 'Nitrile Examination Gloves (Pack of 100)', 'Powder-free, non-sterile, size M', 'Available', 22, 380.0, 'OTC'],
  ['OTC-108', 'Antiseptic Liquid 500 ml', 'Chloroxylenol 4.8% w/v', 'Available', 30, 110.0, 'OTC'],
  ['OTC-109', 'Cotton Roll 100 g', 'Absorbent cotton wool IP', 'Available', 35, 45.0, 'OTC'],
  ['OTC-110', 'Crepe Bandage 10 cm x 4 m', 'Elastic adhesive bandage', 'Available', 28, 85.0, 'OTC'],
  ['OTC-111', 'Adhesive Bandage Strips (Pack of 100)', 'Washproof, assorted sizes', 'Available', 50, 60.0, 'OTC'],
  ['OTC-112', 'Hot Water Bag 2 L', 'Rubber, leak-proof', 'Available', 10, 210.0, 'OTC'],
  ['OTC-113', 'Ice Gel Pack (Reusable)', 'For sprains and fever', 'Available', 18, 130.0, 'OTC'],
  ['OTC-114', 'Steam Inhaler / Vaporizer', 'Electric, facial steamer', 'Not Available', 0, 470.0, 'OTC'],
  ['OTC-115', 'Digital Weighing Scale', 'Body weight, 180 kg capacity', 'Available', 5, 890.0, 'OTC'],
  ['OTC-116', 'Hand Sanitizer 500 ml', 'Ethyl Alcohol 70% v/v', 'Available', 26, 140.0, 'OTC'],
  ['OTC-117', 'Baby Diapers (Medium, Pack of 30)', 'Super absorbent, cotton-soft', 'Available', 14, 330.0, 'OTC'],
  ['OTC-118', 'First Aid Kit (Home)', 'Bandage, antiseptic, scissors, tape', 'Available', 9, 275.0, 'OTC'],
  ['OTC-119', 'Orthopaedic Knee Support (Pair)', 'Neoprene, adjustable', 'Available', 7, 260.0, 'OTC'],
  ['OTC-120', 'Sphygmomanometer (Manual)', 'Aneroid, with stethoscope', 'Available', 6, 720.0, 'OTC'],
  ['OTC-121', 'Pregnancy Test Kit', 'hCG strip, pack of 3', 'Available', 20, 85.0, 'OTC'],
  ['OTC-122', 'Surgical Scissors (Stainless Steel)', '5.5 inch, straight', 'Available', 11, 120.0, 'OTC'],
];

(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pradhan Mantri Bhartiya Janaushadhi Kendra, Punglia';
  const ws = wb.addWorksheet('Stock');
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach(c => { c.width = 26; });
  ws.getColumn(3).width = 46;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const out = path.resolve(__dirname, '..', 'sample-stock', 'Stock_Master_SAMPLE.xlsx');
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out, '(' + (rows.length - 1) + ' rows)');
})();
