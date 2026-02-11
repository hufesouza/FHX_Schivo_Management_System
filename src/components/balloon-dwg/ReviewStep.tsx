import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Star, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { BalloonFeature } from '@/hooks/useBalloonJobs';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const FEATURE_TYPES = [
  'linear_dimension', 'angular_dimension', 'diameter', 'radius',
  'chamfer', 'gdt', 'thread', 'surface_finish', 'note',
];

const featureTypeLabels: Record<string, string> = {
  linear_dimension: 'Linear',
  angular_dimension: 'Angular',
  diameter: 'Diameter',
  radius: 'Radius',
  chamfer: 'Chamfer',
  gdt: 'GD&T',
  thread: 'Thread',
  surface_finish: 'Surface',
  note: 'Note',
};

interface ReviewStepProps {
  features: BalloonFeature[];
  pdfFile: File | null;
  onUpdateFeature: (id: string, updates: Partial<BalloonFeature>) => void;
  onDeleteFeature: (id: string) => void;
  onRenumber: () => void;
  onNext: () => void;
}

export function ReviewStep({ features, pdfFile, onUpdateFeature, onDeleteFeature, onRenumber, onNext }: ReviewStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load PDF
  useEffect(() => {
    if (!pdfFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const doc = await pdfjsLib.getDocument({ data }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    };
    reader.readAsArrayBuffer(pdfFile);
  }, [pdfFile]);

  // Render page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: zoom * 1.5 });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Draw balloons for current page
    const pageFeatures = features.filter(f => f.page_number === currentPage);
    for (const f of pageFeatures) {
      if (f.bbox_x > 0 || f.bbox_y > 0) {
        const x = f.bbox_x * zoom * 1.5;
        const y = f.bbox_y * zoom * 1.5;
        const radius = 14 * zoom;

        // Balloon circle
        ctx.beginPath();
        ctx.arc(x + radius, y - radius * 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = f.is_ctq ? '#ef4444' : '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Balloon number
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(12 * zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(f.balloon_id), x + radius, y - radius * 2);

        // Leader line
        ctx.beginPath();
        ctx.moveTo(x + radius, y - radius);
        ctx.lineTo(x + f.bbox_w * zoom * 0.75, y);
        ctx.strokeStyle = f.is_ctq ? '#ef4444' : '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [pdfDoc, currentPage, zoom, features]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const pageFeatures = features.filter(f => f.page_number === currentPage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
      {/* PDF Viewer */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Drawing Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                Prev
              </Button>
              <span className="text-xs">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-2">
          <canvas ref={canvasRef} className="border rounded" />
        </CardContent>
      </Card>

      {/* Features Table */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Extracted Features ({features.length})
              {pageFeatures.length !== features.length && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({pageFeatures.length} on this page)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRenumber}>
                Renumber
              </Button>
              <Button size="sm" onClick={onNext}>
                Export <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Callout</TableHead>
                  <TableHead className="w-16">Nom</TableHead>
                  <TableHead className="w-14">Tol-</TableHead>
                  <TableHead className="w-14">Tol+</TableHead>
                  <TableHead className="w-12">Unit</TableHead>
                  <TableHead className="w-12">CTQ</TableHead>
                  <TableHead className="w-14">Conf</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((f) => (
                  <TableRow 
                    key={f.id} 
                    className={`cursor-pointer ${f.page_number === currentPage ? '' : 'opacity-50'}`}
                    onClick={() => {
                      if (f.page_number !== currentPage) setCurrentPage(f.page_number);
                      setEditingId(f.id);
                    }}
                  >
                    <TableCell>
                      <Badge variant={f.is_ctq ? 'destructive' : 'secondary'} className="w-8 justify-center">
                        {f.balloon_id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === f.id ? (
                        <Select value={f.feature_type} onValueChange={(v) => onUpdateFeature(f.id, { feature_type: v })}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEATURE_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{featureTypeLabels[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs">{featureTypeLabels[f.feature_type] || f.feature_type}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === f.id ? (
                        <Input 
                          className="h-7 text-xs" 
                          value={f.original_text || ''} 
                          onChange={(e) => onUpdateFeature(f.id, { original_text: e.target.value })}
                        />
                      ) : (
                        <span className="text-xs truncate max-w-[120px] block">{f.original_text}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === f.id ? (
                        <Input 
                          className="h-7 text-xs w-16" 
                          type="number"
                          value={f.nominal ?? ''} 
                          onChange={(e) => onUpdateFeature(f.id, { nominal: e.target.value ? Number(e.target.value) : null })}
                        />
                      ) : (
                        <span className="text-xs">{f.nominal ?? '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === f.id ? (
                        <Input 
                          className="h-7 text-xs w-14" 
                          type="number"
                          value={f.tol_minus ?? ''} 
                          onChange={(e) => onUpdateFeature(f.id, { tol_minus: e.target.value ? Number(e.target.value) : null })}
                        />
                      ) : (
                        <span className="text-xs">{f.tol_minus ?? '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === f.id ? (
                        <Input 
                          className="h-7 text-xs w-14" 
                          type="number"
                          value={f.tol_plus ?? ''} 
                          onChange={(e) => onUpdateFeature(f.id, { tol_plus: e.target.value ? Number(e.target.value) : null })}
                        />
                      ) : (
                        <span className="text-xs">{f.tol_plus ?? '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{f.unit}</span>
                    </TableCell>
                    <TableCell>
                      <Checkbox 
                        checked={f.is_ctq}
                        onCheckedChange={(v) => onUpdateFeature(f.id, { is_ctq: !!v })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${f.confidence >= 0.8 ? 'text-green-600' : f.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round(f.confidence * 100)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onDeleteFeature(f.id); }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
