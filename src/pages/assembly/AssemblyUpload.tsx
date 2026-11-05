import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAeDrawings, useUploadDrawing, useDeleteDrawing } from '@/hooks/useAssemblyExplorer';
import type { AeDrawing } from '@/types/assemblyExplorer';
import { toast } from 'sonner';

const AssemblyUpload = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: drawings, isLoading } = useAeDrawings();
  const upload = useUploadDrawing();
  const deleteDrawing = useDeleteDrawing();
  const [busyFiles, setBusyFiles] = useState<string[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const pdfs = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      toast.error('Only PDF drawings are supported');
      return;
    }
    for (const file of pdfs) {
      setBusyFiles((prev) => [...prev, file.name]);
      try {
        const drawing = await upload.mutateAsync(file);
        toast.success(`Extracted ${file.name} — review before publishing`);
        navigate(`/assembly-explorer/review/${drawing.id}`);
      } catch {
        // error toast already shown by the mutation
      } finally {
        setBusyFiles((prev) => prev.filter((n) => n !== file.name));
      }
    }
  };

  const statusBadge = (drawing: AeDrawing) =>
    drawing.status === 'reviewed' ? (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Reviewed</Badge>
    ) : (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Draft</Badge>
    );

  return (
    <AppLayout title="Assembly Explorer" subtitle="Upload engineering drawings" showBackButton backTo="/assembly-explorer">
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card
          className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Drop PDF drawings here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Multipage and scanned drawings are supported. Extraction runs with Lovable AI and nothing is published until you review it.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </CardContent>
        </Card>

        {busyFiles.map((name) => (
          <Card key={name}>
            <CardContent className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Analysing {name}…</span>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Uploaded drawings</CardTitle>
            <CardDescription>Drafts must be reviewed and published before they appear in the explorer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {!isLoading && (drawings ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No drawings uploaded yet.</p>
            )}
            {(drawings ?? []).map((drawing) => (
              <div
                key={drawing.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40 cursor-pointer"
                onClick={() => navigate(`/assembly-explorer/review/${drawing.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {drawing.drawing_number ?? drawing.file_name}
                      {drawing.revision ? ` · Rev ${drawing.revision}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{drawing.description ?? drawing.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {drawing.revision_discrepancy && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Revision discrepancy" />
                  )}
                  {drawing.issues?.length > 0 && !drawing.revision_discrepancy && (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                      {drawing.issues.length} issue{drawing.issues.length === 1 ? '' : 's'}
                    </Badge>
                  )}
                  {drawing.status === 'reviewed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {statusBadge(drawing)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete drawing ${drawing.drawing_number ?? drawing.file_name}?`)) {
                        deleteDrawing.mutate(drawing);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
};

export default AssemblyUpload;
