import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Task {
  id: string;
  work_order_id: string;
  assigned_to: string;
  assigned_by: string | null;
  department: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  work_order?: {
    work_order_number: string | null;
    customer: string | null;
    part_and_rev: string | null;
    current_stage: string;
  } | null;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        work_order:work_orders(work_order_number, customer, part_and_rev, current_stage)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tasks');
      console.error(error);
    } else {
      // Transform the data to flatten work_order
      const transformedTasks = (data || []).map(task => ({
        ...task,
        work_order: task.work_order as Task['work_order'],
      }));
      setTasks(transformedTasks);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getMyTasks = useCallback(() => {
    if (!user) return [];
    return tasks.filter(t => t.assigned_to === user.id && t.status === 'pending');
  }, [tasks, user]);

  const getAllPendingTasks = useCallback(() => {
    return tasks.filter(t => t.status === 'pending');
  }, [tasks]);

  return {
    tasks,
    loading,
    getMyTasks,
    getAllPendingTasks,
    refetch: fetchTasks,
  };
}

export function useUsersByRole() {
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersByDept, setUsersByDept] = useState<Record<string, { id: string; email: string; full_name: string | null }[]>>({});

  const fetchUsersByDepartment = useCallback(async (department: string) => {
    const { data, error } = await supabase.rpc('get_users_by_department', { _department: department });
    
    if (error) {
      console.error('Error fetching users by department:', error);
      return [];
    }
    
    return (data || []).map((u: { user_id: string; email: string; full_name: string | null }) => ({
      id: u.user_id,
      email: u.email || '',
      full_name: u.full_name,
    }));
  }, []);

  // Pre-fetch all departments on mount
  useEffect(() => {
    const departments = ['engineering', 'operations', 'quality', 'npi', 'supply_chain'];
    
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<string, { id: string; email: string; full_name: string | null }[]> = {};
      
      for (const dept of departments) {
        results[dept] = await fetchUsersByDepartment(dept);
      }
      
      setUsersByDept(results);
      
      // Also populate the flat users array for backward compatibility
      const allUsers: { id: string; email: string; full_name: string | null; role: string }[] = [];
      for (const [role, deptUsers] of Object.entries(results)) {
        for (const user of deptUsers) {
          allUsers.push({ ...user, role });
        }
      }
      setUsers(allUsers);
      setLoading(false);
    };
    
    fetchAll();
  }, [fetchUsersByDepartment]);

  const getUsersByDepartment = useCallback((department: string) => {
    return usersByDept[department] || [];
  }, [usersByDept]);

  return {
    users,
    loading,
    getUsersByDepartment,
    refetch: () => {},
  };
}
