export interface RawJobData {
  Week?: string | number;
  Dept?: string;
  'Process Order'?: string;
  'Production Order'?: string;
  EndProduct?: string;
  ItemName?: string;
  'Customer Code'?: string;
  'Start Date'?: string | number | Date;
  Time?: string | number;
  Qty?: string | number;
  'Days From Today'?: string | number;
  Priority?: string | number;
  'Product Status'?: string;
  Comments?: string;
  [key: string]: unknown;
}

export interface CleanedJob {
  id: string;
  Machine: string;
  Process_Order: string;
  Operation_No: string;
  Production_Order: string;
  End_Product: string;
  Item_Name: string;
  Customer: string;
  Start_DateTime: Date;
  Duration_Hours: number;
  End_DateTime: Date;
  Qty: number;
  Days_From_Today: number;
  Priority: number;
  Status: string;
  Comments: string;
}

export interface MachineSchedule {
  machine: string;
  totalScheduledHours: number;
  hoursPerDay: Record<string, number>;
  hoursPerWeek: Record<string, number>;
  nextFreeDate: Date;
  jobs: CleanedJob[];
  utilization: number;
}

export interface GanttJob {
  id: string;
  machine: string;
  jobName: string;
  startDateTime: Date;
  endDateTime: Date;
  durationHours: number;
  priority: number;
  qty: number;
  processOrder: string;
  endProduct: string;
}

export interface CapacityData {
  jobs: CleanedJob[];
  machines: MachineSchedule[];
  ganttJobs: GanttJob[];
  uploadedAt: Date;
  fileName: string;
}
