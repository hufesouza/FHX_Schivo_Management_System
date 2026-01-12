import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';
import { format } from 'date-fns';
import schivoLogo from '@/assets/schivo-logo-quotation.png';

interface ExportQuotationPDFProps {
  quotation: EnquiryQuotation;
  parts: EnquiryQuotationPart[];
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

export function ExportQuotationPDF({ quotation, parts }: ExportQuotationPDFProps) {
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (value: number | null | undefined, currency: string = 'EUR'): string => {
    if (value === null || value === undefined) return '-';
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Parse notes from quotation or use defaults
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
    setExporting(true);
    
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 40;
      let y = height - margin;
      
      // Schivo brand colors - muted orange for better readability
      const schivoOrange = rgb(0.82, 0.50, 0.12); // Darker, muted orange
      const schivoGray = rgb(0.392, 0.431, 0.412); // #646E69
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
        // Fallback: draw text
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
      
      // Contact info on right side
      page.drawText('Tel: +353 (0)51 372010', { x: width - margin - 120, y: y, size: 9, font: helvetica, color: black });
      
      // To/From section
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
      const colWidths = [35, 100, 150, 60, 80, 90]; // Item, Part No, Description, Qty, Unit Price, Total Price
      
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
      const headers = ['Item', 'Part No.', 'Description', 'Qty', 'Unit Price', 'Total Price'];
      headers.forEach((header, i) => {
        page.drawText(header, { 
          x: xPos, 
          y: y - 15, 
          size: 8, 
          font: helveticaBold, 
          color: rgb(1, 1, 1) // White text on orange
        });
        xPos += colWidths[i];
      });
      
      y -= headerHeight;
      
      // Table Rows - Only show top-level parts (those with unit_price set)
      const topLevelParts = parts.filter(part => part.unit_price !== null && part.unit_price > 0);
      const rowHeight = 16;
      topLevelParts.forEach((part, index) => {
        if (y < 180) return; // Leave space for notes section
        
        y -= rowHeight;
        
        // Alternate row background
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
        
        // Item number
        page.drawText((index + 1).toString(), { 
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
      
      // Get notes and conditions
      const { notes, conditions } = parseNotesAndConditions();
      
      // Notes section
      y = 170;
      page.drawText('Notes and Conditions:', { x: margin, y: y, size: 10, font: helveticaBold, color: schivoOrange });
      y -= 14;
      
      notes.forEach((note: string) => {
        page.drawText('• ' + note, { x: margin, y: y, size: 7, font: helvetica, color: black });
        y -= 10;
      });
      
      y -= 5;
      page.drawText(`Lead Time: ${conditions.leadTime}`, { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 10;
      page.drawText(`Carriage: ${conditions.carriage}`, { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 10;
      page.drawText(`Terms & Conditions of sale: ${conditions.validity}`, { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 10;
      page.drawText(`Payment Terms: ${conditions.paymentTerms}`, { x: margin, y: y, size: 8, font: helvetica, color: black });
      y -= 14;
      page.drawText('Order Placement: All orders to be sent for the attention of: Orders@schivomedical.com', { x: margin, y: y, size: 8, font: helveticaBold, color: schivoOrange });
      
      // Footer with orange accent
      y = margin + 10;
      page.drawRectangle({
        x: margin,
        y: y,
        width: width - 2 * margin,
        height: 2,
        color: schivoOrange,
      });
      page.drawText('WD-TMP-0003c', { x: margin, y: margin, size: 7, font: helvetica, color: schivoGray });
      page.drawText('1 of 1', { x: width - margin - 30, y: margin, size: 7, font: helvetica, color: schivoGray });
      
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
