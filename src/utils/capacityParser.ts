import * as XLSX from 'xlsx';
import { RawJobData, CleanedJob, MachineSchedule, GanttJob, CapacityData } from '@/types/capacity';
import { format, startOfWeek, addHours, isAfter } from 'date-fns';

// Column mapping from raw to clean schema
const COLUMN_MAP: Record<string, keyof CleanedJob> = {
  'Dept': 'Machine',
  'Process Order': 'Process_Order',
  'Production Order': 'Production_Order',
  'EndProduct': 'End_Product',
  'ItemName': 'Item_Name',
  'Customer Code': 'Customer',
  'Start Date': 'Start_DateTime',
  'Time': 'Duration_Hours',
  'Qty': 'Qty',
  'Days From Today': 'Days_From_Today',
  'Priority': 'Priority',
  'Product Status': 'Status',
  'Comments': 'Comments',
};

// Expected headers to detect the real header row
const EXPECTED_HEADERS = ['Dept', 'Process Order', 'Start Date', 'Time', 'Qty'];

function detectHeaderRow(data: unknown[][]): number {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const rowValues = row.map(cell => String(cell || '').trim());
    const matchCount = EXPECTED_HEADERS.filter(header => 
      rowValues.some(val => val.toLowerCase().includes(header.toLowerCase()))
    ).length;
    
    if (matchCount >= 3) {
      return i;
    }
  }
  return 0;
}

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

export function parseCapacityFile(file: File): Promise<CapacityData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Try to find "Download" sheet, fallback to first sheet
        let sheetName = 'Download';
        if (!workbook.SheetNames.includes(sheetName)) {
          sheetName = workbook.SheetNames[0];
        }
        
        const sheet = workbook.Sheets[sheetName];
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        // Detect header row
        const headerRowIndex = detectHeaderRow(rawData);
        const headerRow = rawData[headerRowIndex] as string[];
        
        // Build column index map
        const columnIndices: Record<string, number> = {};
        headerRow.forEach((header, index) => {
          const cleanHeader = String(header).trim();
          columnIndices[cleanHeader] = index;
        });
        
        // Parse data rows
        const jobs: CleanedJob[] = [];
        
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i] as unknown[];
          if (!row || row.every(cell => !cell)) continue;
          
          const getValue = (header: string): unknown => {
            const index = columnIndices[header];
            return index !== undefined ? row[index] : undefined;
          };
          
          const machine = String(getValue('Dept') || '').trim();
          if (!machine) continue;
          
          const startDate = parseExcelDate(getValue('Start Date'));
          if (!startDate) continue;
          
          const durationHours = parseNumber(getValue('Time'));
          const endDateTime = addHours(startDate, durationHours);
          
          const job: CleanedJob = {
            id: generateId(),
            Machine: machine,
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
