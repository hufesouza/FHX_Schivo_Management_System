import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  SystemQuotation, 
  QuotationVolumePricing, 
  QuotationMaterial,
  QuotationRouting,
  QuotationSubcon
} from '@/hooks/useQuotationSystem';
import { format } from 'date-fns';
import schivoLogo from '@/assets/schivo-logo-quotation.png';

interface ExportBreakdownPDFProps {
  quotation: SystemQuotation;
  volumePricing: QuotationVolumePricing[];
  materials: QuotationMaterial[];
  routing: QuotationRouting[];
  subcons: QuotationSubcon[];
}

export function ExportBreakdownPDF({ quotation, volumePricing, materials, routing, subcons }: ExportBreakdownPDFProps) {
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `€${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    setExporting(true);
    
    try {
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pageWidth = 842; // A4 Landscape
      const pageHeight = 595;
      const margin = 40;
      
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      
      const black = rgb(0, 0, 0);
      const gray = rgb(0.4, 0.4, 0.4);
      const lightGray = rgb(0.95, 0.95, 0.95);
      const schivoOrange = rgb(0.82, 0.50, 0.12);
      const schivoGray = rgb(0.392, 0.431, 0.412);
      
      // Embed logo
      try {
        const logoResponse = await fetch(schivoLogo);
        const logoBytes = await logoResponse.arrayBuffer();
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.25);
        page.drawImage(logoImage, {
          x: margin,
          y: y - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        });
      } catch (logoError) {
        console.warn('Could not embed logo:', logoError);
      }
      
      // Header
      page.drawText('Cost Breakdown Report', { x: margin + 150, y, size: 16, font: helveticaBold, color: schivoOrange });
      y -= 15;
      page.drawText(`Generated: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`, { x: margin + 150, y, size: 9, font: helvetica, color: gray });
      y -= 30;
      
      // Quotation details
      page.drawText('Enquiry No:', { x: margin, y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(quotation.enquiry_no, { x: margin + 70, y, size: 9, font: helvetica, color: black });
      page.drawText('Customer:', { x: margin + 200, y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(quotation.customer, { x: margin + 260, y, size: 9, font: helvetica, color: black });
      y -= 14;
      
      page.drawText('Part Number:', { x: margin, y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText(quotation.part_number || 'N/A', { x: margin + 70, y, size: 9, font: helvetica, color: black });
      page.drawText('Description:', { x: margin + 200, y, size: 9, font: helveticaBold, color: schivoOrange });
      page.drawText((quotation.description || 'N/A').substring(0, 40), { x: margin + 260, y, size: 9, font: helvetica, color: black });
      y -= 25;
      
      // Materials Section
      page.drawText('Materials', { x: margin, y, size: 12, font: helveticaBold, color: schivoOrange });
      y -= 15;
      
      if (materials.length > 0) {
        // Material table header
        const matColWidths = [150, 100, 60, 80, 80, 80];
        const matHeaders = ['Description', 'Vendor', 'Qty/Unit', 'Unit Cost', 'Total', 'Category'];
        let xPos = margin;
        
        page.drawRectangle({ x: margin, y: y - 12, width: 550, height: 14, color: schivoOrange });
        matHeaders.forEach((header, i) => {
          page.drawText(header, { x: xPos + 3, y: y - 9, size: 7, font: helveticaBold, color: rgb(1, 1, 1) });
          xPos += matColWidths[i];
        });
        y -= 14;
        
        materials.forEach((mat, idx) => {
          if (y < 80) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          
          if (idx % 2 === 0) {
            page.drawRectangle({ x: margin, y: y - 10, width: 550, height: 12, color: lightGray });
          }
          
          xPos = margin;
          page.drawText((mat.material_description || '-').substring(0, 25), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += matColWidths[0];
          page.drawText((mat.vendor_name || '-').substring(0, 15), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += matColWidths[1];
          page.drawText(String(mat.qty_per_unit || 0), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += matColWidths[2];
          page.drawText(formatCurrency(mat.std_cost_est), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += matColWidths[3];
          page.drawText(formatCurrency(mat.total_material), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += matColWidths[4];
          page.drawText(mat.mat_category || '-', { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          y -= 12;
        });
      } else {
        page.drawText('No materials recorded', { x: margin, y, size: 8, font: helvetica, color: gray });
        y -= 12;
      }
      
      y -= 20;
      
      // Routing Section
      page.drawText('Routing', { x: margin, y, size: 12, font: helveticaBold, color: schivoOrange });
      y -= 15;
      
      if (routing.length > 0) {
        const routeColWidths = [40, 80, 150, 60, 60, 60, 80];
        const routeHeaders = ['Op', 'Resource', 'Operation', 'Setup', 'Run', 'Subcon', 'Cost'];
        let xPos = margin;
        
        page.drawRectangle({ x: margin, y: y - 12, width: 530, height: 14, color: schivoOrange });
        routeHeaders.forEach((header, i) => {
          page.drawText(header, { x: xPos + 3, y: y - 9, size: 7, font: helveticaBold, color: rgb(1, 1, 1) });
          xPos += routeColWidths[i];
        });
        y -= 14;
        
        routing.forEach((route, idx) => {
          if (y < 80) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          
          if (idx % 2 === 0) {
            page.drawRectangle({ x: margin, y: y - 10, width: 530, height: 12, color: lightGray });
          }
          
          xPos = margin;
          page.drawText(String(route.op_no), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += routeColWidths[0];
          page.drawText((route.resource_no || '-').substring(0, 12), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += routeColWidths[1];
          page.drawText((route.operation_details || '-').substring(0, 25), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += routeColWidths[2];
          page.drawText(`${route.setup_time || 0} min`, { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += routeColWidths[3];
          page.drawText(`${route.run_time || 0} min`, { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += routeColWidths[4];
          page.drawText(`${route.subcon_processing_time || 0} min`, { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += routeColWidths[5];
          page.drawText(formatCurrency(route.cost), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          y -= 12;
        });
      } else {
        page.drawText('No routing recorded', { x: margin, y, size: 8, font: helvetica, color: gray });
        y -= 12;
      }
      
      y -= 20;
      
      // Subcon Section
      if (subcons.length > 0) {
        page.drawText('Subcontract Operations', { x: margin, y, size: 12, font: helveticaBold, color: schivoOrange });
        y -= 15;
        
        const subconColWidths = [100, 150, 100, 100];
        const subconHeaders = ['Vendor', 'Process', 'Unit Cost', 'Total'];
        let xPos = margin;
        
        page.drawRectangle({ x: margin, y: y - 12, width: 450, height: 14, color: schivoOrange });
        subconHeaders.forEach((header, i) => {
          page.drawText(header, { x: xPos + 3, y: y - 9, size: 7, font: helveticaBold, color: rgb(1, 1, 1) });
          xPos += subconColWidths[i];
        });
        y -= 14;
        
        subcons.forEach((sub, idx) => {
          if (y < 80) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          
          if (idx % 2 === 0) {
            page.drawRectangle({ x: margin, y: y - 10, width: 450, height: 12, color: lightGray });
          }
          
          xPos = margin;
          page.drawText((sub.vendor_name || '-').substring(0, 15), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += subconColWidths[0];
          page.drawText((sub.process_description || '-').substring(0, 25), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += subconColWidths[1];
          page.drawText(formatCurrency(sub.std_cost_est), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          xPos += subconColWidths[2];
          page.drawText(formatCurrency(sub.total_subcon), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
          y -= 12;
        });
        
        y -= 20;
      }
      
      // Volume Pricing Summary
      page.drawText('Volume Pricing Summary', { x: margin, y, size: 12, font: helveticaBold, color: schivoOrange });
      y -= 15;
      
      const vpColWidths = [60, 80, 80, 80, 80, 80, 60];
      const vpHeaders = ['Qty', 'Labour', 'Material', 'Subcon', 'Total Cost', 'Unit Price', 'Margin'];
      let xPos = margin;
      
      page.drawRectangle({ x: margin, y: y - 12, width: 520, height: 14, color: schivoOrange });
      vpHeaders.forEach((header, i) => {
        page.drawText(header, { x: xPos + 3, y: y - 9, size: 7, font: helveticaBold, color: rgb(1, 1, 1) });
        xPos += vpColWidths[i];
      });
      y -= 14;
      
      volumePricing.forEach((vp, idx) => {
        if (y < 50) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        
        if (idx % 2 === 0) {
          page.drawRectangle({ x: margin, y: y - 10, width: 520, height: 12, color: lightGray });
        }
        
        xPos = margin;
        page.drawText(String(vp.quantity || 0), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        xPos += vpColWidths[0];
        page.drawText(formatCurrency(vp.labour_cost), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        xPos += vpColWidths[1];
        page.drawText(formatCurrency(vp.material_cost), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        xPos += vpColWidths[2];
        page.drawText(formatCurrency(vp.subcon_cost), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        xPos += vpColWidths[3];
        page.drawText(formatCurrency(vp.cost_per_unit), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        xPos += vpColWidths[4];
        page.drawText(formatCurrency(vp.unit_price_quoted), { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        xPos += vpColWidths[5];
        page.drawText(`${(vp.margin || 0).toFixed(1)}%`, { x: xPos + 3, y: y - 7, size: 7, font: helvetica, color: black });
        y -= 12;
      });
      
      // Footer
      page.drawRectangle({ x: margin, y: margin, width: pageWidth - 2 * margin, height: 2, color: schivoOrange });
      page.drawText('CONFIDENTIAL - Internal Use Only', { x: margin, y: margin - 12, size: 7, font: helvetica, color: schivoGray });
      
      // Download PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quotation.enquiry_no}_${quotation.part_number || 'Part'}_Breakdown_${format(new Date(), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Breakdown PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Table2 className="h-4 w-4 mr-2" />
      )}
      Export Breakdown
    </Button>
  );
}
