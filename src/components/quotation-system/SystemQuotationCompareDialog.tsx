import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { GitCompare, TrendingDown, TrendingUp, Minus, FileDown, Loader2 } from 'lucide-react';
import { SystemQuotation, QuotationVolumePricing } from '@/hooks/useQuotationSystem';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface SystemQuotationCompareDialogProps {
  quotations: SystemQuotation[];
  currentQuotation?: SystemQuotation;
}

interface ComparisonRow {
  quantity: number;
  leftPrice: number;
  rightPrice: number;
  difference: number;
  percentChange: number;
  leftCost: number;
  rightCost: number;
  leftMargin: number;
  rightMargin: number;
}

export function SystemQuotationCompareDialog({ quotations, currentQuotation }: SystemQuotationCompareDialogProps) {
  const [open, setOpen] = useState(false);
  const [leftQuotationId, setLeftQuotationId] = useState<string>('');
  const [rightQuotationId, setRightQuotationId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [leftPricing, setLeftPricing] = useState<QuotationVolumePricing[]>([]);
  const [rightPricing, setRightPricing] = useState<QuotationVolumePricing[]>([]);

  // Fetch volume pricing when quotation selected
  useEffect(() => {
    const fetchPricing = async (quotationId: string, setter: (data: QuotationVolumePricing[]) => void) => {
      if (!quotationId) {
        setter([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('quotation_volume_pricing')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('quantity');
      
      if (error) {
        console.error('Error fetching volume pricing:', error);
        return;
      }
      setter(data || []);
    };
    
    fetchPricing(leftQuotationId, setLeftPricing);
    fetchPricing(rightQuotationId, setRightPricing);
  }, [leftQuotationId, rightQuotationId]);

  // Auto-select related quotations when dialog opens
  useEffect(() => {
    if (currentQuotation && open && quotations.length >= 2) {
      // Try to find quotations for same part with different enquiry numbers
      const samePartQuotations = quotations.filter(q => 
        q.part_number === currentQuotation.part_number
      );
      
      if (samePartQuotations.length >= 2) {
        setLeftQuotationId(samePartQuotations[0].id);
        setRightQuotationId(samePartQuotations[1].id);
      } else {
        setLeftQuotationId(currentQuotation.id);
      }
    }
  }, [currentQuotation, quotations, open]);

  const leftQuotation = quotations.find(q => q.id === leftQuotationId);
  const rightQuotation = quotations.find(q => q.id === rightQuotationId);

  // Create comparison data
  const comparisonData: ComparisonRow[] = useMemo(() => {
    if (!leftPricing.length || !rightPricing.length) return [];
    
    return leftPricing.map(leftVp => {
      const rightVp = rightPricing.find(r => r.quantity === leftVp.quantity);
      const leftPrice = leftVp.unit_price_quoted || 0;
      const rightPrice = rightVp?.unit_price_quoted || 0;
      const difference = rightPrice - leftPrice;
      const percentChange = leftPrice > 0 ? ((difference / leftPrice) * 100) : 0;

      return {
        quantity: leftVp.quantity,
        leftPrice,
        rightPrice,
        difference,
        percentChange,
        leftCost: leftVp.cost_per_unit || 0,
        rightCost: rightVp?.cost_per_unit || 0,
        leftMargin: leftVp.margin || 0,
        rightMargin: rightVp?.margin || 0,
      };
    });
  }, [leftPricing, rightPricing]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getDifferenceColor = (diff: number) => {
    if (diff < 0) return 'text-green-600';
    if (diff > 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const exportComparisonPDF = async () => {
    if (!leftQuotation || !rightQuotation) return;
    
    setExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pageWidth = 842;
      const pageHeight = 595;
      const margin = 40;
      
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      
      const black = rgb(0, 0, 0);
      const green = rgb(0, 0.5, 0);
      const red = rgb(0.8, 0, 0);
      const gray = rgb(0.4, 0.4, 0.4);
      const schivoOrange = rgb(0.82, 0.50, 0.12);
      
      // Header
      page.drawText('Quotation Comparison Report', { x: margin, y, size: 16, font: helveticaBold, color: schivoOrange });
      y -= 20;
      page.drawText(`Generated: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`, { x: margin, y, size: 9, font: helvetica, color: gray });
      y -= 25;
      
      // Quotation details
      page.drawText('Comparing:', { x: margin, y, size: 10, font: helveticaBold, color: black });
      y -= 15;
      page.drawText(`Left: ${leftQuotation.enquiry_no} - ${leftQuotation.part_number || 'N/A'}`, { x: margin + 10, y, size: 9, font: helvetica, color: black });
      y -= 12;
      page.drawText(`Right: ${rightQuotation.enquiry_no} - ${rightQuotation.part_number || 'N/A'}`, { x: margin + 10, y, size: 9, font: helvetica, color: black });
      y -= 25;
      
      // Table
      page.drawText('Price Comparison by Quantity', { x: margin, y, size: 12, font: helveticaBold, color: schivoOrange });
      y -= 18;
      
      const colWidths = [60, 100, 100, 100, 80, 100, 100];
      const colX = [margin, margin + 60, margin + 160, margin + 260, margin + 360, margin + 440, margin + 540];
      const headers = ['Qty', leftQuotation.enquiry_no.substring(0, 12), rightQuotation.enquiry_no.substring(0, 12), 'Difference', '%', 'Left Cost', 'Right Cost'];
      
      page.drawRectangle({ x: margin, y: y - 12, width: 640, height: 14, color: schivoOrange });
      headers.forEach((header, i) => {
        page.drawText(header, { x: colX[i] + 3, y: y - 9, size: 7, font: helveticaBold, color: rgb(1, 1, 1) });
      });
      y -= 14;
      
      comparisonData.forEach((item) => {
        if (y < 50) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        
        const rowDiffColor = item.difference < 0 ? green : item.difference > 0 ? red : gray;
        
        page.drawText(String(item.quantity), { x: colX[0] + 3, y: y - 7, size: 8, font: helvetica, color: black });
        page.drawText(formatCurrency(item.leftPrice), { x: colX[1] + 3, y: y - 7, size: 8, font: helvetica, color: black });
        page.drawText(formatCurrency(item.rightPrice), { x: colX[2] + 3, y: y - 7, size: 8, font: helvetica, color: black });
        page.drawText(formatCurrency(item.difference), { x: colX[3] + 3, y: y - 7, size: 8, font: helveticaBold, color: rowDiffColor });
        page.drawText(formatPercent(item.percentChange), { x: colX[4] + 3, y: y - 7, size: 8, font: helvetica, color: rowDiffColor });
        page.drawText(formatCurrency(item.leftCost), { x: colX[5] + 3, y: y - 7, size: 8, font: helvetica, color: schivoOrange });
        page.drawText(formatCurrency(item.rightCost), { x: colX[6] + 3, y: y - 7, size: 8, font: helvetica, color: schivoOrange });
        
        y -= 14;
      });
      
      // Download PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Comparison_${leftQuotation.enquiry_no}_vs_${rightQuotation.enquiry_no}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Comparison PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCompare className="h-4 w-4 mr-2" />
          Compare
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Quotation Comparison
            </div>
            {leftQuotation && rightQuotation && comparisonData.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportComparisonPDF}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quotation Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Left Quotation</label>
              <Select value={leftQuotationId} onValueChange={setLeftQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quotation" />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.enquiry_no} - {q.part_number || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Right Quotation</label>
              <Select value={rightQuotationId} onValueChange={setRightQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quotation" />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.enquiry_no} - {q.part_number || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          {leftQuotation && rightQuotation && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{leftQuotation.enquiry_no}</div>
                  <div className="font-semibold">{leftQuotation.part_number || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{leftQuotation.customer}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{rightQuotation.enquiry_no}</div>
                  <div className="font-semibold">{rightQuotation.part_number || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{rightQuotation.customer}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison Table */}
          {comparisonData.length > 0 ? (
            <ScrollArea className="h-[350px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">{leftQuotation?.enquiry_no}</TableHead>
                    <TableHead className="text-right">{rightQuotation?.enquiry_no}</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Left Margin</TableHead>
                    <TableHead className="text-right">Right Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.leftPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rightPrice)}</TableCell>
                      <TableCell className={`text-right font-semibold ${getDifferenceColor(item.difference)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {getDifferenceIcon(item.difference)}
                          {formatCurrency(Math.abs(item.difference))}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right ${getDifferenceColor(item.difference)}`}>
                        {formatPercent(item.percentChange)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.leftMargin.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.rightMargin.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {leftQuotationId && rightQuotationId 
                ? 'No matching quantities found for comparison'
                : 'Select two quotations to compare'
              }
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
