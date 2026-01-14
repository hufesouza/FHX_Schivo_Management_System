import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';
import { format } from 'date-fns';
import schivoLogo from '@/assets/schivo-logo-quotation.png';
import { DEFAULT_NOTES, DEFAULT_CONDITIONS } from './ExportQuotationPDF';

interface ExportQuotationDialogProps {
  quotation: EnquiryQuotation;
  parts: EnquiryQuotationPart[];
}

export function ExportQuotationDialog({ quotation, parts }: ExportQuotationDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());

  // Get top-level parts (those with unit_price set)
  const topLevelParts = parts.filter(part => part.unit_price !== null && part.unit_price > 0);

  // Initialize all parts as selected when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPartIds(new Set(topLevelParts.map(p => p.id)));
    }
  }, [open, topLevelParts.length]);

  const togglePart = (partId: string) => {
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedPartIds(newSelected);
  };

  const selectAll = () => {
    setSelectedPartIds(new Set(topLevelParts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPartIds(new Set());
  };

  const formatCurrency = (value: number | null | undefined, currency: string = 'EUR'): string => {
    if (value === null || value === undefined) return '-';
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const parseNotesAndConditions = () => {
    if (!quotation.notes) {
      return { notes: DEFAULT_NOTES, conditions: DEFAULT_CONDITIONS };
    }
    
    try {
      const parsed = JSON.parse(quotation.notes);
      return {
        notes: parsed.notes || DEFAULT_NOTES,
        conditions: parsed.conditions || DEFAULT_CONDITIONS,
      };
    } catch {
      return { notes: DEFAULT_NOTES, conditions: DEFAULT_CONDITIONS };
    }
  };

  const generatePDF = async () => {
    if (selectedPartIds.size === 0) {
      toast.error('Please select at least one item to export');
      return;
    }

    setExporting(true);
    
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 40;
      let y = height - margin;
      
      const schivoOrange = rgb(0.82, 0.50, 0.12);
      const schivoGray = rgb(0.392, 0.431, 0.412);
      const lightGray = rgb(0.95, 0.95, 0.95);
      const black = rgb(0, 0, 0);
      
      // Embed logo
      try {
        const logoResponse = await fetch(schivoLogo);
        const logoBytes = await logoResponse.arrayBuffer();
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.3);
        page.drawImage(logoImage, {
          x: margin,
          y: y - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        });
        y -= logoDims.height + 10;
      } catch (logoError) {
        console.warn('Could not embed logo:', logoError);
        page.drawText('Schivo', { x: margin, y: y - 20, size: 24, font: helveticaBold, color: schivoGray });
        y -= 30;
      }
      
      // Header
      page.drawText('WD-FRM-0040', { x: width - margin - 80, y: height - margin, size: 8, font: helvetica, color: black });
      page.drawText('Version: 0', { x: width - margin - 80, y: height - margin - 10, size: 8, font: helvetica, color: black });
      
      y -= 10;
      page.drawText('SCHIVO Medical Limited,', { x: margin, y: y, size: 10, font: helveticaBold, color: schivoGray });
      y -= 12;
      page.drawText('Unit 1-4, IDA Industrial Park, Cork Road, Waterford.', { x: margin, y: y, size: 9, font: helvetica, color: black });
      
      y -= 15;
      page.drawRectangle({ x: margin, y: y, width: width - 2 * margin, height: 3, color: schivoOrange });
      
      y -= 25;
      page.drawText('Sales Quotation', { x: margin, y: y, size: 18, font: helveticaBold, color: schivoOrange });
      page.drawText('Tel: +353 (0)51 372010', { x: width - margin - 120, y: y, size: 9, font: helvetica, color: black });
      
      y -= 30;
      page.drawText('To:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(quotation.customer, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      page.drawText('From:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText('Schivo Medical', { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      y -= 14;
      page.drawText('Company:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(quotation.customer, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      page.drawText('Date:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(format(new Date(quotation.created_at), 'dd-MMM-yy'), { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      y -= 14;
      page.drawText('Schivo Ref:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(quotation.enquiry_no, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      page.drawText('Customer Ref:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText('N/A', { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      // Table
      y -= 30;
      const tableWidth = width - 2 * margin;
      const colWidths = [30, 80, 120, 45, 70, 70, 70];
      
      const headerHeight = 22;
      page.drawRectangle({ x: margin, y: y - headerHeight, width: tableWidth, height: headerHeight, color: schivoOrange });
      
      let xPos = margin + 5;
      const headers = ['Item', 'Part No.', 'Description', 'Qty', 'NRE (€)', 'Unit Price', 'Total Price'];
      headers.forEach((header, i) => {
        page.drawText(header, { x: xPos, y: y - 15, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
        xPos += colWidths[i];
      });
      
      y -= headerHeight;
      
      // Filter to selected parts only
      const selectedParts = topLevelParts.filter(p => selectedPartIds.has(p.id));
      const rowHeight = 16;
      
      let totalNRE = 0;
      
      selectedParts.forEach((part, index) => {
        if (y < 180) return;
        
        y -= rowHeight;
        
        if (index % 2 === 0) {
          page.drawRectangle({ x: margin, y: y, width: tableWidth, height: rowHeight, color: lightGray });
        }
        
        xPos = margin + 5;
        
        page.drawText((index + 1).toString(), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[0];
        
        const partNum = part.part_number || '-';
        page.drawText(partNum.length > 12 ? partNum.substring(0, 12) + '...' : partNum, { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[1];
        
        const desc = part.description || '-';
        page.drawText(desc.length > 20 ? desc.substring(0, 20) + '...' : desc, { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[2];
        
        page.drawText(part.quantity?.toLocaleString() || '-', { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[3];
        
        const nre = part.nre || 0;
        totalNRE += nre;
        page.drawText(formatCurrency(nre), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[4];
        
        page.drawText(formatCurrency(part.unit_price), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[5];
        
        const total = (part.unit_price || 0) * (part.quantity || 0);
        page.drawText(formatCurrency(total), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
      });
      
      // Total NRE row
      if (totalNRE > 0) {
        y -= rowHeight;
        page.drawRectangle({ x: margin, y: y, width: tableWidth, height: rowHeight, color: schivoOrange });
        
        page.drawText('Total NRE:', { x: margin + 5 + colWidths[0] + colWidths[1] + colWidths[2], y: y + 4, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText(formatCurrency(totalNRE), { x: margin + 5 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y: y + 4, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
      }
      
      // Notes page
      const { notes, conditions } = parseNotesAndConditions();
      
      const wrapText = (text: string, fontSize: number, font: typeof helvetica, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          
          if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };
      
      const notesPage = pdfDoc.addPage([595, 842]);
      let notesY = height - margin;
      
      notesPage.drawText('Notes and Conditions:', { x: margin, y: notesY, size: 12, font: helveticaBold, color: schivoOrange });
      notesY -= 20;
      
      notesPage.drawRectangle({ x: margin, y: notesY, width: width - 2 * margin, height: 2, color: schivoOrange });
      notesY -= 15;
      
      const maxTextWidth = width - 2 * margin - 15;
      const notesFontSize = 8;
      const lineHeight = 11;
      
      notes.forEach((note: string) => {
        const wrappedLines = wrapText(note, notesFontSize, helvetica, maxTextWidth);
        
        wrappedLines.forEach((line, lineIdx) => {
          const prefix = lineIdx === 0 ? '• ' : '  ';
          notesPage.drawText(prefix + line, { x: margin, y: notesY, size: notesFontSize, font: helvetica, color: black });
          notesY -= lineHeight;
        });
        notesY -= 3;
      });
      
      notesY -= 10;
      
      notesPage.drawText('Lead Time:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(conditions.leadTime, { x: margin + 70, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 14;
      
      notesPage.drawText('Carriage:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(conditions.carriage, { x: margin + 70, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 14;
      
      notesPage.drawText('Terms & Conditions of sale:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(conditions.validity, { x: margin + 130, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 14;
      
      notesPage.drawText('Payment Terms:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(conditions.paymentTerms, { x: margin + 100, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 20;
      
      notesPage.drawText('Order Placement: All orders to be sent for the attention of: Orders@schivomedical.com', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      
      // Footers
      notesPage.drawRectangle({ x: margin, y: margin + 10, width: width - 2 * margin, height: 2, color: schivoOrange });
      notesPage.drawText('WD-TMP-0003c', { x: margin, y: margin, size: 7, font: helvetica, color: schivoGray });
      notesPage.drawText('2 of 2', { x: width - margin - 30, y: margin, size: 7, font: helvetica, color: schivoGray });
      
      page.drawRectangle({ x: margin, y: margin + 10, width: width - 2 * margin, height: 2, color: schivoOrange });
      page.drawText('WD-TMP-0003c', { x: margin, y: margin, size: 7, font: helvetica, color: schivoGray });
      page.drawText('1 of 2', { x: width - margin - 30, y: margin, size: 7, font: helvetica, color: schivoGray });
      
      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quotation.enquiry_no.replace(/\s+/g, '_')}_Quotation.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`PDF exported with ${selectedParts.length} items`);
      setOpen(false);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  // Calculate totals for selected parts
  const selectedParts = topLevelParts.filter(p => selectedPartIds.has(p.id));
  const totalQuote = selectedParts.reduce((sum, p) => sum + (p.unit_price || 0) * (p.quantity || 0), 0);
  const totalNRE = selectedParts.reduce((sum, p) => sum + (p.nre || 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={parts.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Quotation: {quotation.enquiry_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedPartIds.size} of {topLevelParts.length} items selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <Check className="h-3 w-3 mr-1" /> Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <X className="h-3 w-3 mr-1" /> Deselect All
              </Button>
            </div>
          </div>

          {/* Parts list with checkboxes */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2 space-y-1">
              {topLevelParts.map((part) => (
                <div
                  key={part.id}
                  className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                    selectedPartIds.has(part.id) ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => togglePart(part.id)}
                >
                  <Checkbox
                    checked={selectedPartIds.has(part.id)}
                    onCheckedChange={() => togglePart(part.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {part.part_number || 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {part.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="text-muted-foreground">Qty: {part.quantity || 0}</span>
                    <span className="font-medium">{formatCurrency(part.unit_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="flex gap-4 p-3 bg-muted/30 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Selected Items:</span>
              <span className="ml-2 font-medium">{selectedPartIds.size}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total NRE:</span>
              <span className="ml-2 font-medium text-blue-600">{formatCurrency(totalNRE)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Quote:</span>
              <span className="ml-2 font-medium text-green-600">{formatCurrency(totalQuote)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={generatePDF} disabled={exporting || selectedPartIds.size === 0}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Export Selected ({selectedPartIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
