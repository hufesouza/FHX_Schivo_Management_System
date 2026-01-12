import * as XLSX from 'xlsx';

export interface ParsedQuotationPart {
  line_number: number;
  part_number: string | null;
  description: string | null;
  quantity: number | null;
  // Material
  material_name: string | null;
  material_qty_per_unit: number | null;
  material_std_cost_est: number | null;
  material_markup: number | null;
  total_material: number | null;
  // Subcon
  subcon_cost: number | null;
  subcon_markup: number | null;
  subcon_cost_per_part: number | null;
  // Development
  resource: string | null;
  volume: number | null;
  development_time: number | null;
  days_dev_time: number | null;
  shift: number | null;
  dev_time_cost: number | null;
  tooling: number | null;
  nre: number | null;
  // Routing
  machine_manning: string | null;
  machine_setup: number | null;
  machine_run_time: number | null;
  part_deburr: number | null;
  wash: number | null;
  labour_per_hr: number | null;
  overheads_per_hr: number | null;
  machine_cost_per_min: number | null;
  secondary_ops_cost_per_min: number | null;
  labour_processing_cost: number | null;
  // Price
  total_cost_per_part: number | null;
  margin: number | null;
  unit_price: number | null;
}

export interface ParsedQuotationData {
  parts: ParsedQuotationPart[];
  totals: {
    total_quoted_price: number;
    total_cost: number;
    average_margin: number;
  };
}

// Parse number from string, handling currency symbols and percentages
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  if (!str || str === '-' || str === '#VALUE!') return null;
  
  // Remove currency symbols and whitespace
  const cleaned = str
    .replace(/[€$£]/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse percentage (converts 15% to 0.15)
function parsePercentage(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // If it's already a decimal less than 1, return as is
    if (value <= 1) return value;
    // Otherwise divide by 100
    return value / 100;
  }
  
  const str = String(value).trim();
  if (!str || str === '-') return null;
  
  const hasPercent = str.includes('%');
  const cleaned = str.replace(/[€$£%,]/g, '').trim();
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return null;
  
  // If it had % sign or if number is > 1, divide by 100
  if (hasPercent || num > 1) {
    return num / 100;
  }
  return num;
}

// Normalize string value
function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str === '-' || str === '#VALUE!') return null;
  return str;
}

// Column mapping based on the template structure
const COLUMN_MAP = {
  lineNumber: 0,        // #
  partNumber: 1,        // Part Number
  description: 2,       // Description
  partView: 3,          // Part View (skip)
  materialName: 4,      // Material Name
  quantity: 5,          // Qty
  materialQtyPerUnit: 6, // Material QTY/Unit
  materialStdCostEst: 7, // Material Std Cst est
  materialMarkup: 8,    // Material Markup
  totalMaterial: 9,     // Total Material
  subcon: 10,           // Subcon
  subconMarkup: 11,     // Subcon Markup
  subconCostPerPart: 12, // Subcon cost per part
  resource: 13,         // Resource
  volume: 14,           // Volume
  developmentTime: 15,  // Devlopment Time
  daysDev: 16,          // Days Dev Time
  shift: 17,            // Shift
  devTimeCost: 18,      // Dev time Cost
  tooling: 19,          // Tooling
  nre: 20,              // NRE
  machineManning: 21,   // Machine Manning
  machineSetup: 22,     // Machine set-up
  machineRunTime: 23,   // Machine run time
  partDeburr: 24,       // Part Deburr
  wash: 25,             // Wash
  labourPerHr: 26,      // Labour/ hr
  overheadsPerHr: 27,   // Overheads/ hr
  machineCostPerMin: 28, // Machine Cost/ min
  secondaryOpsCostPerMin: 29, // Secondary Ops Cost / min
  labourProcessingCost: 30, // Labour/Processing Cost
  totalCostPerPart: 31, // Total Cost/part
  margin: 32,           // Margin
  unitPrice: 33,        // Unit Price (€)
};

// Find the header row (the row with "Part Number", "Description", etc.)
function findHeaderRow(data: unknown[][]): number {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    if (rowStr.includes('part number') || rowStr.includes('description') || rowStr.includes('material name')) {
      return i;
    }
  }
  return 1; // Default to row 1 (after headers in row 0)
}

export function parseQuotationTemplateExcel(file: File): Promise<ParsedQuotationData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Get the first sheet (the main quotation sheet)
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        // Find header row
        const headerRowIndex = findHeaderRow(rawData);
        console.log(`Header row found at index: ${headerRowIndex}`);
        
        const parts: ParsedQuotationPart[] = [];
        let totalQuotedPrice = 0;
        let totalCost = 0;
        let marginSum = 0;
        let marginCount = 0;
        let lineCounter = 0; // Use auto-incrementing line number
        
        // Start parsing from the row after headers
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length < 5) continue;
          
          // Get line number from sheet (can be decimal like 1.1, 1.2)
          const lineNumFromSheet = parseNumber(row[COLUMN_MAP.lineNumber]);
          if (lineNumFromSheet === null || lineNumFromSheet < 1 || lineNumFromSheet > 30) continue;
          
          // Get part number - skip if empty
          const partNumber = normalizeString(row[COLUMN_MAP.partNumber]);
          const unitPrice = parseNumber(row[COLUMN_MAP.unitPrice]);
          
          // Skip empty rows (no part number and no unit price)
          if (!partNumber && !unitPrice) continue;
          
          const quantity = parseNumber(row[COLUMN_MAP.quantity]);
          const totalCostPerPart = parseNumber(row[COLUMN_MAP.totalCostPerPart]);
          const margin = parsePercentage(row[COLUMN_MAP.margin]);
          
          // Use auto-incrementing integer for line_number (database requires integer)
          lineCounter++;
          
          const part: ParsedQuotationPart = {
            line_number: lineCounter,
            part_number: partNumber,
            description: normalizeString(row[COLUMN_MAP.description]),
            quantity: quantity,
            // Material
            material_name: normalizeString(row[COLUMN_MAP.materialName]),
            material_qty_per_unit: parseNumber(row[COLUMN_MAP.materialQtyPerUnit]),
            material_std_cost_est: parseNumber(row[COLUMN_MAP.materialStdCostEst]),
            material_markup: parsePercentage(row[COLUMN_MAP.materialMarkup]),
            total_material: parseNumber(row[COLUMN_MAP.totalMaterial]),
            // Subcon
            subcon_cost: parseNumber(row[COLUMN_MAP.subcon]),
            subcon_markup: parsePercentage(row[COLUMN_MAP.subconMarkup]),
            subcon_cost_per_part: parseNumber(row[COLUMN_MAP.subconCostPerPart]),
            // Development
            resource: normalizeString(row[COLUMN_MAP.resource]),
            volume: parseNumber(row[COLUMN_MAP.volume]),
            development_time: parseNumber(row[COLUMN_MAP.developmentTime]),
            days_dev_time: parseNumber(row[COLUMN_MAP.daysDev]),
            shift: parseNumber(row[COLUMN_MAP.shift]),
            dev_time_cost: parseNumber(row[COLUMN_MAP.devTimeCost]),
            tooling: parseNumber(row[COLUMN_MAP.tooling]),
            nre: parseNumber(row[COLUMN_MAP.nre]),
            // Routing
            machine_manning: normalizeString(row[COLUMN_MAP.machineManning]),
            machine_setup: parseNumber(row[COLUMN_MAP.machineSetup]),
            machine_run_time: parseNumber(row[COLUMN_MAP.machineRunTime]),
            part_deburr: parseNumber(row[COLUMN_MAP.partDeburr]),
            wash: parseNumber(row[COLUMN_MAP.wash]),
            labour_per_hr: parseNumber(row[COLUMN_MAP.labourPerHr]),
            overheads_per_hr: parseNumber(row[COLUMN_MAP.overheadsPerHr]),
            machine_cost_per_min: parseNumber(row[COLUMN_MAP.machineCostPerMin]),
            secondary_ops_cost_per_min: parseNumber(row[COLUMN_MAP.secondaryOpsCostPerMin]),
            labour_processing_cost: parseNumber(row[COLUMN_MAP.labourProcessingCost]),
            // Price
            total_cost_per_part: totalCostPerPart,
            margin: margin,
            unit_price: unitPrice,
          };
          
          parts.push(part);
          
          // Calculate totals
          if (unitPrice && quantity) {
            totalQuotedPrice += unitPrice * quantity;
          }
          if (totalCostPerPart && quantity) {
            totalCost += totalCostPerPart * quantity;
          }
          if (margin !== null) {
            marginSum += margin;
            marginCount++;
          }
        }
        
        if (parts.length === 0) {
          reject(new Error('No valid parts found in the quotation template. Please check the file format.'));
          return;
        }
        
        const averageMargin = marginCount > 0 ? marginSum / marginCount : 0;
        
        console.log(`Parsed ${parts.length} parts from quotation template`);
        
        resolve({
          parts,
          totals: {
            total_quoted_price: Math.round(totalQuotedPrice * 100) / 100,
            total_cost: Math.round(totalCost * 100) / 100,
            average_margin: Math.round(averageMargin * 1000) / 1000,
          }
        });
      } catch (error) {
        console.error('Parse error:', error);
        reject(error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}
