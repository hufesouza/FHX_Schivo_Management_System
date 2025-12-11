import * as XLSX from 'xlsx';
import { ParsedNPIData } from '@/types/npi';

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
    
    // Try DD/MM/YYYY format
    const parts = trimmed.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
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
    const cleaned = value.replace(/[%,]/g, '').trim();
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

function findHeaderRow(data: unknown[][], searchTerms: string[]): number {
  for (let rowIdx = 0; rowIdx < Math.min(data.length, 50); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;
    
    const rowText = row.map(cell => String(cell || '').toUpperCase().trim()).join(' ');
    const foundTerms = searchTerms.filter(term => rowText.includes(term.toUpperCase()));
    
    if (foundTerms.length >= searchTerms.length * 0.7) {
      return rowIdx;
    }
  }
  return -1;
}

function buildColumnMapping(headerRow: unknown[], columnNames: Record<string, string[]>): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  headerRow.forEach((cell, colIdx) => {
    const cellText = String(cell || '').toUpperCase().trim();
    
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

function findSectionHeader(data: unknown[][], searchText: string): number {
  const searchUpper = searchText.toUpperCase();
  
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;
    
    for (const cell of row) {
      if (cell && String(cell).toUpperCase().includes(searchUpper)) {
        return rowIdx;
      }
    }
  }
  return -1;
}

export function parseNPIExcelFile(file: File): Promise<ParsedNPIData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Find NPI database sheet
        let sheetName = workbook.SheetNames.find(name => 
          name.toUpperCase().includes('NPI DATABASE') || 
          name.toUpperCase().includes('NPI')
        );
        
        if (!sheetName) {
          sheetName = workbook.SheetNames[0];
        }
        
        const sheet = workbook.Sheets[sheetName];
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        // Parse the three blocks
        const jobs = parseJobsBlock(rawData);
        const prereqs = parsePrereqsBlock(rawData, jobs.length);
        const postMcs = parsePostMcBlock(rawData, jobs.length);
        
        if (jobs.length === 0) {
          reject(new Error('No NPI jobs found in the file. Make sure the sheet contains the job header row with columns like NPI PM, Customer, MC Cell, etc.'));
          return;
        }
        
        resolve({ jobs, prereqs, postMcs });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function parseJobsBlock(data: unknown[][]): ParsedNPIData['jobs'] {
  const jobColumnNames: Record<string, string[]> = {
    npi_pm: ['NPI PM', 'PM', 'PROJECT MANAGER'],
    customer: ['CUSTOMER', 'CUST'],
    mc_cell: ['MC CELL', 'CELL', 'MCCELL'],
    mc: ['MC', 'MACHINE'],
    part: ['PART', 'PART NO', 'PART NUMBER'],
    dp1: ['DP#', 'DP1', 'DP 1'],
    dp2: ['DP#2', 'DP2', 'DP 2'],
    description: ['DESCRIPTION', 'DESC'],
    start_date: ['START', 'START DATE'],
    end_date: ['END', 'END DATE'],
    days: ['DAYS', 'DURATION'],
    status: ['STATUS'],
    gate_commit_date: ['GATE COMMIT', 'GATE', 'COMMIT DATE'],
    percent_complete: ['% COMPLETE', 'COMPLETE', 'PERCENT', '%']
  };
  
  // Find the job header row
  const headerRowIdx = findHeaderRow(data, ['NPI PM', 'CUSTOMER', 'MC CELL', 'DESCRIPTION']);
  
  if (headerRowIdx === -1) {
    console.warn('Job header row not found');
    return [];
  }
  
  const headerRow = data[headerRowIdx];
  const columnMapping = buildColumnMapping(headerRow, jobColumnNames);
  
  const jobs: ParsedNPIData['jobs'] = [];
  
  // Parse job rows until empty row
  for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    
    // Check if row is empty
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      break;
    }
    
    const getValue = (field: string) => {
      const colIdx = columnMapping[field];
      return colIdx !== undefined ? row[colIdx] : null;
    };
    
    const npi_pm = normalizeString(getValue('npi_pm'));
    const customer = normalizeString(getValue('customer'));
    
    // Skip rows without NPI PM and Customer
    if (!npi_pm && !customer) {
      continue;
    }
    
    jobs.push({
      row_index: rowIdx,
      npi_pm,
      customer,
      mc_cell: normalizeString(getValue('mc_cell')),
      mc: normalizeString(getValue('mc')),
      part: normalizeString(getValue('part')),
      dp1: normalizeString(getValue('dp1')),
      dp2: normalizeString(getValue('dp2')),
      description: normalizeString(getValue('description')),
      start_date: parseExcelDate(getValue('start_date')),
      end_date: parseExcelDate(getValue('end_date')),
      days: parseNumber(getValue('days')),
      status: normalizeString(getValue('status')),
      gate_commit_date: parseExcelDate(getValue('gate_commit_date')),
      percent_complete: parseNumber(getValue('percent_complete'))
    });
  }
  
  return jobs;
}

function parsePrereqsBlock(data: unknown[][], jobCount: number): ParsedNPIData['prereqs'] {
  const prereqColumnNames: Record<string, string[]> = {
    doc_control: ['DOC CONTROL', 'DOCUMENT CONTROL', 'DOC'],
    po_printed: ['PO PRINTED', 'PO', 'PURCHASE ORDER'],
    packaging: ['PACKAGING', 'PACK'],
    material: ['MATERIAL', 'MAT'],
    tooling: ['TOOLING', 'TOOL'],
    mc_prep: ['MC PREP', 'MACHINE PREP', 'PREP'],
    metr_prg: ['METR PRG', 'METROLOGY PRG', 'METR PROGRAM'],
    metr_fix: ['METR FIX', 'METROLOGY FIX', 'METR FIXTURE'],
    gauges: ['GAUGES', 'GAUGE'],
    additional_reqs: ['ADDITIONAL', 'ADD REQ', 'ADDITIONAL REQ']
  };
  
  // Find the prerequisites section header
  const sectionIdx = findSectionHeader(data, 'Pre-requisites to start mc');
  
  if (sectionIdx === -1) {
    console.warn('Prerequisites section not found');
    return Array(jobCount).fill({}).map(() => ({
      doc_control: null,
      po_printed: null,
      packaging: null,
      material: null,
      tooling: null,
      mc_prep: null,
      metr_prg: null,
      metr_fix: null,
      gauges: null,
      additional_reqs: null
    }));
  }
  
  // Find the column labels row (usually 2-3 rows below section header)
  let headerRowIdx = -1;
  for (let i = sectionIdx + 1; i < Math.min(sectionIdx + 5, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowText = row.map(cell => String(cell || '').toUpperCase()).join(' ');
    if (rowText.includes('DOC') || rowText.includes('MATERIAL') || rowText.includes('TOOLING')) {
      headerRowIdx = i;
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    return Array(jobCount).fill({}).map(() => ({
      doc_control: null,
      po_printed: null,
      packaging: null,
      material: null,
      tooling: null,
      mc_prep: null,
      metr_prg: null,
      metr_fix: null,
      gauges: null,
      additional_reqs: null
    }));
  }
  
  const headerRow = data[headerRowIdx];
  const columnMapping = buildColumnMapping(headerRow, prereqColumnNames);
  
  const prereqs: ParsedNPIData['prereqs'] = [];
  
  // Parse prereq rows corresponding to jobs
  for (let i = 0; i < jobCount; i++) {
    const rowIdx = headerRowIdx + 1 + i;
    const row = data[rowIdx] || [];
    
    const getValue = (field: string) => {
      const colIdx = columnMapping[field];
      return colIdx !== undefined ? normalizeString(row[colIdx]) : null;
    };
    
    prereqs.push({
      doc_control: getValue('doc_control'),
      po_printed: getValue('po_printed'),
      packaging: getValue('packaging'),
      material: getValue('material'),
      tooling: getValue('tooling'),
      mc_prep: getValue('mc_prep'),
      metr_prg: getValue('metr_prg'),
      metr_fix: getValue('metr_fix'),
      gauges: getValue('gauges'),
      additional_reqs: getValue('additional_reqs')
    });
  }
  
  return prereqs;
}

function parsePostMcBlock(data: unknown[][], jobCount: number): ParsedNPIData['postMcs'] {
  const postMcColumnNames: Record<string, string[]> = {
    work_instructions: ['WORK INSTRUCTIONS', 'WORK INST', 'WI'],
    production_ims: ['PRODUCTION IMS', 'PROD IMS'],
    qc_ims: ['QC IMS', 'QUALITY IMS'],
    fair: ['FAIR'],
    re_rev_closure: ['RE-REV', 'REV CLOSURE', 'RE-REV CLOSURE'],
    aging_days: ['AGING', 'AGING DAYS', 'AGE']
  };
  
  // Find the post-mc section header
  const sectionIdx = findSectionHeader(data, 'Post mc activities');
  
  if (sectionIdx === -1) {
    console.warn('Post-MC section not found');
    return Array(jobCount).fill({}).map(() => ({
      work_instructions: null,
      production_ims: null,
      qc_ims: null,
      fair: null,
      re_rev_closure: null,
      aging_days: null
    }));
  }
  
  // Find the column labels row
  let headerRowIdx = -1;
  for (let i = sectionIdx + 1; i < Math.min(sectionIdx + 5, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowText = row.map(cell => String(cell || '').toUpperCase()).join(' ');
    if (rowText.includes('WORK') || rowText.includes('IMS') || rowText.includes('FAIR')) {
      headerRowIdx = i;
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    return Array(jobCount).fill({}).map(() => ({
      work_instructions: null,
      production_ims: null,
      qc_ims: null,
      fair: null,
      re_rev_closure: null,
      aging_days: null
    }));
  }
  
  const headerRow = data[headerRowIdx];
  const columnMapping = buildColumnMapping(headerRow, postMcColumnNames);
  
  const postMcs: ParsedNPIData['postMcs'] = [];
  
  // Parse post-mc rows corresponding to jobs
  for (let i = 0; i < jobCount; i++) {
    const rowIdx = headerRowIdx + 1 + i;
    const row = data[rowIdx] || [];
    
    const getValue = (field: string) => {
      const colIdx = columnMapping[field];
      return colIdx !== undefined ? normalizeString(row[colIdx]) : null;
    };
    
    postMcs.push({
      work_instructions: getValue('work_instructions'),
      production_ims: getValue('production_ims'),
      qc_ims: getValue('qc_ims'),
      fair: getValue('fair'),
      re_rev_closure: getValue('re_rev_closure'),
      aging_days: parseNumber(getValue('aging_days'))
    });
  }
  
  return postMcs;
}
