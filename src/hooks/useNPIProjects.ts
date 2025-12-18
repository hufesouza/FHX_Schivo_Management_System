import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { 
  NPIProject, 
  NPIProjectCharter, 
  NPIDesignTransferItem, 
  NPIProjectTeamMember, 
  NPIProjectMilestone,
  NPIProjectWithRelations
} from '@/types/npiProject';
import { DEFAULT_DESIGN_TRANSFER_ITEMS } from '@/types/npiProject';

export function useNPIProjects() {
  const [projects, setProjects] = useState<NPIProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('npi_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch related counts
      const projectsWithRelations: NPIProjectWithRelations[] = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get linked Blue Reviews count
          const { count: brCount } = await supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .eq('npi_project_id', project.id);

          // Get linked NPI Pipeline jobs count
          const { count: jobsCount } = await supabase
            .from('npi_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('npi_project_id', project.id);

          // Get project manager info
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
            linked_blue_reviews_count: brCount || 0,
            linked_pipeline_jobs_count: jobsCount || 0,
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
    projectData: Omit<NPIProject, 'id' | 'project_number' | 'created_by' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      // Generate project number based on timestamp and random
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const projectNumber = `NPI-${timestamp}${random}`;

      const { data, error } = await supabase
        .from('npi_projects')
        .insert({
          ...projectData,
          project_number: projectNumber,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default charter
      await supabase
        .from('npi_project_charter')
        .insert({ project_id: data.id });

      // Create default design transfer items
      const itemsToInsert = DEFAULT_DESIGN_TRANSFER_ITEMS.map(item => ({
        ...item,
        project_id: data.id,
      }));

      await supabase
        .from('npi_design_transfer_items')
        .insert(itemsToInsert);

      // Create default milestones
      const defaultMilestones = [
        { project_id: data.id, milestone_name: 'Project Kickoff', phase: 'planning', display_order: 1 },
        { project_id: data.id, milestone_name: 'Planning Complete', phase: 'planning', display_order: 2 },
        { project_id: data.id, milestone_name: 'First Article Complete', phase: 'execution', display_order: 3 },
        { project_id: data.id, milestone_name: 'IQ/OQ Complete', phase: 'execution', display_order: 4 },
        { project_id: data.id, milestone_name: 'PQ Complete', phase: 'process_qualification', display_order: 5 },
        { project_id: data.id, milestone_name: 'Handover to Production', phase: 'process_qualification', display_order: 6 },
      ];

      await supabase
        .from('npi_project_milestones')
        .insert(defaultMilestones);

      toast.success(`Project ${projectNumber} created successfully`);
      fetchProjects();
      return data;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  }, [user, fetchProjects]);

  const updateProject = useCallback(async (
    id: string,
    updates: Partial<NPIProject>
  ) => {
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

  return {
    projects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
  };
}

export function useNPIProjectDetail(projectId: string | undefined) {
  const [project, setProject] = useState<NPIProjectWithRelations | null>(null);
  const [charter, setCharter] = useState<NPIProjectCharter | null>(null);
  const [designTransferItems, setDesignTransferItems] = useState<NPIDesignTransferItem[]>([]);
  const [team, setTeam] = useState<NPIProjectTeamMember[]>([]);
  const [milestones, setMilestones] = useState<NPIProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('npi_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch charter
      const { data: charterData } = await supabase
        .from('npi_project_charter')
        .select('*')
        .eq('project_id', projectId)
        .single();

      // Fetch design transfer items
      const { data: itemsData } = await supabase
        .from('npi_design_transfer_items')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');

      // Cast items to proper type
      const typedItems = (itemsData || []) as NPIDesignTransferItem[];

      // Fetch team with profile info
      const { data: teamData } = await supabase
        .from('npi_project_team')
        .select('*')
        .eq('project_id', projectId);

      // Get team member profiles
      const teamWithProfiles = await Promise.all(
        (teamData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', member.user_id)
            .single();
          return { ...member, ...profile };
        })
      );

      // Fetch milestones
      const { data: milestonesData } = await supabase
        .from('npi_project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');

      // Cast milestones to proper type
      const typedMilestones = (milestonesData || []) as NPIProjectMilestone[];

      // Get project manager
      let projectManager = null;
      if (projectData.project_manager_id) {
        const { data: pmData } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('user_id', projectData.project_manager_id)
          .single();
        projectManager = pmData;
      }

      // Get counts for linked items
      const { count: brCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('npi_project_id', projectId);

      const { count: jobsCount } = await supabase
        .from('npi_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('npi_project_id', projectId);

      setProject({ 
        ...projectData, 
        project_manager: projectManager,
        linked_blue_reviews_count: brCount || 0,
        linked_pipeline_jobs_count: jobsCount || 0,
      } as NPIProjectWithRelations);
      setCharter(charterData);
      setDesignTransferItems(typedItems);
      setTeam(teamWithProfiles);
      setMilestones(typedMilestones);
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

  const updateCharter = useCallback(async (updates: Partial<NPIProjectCharter>) => {
    if (!projectId || !charter) return false;

    try {
      const { error } = await supabase
        .from('npi_project_charter')
        .update(updates)
        .eq('project_id', projectId);

      if (error) throw error;

      setCharter(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Charter updated');
      return true;
    } catch (error: any) {
      console.error('Error updating charter:', error);
      toast.error('Failed to update charter');
      return false;
    }
  }, [projectId, charter]);

  const updateDesignTransferItem = useCallback(async (
    itemId: string, 
    updates: Partial<NPIDesignTransferItem>
  ) => {
    try {
      const { error } = await supabase
        .from('npi_design_transfer_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      const newItems = designTransferItems.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      setDesignTransferItems(newItems);

      // Check if we should auto-advance the phase
      if (project && updates.status) {
        const phaseOrder = ['planning', 'execution', 'process_qualification'];
        const currentPhaseIndex = phaseOrder.indexOf(project.current_phase);
        
        if (currentPhaseIndex < phaseOrder.length - 1) {
          const currentPhaseItems = newItems.filter(i => i.phase === project.current_phase);
          const allComplete = currentPhaseItems.every(
            i => i.status === 'completed' || i.status === 'not_applicable'
          );
          
          if (allComplete && currentPhaseItems.length > 0) {
            const nextPhase = phaseOrder[currentPhaseIndex + 1] as NPIProject['current_phase'];
            await supabase
              .from('npi_projects')
              .update({ current_phase: nextPhase })
              .eq('id', project.id);
            
            setProject(prev => prev ? { ...prev, current_phase: nextPhase } : null);
            toast.success(`Phase advanced to ${nextPhase.replace('_', ' ')}`);
          }
        }
      }
      
      return true;
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
      return false;
    }
  }, [designTransferItems, project]);

  const updateMilestone = useCallback(async (
    milestoneId: string,
    updates: Partial<NPIProjectMilestone>
  ) => {
    try {
      const { error } = await supabase
        .from('npi_project_milestones')
        .update(updates)
        .eq('id', milestoneId);

      if (error) throw error;

      setMilestones(prev =>
        prev.map(m => m.id === milestoneId ? { ...m, ...updates } : m)
      );
      return true;
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
      return false;
    }
  }, []);

  const addTeamMember = useCallback(async (userId: string, role: string, responsibilities?: string) => {
    if (!projectId) return false;

    try {
      const { data, error } = await supabase
        .from('npi_project_team')
        .insert({
          project_id: projectId,
          user_id: userId,
          role,
          responsibilities,
        })
        .select()
        .single();

      if (error) throw error;

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', userId)
        .single();

      setTeam(prev => [...prev, { ...data, ...profile }]);
      toast.success('Team member added');
      return true;
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error('Failed to add team member');
      return false;
    }
  }, [projectId]);

  const removeTeamMember = useCallback(async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('npi_project_team')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setTeam(prev => prev.filter(m => m.id !== memberId));
      toast.success('Team member removed');
      return true;
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
      return false;
    }
  }, []);

  const linkNPIJob = useCallback(async (jobId: string) => {
    if (!projectId) return false;
    try {
      const { error } = await supabase
        .from('npi_jobs')
        .update({ npi_project_id: projectId })
        .eq('id', jobId);
      if (error) throw error;
      toast.success('NPI job linked');
      fetchProject();
      return true;
    } catch (error: any) {
      console.error('Error linking job:', error);
      toast.error('Failed to link job');
      return false;
    }
  }, [projectId, fetchProject]);

  const unlinkNPIJob = useCallback(async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('npi_jobs')
        .update({ npi_project_id: null })
        .eq('id', jobId);
      if (error) throw error;
      toast.success('NPI job unlinked');
      fetchProject();
      return true;
    } catch (error: any) {
      console.error('Error unlinking job:', error);
      toast.error('Failed to unlink job');
      return false;
    }
  }, [fetchProject]);

  const linkBlueReview = useCallback(async (workOrderId: string) => {
    if (!projectId) return false;
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ npi_project_id: projectId })
        .eq('id', workOrderId);
      if (error) throw error;
      toast.success('Blue Review linked');
      fetchProject();
      return true;
    } catch (error: any) {
      console.error('Error linking Blue Review:', error);
      toast.error('Failed to link Blue Review');
      return false;
    }
  }, [projectId, fetchProject]);

  const unlinkBlueReview = useCallback(async (workOrderId: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ npi_project_id: null })
        .eq('id', workOrderId);
      if (error) throw error;
      toast.success('Blue Review unlinked');
      fetchProject();
      return true;
    } catch (error: any) {
      console.error('Error unlinking Blue Review:', error);
      toast.error('Failed to unlink Blue Review');
      return false;
    }
  }, [fetchProject]);

  return {
    project,
    charter,
    designTransferItems,
    team,
    milestones,
    loading,
    fetchProject,
    updateCharter,
    updateDesignTransferItem,
    updateMilestone,
    addTeamMember,
    removeTeamMember,
    linkNPIJob,
    unlinkNPIJob,
    linkBlueReview,
    unlinkBlueReview,
  };
}
