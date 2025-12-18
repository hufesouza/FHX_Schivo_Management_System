import * as XLSX from 'xlsx';
import { ParsedEnquiryLog } from '@/types/enquiryLog';

interface ColumnMapping {
  [key: string]: number;
}

function parseExcelDate(value: unknown): string | null {
  if (!value) return null;
  
  // Handle Excel serial date numbers
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Handle string dates
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Try various date formats
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY or DD/MM/YY format
    const parts = trimmed.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let [d, m, y] = parts.map(Number);
      // Handle 2-digit year
      if (y < 100) {
        y = y > 50 ? 1900 + y : 2000 + y;
      }
      const parsed = new Date(y, m - 1, d);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  }
  
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[€$£,\s]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

function parseBoolean(value: unknown): boolean {
  if (!value) return false;
  const str = String(value).toUpperCase().trim();
  return ['YES', 'Y', 'TRUE', '1', 'WON'].includes(str);
}

function findHeaderRow(data: unknown[][], searchTerms: string[]): number {
  for (let rowIdx = 0; rowIdx < Math.min(data.length, 20); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;
    
    const rowText = row.map(cell => String(cell || '').toUpperCase().trim()).join(' ');
    const foundTerms = searchTerms.filter(term => rowText.includes(term.toUpperCase()));
    
    if (foundTerms.length >= searchTerms.length * 0.5) {
      return rowIdx;
    }
  }
  return -1;
}

function buildColumnMapping(headerRow: unknown[], columnNames: Record<string, string[]>): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  headerRow.forEach((cell, colIdx) => {
    const cellText = String(cell || '').toUpperCase().trim().replace(/\n/g, ' ');
    
    for (const [field, aliases] of Object.entries(columnNames)) {
      if (aliases.some(alias => cellText.includes(alias.toUpperCase()))) {
        if (!(field in mapping)) {
          mapping[field] = colIdx;
        }
      }
    }
  });
  
  return mapping;
}

export function parseEnquiryLogExcel(file: File): Promise<ParsedEnquiryLog[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Look for the main data sheet (skip pivot tables)
        let sheetName = workbook.SheetNames.find(name => 
          !name.toUpperCase().includes('PIVOT') && 
          (name.toUpperCase().includes('ENQUIRY') || name.toUpperCase().includes('LOG') || name.toUpperCase().includes('DATA'))
        );
        
        // If not found, try to find a sheet with enquiry data
        if (!sheetName) {
          // Check each sheet for enquiry data
          for (const name of workbook.SheetNames) {
            const sheet = workbook.Sheets[name];
            const testData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
            const headerIdx = findHeaderRow(testData, ['ENQUIRY', 'CUSTOMER', 'DATE']);
            if (headerIdx !== -1) {
              sheetName = name;
              break;
            }
          }
        }
        
        if (!sheetName) {
          sheetName = workbook.SheetNames[0];
        }
        
        const sheet = workbook.Sheets[sheetName];
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        const enquiries = parseEnquiryData(rawData);
        
        if (enquiries.length === 0) {
          reject(new Error('No enquiry data found. Make sure the sheet contains columns like Enquiry No., Customer, Date Enquiry Received.'));
          return;
        }
        
        resolve(enquiries);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function parseEnquiryData(data: unknown[][]): ParsedEnquiryLog[] {
  const columnNames: Record<string, string[]> = {
    enquiry_no: ['ENQUIRY NO', 'ENQUIRY', 'ENQ NO', 'ENQ'],
    customer: ['CUSTOMER', 'CUST'],
    details: ['DETAILS', 'DESCRIPTION', 'DESC'],
    customer_type: ['NEW/EXISTING CUSTOMER', 'CUSTOMER TYPE'],
    business_type: ['NEW/EXISTING BUSINESS', 'BUSINESS TYPE'],
    date_received: ['DATE ENQUIRY RECEIVED', 'DATE RECEIVED', 'RECEIVED DATE', 'ENQUIRY RECEIVED'],
    npi_owner: ['NPI OWNER', 'OWNER', 'ASSIGNED'],
    priority: ['PRIORITY', 'PRIO'],
    commercial_owner: ['COMMERCIAL OWNER', 'COMMERCIAL', 'SALES'],
    ecd_quote_submission: ['ECD FOR QUOTE', 'ECD', 'EXPECTED'],
    date_quote_submitted: ['DATE QUOTE SUBMITTED', 'QUOTE SUBMITTED', 'SUBMITTED DATE'],
    quoted_price_euro: ['QUOTED PRICE', 'PRICE', 'EURO', 'VALUE'],
    aging: ['AGING', 'AGE'],
    turnaround_days: ['TURNAROUND', 'TURNAROUND TIME', 'TAT'],
    quantity_parts_quoted: ['QUANTITY', 'QTY', 'PARTS QUOTED'],
    quoted_gap: ['QUOTED GAP', 'GAP'],
    is_quoted: ['QUOTED'],
    po_received: ['P.O. RECEIVED', 'PO RECEIVED', 'PO'],
    po_value_euro: ['PO VALUE', 'PO EURO'],
    date_po_received: ['DATE PO RECEIVED', 'PO DATE'],
    comments: ['COMMENTS', 'NOTES', 'REMARKS'],
    status: ['STATUS']
  };
  
  // Find the header row
  const headerRowIdx = findHeaderRow(data, ['ENQUIRY', 'CUSTOMER', 'STATUS']);
  
  if (headerRowIdx === -1) {
    console.warn('Header row not found');
    return [];
  }
  
  const headerRow = data[headerRowIdx];
  const columnMapping = buildColumnMapping(headerRow, columnNames);
  
  const enquiries: ParsedEnquiryLog[] = [];
  
  // Parse data rows
  for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    
    // Check if row is empty
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      continue;
    }
    
    const getValue = (field: string) => {
      const colIdx = columnMapping[field];
      return colIdx !== undefined ? row[colIdx] : null;
    };
    
    const enquiryNo = normalizeString(getValue('enquiry_no'));
    
    // Skip rows without enquiry number
    if (!enquiryNo) {
      continue;
    }
    
    // Check if status indicates this is a valid enquiry (skip blank/cancelled if needed)
    const status = normalizeString(getValue('status'));
    
    enquiries.push({
      enquiry_no: enquiryNo,
      customer: normalizeString(getValue('customer')),
      details: normalizeString(getValue('details')),
      customer_type: normalizeString(getValue('customer_type')),
      business_type: normalizeString(getValue('business_type')),
      date_received: parseExcelDate(getValue('date_received')),
      npi_owner: normalizeString(getValue('npi_owner')),
      priority: normalizeString(getValue('priority')),
      commercial_owner: normalizeString(getValue('commercial_owner')),
      ecd_quote_submission: parseExcelDate(getValue('ecd_quote_submission')),
      date_quote_submitted: parseExcelDate(getValue('date_quote_submitted')),
      quoted_price_euro: parseNumber(getValue('quoted_price_euro')),
      aging: parseNumber(getValue('aging')),
      turnaround_days: parseNumber(getValue('turnaround_days')),
      quantity_parts_quoted: parseNumber(getValue('quantity_parts_quoted')),
      quoted_gap: parseNumber(getValue('quoted_gap')),
      is_quoted: parseBoolean(getValue('is_quoted')) || !!parseExcelDate(getValue('date_quote_submitted')),
      po_received: parseBoolean(getValue('po_received')),
      po_value_euro: parseNumber(getValue('po_value_euro')),
      date_po_received: parseExcelDate(getValue('date_po_received')),
      comments: normalizeString(getValue('comments')),
      status: status || 'OPEN'
    });
  }
  
  return enquiries;
}
