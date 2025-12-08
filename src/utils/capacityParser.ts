import * as XLSX from 'xlsx';
import { CleanedJob, MachineSchedule, GanttJob, CapacityData } from '@/types/capacity';
import { format, startOfWeek, addHours, isAfter } from 'date-fns';

// Headers to ignore when detecting resource names
const IGNORED_RESOURCE_VALUES = [
  'process order',
  'production plan',
  'product status',
  'days from today',
  'production order',
  'op no.',
  'endproduct',
  'itemname',
  'sales order',
  'customer code',
  'start date',
  'time',
  'qty',
  'fg commit date',
  'priority',
  'comments',
];

// Expected header columns for validation
const EXPECTED_HEADER_COLUMNS = [
  'Process Order',
  'Production Order', 
  'Op No.',
  'EndProduct',
  'ItemName',
  'Sales Order',
  'Customer Code',
  'Start Date',
  'Time',
  'Qty',
  'Days From Today',
  'Product Status',
  'FG Commit Date',
  'Priority',
  'Comments',
];

function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  
  // Handle Excel serial date numbers
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0);
    }
  }
  
  // Handle string dates
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Try DD/MM/YYYY format
    const parts = value.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  if (value instanceof Date) {
    return value;
  }
  
  return null;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number' && !isNaN(value)) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' && !isNaN(Number(trimmed));
  }
  return false;
}

function isBlankRow(row: unknown[]): boolean {
  if (!row || !Array.isArray(row)) return true;
  return row.every(cell => cell === null || cell === undefined || cell === '' || 
    (typeof cell === 'number' && isNaN(cell)));
}

function isHeaderRow(row: unknown[]): boolean {
  const firstCell = String(row[0] || '').trim();
  return firstCell.toLowerCase() === 'process order';
}

function isResourceRow(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const strValue = String(value).trim().toLowerCase();
  if (strValue === '') return false;
  
  // Not a resource if it's a known header value
  if (IGNORED_RESOURCE_VALUES.includes(strValue)) return false;
  
  // Not a resource if it's numeric (job row)
  if (isNumericValue(value)) return false;
  
  return true;
}

function buildHeaderMap(row: unknown[]): Record<string, number> {
  const headerMap: Record<string, number> = {};
  row.forEach((cell, index) => {
    const header = String(cell || '').trim();
    if (header) {
      headerMap[header] = index;
    }
  });
  return headerMap;
}

export function parseCapacityFile(file: File): Promise<CapacityData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Always read Sheet1, fallback to first sheet
        let sheetName = 'Sheet1';
        if (!workbook.SheetNames.includes(sheetName)) {
          sheetName = workbook.SheetNames[0];
        }
        
        const sheet = workbook.Sheets[sheetName];
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        // State variables for hierarchical parsing
        let currentResource: string | null = null;
        let currentHeaderMap: Record<string, number> | null = null;
        let foundAnyHeader = false;
        
        const jobs: CleanedJob[] = [];
        
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i] as unknown[];
          
          // Skip blank rows
          if (isBlankRow(row)) continue;
          
          const firstCell = row[0];
          
          // Case B: Header row (starts with "Process Order")
          if (isHeaderRow(row)) {
            currentHeaderMap = buildHeaderMap(row);
            foundAnyHeader = true;
            continue;
          }
          
          // Case C: Job row (first cell is numeric and we have header + resource)
          if (currentHeaderMap && currentResource && isNumericValue(firstCell)) {
            const getValue = (header: string): unknown => {
              const index = currentHeaderMap![header];
              return index !== undefined ? row[index] : undefined;
            };
            
            const startDate = parseExcelDate(getValue('Start Date'));
            if (!startDate) continue; // Skip rows without valid start date
            
            const durationHours = parseNumber(getValue('Time'));
            const endDateTime = addHours(startDate, durationHours);
            
            const job: CleanedJob = {
              id: generateId(),
              Machine: currentResource,
              Process_Order: String(getValue('Process Order') || '').trim(),
              Production_Order: String(getValue('Production Order') || '').trim(),
              End_Product: String(getValue('EndProduct') || '').trim(),
              Item_Name: String(getValue('ItemName') || '').trim(),
              Customer: String(getValue('Customer Code') || '').trim(),
              Start_DateTime: startDate,
              Duration_Hours: durationHours,
              End_DateTime: endDateTime,
              Qty: parseNumber(getValue('Qty')),
              Days_From_Today: parseNumber(getValue('Days From Today')),
              Priority: parseNumber(getValue('Priority')),
              Status: String(getValue('Product Status') || '').trim(),
              Comments: String(getValue('Comments') || '').trim(),
            };
            
            jobs.push(job);
            continue;
          }
          
          // Case A: Resource/machine row (text, not a header, not numeric)
          if (isResourceRow(firstCell)) {
            currentResource = String(firstCell).trim();
            continue;
          }
        }
        
        // Validate that we found at least one header
        if (!foundAnyHeader) {
          reject(new Error(
            'Invalid file structure: No "Process Order" header row found. ' +
            'The file must follow the hierarchical format with resource names followed by header rows starting with "Process Order".'
          ));
          return;
        }
        
        if (jobs.length === 0) {
          reject(new Error(
            'No valid jobs found in the file. ' +
            'Please ensure the file contains job rows with numeric Process Order values and valid Start Dates.'
          ));
          return;
        }
        
        // Build machine schedules
        const machines = buildMachineSchedules(jobs);
        
        // Build Gantt jobs
        const ganttJobs = buildGanttJobs(jobs);
        
        resolve({
          jobs,
          machines,
          ganttJobs,
          uploadedAt: new Date(),
          fileName: file.name,
        });
        
      } catch (error) {
        reject(new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function buildMachineSchedules(jobs: CleanedJob[]): MachineSchedule[] {
  const machineMap = new Map<string, CleanedJob[]>();
  
  jobs.forEach(job => {
    const existing = machineMap.get(job.Machine) || [];
    existing.push(job);
    machineMap.set(job.Machine, existing);
  });
  
  const machines: MachineSchedule[] = [];
  
  machineMap.forEach((machineJobs, machineName) => {
    // Sort by start date
    machineJobs.sort((a, b) => a.Start_DateTime.getTime() - b.Start_DateTime.getTime());
    
    // Calculate totals
    const totalScheduledHours = machineJobs.reduce((sum, job) => sum + job.Duration_Hours, 0);
    
    // Hours per day
    const hoursPerDay: Record<string, number> = {};
    machineJobs.forEach(job => {
      const dayKey = format(job.Start_DateTime, 'yyyy-MM-dd');
      hoursPerDay[dayKey] = (hoursPerDay[dayKey] || 0) + job.Duration_Hours;
    });
    
    // Hours per week
    const hoursPerWeek: Record<string, number> = {};
    machineJobs.forEach(job => {
      const weekStart = startOfWeek(job.Start_DateTime, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      hoursPerWeek[weekKey] = (hoursPerWeek[weekKey] || 0) + job.Duration_Hours;
    });
    
    // Next free date (latest end date)
    const nextFreeDate = machineJobs.reduce((latest, job) => {
      return isAfter(job.End_DateTime, latest) ? job.End_DateTime : latest;
    }, new Date());
    
    // Calculate utilization (hours scheduled vs available in the period)
    const firstJob = machineJobs[0];
    const lastJob = machineJobs[machineJobs.length - 1];
    const periodHours = (lastJob.End_DateTime.getTime() - firstJob.Start_DateTime.getTime()) / (1000 * 60 * 60);
    const workingHoursInPeriod = periodHours * (8 / 24); // Assume 8 working hours per day
    const utilization = workingHoursInPeriod > 0 ? (totalScheduledHours / workingHoursInPeriod) * 100 : 0;
    
    machines.push({
      machine: machineName,
      totalScheduledHours,
      hoursPerDay,
      hoursPerWeek,
      nextFreeDate,
      jobs: machineJobs,
      utilization: Math.min(utilization, 100),
    });
  });
  
  // Sort by total hours descending (bottlenecks first)
  machines.sort((a, b) => b.totalScheduledHours - a.totalScheduledHours);
  
  return machines;
}

function buildGanttJobs(jobs: CleanedJob[]): GanttJob[] {
  return jobs.map(job => ({
    id: job.id,
    machine: job.Machine,
    jobName: `${job.Process_Order} - ${job.End_Product}`,
    startDateTime: job.Start_DateTime,
    endDateTime: job.End_DateTime,
    durationHours: job.Duration_Hours,
    priority: job.Priority,
    qty: job.Qty,
    processOrder: job.Process_Order,
    endProduct: job.End_Product,
  }));
}
