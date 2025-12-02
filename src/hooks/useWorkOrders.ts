import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrder, WorkCentre } from '@/types/workOrder';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Type for database row with Json type for operations_work_centres
type DbWorkOrder = Omit<WorkOrder, 'operations_work_centres'> & {
  operations_work_centres: Json;
};

function parseWorkCentres(data: Json): WorkCentre[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as WorkCentre[];
}

function transformDbToWorkOrder(row: DbWorkOrder): WorkOrder {
  return {
    ...row,
    operations_work_centres: parseWorkCentres(row.operations_work_centres),
  };
}

// Transform WorkOrder updates to DB-compatible format
function transformToDbUpdates(updates: Partial<WorkOrder>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...updates };
  if ('operations_work_centres' in updates) {
    result.operations_work_centres = updates.operations_work_centres as unknown as Json;
  }
  return result;
}

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchWorkOrders = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to load Blue Reviews');
      console.error(error);
    } else {
      setWorkOrders((data as unknown as DbWorkOrder[]).map(transformDbToWorkOrder));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const createWorkOrder = useCallback(async () => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('work_orders')
      .insert({ user_id: user.id })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to create Blue Review');
      console.error(error);
      return null;
    }
    
    const newOrder = transformDbToWorkOrder(data as unknown as DbWorkOrder);
    setWorkOrders(prev => [newOrder, ...prev]);
    toast.success('Blue Review created');
    return newOrder;
  }, [user]);

  const updateWorkOrder = useCallback(async (id: string, updates: Partial<WorkOrder>) => {
    const dbUpdates = transformToDbUpdates(updates);
    
    const { error } = await supabase
      .from('work_orders')
      .update(dbUpdates)
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to save changes');
      console.error(error);
      return false;
    }
    
    setWorkOrders(prev => prev.map(wo => 
      wo.id === id ? { ...wo, ...updates } as WorkOrder : wo
    ));
    return true;
  }, []);

  const deleteWorkOrder = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete Blue Review');
      console.error(error);
      return false;
    }
    
    setWorkOrders(prev => prev.filter(wo => wo.id !== id));
    toast.success('Blue Review deleted');
    return true;
  }, []);

  return {
    workOrders,
    loading,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    refetch: fetchWorkOrders,
  };
}

export function useWorkOrder(id: string | undefined) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetch() {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        toast.error('Failed to load Blue Review');
        console.error(error);
      } else if (data) {
        setWorkOrder(transformDbToWorkOrder(data as unknown as DbWorkOrder));
      }
      setLoading(false);
    }

    fetch();
  }, [id]);

  const updateWorkOrder = useCallback(async (updates: Partial<WorkOrder>) => {
    if (!id) return false;
    
    const dbUpdates = transformToDbUpdates(updates);
    
    const { error } = await supabase
      .from('work_orders')
      .update(dbUpdates)
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to save changes');
      console.error(error);
      return false;
    }
    
    setWorkOrder(prev => prev ? { ...prev, ...updates } as WorkOrder : null);
    return true;
  }, [id]);

  return { workOrder, loading, updateWorkOrder };
}
