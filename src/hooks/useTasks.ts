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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    
    // Fetch user_roles with profiles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      setLoading(false);
      return;
    }

    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Combine data
    const combined = rolesData.map(role => {
      const profile = profilesData.find(p => p.user_id === role.user_id);
      return {
        id: role.user_id,
        email: profile?.email || '',
        full_name: profile?.full_name || null,
        role: role.role,
      };
    });

    setUsers(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getUsersByDepartment = useCallback((department: string) => {
    return users.filter(u => u.role === department);
  }, [users]);

  return {
    users,
    loading,
    getUsersByDepartment,
    refetch: fetchUsers,
  };
}
