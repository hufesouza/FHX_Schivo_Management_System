import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  NPIJob, 
  NPIPrereq, 
  NPIPostMc, 
  NPIJobWithRelations,
  ParsedNPIData,
  isJobReadyForMC,
  isJobFullyReleased
} from '@/types/npi';
import { toast } from 'sonner';

export function useNPIJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<NPIJobWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('npi_jobs')
        .select('*')
        .order('row_index', { ascending: true });

      if (jobsError) throw jobsError;

      // Fetch prereqs
      const { data: prereqsData, error: prereqsError } = await supabase
        .from('npi_prereq')
        .select('*');

      if (prereqsError) throw prereqsError;

      // Fetch post-mc
      const { data: postMcData, error: postMcError } = await supabase
        .from('npi_post_mc')
        .select('*');

      if (postMcError) throw postMcError;

      // Create lookup maps
      const prereqMap = new Map<string, NPIPrereq>();
      (prereqsData || []).forEach((p) => prereqMap.set(p.job_id, p as NPIPrereq));

      const postMcMap = new Map<string, NPIPostMc>();
      (postMcData || []).forEach((p) => postMcMap.set(p.job_id, p as NPIPostMc));

      // Combine data
      const combinedJobs: NPIJobWithRelations[] = (jobsData || []).map((job) => {
        const prereq = prereqMap.get(job.id);
        const post_mc = postMcMap.get(job.id);
        
        return {
          ...(job as NPIJob),
          prereq,
          post_mc,
          ready_for_mc: isJobReadyForMC(prereq),
          fully_released: isJobFullyReleased(post_mc)
        };
      });

      setJobs(combinedJobs);
    } catch (error) {
      console.error('Error fetching NPI jobs:', error);
      toast.error('Failed to load NPI jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const uploadData = useCallback(async (parsedData: ParsedNPIData) => {
    if (!user?.id) {
      toast.error('You must be logged in to upload data');
      return false;
    }

    setUploading(true);
    try {
      // Clear existing data (delete in order due to FK constraints)
      const { error: deletePostMcError } = await supabase
        .from('npi_post_mc')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deletePostMcError) throw deletePostMcError;

      const { error: deletePrereqError } = await supabase
        .from('npi_prereq')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deletePrereqError) throw deletePrereqError;

      const { error: deleteJobsError } = await supabase
        .from('npi_jobs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteJobsError) throw deleteJobsError;

      // Insert new jobs
      const jobsToInsert = parsedData.jobs.map(job => ({
        ...job,
        uploaded_by: user.id
      }));

      const { data: insertedJobs, error: insertJobsError } = await supabase
        .from('npi_jobs')
        .insert(jobsToInsert)
        .select();

      if (insertJobsError) throw insertJobsError;

      if (!insertedJobs || insertedJobs.length === 0) {
        throw new Error('No jobs were inserted');
      }

      // Insert prereqs linked to jobs
      const prereqsToInsert = parsedData.prereqs.map((prereq, idx) => ({
        ...prereq,
        job_id: insertedJobs[idx]?.id
      })).filter(p => p.job_id);

      if (prereqsToInsert.length > 0) {
        const { error: insertPrereqError } = await supabase
          .from('npi_prereq')
          .insert(prereqsToInsert);

        if (insertPrereqError) throw insertPrereqError;
      }

      // Insert post-mc linked to jobs
      const postMcsToInsert = parsedData.postMcs.map((postMc, idx) => ({
        ...postMc,
        job_id: insertedJobs[idx]?.id
      })).filter(p => p.job_id);

      if (postMcsToInsert.length > 0) {
        const { error: insertPostMcError } = await supabase
          .from('npi_post_mc')
          .insert(postMcsToInsert);

        if (insertPostMcError) throw insertPostMcError;
      }

      toast.success(`Successfully imported ${insertedJobs.length} NPI jobs`);
      await fetchJobs();
      return true;
    } catch (error) {
      console.error('Error uploading NPI data:', error);
      toast.error('Failed to upload NPI data: ' + (error as Error).message);
      return false;
    } finally {
      setUploading(false);
    }
  }, [user, fetchJobs]);

  const clearAllData = useCallback(async () => {
    try {
      await supabase.from('npi_post_mc').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('npi_prereq').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('npi_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setJobs([]);
      toast.success('All NPI data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    }
  }, []);

  // Computed stats
  const stats = {
    totalJobs: jobs.length,
    byStatus: jobs.reduce((acc, job) => {
      const status = job.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byCustomer: jobs.reduce((acc, job) => {
      const customer = job.customer || 'Unknown';
      acc[customer] = (acc[customer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byMcCell: jobs.reduce((acc, job) => {
      const mcCell = job.mc_cell || 'Unknown';
      acc[mcCell] = (acc[mcCell] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    readyForMC: jobs.filter(j => j.ready_for_mc).length,
    fullyReleased: jobs.filter(j => j.fully_released).length
  };

  return {
    jobs,
    loading,
    uploading,
    stats,
    fetchJobs,
    uploadData,
    clearAllData
  };
}
