import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';
import { format } from 'date-fns';

interface ExportQuotationPDFProps {
  quotation: EnquiryQuotation;
  parts: EnquiryQuotationPart[];
}

export function ExportQuotationPDF({ quotation, parts }: ExportQuotationPDFProps) {
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (value: number | null | undefined, currency: string = 'EUR'): string => {
    if (value === null || value === undefined) return '-';
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    setExporting(true);
    
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 40;
      let y = height - margin;
      
      // Colors
      const darkBlue = rgb(0.1, 0.2, 0.4);
      const lightGray = rgb(0.9, 0.9, 0.9);
      const black = rgb(0, 0, 0);
      
      // Header - Company Info
      page.drawText('WD-FRM-0040', { x: width - margin - 80, y: y, size: 8, font: helvetica, color: black });
      page.drawText('Version: 0', { x: width - margin - 80, y: y - 10, size: 8, font: helvetica, color: black });
      
      y -= 20;
      
      // Company Address
      page.drawText('SCHIVO Medical Limited,', { x: margin, y: y, size: 10, font: helveticaBold, color: darkBlue });
      y -= 12;
      page.drawText('Unit 1-4', { x: margin, y: y, size: 9, font: helvetica, color: black });
      y -= 10;
      page.drawText('IDA Industrial Park,', { x: margin, y: y, size: 9, font: helvetica, color: black });
      y -= 10;
      page.drawText('Cork Road,', { x: margin, y: y, size: 9, font: helvetica, color: black });
      y -= 10;
      page.drawText('Waterford.', { x: margin, y: y, size: 9, font: helvetica, color: black });
      
      // Title
      y -= 30;
      page.drawText('Sales Quotation', { x: margin, y: y, size: 16, font: helveticaBold, color: darkBlue });
      
      // Contact info on right side
      page.drawText('Tel: +353 (0)51 372010', { x: width - margin - 120, y: y, size: 9, font: helvetica, color: black });
      
      // To/From section
      y -= 30;
      page.drawText('To:', { x: margin, y: y, size: 9, font: helveticaBold, color: black });
      page.drawText(quotation.customer, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      
      page.drawText('From:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: black });
      page.drawText('Schivo Medical', { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      y -= 14;
      page.drawText('Company:', { x: margin, y: y, size: 9, font: helveticaBold, color: black });
      page.drawText(quotation.customer, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      
      page.drawText('Date:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: black });
      page.drawText(format(new Date(quotation.created_at), 'dd-MMM-yy'), { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      y -= 14;
      page.drawText('Schivo Ref:', { x: margin, y: y, size: 9, font: helveticaBold, color: black });
      page.drawText(quotation.enquiry_no, { x: margin + 60, y: y, size: 9, font: helvetica, color: black });
      
      page.drawText('Customer Ref:', { x: width / 2, y: y, size: 9, font: helveticaBold, color: black });
      page.drawText('N/A', { x: width / 2 + 60, y: y, size: 9, font: helvetica, color: black });
      
      // Table
      y -= 30;
      const tableWidth = width - 2 * margin;
      const colWidths = [35, 100, 150, 60, 80, 90]; // Item, Part No, Description, Qty, Unit Price, Total Price
      
      // Table Header
      const headerHeight = 20;
      page.drawRectangle({
        x: margin,
        y: y - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: lightGray,
      });
      
      let xPos = margin + 5;
      const headers = ['Item', 'Part No.', 'Description', 'Qty', 'Unit Price', 'Total Price'];
      headers.forEach((header, i) => {
        page.drawText(header, { 
          x: xPos, 
          y: y - 14, 
          size: 8, 
          font: helveticaBold, 
          color: black 
        });
        xPos += colWidths[i];
      });
      
      y -= headerHeight;
      
      // Table Rows
      const rowHeight = 16;
      parts.forEach((part, index) => {
        if (y < 180) return; // Leave space for notes section
        
        y -= rowHeight;
        
        // Alternate row background
        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: y,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.97, 0.97, 0.97),
          });
        }
        
        xPos = margin + 5;
        
        // Item number
        page.drawText(part.line_number.toString(), { 
          x: xPos, 
          y: y + 4, 
          size: 8, 
          font: helvetica, 
          color: black 
        });
        xPos += colWidths[0];
        
        // Part Number
        const partNum = part.part_number || '-';
        page.drawText(partNum.length > 15 ? partNum.substring(0, 15) + '...' : partNum, { 
          x: xPos, 
          y: y + 4, 
          size: 8, 
          font: helvetica, 
          color: black 
        });
        xPos += colWidths[1];
        
        // Description
        const desc = part.description || '-';
        page.drawText(desc.length > 25 ? desc.substring(0, 25) + '...' : desc, { 
          x: xPos, 
          y: y + 4, 
          size: 8, 
          font: helvetica, 
          color: black 
        });
        xPos += colWidths[2];
        
        // Quantity
        page.drawText(part.quantity?.toLocaleString() || '-', { 
          x: xPos, 
          y: y + 4, 
          size: 8, 
          font: helvetica, 
          color: black 
        });
        xPos += colWidths[3];
        
        // Unit Price
        page.drawText(formatCurrency(part.unit_price), { 
          x: xPos, 
          y: y + 4, 
          size: 8, 
          font: helvetica, 
          color: black 
        });
        xPos += colWidths[4];
        
        // Total Price
        const total = (part.unit_price || 0) * (part.quantity || 0);
        page.drawText(formatCurrency(total), { 
          x: xPos, 
          y: y + 4, 
          size: 8, 
          font: helvetica, 
          color: black 
        });
      });
      
      // Notes section
      y = 170;
      page.drawText('Notes and Conditions:', { x: margin, y: y, size: 10, font: helveticaBold, color: darkBlue });
      y -= 14;
      
      const notes = [
        'Pricing in EUR and subject to review if exchange rate fluctuates greater than ±5%.',
        'Schivo reserves the right to re-quote after initial samples and if material prices fluctuate.',
        'Pricing based on current information available and may be subject to change upon receipt of additional requirements.',
        'Pricing excludes any costs associated with validation, capability assessment, Gauge R&R activities, etc.',
        'Pricing based on Schivo\'s standard inspection & packaging procedures.',
      ];
      
      notes.forEach(note => {
        page.drawText('• ' + note, { x: margin, y: y, size: 7, font: helvetica, color: black });
        y -= 10;
      });
      
      y -= 5;
      page.drawText('Lead Time: (Subject to confirmation at time of order placement): TBD', { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 10;
      page.drawText('Carriage: Extra at Cost (unless otherwise stated)', { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 10;
      page.drawText('Terms & Conditions of sale: Quotation is valid for 60 days.', { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 10;
      page.drawText('Payment Terms: 30 Days end of month', { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 14;
      page.drawText('Order Placement: All orders to be sent for the attention of: Orders@schivomedical.com', { x: margin, y: y, size: 8, font: helveticaBold, color: darkBlue });
      
      // Footer
      y = margin;
      page.drawText('WD-TMP-0003c', { x: margin, y: y, size: 7, font: helvetica, color: black });
      page.drawText('1 of 1', { x: width - margin - 30, y: y, size: 7, font: helvetica, color: black });
      
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
      
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={generatePDF}
      disabled={exporting || parts.length === 0}
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      Export PDF
    </Button>
  );
}
