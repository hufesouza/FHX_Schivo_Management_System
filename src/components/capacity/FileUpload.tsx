import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseCapacityFile } from '@/utils/capacityParser';
import { CapacityData } from '@/types/capacity';

interface FileUploadProps {
  onDataLoaded: (data: CapacityData) => void;
  isLoading?: boolean;
}

export function FileUpload({ onDataLoaded, isLoading = false }: FileUploadProps) {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
      return;
    }

    setUploadStatus('loading');
    setFileName(file.name);

    try {
      const data = await parseCapacityFile(file);
      setUploadStatus('success');
      
      toast({
        title: 'File processed successfully',
        description: `Loaded ${data.jobs.length} jobs across ${data.machines.length} machines`,
      });
      
      onDataLoaded(data);
    } catch (error) {
      setUploadStatus('error');
      toast({
        title: 'Failed to process file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [onDataLoaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isLoading || uploadStatus === 'loading'}
      />
      
      <div className="flex flex-col items-center gap-4">
        {uploadStatus === 'loading' ? (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div>
              <p className="font-medium">Processing {fileName}...</p>
              <p className="text-sm text-muted-foreground">Cleaning and structuring data</p>
            </div>
          </>
        ) : uploadStatus === 'success' ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div>
              <p className="font-medium text-green-600">Successfully processed!</p>
              <p className="text-sm text-muted-foreground">{fileName}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setUploadStatus('idle')}>
              Upload Another File
            </Button>
          </>
        ) : uploadStatus === 'error' ? (
          <>
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to process file</p>
              <p className="text-sm text-muted-foreground">Please check the file format and try again</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setUploadStatus('idle')}>
              Try Again
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Drag and drop your Excel file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <Button variant="secondary" size="sm">
              Select File
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
