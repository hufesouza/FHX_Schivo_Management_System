import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseNPIExcelFile } from '@/utils/npiExcelParser';
import { ParsedNPIData } from '@/types/npi';

interface NPIFileUploadProps {
  onFileProcessed: (data: ParsedNPIData) => Promise<boolean>;
  isUploading: boolean;
}

type UploadStatus = 'idle' | 'parsing' | 'success' | 'error';

export function NPIFileUpload({ onFileProcessed, isUploading }: NPIFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setStatus('error');
      setErrorMessage('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFileName(file.name);
    setStatus('parsing');
    setErrorMessage('');

    try {
      const parsedData = await parseNPIExcelFile(file);
      const success = await onFileProcessed(parsedData);
      setStatus(success ? 'success' : 'error');
      if (!success) {
        setErrorMessage('Failed to save data to database');
      }
    } catch (error) {
      console.error('Parse error:', error);
      setStatus('error');
      setErrorMessage((error as Error).message || 'Failed to parse file');
    }
  }, [onFileProcessed]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
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
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isProcessing = status === 'parsing' || isUploading;

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragActive
          ? 'border-primary bg-primary/5'
          : status === 'success'
          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
          : status === 'error'
          ? 'border-destructive bg-destructive/5'
          : 'border-border hover:border-primary/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleInputChange}
        disabled={isProcessing}
      />

      {isProcessing ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {status === 'parsing' ? 'Parsing Excel file...' : 'Saving to database...'}
          </p>
          {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
        </div>
      ) : status === 'success' ? (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            File uploaded successfully!
          </p>
          <p className="text-xs text-muted-foreground">{fileName}</p>
          <Button variant="outline" size="sm" onClick={() => setStatus('idle')}>
            Upload Another File
          </Button>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3">
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-destructive">Upload Failed</p>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={() => setStatus('idle')}>
            Try Again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium">Drop your NPI Excel file here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (supports .xlsx, .xls)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Upload className="h-4 w-4" />
            <span>NPI NEW PROCESS - July 25.xlsx format</span>
          </div>
        </div>
      )}
    </div>
  );
}
