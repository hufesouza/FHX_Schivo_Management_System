import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourceConfiguration {
  id: string;
  resource_name: string;
  department: string;
  working_hours_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DepartmentType = 'milling' | 'turning' | 'sliding_head' | 'misc';

const DEPARTMENT_OPTIONS: { value: DepartmentType; label: string }[] = [
  { value: 'milling', label: 'Milling' },
  { value: 'turning', label: 'Turning' },
  { value: 'sliding_head', label: 'Sliding Heads' },
  { value: 'misc', label: 'Misc' },
];

export function useResourceConfigurations() {
  const [configurations, setConfigurations] = useState<ResourceConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfigurations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('resource_configurations')
        .select('*')
        .order('resource_name', { ascending: true });

      if (error) {
        console.error('Error fetching resource configurations:', error);
        return;
      }

      setConfigurations(data || []);
    } catch (error) {
      console.error('Error fetching resource configurations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get configuration for a specific resource
  const getResourceConfig = useCallback((resourceName: string): ResourceConfiguration | null => {
    return configurations.find(c => c.resource_name === resourceName) || null;
  }, [configurations]);

  // Get working hours for a resource (default 24 if not configured)
  const getWorkingHours = useCallback((resourceName: string): number => {
    const config = getResourceConfig(resourceName);
    return config?.working_hours_per_day ?? 24;
  }, [getResourceConfig]);

  // Get department for a resource
  const getResourceDepartment = useCallback((resourceName: string): DepartmentType | null => {
    const config = getResourceConfig(resourceName);
    return config?.department as DepartmentType || null;
  }, [getResourceConfig]);

  // Create or update configuration
  const upsertConfiguration = useCallback(async (
    resourceName: string,
    department: DepartmentType,
    workingHoursPerDay: number
  ) => {
    const { error } = await supabase
      .from('resource_configurations')
      .upsert({
        resource_name: resourceName,
        department,
        working_hours_per_day: workingHoursPerDay,
      }, {
        onConflict: 'resource_name',
      });

    if (error) {
      console.error('Error upserting resource configuration:', error);
      toast.error('Failed to save resource configuration');
      throw error;
    }

    await fetchConfigurations();
    toast.success(`Configuration saved for ${resourceName}`);
  }, [fetchConfigurations]);

  // Bulk upsert (for initializing from job data)
  const bulkUpsertConfigurations = useCallback(async (
    resources: { name: string; department: DepartmentType }[]
  ) => {
    const existingNames = new Set(configurations.map(c => c.resource_name));
    const newResources = resources.filter(r => !existingNames.has(r.name));

    if (newResources.length === 0) return;

    const insertData = newResources.map(r => ({
      resource_name: r.name,
      department: r.department,
      working_hours_per_day: 24, // Default
    }));

    const { error } = await supabase
      .from('resource_configurations')
      .upsert(insertData, {
        onConflict: 'resource_name',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('Error bulk upserting resource configurations:', error);
      return;
    }

    await fetchConfigurations();
  }, [configurations, fetchConfigurations]);

  // Delete configuration
  const deleteConfiguration = useCallback(async (resourceName: string) => {
    const { error } = await supabase
      .from('resource_configurations')
      .delete()
      .eq('resource_name', resourceName);

    if (error) {
      console.error('Error deleting resource configuration:', error);
      toast.error('Failed to delete resource configuration');
      throw error;
    }

    await fetchConfigurations();
    toast.success(`Configuration deleted for ${resourceName}`);
  }, [fetchConfigurations]);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  return {
    configurations,
    isLoading,
    getResourceConfig,
    getWorkingHours,
    getResourceDepartment,
    upsertConfiguration,
    bulkUpsertConfigurations,
    deleteConfiguration,
    refetch: fetchConfigurations,
    departmentOptions: DEPARTMENT_OPTIONS,
  };
}
