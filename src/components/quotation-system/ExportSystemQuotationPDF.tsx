import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SystemQuotation, QuotationVolumePricing } from '@/hooks/useQuotationSystem';
import { format } from 'date-fns';
import schivoLogo from '@/assets/schivo-logo-quotation.png';
import { supabase } from '@/integrations/supabase/client';

export interface ExportSystemQuotationPDFProps {
  enquiryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Default notes and conditions matching WD-FRM-0040
export const DEFAULT_NOTES = [
  'Pricing quoted in Euros unless otherwise noted. Pricing is subject to confirmation at time of order and in the event of currency exchange rate fluctuations >5%.',
  'Customer to confirm in Writing or detail on P.O. if any of the following is required: Certs of Conformity, Material Certs, Inspection Reports, RoHS Compliance Certification or any other required Documentation',
  "Placing an order with SCHIVO Medical Ltd. is an acceptance of our \"Terms & Conditions of sale\" which is available upon request and on our Website.",
  "Schivo's ability to achieve all dimensional, tolerance and any associated specification requirements to be confirmed with initial order. Subsequent component pricing may be impacted subject to implementation of any or all proposed design for manufacture change requests.",
  'Pricing assumes expected annual usages are maintained with minimum production batch sizes based on quarterly requirements. Schivo accepts no liability for unused stock and the customer may be charged additional costs related to handling, disposal fees etc. at Schivo\'s discretion.',
  'Pricing excludes any process validation activities or special inspection requirements beyond what Schivo deem appropriate. Additional requirements will require review and potentially incur further costs.',
  'Pricing subject to changes based on any additional international customs duty costs fees etc. incurred at time of order placement.',
  'Unit pricing and NRE cost have been calculated based on manufacturing the group of components quoted and partial orders for individual parts will be subject to price reviews resulting from any reduced production cost efficiencies.',
  'Pricing excludes any special packaging requirements. Components will be packed & supplied as deemed appropriate by Schivo to prevent potential damage in transit.',
  'Schivo reserves the right to requote upon discovery of any errors or changes to initial quotation assumptions & conditions.',
];

export const DEFAULT_CONDITIONS = {
  leadTime: 'Subject to confirmation at time of order placement',
  carriage: 'Extra at Cost (unless otherwise stated)',
  validity: 'Quotation is valid for 60 days.',
  paymentTerms: '30 Days end of month',
};

export function ExportSystemQuotationPDF({ enquiryId, open, onOpenChange }: ExportSystemQuotationPDFProps) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [quotations, setQuotations] = useState<SystemQuotation[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [volumePricing, setVolumePricing] = useState<QuotationVolumePricing[]>([]);

  // Fetch quotations for this enquiry
  useEffect(() => {
    if (!open || !enquiryId) return;
    
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_quotations')
          .select('*')
          .eq('enquiry_id', enquiryId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setQuotations(data || []);
        if (data && data.length > 0) {
          setSelectedQuotationId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
        toast.error('Failed to load quotations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotations();
  }, [enquiryId, open]);

  // Fetch volume pricing when quotation selected
  useEffect(() => {
    if (!selectedQuotationId) return;
    
    const fetchPricing = async () => {
      const { data, error } = await supabase
        .from('quotation_volume_pricing')
        .select('*')
        .eq('quotation_id', selectedQuotationId)
        .order('quantity');
      
      if (error) {
        console.error('Error fetching pricing:', error);
        return;
      }
      setVolumePricing(data || []);
    };
    
    fetchPricing();
  }, [selectedQuotationId]);

  const selectedQuotation = quotations.find(q => q.id === selectedQuotationId);

  const formatCurrency = (value: number | null | undefined, currency: string = 'EUR'): string => {
    if (value === null || value === undefined) return '-';
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    if (!selectedQuotation || volumePricing.length === 0) {
      toast.error('No quotation data to export');
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
      
      // Schivo brand colors
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
      
      // Header - Form info
      page.drawText('WD-FRM-0040', { x: width - margin - 80, y: height - margin, size: 8, font: helvetica, color: black });
      page.drawText('Version: 0', { x: width - margin - 80, y: height - margin - 10, size: 8, font: helvetica, color: black });
      
      // Company Address
      y -= 10;
      page.drawText('SCHIVO Medical Limited,', { x: margin, y: y, size: 10, font: helveticaBold, color: schivoGray });
      y -= 12;
      page.drawText('Unit 1-4, IDA Industrial Park, Cork Road, Waterford.', { x: margin, y: y, size: 9, font: helvetica, color: black });
      
      // Orange accent line
      y -= 15;
      page.drawRectangle({
        x: margin,
        y: y,
        width: width - 2 * margin,
        height: 3,
        color: schivoOrange,
      });
      
      // Title
      y -= 25;
      page.drawText('Sales Quotation', { x: margin, y: y, size: 18, font: helveticaBold, color: schivoOrange });
      page.drawText('Tel: +353 (0)51 372010', { x: width - margin - 120, y: y, size: 9, font: helvetica, color: black });
      
      // To/From section
      y -= 30;
      page.drawText('To:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(selectedQuotation.customer, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      page.drawText('From:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText('Schivo Medical', { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      y -= 14;
      page.drawText('Company:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(selectedQuotation.customer, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      page.drawText('Date:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(format(new Date(selectedQuotation.created_at), 'dd-MMM-yy'), { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      y -= 14;
      page.drawText('Schivo Ref:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(selectedQuotation.enquiry_no, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      page.drawText('Part Number:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(selectedQuotation.part_number || 'N/A', { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      // Part Details
      y -= 20;
      page.drawText('Part Description:', { x: margin, y: y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(selectedQuotation.description || 'N/A', { x: margin + 100, y: y, size: 9, font: helvetica, color: black });
      
      // Table
      y -= 30;
      const tableWidth = width - 2 * margin;
      const colWidths = [50, 80, 80, 80, 80, 70];
      
      // Table Header with orange background
      const headerHeight = 22;
      page.drawRectangle({
        x: margin,
        y: y - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: schivoOrange,
      });
      
      let xPos = margin + 5;
      const headers = ['Qty', 'Unit Price', 'Cost/Unit', 'Total Value', 'Margin %'];
      headers.forEach((header, i) => {
        page.drawText(header, { 
          x: xPos, 
          y: y - 15, 
          size: 8, 
          font: helveticaBold, 
          color: rgb(1, 1, 1)
        });
        xPos += colWidths[i];
      });
      
      y -= headerHeight;
      
      const rowHeight = 16;
      
      volumePricing.forEach((vp, index) => {
        if (y < 180) return;
        
        y -= rowHeight;
        
        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: y,
            width: tableWidth,
            height: rowHeight,
            color: lightGray,
          });
        }
        
        xPos = margin + 5;
        
        // Quantity
        page.drawText(vp.quantity?.toLocaleString() || '-', { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[0];
        
        // Unit Price
        page.drawText(formatCurrency(vp.unit_price_quoted), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[1];
        
        // Cost Per Unit
        page.drawText(formatCurrency(vp.cost_per_unit), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[2];
        
        // Total Value
        const total = (vp.unit_price_quoted || 0) * (vp.quantity || 0);
        page.drawText(formatCurrency(total), { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
        xPos += colWidths[3];
        
        // Margin
        page.drawText(`${(vp.margin || 0).toFixed(1)}%`, { x: xPos, y: y + 4, size: 8, font: helvetica, color: black });
      });
      
      // Notes page
      const notesPage = pdfDoc.addPage([595, 842]);
      let notesY = height - margin;
      
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
      
      notesPage.drawText('Notes and Conditions:', { x: margin, y: notesY, size: 12, font: helveticaBold, color: schivoOrange });
      notesY -= 20;
      
      notesPage.drawRectangle({ x: margin, y: notesY, width: width - 2 * margin, height: 2, color: schivoOrange });
      notesY -= 15;
      
      const maxTextWidth = width - 2 * margin - 15;
      const notesFontSize = 8;
      const lineHeight = 11;
      
      DEFAULT_NOTES.forEach((note: string) => {
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
      notesPage.drawText(DEFAULT_CONDITIONS.leadTime, { x: margin + 70, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 14;
      
      notesPage.drawText('Carriage:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(DEFAULT_CONDITIONS.carriage, { x: margin + 70, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 14;
      
      notesPage.drawText('Terms & Conditions:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(DEFAULT_CONDITIONS.validity, { x: margin + 100, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 14;
      
      notesPage.drawText('Payment Terms:', { x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange });
      notesPage.drawText(DEFAULT_CONDITIONS.paymentTerms, { x: margin + 100, y: notesY, size: 9, font: helvetica, color: black });
      notesY -= 20;
      
      notesPage.drawText('Order Placement: All orders to be sent for the attention of: Orders@schivomedical.com', { 
        x: margin, y: notesY, size: 9, font: helveticaBold, color: schivoOrange 
      });
      
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
      link.download = `${selectedQuotation.enquiry_no.replace(/\s+/g, '_')}_${selectedQuotation.part_number || 'Quotation'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Quotation PDF</DialogTitle>
          <DialogDescription>
            Select a quotation to export as PDF
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No quotations found for this enquiry
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Quotation</label>
              <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quotation" />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.part_number || 'N/A'} - {q.description?.substring(0, 30) || 'No description'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedQuotation && (
              <div className="text-sm text-muted-foreground space-y-1 p-3 bg-muted rounded-md">
                <p><strong>Customer:</strong> {selectedQuotation.customer}</p>
                <p><strong>Part:</strong> {selectedQuotation.part_number || 'N/A'}</p>
                <p><strong>Pricing Tiers:</strong> {volumePricing.length}</p>
              </div>
            )}
            
            <Button 
              className="w-full"
              onClick={generatePDF}
              disabled={exporting || volumePricing.length === 0}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
