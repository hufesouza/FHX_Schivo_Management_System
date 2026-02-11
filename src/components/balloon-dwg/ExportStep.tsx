import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, FileSpreadsheet, FileJson, FileText, Loader2, CheckCircle } from 'lucide-react';
import { BalloonFeature } from '@/hooks/useBalloonJobs';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface ExportStepProps {
  features: BalloonFeature[];
  pdfFile: File | null;
  jobName: string;
}

export function ExportStep({ features, pdfFile, jobName }: ExportStepProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Set<string>>(new Set());

  const exportExcel = useCallback(() => {
    setGenerating('excel');
    try {
      const rows = features.map(f => ({
        'Balloon ID': f.balloon_id,
        'Characteristic Type': f.feature_type,
        'Requirement': f.original_text || '',
        'Nominal': f.nominal ?? '',
        'Tol -': f.tol_minus ?? '',
        'Tol +': f.tol_plus ?? '',
        'Units': f.unit,
        'Page': f.page_number,
        'Zone': f.zone || '',
        'Notes': f.notes || '',
        'CTQ': f.is_ctq ? 'Yes' : 'No',
        'Confidence': `${Math.round(f.confidence * 100)}%`,
        'BBox (x,y,w,h)': `${f.bbox_x},${f.bbox_y},${f.bbox_w},${f.bbox_h}`,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Column widths
      ws['!cols'] = [
        { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 10 },
        { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 },
        { wch: 6 }, { wch: 20 }, { wch: 5 }, { wch: 10 }, { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dimensional Report');
      XLSX.writeFile(wb, `${jobName}_inspection_report.xlsx`);
      setGenerated(prev => new Set(prev).add('excel'));
    } finally {
      setGenerating(null);
    }
  }, [features, jobName]);

  const exportJSON = useCallback(() => {
    setGenerating('json');
    try {
      const data = {
        report_name: `${jobName} - Dimensional Inspection Report`,
        generated_at: new Date().toISOString(),
        total_features: features.length,
        ctq_count: features.filter(f => f.is_ctq).length,
        features: features.map(f => ({
          balloon_id: f.balloon_id,
          feature_type: f.feature_type,
          original_text: f.original_text,
          nominal: f.nominal,
          tol_minus: f.tol_minus,
          tol_plus: f.tol_plus,
          unit: f.unit,
          page_number: f.page_number,
          zone: f.zone,
          notes: f.notes,
          is_ctq: f.is_ctq,
          confidence: f.confidence,
          bounding_box: { x: f.bbox_x, y: f.bbox_y, w: f.bbox_w, h: f.bbox_h },
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobName}_features.json`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerated(prev => new Set(prev).add('json'));
    } finally {
      setGenerating(null);
    }
  }, [features, jobName]);

  const exportBalloonedPDF = useCallback(async () => {
    if (!pdfFile) return;
    setGenerating('pdf');
    try {
      const fileBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const { width, height } = page.getSize();
        const pageFeatures = features.filter(f => f.page_number === pageIdx + 1);

        for (const f of pageFeatures) {
          // Position balloon - use bbox if available, else distribute along right margin
          let bx: number, by: number;
          if (f.bbox_x > 0 || f.bbox_y > 0) {
            // Scale bbox coords to PDF coords (approximate)
            bx = Math.min(f.bbox_x * 0.72, width - 30);
            by = height - Math.min(f.bbox_y * 0.72, height - 30);
          } else {
            // Fallback: position along right side
            bx = width - 40;
            by = height - (f.balloon_id * 25) % (height - 40);
          }

          const radius = 10;
          const color = f.is_ctq ? rgb(0.93, 0.26, 0.26) : rgb(0.15, 0.39, 0.92);

          // Draw circle
          page.drawCircle({
            x: bx,
            y: by,
            size: radius,
            color,
            borderColor: rgb(1, 1, 1),
            borderWidth: 1.5,
          });

          // Draw number
          const text = String(f.balloon_id);
          const textWidth = font.widthOfTextAtSize(text, 8);
          page.drawText(text, {
            x: bx - textWidth / 2,
            y: by - 3,
            size: 8,
            font,
            color: rgb(1, 1, 1),
          });

          // Leader line if bbox available
          if (f.bbox_x > 0 && f.bbox_w > 0) {
            const targetX = f.bbox_x * 0.72 + (f.bbox_w * 0.72) / 2;
            const targetY = height - (f.bbox_y * 0.72 + (f.bbox_h * 0.72) / 2);
            page.drawLine({
              start: { x: bx, y: by - radius },
              end: { x: targetX, y: targetY },
              thickness: 0.75,
              color,
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobName}_ballooned.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerated(prev => new Set(prev).add('pdf'));
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(null);
    }
  }, [features, pdfFile, jobName]);

  const exports = [
    {
      id: 'pdf',
      title: 'Ballooned PDF',
      description: 'Original drawing with numbered balloon callouts and leader lines',
      icon: FileText,
      action: exportBalloonedPDF,
      disabled: !pdfFile,
    },
    {
      id: 'excel',
      title: 'Dimensional Inspection Report (Excel)',
      description: 'Complete inspection report with all characteristics, tolerances and metadata',
      icon: FileSpreadsheet,
      action: exportExcel,
    },
    {
      id: 'json',
      title: 'JSON Data Export',
      description: 'Structured JSON for integration with QMS/ERP systems',
      icon: FileJson,
      action: exportJSON,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">Export Results</h3>
        <p className="text-muted-foreground mt-1">
          {features.length} features extracted • {features.filter(f => f.is_ctq).length} CTQ
        </p>
      </div>

      {exports.map((exp) => (
        <Card key={exp.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <exp.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{exp.title}</p>
                <p className="text-sm text-muted-foreground">{exp.description}</p>
              </div>
            </div>
            <Button
              variant={generated.has(exp.id) ? 'outline' : 'default'}
              disabled={generating !== null || exp.disabled}
              onClick={exp.action}
            >
              {generating === exp.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : generated.has(exp.id) ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  Download Again
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-1" />
                  Download
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
