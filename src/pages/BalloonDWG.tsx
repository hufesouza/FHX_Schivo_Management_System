import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBalloonJobs } from '@/hooks/useBalloonJobs';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { UploadStep } from '@/components/balloon-dwg/UploadStep';
import { ReviewStep } from '@/components/balloon-dwg/ReviewStep';
import { ExportStep } from '@/components/balloon-dwg/ExportStep';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Step = 'upload' | 'review' | 'export';

const stepLabels: Record<Step, string> = {
  upload: '1. Upload',
  review: '2. Review & Edit',
  export: '3. Export',
};

const BalloonDWG = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    job, features,
    isProcessing, processingStep, setProcessingStep,
    createJob, processJob, loadFeatures,
    updateFeature, deleteFeature, renumberBalloons,
  } = useBalloonJobs();

  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleProcess = useCallback(async (file: File, standard: string, unit: string, format: string) => {
    try {
      setPdfFile(file);
      setProcessingStep('Creating job...');

      const newJob = await createJob(file, standard, unit, format);
      if (!newJob) return;

      setProcessingStep('Converting PDF pages to images...');

      const fileData = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fileData) }).promise;
      const pages: Array<{ imageBase64: string }> = [];

      for (let i = 1; i <= doc.numPages; i++) {
        setProcessingStep(`Rendering page ${i}/${doc.numPages}...`);
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const base64 = canvas.toDataURL('image/png');
        pages.push({ imageBase64: base64 });
      }

      setProcessingStep('Extracting features with AI...');
      const success = await processJob(newJob.id, pages, standard, unit);
      if (success) {
        setStep('review');
      }
    } catch (err: any) {
      console.error('BalloonDWG process error:', err);
      toast.error(err?.message || 'Failed to process drawing');
    }
  }, [createJob, processJob, setProcessingStep]);

  const handleRenumber = useCallback(() => {
    if (job) renumberBalloons(job.id);
  }, [job, renumberBalloons]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="BalloonDWG" subtitle="Automated Ballooned Drawings & Inspection Reports" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(Object.keys(stepLabels) as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <Badge
                variant={step === s ? 'default' : features.length > 0 && s === 'upload' ? 'secondary' : 'outline'}
                className={`cursor-pointer ${step === s ? '' : 'opacity-60'}`}
                onClick={() => {
                  if (s === 'upload') setStep('upload');
                  else if (s === 'review' && features.length > 0) setStep('review');
                  else if (s === 'export' && features.length > 0) setStep('export');
                }}
              >
                {stepLabels[s]}
              </Badge>
              {idx < 2 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>

        {step === 'upload' && (
          <UploadStep
            onProcess={handleProcess}
            isProcessing={isProcessing}
            processingStep={processingStep}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            features={features}
            pdfFile={pdfFile}
            onUpdateFeature={updateFeature}
            onDeleteFeature={deleteFeature}
            onRenumber={handleRenumber}
            onNext={() => setStep('export')}
          />
        )}

        {step === 'export' && (
          <ExportStep
            features={features}
            pdfFile={pdfFile}
            jobName={job?.file_name?.replace('.pdf', '') || 'drawing'}
          />
        )}
      </main>
    </AppLayout>
  );
};

export default BalloonDWG;
