import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CapacityData } from '@/types/capacity';
import { toast } from 'sonner';

type DepartmentType = 'milling' | 'turning' | 'sliding_head' | 'misc';

interface StoredCapacityData {
  id: string;
  department: DepartmentType;
  data: CapacityData;
  file_name: string;
  uploaded_at: string;
  uploaded_by: string;
}

// Convert date strings back to Date objects
const hydrateCapacityData = (data: any): CapacityData => {
  return {
    ...data,
    uploadedAt: new Date(data.uploadedAt),
    jobs: data.jobs.map((job: any) => ({
      ...job,
      Start_DateTime: new Date(job.Start_DateTime),
      End_DateTime: new Date(job.End_DateTime),
    })),
    machines: data.machines.map((machine: any) => ({
      ...machine,
      nextFreeDate: new Date(machine.nextFreeDate),
    })),
    ganttJobs: data.ganttJobs.map((job: any) => ({
      ...job,
      startDateTime: new Date(job.startDateTime),
      endDateTime: new Date(job.endDateTime),
    })),
  };
};

export function useCapacityData() {
  const [millingData, setMillingData] = useState<CapacityData | null>(null);
  const [turningData, setTurningData] = useState<CapacityData | null>(null);
  const [slidingHeadData, setSlidingHeadData] = useState<CapacityData | null>(null);
  const [miscData, setMiscData] = useState<CapacityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCapacityData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('capacity_data')
        .select('*');

      if (error) {
        console.error('Error fetching capacity data:', error);
        toast.error('Failed to load capacity data');
        return;
      }

      // Reset all data first
      setMillingData(null);
      setTurningData(null);
      setSlidingHeadData(null);
      setMiscData(null);

      // Process each department's data
      data?.forEach((row: any) => {
        const capacityData = hydrateCapacityData(row.data);
        
        switch (row.department as DepartmentType) {
          case 'milling':
            setMillingData(capacityData);
            break;
          case 'turning':
            setTurningData(capacityData);
            break;
          case 'sliding_head':
            setSlidingHeadData(capacityData);
            break;
          case 'misc':
            setMiscData(capacityData);
            break;
        }
      });
    } catch (error) {
      console.error('Error fetching capacity data:', error);
      toast.error('Failed to load capacity data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCapacityData = useCallback(async (
    department: DepartmentType,
    data: CapacityData | null,
    userId: string
  ) => {
    if (!data) {
      // Delete the data for this department
      const { error } = await supabase
        .from('capacity_data')
        .delete()
        .eq('department', department);

      if (error) {
        console.error('Error deleting capacity data:', error);
        throw error;
      }
      return;
    }

    // Upsert the data (insert or update based on department)
    const { error } = await supabase
      .from('capacity_data')
      .upsert({
        department,
        data: data as any, // Store as JSONB
        file_name: data.fileName,
        uploaded_at: data.uploadedAt.toISOString(),
        uploaded_by: userId,
      }, {
        onConflict: 'department',
      });

    if (error) {
      console.error('Error saving capacity data:', error);
      throw error;
    }
  }, []);

  const clearAllData = useCallback(async () => {
    const { error } = await supabase
      .from('capacity_data')
      .delete()
      .neq('department', ''); // Delete all rows

    if (error) {
      console.error('Error clearing capacity data:', error);
      throw error;
    }

    setMillingData(null);
    setTurningData(null);
    setSlidingHeadData(null);
    setMiscData(null);
  }, []);

  useEffect(() => {
    fetchCapacityData();
  }, [fetchCapacityData]);

  return {
    millingData,
    turningData,
    slidingHeadData,
    miscData,
    setMillingData,
    setTurningData,
    setSlidingHeadData,
    setMiscData,
    isLoading,
    saveCapacityData,
    clearAllData,
    refetch: fetchCapacityData,
  };
}
