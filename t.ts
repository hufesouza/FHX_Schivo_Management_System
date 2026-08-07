import * as XLSX from 'xlsx';
import { extractFromWorkbook, deriveQuotation } from './src/utils/quotationSheetExtractor';
import fs from 'fs';
const wb = XLSX.read(fs.readFileSync('/mnt/user-uploads/MEC000668-Rev3_upload.xlsm'), {type:'buffer', cellDates:true});
const r = extractFromWorkbook(wb);
console.log(r.sheetName, r.overallConfidence);
console.log(Object.entries(r.fields).map(([k,v])=>`${k}=${JSON.stringify(v.value)}(${v.confidence})`).join('\n'));
for (const [k,t] of Object.entries(r.tables)) console.log('TABLE',k,t.rows.length, JSON.stringify(t.rows.slice(0,3)));
console.log(JSON.stringify(deriveQuotation(r),null,1).slice(0,1500));
