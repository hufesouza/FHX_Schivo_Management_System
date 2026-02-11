import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileUp, Loader2 } from 'lucide-react';

interface UploadStepProps {
  onProcess: (file: File, standard: string, unit: string, format: string) => void;
  isProcessing: boolean;
  processingStep: string;
}

export function UploadStep({ onProcess, isProcessing, processingStep }: UploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [standard, setStandard] = useState('ASME Y14.5');
  const [unit, setUnit] = useState('mm');
  const [format, setFormat] = useState('generic');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Engineering Drawing
          </CardTitle>
          <CardDescription>
            Upload a PDF drawing to automatically extract inspectable characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File upload */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-2">
                <FileUp className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Click to select a PDF drawing</p>
                <p className="text-xs text-muted-foreground">Max 20MB</p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Standard</Label>
              <Select value={standard} onValueChange={setStandard}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASME Y14.5">ASME Y14.5</SelectItem>
                  <SelectItem value="ISO">ISO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="in">inches</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="FAI">FAI</SelectItem>
                  <SelectItem value="PPAP">PPAP</SelectItem>
                  <SelectItem value="AS9102">AS9102</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Process button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!file || isProcessing}
            onClick={() => file && onProcess(file, standard, unit, format)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {processingStep || 'Processing...'}
              </>
            ) : (
              'Process Drawing'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
