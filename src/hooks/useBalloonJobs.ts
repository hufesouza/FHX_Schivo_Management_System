import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BalloonFeature {
  id: string;
  job_id: string;
  balloon_id: number;
  feature_type: string;
  original_text: string | null;
  nominal: number | null;
  tol_minus: number | null;
  tol_plus: number | null;
  unit: string;
  page_number: number;
  zone: string | null;
  notes: string | null;
  is_ctq: boolean;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

export interface BalloonJob {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  standard: string;
  preferred_unit: string;
  report_format: string;
  total_pages: number;
  current_step: string;
  created_at: string;
}

export function useBalloonJobs() {
  const { user } = useAuth();
  const [job, setJob] = useState<BalloonJob | null>(null);
  const [features, setFeatures] = useState<BalloonFeature[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  const createJob = useCallback(async (
    file: File,
    standard: string,
    preferredUnit: string,
    reportFormat: string,
  ) => {
    if (!user) { toast.error('Please log in'); return null; }

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('balloon-drawings')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Failed to upload file');
      console.error(uploadError);
      return null;
    }

    const { data, error } = await supabase.from('balloon_jobs').insert({
      created_by: user.id,
      file_name: file.name,
      file_path: filePath,
      standard,
      preferred_unit: preferredUnit,
      report_format: reportFormat,
      status: 'pending',
      current_step: 'upload',
    }).select().single();

    if (error) {
      toast.error('Failed to create job');
      console.error(error);
      return null;
    }

    setJob(data as BalloonJob);
    return data as BalloonJob;
  }, [user]);

  const processJob = useCallback(async (
    jobId: string,
    pages: Array<{ imageBase64: string }>,
    standard: string,
    preferredUnit: string,
  ) => {
    setIsProcessing(true);
    setProcessingStep('Sending pages for extraction...');

    try {
      const response = await supabase.functions.invoke('balloon-extract', {
        body: { jobId, pages, standard, preferredUnit },
      });

      if (response.error) throw new Error(response.error.message);
      
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Processing failed');

      // Fetch features from DB
      await loadFeatures(jobId);
      setProcessingStep('');
      toast.success(`Extracted ${result.totalFeatures} features`);
      return true;
    } catch (err: any) {
      console.error('Process error:', err);
      toast.error(err.message || 'Processing failed');
      await supabase.from('balloon_jobs').update({ 
        status: 'error', 
        error_message: err.message 
      }).eq('id', jobId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const loadFeatures = useCallback(async (jobId: string) => {
    const { data, error } = await supabase
      .from('balloon_features')
      .select('*')
      .eq('job_id', jobId)
      .order('balloon_id', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    setFeatures((data || []) as BalloonFeature[]);
  }, []);

  const updateFeature = useCallback(async (featureId: string, updates: Partial<BalloonFeature>) => {
    const { error } = await supabase
      .from('balloon_features')
      .update(updates)
      .eq('id', featureId);

    if (error) {
      toast.error('Failed to update feature');
      return;
    }

    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, ...updates } : f));
  }, []);

  const deleteFeature = useCallback(async (featureId: string) => {
    const { error } = await supabase
      .from('balloon_features')
      .delete()
      .eq('id', featureId);

    if (error) {
      toast.error('Failed to delete feature');
      return;
    }

    setFeatures(prev => prev.filter(f => f.id !== featureId));
  }, []);

  const renumberBalloons = useCallback(async (jobId: string) => {
    const sorted = [...features].sort((a, b) => {
      if (a.page_number !== b.page_number) return a.page_number - b.page_number;
      return a.balloon_id - b.balloon_id;
    });

    const updates = sorted.map((f, idx) => ({
      id: f.id,
      balloon_id: idx + 1,
    }));

    for (const u of updates) {
      await supabase.from('balloon_features').update({ balloon_id: u.balloon_id }).eq('id', u.id);
    }

    setFeatures(sorted.map((f, idx) => ({ ...f, balloon_id: idx + 1 })));
    toast.success('Balloons renumbered');
  }, [features]);

  return {
    job, setJob,
    features, setFeatures,
    isProcessing, processingStep, setProcessingStep,
    createJob, processJob, loadFeatures,
    updateFeature, deleteFeature, renumberBalloons,
  };
}
