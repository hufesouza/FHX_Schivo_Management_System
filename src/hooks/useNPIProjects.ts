import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { 
  NPIProject, 
  NPIProjectCharter, 
  NPIPhaseTask,
  NPIProjectTeamMember, 
  NPIProjectMilestone,
  NPIProjectWithRelations
} from '@/types/npiProject';
import { DEFAULT_PHASE_TASKS, DEFAULT_PHASE_GATES, DEFAULT_MILESTONES } from '@/types/npiProject';

export function useNPIProjects() {
  const [projects, setProjects] = useState<NPIProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('npi_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithRelations: NPIProjectWithRelations[] = await Promise.all(
        (projectsData || []).map(async (project) => {
          let projectManager = null;
          if (project.project_manager_id) {
            const { data: pmData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', project.project_manager_id)
              .single();
            projectManager = pmData;
          }

          return {
            ...project,
            project_manager: projectManager,
          } as NPIProjectWithRelations;
        })
      );

      setProjects(projectsWithRelations);
    } catch (error: any) {
      console.error('Error fetching NPI projects:', error);
      toast.error('Failed to load NPI projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (
    projectData: Partial<NPIProject>
  ) => {
    if (!user) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const projectNumber = `NPI-${timestamp}${random}`;

      const { data, error } = await supabase
        .from('npi_projects')
        .insert({
          project_name: projectData.project_name || 'New Project',
          customer: projectData.customer,
          description: projectData.description,
          project_type: projectData.project_type || 'simple',
          project_number: projectNumber,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default charter
      await supabase.from('npi_project_charter').insert({ project_id: data.id });

      // Create default phase tasks
      const tasksToInsert = DEFAULT_PHASE_TASKS.map(task => ({
        ...task,
        project_id: data.id,
      }));
      await supabase.from('npi_phase_tasks').insert(tasksToInsert);

      // Create default gates
      const gatesToInsert = DEFAULT_PHASE_GATES.map(gate => ({
        ...gate,
        project_id: data.id,
      }));
      await supabase.from('npi_phase_gates').insert(gatesToInsert);

      // Create default milestones
      const milestonesToInsert = DEFAULT_MILESTONES.map(m => ({
        ...m,
        project_id: data.id,
      }));
      await supabase.from('npi_project_milestones').insert(milestonesToInsert);

      toast.success(`Project ${projectNumber} created successfully`);
      fetchProjects();
      return data;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  }, [user, fetchProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<NPIProject>) => {
    try {
      const { error } = await supabase
        .from('npi_projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Project updated');
      fetchProjects();
      return true;
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      return false;
    }
  }, [fetchProjects]);

  return { projects, loading, fetchProjects, createProject, updateProject };
}

export function useNPIProjectDetail(projectId: string | undefined) {
  const [project, setProject] = useState<NPIProjectWithRelations | null>(null);
  const [charter, setCharter] = useState<NPIProjectCharter | null>(null);
  const [tasks, setTasks] = useState<NPIPhaseTask[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [team, setTeam] = useState<NPIProjectTeamMember[]>([]);
  const [milestones, setMilestones] = useState<NPIProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('npi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: charterData } = await supabase
        .from('npi_project_charter')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      const { data: tasksData } = await supabase
        .from('npi_phase_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');

      const { data: gatesData } = await supabase
        .from('npi_phase_gates')
        .select('*')
        .eq('project_id', projectId);

      const { data: teamData } = await supabase
        .from('npi_project_team')
        .select('*')
        .eq('project_id', projectId);

      const { data: milestonesData } = await supabase
        .from('npi_project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');

      setProject(projectData as NPIProjectWithRelations);
      setCharter(charterData as NPIProjectCharter | null);
      setTasks((tasksData || []) as NPIPhaseTask[]);
      setGates(gatesData || []);
      setTeam((teamData || []) as NPIProjectTeamMember[]);
      setMilestones((milestonesData || []) as NPIProjectMilestone[]);
    } catch (error: any) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<NPIPhaseTask>) => {
    if (!user) return false;
    try {
      const finalUpdates: any = { ...updates };
      
      // If completing, add completion metadata
      if (updates.status === 'completed') {
        finalUpdates.completed_date = new Date().toISOString();
        finalUpdates.completed_by = user.id;
      } else if (updates.status === 'not_started') {
        finalUpdates.completed_date = null;
        finalUpdates.completed_by = null;
        finalUpdates.started_date = null;
      } else if (updates.status === 'in_progress' && !updates.started_date) {
        finalUpdates.started_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('npi_phase_tasks')
        .update(finalUpdates)
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('Task updated');
      await fetchProject();
      return true;
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      return false;
    }
  }, [user, fetchProject]);

  const updateProject = useCallback(async (updates: Partial<NPIProject>) => {
    if (!projectId) return false;
    try {
      const { error } = await supabase
        .from('npi_projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;
      toast.success('Project updated');
      await fetchProject();
      return true;
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      return false;
    }
  }, [projectId, fetchProject]);

  const advancePhase = useCallback(async (nextPhase: string) => {
    return updateProject({ current_phase: nextPhase as any });
  }, [updateProject]);

  return { 
    project, 
    charter, 
    tasks,
    gates, 
    team, 
    milestones, 
    loading, 
    fetchProject,
    updateTask,
    updateProject,
    advancePhase
  };
}
