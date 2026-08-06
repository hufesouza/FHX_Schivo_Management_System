import * as XLSX from 'xlsx';
import { extractFromWorkbook, deriveQuotation } from './src/utils/quotationSheetExtractor';
const wb = XLSX.readFile('/mnt/user-uploads/MEC000668-Rev3_upload.xlsm');
const r = extractFromWorkbook(wb);
console.log(r.sheetName, r.overallConfidence, r.missing);
console.log(Object.fromEntries(Object.entries(r.fields).map(([k,v])=>[k,[v.value,v.confidence,v.source]])));
for (const [k,t] of Object.entries(r.tables)) console.log(k, t.rows.length, JSON.stringify(t.rows.slice(0,3)));
console.log(deriveQuotation(r));
