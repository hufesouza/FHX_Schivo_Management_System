import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Upload, 
  FileText, 
  Languages, 
  Download, 
  Settings2, 
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye
} from 'lucide-react';

// Set PDF.js worker using unpkg which supports ES modules properly
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface OCRResult {
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  rotation?: number;
}

interface TranslationResult {
  original: string;
  translated: string;
  wasSkipped: boolean;
}

interface PageData {
  pageNumber: number;
  ocrResults: OCRResult[];
  translations: TranslationResult[];
  status: 'pending' | 'ocr' | 'translating' | 'complete' | 'error';
  error?: string;
  imageData?: string;
}

interface TranslationReport {
  pageNumber: number;
  original: string;
  translated: string;
  confidence: number;
  flagged: boolean;
  reason?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'pt-br', label: 'Portuguese (Brazil)' },
  { code: 'pt-pt', label: 'Portuguese (Portugal)' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'en', label: 'English' },
];

const DPI_OPTIONS = [
  { value: 150, label: '150 DPI (Fast)' },
  { value: 300, label: '300 DPI (Recommended)' },
  { value: 600, label: '600 DPI (High Quality)' },
];

const DrawingTranslate = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [dpi, setDpi] = useState(300);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<TranslationReport[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [glossaryText, setGlossaryText] = useState('');
  const [doNotTranslateText, setDoNotTranslateText] = useState('');
  const [minTextHeight, setMinTextHeight] = useState(2);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      if (selectedFile.size > 25 * 1024 * 1024) {
        toast.error('File size must be less than 25MB');
        return;
      }
      setFile(selectedFile);
      setPages([]);
      setReport([]);
      setPreviewImage(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      if (droppedFile.size > 25 * 1024 * 1024) {
        toast.error('File size must be less than 25MB');
        return;
      }
      setFile(droppedFile);
      setPages([]);
      setReport([]);
      setPreviewImage(null);
    }
  }, []);

  const parseGlossary = (text: string): Record<string, string> => {
    const glossary: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const [original, translation] = line.split(',').map(s => s.trim());
      if (original && translation) {
        glossary[original.toLowerCase()] = translation;
      }
    });
    return glossary;
  };

  const renderPageToImage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const scale = dpi / 72; // PDF default is 72 DPI
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).promise;

    return canvas.toDataURL('image/png');
  };

  const processPage = async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    glossary: Record<string, string>,
    doNotTranslate: string[]
  ): Promise<PageData> => {
    // Update status to OCR
    setPages(prev => prev.map(p => 
      p.pageNumber === pageNum ? { ...p, status: 'ocr' as const } : p
    ));

    // Render page to image
    const imageData = await renderPageToImage(pdfDoc, pageNum);

    // Call OCR edge function
    const { data: ocrData, error: ocrError } = await supabase.functions.invoke('drawing-ocr', {
      body: {
        imageBase64: imageData,
        pageNumber: pageNum,
        dpi,
      },
    });

    if (ocrError || !ocrData?.success) {
      return {
        pageNumber: pageNum,
        ocrResults: [],
        translations: [],
        status: 'error',
        error: ocrError?.message || ocrData?.error || 'OCR failed',
        imageData,
      };
    }

    // Filter results by minimum text height
    const filteredResults: OCRResult[] = ocrData.results.filter(
      (r: OCRResult) => r.boundingBox.height >= minTextHeight * (dpi / 25.4) // Convert mm to pixels
    );

    // Update status to translating
    setPages(prev => prev.map(p => 
      p.pageNumber === pageNum ? { ...p, status: 'translating' as const, ocrResults: filteredResults } : p
    ));

    // Call translation edge function
    const texts = filteredResults.map((r: OCRResult) => r.text);
    
    const { data: translateData, error: translateError } = await supabase.functions.invoke('drawing-translate', {
      body: {
        texts,
        sourceLanguage,
        targetLanguage,
        glossary,
        doNotTranslate,
      },
    });

    if (translateError || !translateData?.success) {
      return {
        pageNumber: pageNum,
        ocrResults: filteredResults,
        translations: [],
        status: 'error',
        error: translateError?.message || translateData?.error || 'Translation failed',
        imageData,
      };
    }

    return {
      pageNumber: pageNum,
      ocrResults: filteredResults,
      translations: translateData.results,
      status: 'complete',
      imageData,
    };
  };

  const handleTranslate = async () => {
    if (!file) {
      toast.error('Please upload a PDF file first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setReport([]);

    try {
      const glossary = parseGlossary(glossaryText);
      const doNotTranslate = doNotTranslateText.split('\n').map(s => s.trim()).filter(Boolean);

      // Load PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;

      if (numPages > 50) {
        toast.error('PDF must have 50 pages or fewer');
        setIsProcessing(false);
        return;
      }

      // Initialize pages
      const initialPages: PageData[] = Array.from({ length: numPages }, (_, i) => ({
        pageNumber: i + 1,
        ocrResults: [],
        translations: [],
        status: 'pending' as const,
      }));
      setPages(initialPages);

      // Generate preview of first page
      const firstPageImage = await renderPageToImage(pdfDoc, 1);
      setPreviewImage(firstPageImage);

      // Process each page
      const processedPages: PageData[] = [];
      const fullReport: TranslationReport[] = [];

      for (let i = 0; i < numPages; i++) {
        setCurrentPage(i + 1);
        
        const pageData = await processPage(pdfDoc, i + 1, glossary, doNotTranslate);
        processedPages.push(pageData);

        // Update pages state
        setPages(prev => prev.map(p => 
          p.pageNumber === pageData.pageNumber ? pageData : p
        ));

        // Build report
        if (pageData.status === 'complete') {
          pageData.translations.forEach((t, idx) => {
            const ocrResult = pageData.ocrResults[idx];
            const isFlagged = ocrResult?.boundingBox.height < 10 || ocrResult?.confidence < 0.7;
            fullReport.push({
              pageNumber: pageData.pageNumber,
              original: t.original,
              translated: t.translated,
              confidence: ocrResult?.confidence || 0,
              flagged: isFlagged,
              reason: isFlagged ? 'Low confidence or small text' : undefined,
            });
          });
        } else if (pageData.status === 'error') {
          fullReport.push({
            pageNumber: pageData.pageNumber,
            original: '',
            translated: '',
            confidence: 0,
            flagged: true,
            reason: pageData.error,
          });
        }

        setProgress(((i + 1) / numPages) * 100);
      }

      setReport(fullReport);
      toast.success('Translation complete!');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (pages.length === 0 || !file) {
      toast.error('No translation data available');
      return;
    }

    toast.info('Generating translated PDF...');

    try {
      // For now, generate a simple overlay PDF using canvas
      // This is a simplified version - a full implementation would use pdf-lib
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const pageData of pages) {
        if (pageData.status !== 'complete') continue;

        const page = pdfDoc.getPage(pageData.pageNumber - 1);
        const { height } = page.getSize();
        const scale = 72 / dpi; // Convert from render DPI back to PDF units

        for (let i = 0; i < pageData.translations.length; i++) {
          const translation = pageData.translations[i];
          const ocr = pageData.ocrResults[i];

          if (!ocr || translation.wasSkipped) continue;

          const x = ocr.boundingBox.x * scale;
          const y = height - (ocr.boundingBox.y + ocr.boundingBox.height) * scale;
          const boxWidth = ocr.boundingBox.width * scale;
          const boxHeight = ocr.boundingBox.height * scale;

          // Draw white rectangle to cover original text
          page.drawRectangle({
            x,
            y,
            width: boxWidth,
            height: boxHeight,
            color: rgb(1, 1, 1),
          });

          // Calculate font size to fit
          let fontSize = boxHeight * 0.8;
          let textWidth = helvetica.widthOfTextAtSize(translation.translated, fontSize);
          
          while (textWidth > boxWidth && fontSize > 4) {
            fontSize -= 0.5;
            textWidth = helvetica.widthOfTextAtSize(translation.translated, fontSize);
          }

          // Draw translated text
          page.drawText(translation.translated, {
            x: x + (boxWidth - textWidth) / 2,
            y: y + (boxHeight - fontSize) / 2,
            size: fontSize,
            font: helvetica,
            color: rgb(0, 0, 0),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_translated_EN.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadReport = () => {
    if (report.length === 0) {
      toast.error('No report data available');
      return;
    }

    const csv = [
      ['Page', 'Original', 'Translated', 'Confidence', 'Flagged', 'Reason'].join(','),
      ...report.map(r => [
        r.pageNumber,
        `"${r.original.replace(/"/g, '""')}"`,
        `"${r.translated.replace(/"/g, '""')}"`,
        r.confidence.toFixed(2),
        r.flagged ? 'Yes' : 'No',
        r.reason || '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Report downloaded!');
  };

  const completedPages = pages.filter(p => p.status === 'complete').length;
  const errorPages = pages.filter(p => p.status === 'error').length;
  const flaggedItems = report.filter(r => r.flagged).length;

  return (
    <AppLayout title="DrawingTranslate" subtitle="PDF Technical Drawing Translation" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Drawing
              </CardTitle>
              <CardDescription>
                Upload a PDF technical drawing to translate text overlays
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-4">
                    <FileText className="h-10 w-10 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null);
                        setPages([]);
                        setReport([]);
                        setPreviewImage(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Drag and drop a PDF file here, or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      className="max-w-xs mx-auto"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Max 50 pages, 25MB
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Translation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source Language</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Language</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Settings */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Advanced Settings
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>OCR Resolution</Label>
                      <Select value={dpi.toString()} onValueChange={(v) => setDpi(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DPI_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Min Text Height (mm)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={minTextHeight}
                        onChange={(e) => setMinTextHeight(parseInt(e.target.value) || 2)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Glossary (CSV format: original,translation)</Label>
                    <Textarea
                      placeholder="parafuso,screw&#10;diâmetro,diameter&#10;furo,hole"
                      value={glossaryText}
                      onChange={(e) => setGlossaryText(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Do Not Translate (one per line)</Label>
                    <Textarea
                      placeholder="±&#10;Ra&#10;Ø"
                      value={doNotTranslateText}
                      onChange={(e) => setDoNotTranslateText(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleTranslate}
                disabled={!file || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4 mr-2" />
                    Translate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Progress Section */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle>Translation Progress</CardTitle>
                <CardDescription>
                  Processing page {currentPage} of {pages.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="h-3" />
                <div className="flex flex-wrap gap-2">
                  {pages.map((page) => (
                    <Badge
                      key={page.pageNumber}
                      variant={
                        page.status === 'complete' ? 'default' :
                        page.status === 'error' ? 'destructive' :
                        page.status === 'pending' ? 'outline' : 'secondary'
                      }
                    >
                      {page.status === 'ocr' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {page.status === 'translating' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {page.status === 'complete' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {page.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      Page {page.pageNumber}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {pages.length > 0 && !isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Results</span>
                  <div className="flex gap-2">
                    <Badge variant="default">{completedPages} complete</Badge>
                    {errorPages > 0 && <Badge variant="destructive">{errorPages} errors</Badge>}
                    {flaggedItems > 0 && <Badge variant="secondary">{flaggedItems} flagged</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewImage && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">Preview (Page 1)</span>
                    </div>
                    <img 
                      src={previewImage} 
                      alt="First page preview" 
                      className="max-h-96 w-full object-contain bg-white"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download Translated PDF
                  </Button>
                  <Button variant="outline" onClick={handleDownloadReport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Translation Report Table */}
          {report.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Translation Report</CardTitle>
                <CardDescription>
                  Review translations and flagged items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Page</TableHead>
                        <TableHead>Original</TableHead>
                        <TableHead>Translated</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.slice(0, 100).map((item, idx) => (
                        <TableRow key={idx} className={item.flagged ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                          <TableCell>{item.pageNumber}</TableCell>
                          <TableCell className="font-mono text-sm">{item.original || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{item.translated || '-'}</TableCell>
                          <TableCell>
                            {item.flagged ? (
                              <Badge variant="secondary" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Review
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {report.length > 100 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Showing first 100 of {report.length} items. Download report for full data.
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AppLayout>
  );
};

export default DrawingTranslate;
