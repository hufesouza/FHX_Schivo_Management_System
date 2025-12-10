import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CleanedJob, MachineSchedule, GanttJob, CapacityData } from '@/types/capacity';
import { toast } from 'sonner';
import { format, startOfWeek, addHours, isAfter } from 'date-fns';

type DepartmentType = 'milling' | 'turning' | 'sliding_head' | 'misc';

interface ProductionJob {
  id: string;
  process_order: string;
  production_order: string | null;
  machine: string;
  original_machine: string;
  department: string;
  end_product: string | null;
  item_name: string | null;
  customer: string | null;
  start_datetime: string;
  duration_hours: number;
  original_duration_hours: number;
  qty: number;
  days_from_today: number;
  priority: number;
  status: string;
  comments: string | null;
  is_manually_moved: boolean;
  moved_by: string | null;
  moved_at: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface MergeResult {
  added: number;
  removed: number;
  preserved: number;
  skipped: number;
}

// Convert DB row to CleanedJob
function dbToCleanedJob(row: ProductionJob): CleanedJob {
  const startDateTime = new Date(row.start_datetime);
  const endDateTime = addHours(startDateTime, row.duration_hours);
  
  return {
    id: row.id,
    Machine: row.machine,
    Process_Order: row.process_order,
    Production_Order: row.production_order || '',
    End_Product: row.end_product || '',
    Item_Name: row.item_name || '',
    Customer: row.customer || '',
    Start_DateTime: startDateTime,
    Duration_Hours: row.duration_hours,
    End_DateTime: endDateTime,
    Qty: row.qty,
    Days_From_Today: row.days_from_today,
    Priority: row.priority,
    Status: row.status,
    Comments: row.comments || '',
  };
}

// Build MachineSchedule from jobs (same logic as parser)
function buildMachineSchedules(jobs: CleanedJob[]): MachineSchedule[] {
  const machineMap = new Map<string, CleanedJob[]>();
  
  jobs.forEach(job => {
    const existing = machineMap.get(job.Machine) || [];
    existing.push(job);
    machineMap.set(job.Machine, existing);
  });
  
  const machines: MachineSchedule[] = [];
  
  machineMap.forEach((machineJobs, machineName) => {
    machineJobs.sort((a, b) => a.Start_DateTime.getTime() - b.Start_DateTime.getTime());
    
    const totalScheduledHours = machineJobs.reduce((sum, job) => sum + job.Duration_Hours, 0);
    
    const hoursPerDay: Record<string, number> = {};
    machineJobs.forEach(job => {
      const dayKey = format(job.Start_DateTime, 'yyyy-MM-dd');
      hoursPerDay[dayKey] = (hoursPerDay[dayKey] || 0) + job.Duration_Hours;
    });
    
    const hoursPerWeek: Record<string, number> = {};
    machineJobs.forEach(job => {
      const weekStart = startOfWeek(job.Start_DateTime, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      hoursPerWeek[weekKey] = (hoursPerWeek[weekKey] || 0) + job.Duration_Hours;
    });
    
    const nextFreeDate = machineJobs.reduce((latest, job) => {
      return isAfter(job.End_DateTime, latest) ? job.End_DateTime : latest;
    }, new Date());
    
    const firstJob = machineJobs[0];
    const lastJob = machineJobs[machineJobs.length - 1];
    const periodDays = Math.max(1, Math.ceil((lastJob.End_DateTime.getTime() - firstJob.Start_DateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const availableHours = periodDays * 24;
    const utilization = availableHours > 0 ? (totalScheduledHours / availableHours) * 100 : 0;
    
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

export function useProductionJobs() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all jobs - Supabase has a 1000 row default limit, so we need to paginate
      let allJobs: ProductionJob[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('production_jobs')
          .select('*')
          .order('start_datetime', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('Error fetching production jobs:', error);
          toast.error('Failed to load production jobs');
          return;
        }

        if (data && data.length > 0) {
          allJobs = [...allJobs, ...data];
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Loaded ${allJobs.length} total production jobs`);
      setJobs(allJobs);
    } catch (error) {
      console.error('Error fetching production jobs:', error);
      toast.error('Failed to load production jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Smart merge: add new, preserve manual moves, remove completed
  const mergeJobs = useCallback(async (
    newJobs: CleanedJob[],
    department: DepartmentType,
    userId: string,
    fileName: string
  ): Promise<MergeResult> => {
    const result: MergeResult = { added: 0, removed: 0, preserved: 0, skipped: 0 };

    // Get existing jobs for this department
    const { data: existingJobs, error: fetchError } = await supabase
      .from('production_jobs')
      .select('*')
      .eq('department', department);

    if (fetchError) {
      throw new Error(`Failed to fetch existing jobs: ${fetchError.message}`);
    }

    const existingMap = new Map<string, ProductionJob>();
    (existingJobs || []).forEach(job => {
      existingMap.set(job.process_order, job);
    });

    const newProcessOrders = new Set(newJobs.map(j => j.Process_Order));

    // Dedupe new jobs by process_order (keep last occurrence)
    const deduped = new Map<string, CleanedJob>();
    newJobs.forEach(job => {
      deduped.set(job.Process_Order, job);
    });
    const uniqueNewJobs = Array.from(deduped.values());

    // 1. Find jobs to remove (in DB but not in new upload, and not manually moved)
    const toRemove = (existingJobs || []).filter(job => 
      !newProcessOrders.has(job.process_order) && !job.is_manually_moved
    );

    // 2. Find jobs to add (in new upload but not in DB)
    const toAdd = uniqueNewJobs.filter(job => !existingMap.has(job.Process_Order));

    // 3. Find manually moved jobs to preserve
    const manuallyMoved = (existingJobs || []).filter(job => 
      job.is_manually_moved && newProcessOrders.has(job.process_order)
    );

    // 4. Find jobs already in DB (skip)
    const skipped = uniqueNewJobs.filter(job => existingMap.has(job.Process_Order));

    console.log(`Merge stats for ${department}:`, {
      newJobs: uniqueNewJobs.length,
      existingJobs: existingJobs?.length || 0,
      toRemove: toRemove.length,
      toAdd: toAdd.length,
      manuallyMoved: manuallyMoved.length,
      skipped: skipped.length - manuallyMoved.length
    });

    // Execute removals in batches
    if (toRemove.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < toRemove.length; i += BATCH_SIZE) {
        const batch = toRemove.slice(i, i + BATCH_SIZE);
        const removeIds = batch.map(j => j.id);
        const { error: deleteError } = await supabase
          .from('production_jobs')
          .delete()
          .in('id', removeIds);

        if (deleteError) {
          console.error('Error removing jobs batch:', deleteError);
        }
      }
      result.removed = toRemove.length;
    }

    // Execute additions in batches to handle large datasets
    if (toAdd.length > 0) {
      const BATCH_SIZE = 500;
      let totalInserted = 0;
      
      for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
        const batch = toAdd.slice(i, i + BATCH_SIZE);
        const insertData = batch.map(job => ({
          process_order: job.Process_Order,
          production_order: job.Production_Order || null,
          machine: job.Machine,
          original_machine: job.Machine,
          department,
          end_product: job.End_Product || null,
          item_name: job.Item_Name || null,
          customer: job.Customer || null,
          start_datetime: job.Start_DateTime.toISOString(),
          duration_hours: job.Duration_Hours,
          original_duration_hours: job.Duration_Hours,
          qty: Math.round(job.Qty || 0),
          days_from_today: Math.round(job.Days_From_Today || 0),
          priority: Math.round(job.Priority || 0),
          status: job.Status || 'scheduled',
          comments: job.Comments || null,
          is_manually_moved: false,
          uploaded_by: userId,
        }));

        const { error: insertError } = await supabase
          .from('production_jobs')
          .upsert(insertData, { 
            onConflict: 'process_order,department',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
          throw new Error(`Failed to insert jobs: ${insertError.message}`);
        }
        
        totalInserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toAdd.length / BATCH_SIZE)} (${totalInserted}/${toAdd.length} jobs)`);
      }
      
      result.added = totalInserted;
    }

    result.preserved = manuallyMoved.length;
    result.skipped = skipped.length - manuallyMoved.length;

    await fetchJobs();
    return result;
  }, [fetchJobs]);

  // Move a job to a different machine
  const moveJob = useCallback(async (
    processOrder: string,
    department: DepartmentType,
    toMachine: string,
    newDuration: number,
    newStartDate?: Date,
    newPriority?: number,
    userId?: string,
    reason?: string
  ) => {
    // Find the job
    const job = jobs.find(j => j.process_order === processOrder && j.department === department);
    if (!job) {
      throw new Error(`Job with process order ${processOrder} not found`);
    }

    // Record move history
    if (userId) {
      await supabase.from('job_move_history').insert({
        job_id: job.id,
        from_machine: job.machine,
        to_machine: toMachine,
        old_duration_hours: job.duration_hours,
        new_duration_hours: newDuration,
        old_start_datetime: job.start_datetime,
        new_start_datetime: newStartDate?.toISOString() || job.start_datetime,
        moved_by: userId,
        reason: reason || null,
      });
    }

    // Update the job
    const updates: Partial<ProductionJob> = {
      machine: toMachine,
      duration_hours: newDuration,
      is_manually_moved: true,
      moved_by: userId || null,
      moved_at: new Date().toISOString(),
    };

    if (newStartDate) {
      updates.start_datetime = newStartDate.toISOString();
    }

    if (newPriority !== undefined) {
      updates.priority = newPriority;
    }

    const { error } = await supabase
      .from('production_jobs')
      .update(updates)
      .eq('id', job.id);

    if (error) {
      throw new Error(`Failed to move job: ${error.message}`);
    }

    await fetchJobs();
    toast.success(`Job ${processOrder} moved to ${toMachine}`);
  }, [jobs, fetchJobs]);

  // Get CapacityData for a specific department
  const getCapacityData = useCallback((department: DepartmentType, fileName: string): CapacityData | null => {
    const deptJobs = jobs.filter(j => j.department === department);
    if (deptJobs.length === 0) return null;

    const cleanedJobs = deptJobs.map(dbToCleanedJob);
    
    return {
      jobs: cleanedJobs,
      machines: buildMachineSchedules(cleanedJobs),
      ganttJobs: buildGanttJobs(cleanedJobs),
      uploadedAt: new Date(),
      fileName,
    };
  }, [jobs]);

  // Clear all jobs for a department
  const clearDepartment = useCallback(async (department: DepartmentType) => {
    const { error } = await supabase
      .from('production_jobs')
      .delete()
      .eq('department', department);

    if (error) {
      throw new Error(`Failed to clear jobs: ${error.message}`);
    }

    await fetchJobs();
  }, [fetchJobs]);

  // Clear all jobs
  const clearAllJobs = useCallback(async () => {
    const { error } = await supabase
      .from('production_jobs')
      .delete()
      .neq('department', '');

    if (error) {
      throw new Error(`Failed to clear all jobs: ${error.message}`);
    }

    setJobs([]);
  }, []);

  // Get unique machines for a department
  const getMachinesForDepartment = useCallback((department: DepartmentType): string[] => {
    const deptJobs = jobs.filter(j => j.department === department);
    const machines = new Set(deptJobs.map(j => j.machine));
    return Array.from(machines).sort();
  }, [jobs]);

  // Find a job by process order
  const findJob = useCallback((processOrder: string, department: DepartmentType) => {
    return jobs.find(j => j.process_order === processOrder && j.department === department);
  }, [jobs]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    mergeJobs,
    moveJob,
    getCapacityData,
    clearDepartment,
    clearAllJobs,
    getMachinesForDepartment,
    findJob,
    refetch: fetchJobs,
  };
}
