import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface QuotationReviewTask {
  id: string;
  enquiry_id: string;
  assigned_to: string;
  assigned_by: string | null;
  status: 'pending' | 'completed';
  task_type: 'review' | 'revision';
  comments: string | null;
  created_at: string;
  completed_at: string | null;
  enquiry?: {
    enquiry_no: string;
    customer_name: string;
    total_quoted_value: number | null;
    average_margin: number | null;
  };
}

export function useQuotationReviewTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<QuotationReviewTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotation_review_tasks')
        .select(`
          *,
          enquiry:quotation_enquiries(enquiry_no, customer_name, total_quoted_value, average_margin)
        `)
        .eq('assigned_to', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedTasks: QuotationReviewTask[] = (data || []).map(task => ({
        ...task,
        status: task.status as 'pending' | 'completed',
        task_type: task.task_type as 'review' | 'revision',
        enquiry: task.enquiry as QuotationReviewTask['enquiry']
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error fetching review tasks:', error);
      toast.error('Failed to load review tasks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const getPendingCount = useCallback(() => {
    return tasks.filter(t => t.status === 'pending').length;
  }, [tasks]);

  return {
    tasks,
    loading,
    getPendingCount,
    refetch: fetchMyTasks
  };
}
