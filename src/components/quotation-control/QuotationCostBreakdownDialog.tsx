import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  EyeOff,
  Package, 
  DollarSign,
  FileDown,
  Loader2
} from 'lucide-react';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface QuotationCostBreakdownDialogProps {
  quotation: EnquiryQuotation;
  parts: EnquiryQuotationPart[];
}

interface AssemblyGroup {
  resource: string;
  topLevel: EnquiryQuotationPart;
  subParts: EnquiryQuotationPart[];
  totals: {
    totalCost: number;
    totalQuotedPrice: number;
    totalMargin: number;
    totalNRE: number;
    partCount: number;
  };
}

// Component for showing detailed breakdown of a single part
function PartBreakdownDetail({ 
  part, 
  formatCurrency, 
  formatPercent 
}: { 
  part: EnquiryQuotationPart; 
  formatCurrency: (v: number | null) => string;
  formatPercent: (v: number | null) => string;
}) {
  const formatNumber = (v: number | null) => v !== null && v !== undefined ? v.toFixed(2) : '—';
  
  return (
    <div className="p-4 space-y-4 bg-muted/10">
      {/* Material Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 font-semibold text-sm text-blue-800 dark:text-blue-200">
          Material
        </div>
        <div className="grid grid-cols-5 gap-2 p-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Material</span>
            <p className="font-medium truncate" title={part.material_name || ''}>{part.material_name || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Qty/Unit</span>
            <p className="font-medium">{formatNumber(part.material_qty_per_unit)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Std Cost Est</span>
            <p className="font-medium">{formatCurrency(part.material_std_cost_est)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Markup</span>
            <p className="font-medium">{formatPercent(part.material_markup ? part.material_markup * 100 : null)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Total Material</span>
            <p className="font-bold text-blue-600">{formatCurrency(part.total_material)}</p>
          </div>
        </div>
      </div>

      {/* Subcon Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-2 font-semibold text-sm text-purple-800 dark:text-purple-200">
          Subcon
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Subcon Cost</span>
            <p className="font-medium">{formatCurrency(part.subcon_cost)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Subcon Markup</span>
            <p className="font-medium">{formatPercent(part.subcon_markup ? part.subcon_markup * 100 : null)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Subcon Cost/Part</span>
            <p className="font-bold text-purple-600">{formatCurrency(part.subcon_cost_per_part)}</p>
          </div>
        </div>
      </div>

      {/* Development Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-amber-100 dark:bg-amber-900/30 px-3 py-2 font-semibold text-sm text-amber-800 dark:text-amber-200">
          Development
        </div>
        <div className="grid grid-cols-6 gap-2 p-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Resource</span>
            <p className="font-medium">{part.resource || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Volume</span>
            <p className="font-medium">{formatNumber(part.volume)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Dev Time</span>
            <p className="font-medium">{formatNumber(part.development_time)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Days Dev</span>
            <p className="font-medium">{formatNumber(part.days_dev_time)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Shift</span>
            <p className="font-medium">{formatNumber(part.shift)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Dev Time Cost</span>
            <p className="font-bold text-amber-600">{formatCurrency(part.dev_time_cost)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 pb-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Tooling</span>
            <p className="font-medium">{formatCurrency(part.tooling)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">NRE</span>
            <p className="font-bold text-amber-600">{formatCurrency(part.nre)}</p>
          </div>
        </div>
      </div>

      {/* Routing Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-green-100 dark:bg-green-900/30 px-3 py-2 font-semibold text-sm text-green-800 dark:text-green-200">
          Routing
        </div>
        <div className="grid grid-cols-5 gap-2 p-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Machine Manning</span>
            <p className="font-medium">{part.machine_manning || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Setup (min)</span>
            <p className="font-medium">{formatNumber(part.machine_setup)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Run Time (min)</span>
            <p className="font-medium">{formatNumber(part.machine_run_time)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Deburr (min)</span>
            <p className="font-medium">{formatNumber(part.part_deburr)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Wash (min)</span>
            <p className="font-medium">{formatNumber(part.wash)}</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 px-3 pb-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Labour/hr</span>
            <p className="font-medium">{formatCurrency(part.labour_per_hr)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Overheads/hr</span>
            <p className="font-medium">{formatCurrency(part.overheads_per_hr)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Machine Cost/min</span>
            <p className="font-medium">{formatCurrency(part.machine_cost_per_min)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Sec Ops Cost/min</span>
            <p className="font-medium">{formatCurrency(part.secondary_ops_cost_per_min)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Processing Cost</span>
            <p className="font-bold text-green-600">{formatCurrency(part.labour_processing_cost)}</p>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary/20 px-3 py-2 font-semibold text-sm">
          Price Summary
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Total Cost/Part</span>
            <p className="font-bold text-orange-600 text-lg">{formatCurrency(part.total_cost_per_part)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Margin</span>
            <p className="font-bold text-lg">{formatPercent(part.margin ? part.margin * 100 : null)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Unit Price</span>
            <p className="font-bold text-green-600 text-lg">{formatCurrency(part.unit_price)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuotationCostBreakdownDialog({ quotation, parts }: QuotationCostBreakdownDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  // Group parts by resource + assembly
  // Each top-level assembly gets its own group with its subparts
  const groupedParts: AssemblyGroup[] = (() => {
    // First, identify all top-level assemblies (those with unit_price set)
    const topLevelParts = parts.filter(p => p.unit_price !== null && p.unit_price > 0);
    const subParts = parts.filter(p => p.unit_price === null || p.unit_price === 0);
    
    // Sort by line_number to group correctly
    const sortedTopLevel = [...topLevelParts].sort((a, b) => a.line_number - b.line_number);

    // Track which subparts have been assigned to avoid duplicates
    const assignedSubPartIds = new Set<string>();

    return sortedTopLevel.map((topLevel, idx) => {
      const resource = topLevel.resource || 'Unassigned';
      const currentLineNum = topLevel.line_number;
      
      // Find the next top-level part (any resource) to determine line number range
      const nextTopLevel = sortedTopLevel.find(t => t.line_number > currentLineNum);
      const maxLineNum = nextTopLevel?.line_number ?? Infinity;
      
      // Get subparts for this assembly based on line_number range
      // Subparts are between this top-level and the next top-level, regardless of resource
      const assemblySubParts = subParts.filter(p => {
        // Skip if already assigned
        if (assignedSubPartIds.has(p.id)) return false;
        
        // Check if line number is within range
        const inRange = p.line_number > currentLineNum && p.line_number < maxLineNum;
        
        if (inRange) {
          assignedSubPartIds.add(p.id);
          return true;
        }
        return false;
      });

      // Calculate totals
      const subPartsTotalCost = assemblySubParts.reduce(
        (sum, p) => sum + ((p.total_cost_per_part || 0) * (p.quantity || 0)),
        0
      );

      const topLevelQty = topLevel.quantity || 0;
      const topLevelPrice = (topLevel.unit_price || 0) * topLevelQty;

      return {
        resource,
        topLevel,
        subParts: assemblySubParts,
        totals: {
          totalCost: subPartsTotalCost,
          totalQuotedPrice: topLevelPrice,
          totalMargin: topLevel.margin || 0,
          totalNRE: topLevel.nre || 0,
          partCount: assemblySubParts.length,
        },
      };
    }).sort((a, b) => {
      // Sort by resource first, then by part number
      const resourceCompare = a.resource.localeCompare(b.resource);
      if (resourceCompare !== 0) return resourceCompare;
      return (a.topLevel.part_number || '').localeCompare(b.topLevel.part_number || '');
    });
  })();

  // Calculate grand total excluding hidden groups
  const grandTotal = groupedParts
    .filter(g => !hiddenGroups.has(g.topLevel.id))
    .reduce((sum, g) => sum + g.totals.totalQuotedPrice, 0);

  // Calculate visible total cost
  const visibleTotalCost = groupedParts
    .filter(g => !hiddenGroups.has(g.topLevel.id))
    .reduce((sum, g) => sum + g.totals.totalCost, 0);

  // Calculate total NRE excluding hidden groups
  const totalNRE = groupedParts
    .filter(g => !hiddenGroups.has(g.topLevel.id))
    .reduce((sum, g) => sum + g.totals.totalNRE, 0);

  // Expand all groups by default when dialog opens
  useEffect(() => {
    if (open) {
      setExpandedGroups(new Set(groupedParts.map(g => g.topLevel.id)));
      setHiddenGroups(new Set()); // Reset hidden state when reopening
    }
  }, [open, groupedParts.length]);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleHidden = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHidden = new Set(hiddenGroups);
    if (newHidden.has(groupId)) {
      newHidden.delete(groupId);
    } else {
      newHidden.add(groupId);
    }
    setHiddenGroups(newHidden);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(1)}%`;
  };

  const exportBreakdownPDF = async () => {
    setExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pageWidth = 595;
      const pageHeight = 842;
      const margin = 40;
      
      const schivoOrange = rgb(0.82, 0.50, 0.12);
      const black = rgb(0, 0, 0);
      const lightGray = rgb(0.95, 0.95, 0.95);
      const green = rgb(0.13, 0.55, 0.13);
      const orange = rgb(0.80, 0.40, 0.0);
      
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      
      // Header
      page.drawText(`Cost Breakdown: ${quotation.enquiry_no}`, { 
        x: margin, y, size: 16, font: helveticaBold, color: schivoOrange 
      });
      y -= 20;
      page.drawText(`Customer: ${quotation.customer}`, { 
        x: margin, y, size: 10, font: helvetica, color: black 
      });
      page.drawText(`Date: ${format(new Date(), 'dd-MMM-yyyy')}`, { 
        x: pageWidth - margin - 100, y, size: 10, font: helvetica, color: black 
      });
      y -= 25;
      
      // Orange line
      page.drawRectangle({ x: margin, y, width: pageWidth - 2 * margin, height: 2, color: schivoOrange });
      y -= 20;
      
      // Summary
      page.drawText('Summary:', { x: margin, y, size: 12, font: helveticaBold, color: black });
      y -= 15;
      page.drawText(`Total Assemblies: ${groupedParts.length}`, { x: margin, y, size: 9, font: helvetica, color: black });
      page.drawText(`Visible: ${groupedParts.length - hiddenGroups.size}`, { x: margin + 120, y, size: 9, font: helvetica, color: black });
      y -= 12;
      const blue = rgb(0.15, 0.35, 0.70);
      page.drawText(`Total NRE: ${formatCurrency(totalNRE)}`, { x: margin, y, size: 10, font: helveticaBold, color: blue });
      page.drawText(`Grand Total (visible): ${formatCurrency(grandTotal)}`, { x: margin + 150, y, size: 10, font: helveticaBold, color: green });
      y -= 25;
      
      // Iterate through each assembly
      for (const group of groupedParts) {
        const isHidden = hiddenGroups.has(group.topLevel.id);
        
        // Check if we need a new page
        if (y < 150) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        
        // Assembly header
        const headerColor = isHidden ? rgb(0.6, 0.6, 0.6) : schivoOrange;
        page.drawRectangle({ x: margin, y: y - 18, width: pageWidth - 2 * margin, height: 22, color: lightGray });
        
        const partNum = group.topLevel.part_number || 'N/A';
        const resourceLabel = group.resource;
        page.drawText(`${partNum} - ${group.topLevel.description || ''}`, { 
          x: margin + 5, y: y - 12, size: 10, font: helveticaBold, color: headerColor 
        });
        page.drawText(`[${resourceLabel}]${isHidden ? ' (EXCLUDED)' : ''}`, { 
          x: pageWidth - margin - 150, y: y - 12, size: 8, font: helvetica, color: headerColor 
        });
        y -= 30;
        
        // Assembly totals
        const blue = rgb(0.15, 0.35, 0.70);
        page.drawText(`Qty: ${group.topLevel.quantity || 0}`, { x: margin + 10, y, size: 8, font: helvetica, color: black });
        page.drawText(`NRE: ${formatCurrency(group.totals.totalNRE)}`, { x: margin + 60, y, size: 8, font: helvetica, color: isHidden ? black : blue });
        page.drawText(`Unit Price: ${formatCurrency(group.topLevel.unit_price)}`, { x: margin + 160, y, size: 8, font: helvetica, color: isHidden ? black : green });
        page.drawText(`Total: ${formatCurrency(group.totals.totalQuotedPrice)}`, { x: margin + 280, y, size: 8, font: helveticaBold, color: isHidden ? black : green });
        page.drawText(`Margin: ${formatPercent(group.totals.totalMargin)}`, { x: margin + 400, y, size: 8, font: helvetica, color: black });
        y -= 18;
        
        // For single parts (no sub-parts), show detailed breakdown
        if (group.subParts.length === 0) {
          const part = group.topLevel;
          const blue = rgb(0.15, 0.35, 0.70);
          const purple = rgb(0.5, 0.2, 0.6);
          const amber = rgb(0.8, 0.5, 0.1);
          
          // Check for new page
          if (y < 280) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          
          // Material section
          page.drawText('Material:', { x: margin + 10, y, size: 8, font: helveticaBold, color: blue });
          y -= 10;
          page.drawText(`Material: ${part.material_name || '-'}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          y -= 9;
          page.drawText(`Qty/Unit: ${part.material_qty_per_unit?.toFixed(3) || '-'}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          page.drawText(`Std Cost: ${formatCurrency(part.material_std_cost_est)}`, { x: margin + 100, y, size: 7, font: helvetica, color: black });
          page.drawText(`Markup: ${formatPercent(part.material_markup ? part.material_markup * 100 : null)}`, { x: margin + 200, y, size: 7, font: helvetica, color: black });
          page.drawText(`Total Material: ${formatCurrency(part.total_material)}`, { x: margin + 300, y, size: 7, font: helveticaBold, color: blue });
          y -= 12;
          
          // Subcon section
          page.drawText('Subcon:', { x: margin + 10, y, size: 8, font: helveticaBold, color: purple });
          y -= 10;
          page.drawText(`Subcon Cost: ${formatCurrency(part.subcon_cost)}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          page.drawText(`Markup: ${formatPercent(part.subcon_markup ? part.subcon_markup * 100 : null)}`, { x: margin + 120, y, size: 7, font: helvetica, color: black });
          page.drawText(`Subcon/Part: ${formatCurrency(part.subcon_cost_per_part)}`, { x: margin + 220, y, size: 7, font: helveticaBold, color: purple });
          y -= 12;
          
          // Development section
          page.drawText('Development:', { x: margin + 10, y, size: 8, font: helveticaBold, color: amber });
          y -= 10;
          page.drawText(`Resource: ${part.resource || '-'}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          page.drawText(`Volume: ${part.volume || '-'}`, { x: margin + 120, y, size: 7, font: helvetica, color: black });
          page.drawText(`Dev Time: ${part.development_time?.toFixed(0) || '-'}`, { x: margin + 180, y, size: 7, font: helvetica, color: black });
          page.drawText(`Days Dev: ${part.days_dev_time?.toFixed(2) || '-'}`, { x: margin + 260, y, size: 7, font: helvetica, color: black });
          y -= 9;
          page.drawText(`Shift: ${part.shift || '-'}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          page.drawText(`Dev Cost: ${formatCurrency(part.dev_time_cost)}`, { x: margin + 80, y, size: 7, font: helvetica, color: amber });
          page.drawText(`Tooling: ${formatCurrency(part.tooling)}`, { x: margin + 180, y, size: 7, font: helvetica, color: black });
          page.drawText(`NRE: ${formatCurrency(part.nre)}`, { x: margin + 280, y, size: 7, font: helveticaBold, color: amber });
          y -= 12;
          
          // Routing section
          page.drawText('Routing:', { x: margin + 10, y, size: 8, font: helveticaBold, color: green });
          y -= 10;
          page.drawText(`Manning: ${part.machine_manning || '-'}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          page.drawText(`Setup: ${part.machine_setup || '-'}`, { x: margin + 150, y, size: 7, font: helvetica, color: black });
          page.drawText(`Run: ${part.machine_run_time || '-'}`, { x: margin + 210, y, size: 7, font: helvetica, color: black });
          page.drawText(`Deburr: ${part.part_deburr || '-'}`, { x: margin + 280, y, size: 7, font: helvetica, color: black });
          page.drawText(`Wash: ${part.wash || '-'}`, { x: margin + 350, y, size: 7, font: helvetica, color: black });
          y -= 9;
          page.drawText(`Labour/hr: ${formatCurrency(part.labour_per_hr)}`, { x: margin + 15, y, size: 7, font: helvetica, color: black });
          page.drawText(`OH/hr: ${formatCurrency(part.overheads_per_hr)}`, { x: margin + 110, y, size: 7, font: helvetica, color: black });
          page.drawText(`Mach/min: ${formatCurrency(part.machine_cost_per_min)}`, { x: margin + 200, y, size: 7, font: helvetica, color: black });
          page.drawText(`Processing: ${formatCurrency(part.labour_processing_cost)}`, { x: margin + 320, y, size: 7, font: helveticaBold, color: green });
          y -= 12;
          
          // Summary line
          page.drawRectangle({ x: margin + 10, y: y + 2, width: pageWidth - 2 * margin - 20, height: 0.5, color: black });
          y -= 8;
          page.drawText(`Cost/Part: ${formatCurrency(part.total_cost_per_part)}`, { x: margin + 15, y, size: 8, font: helveticaBold, color: orange });
          page.drawText(`Margin: ${formatPercent(part.margin ? part.margin * 100 : null)}`, { x: margin + 150, y, size: 8, font: helveticaBold, color: black });
          page.drawText(`Unit Price: ${formatCurrency(part.unit_price)}`, { x: margin + 280, y, size: 8, font: helveticaBold, color: green });
          y -= 15;
        } else {
          // For assemblies with sub-parts, show component table
          page.drawText('Part Number', { x: margin + 10, y, size: 7, font: helveticaBold, color: black });
          page.drawText('Description', { x: margin + 100, y, size: 7, font: helveticaBold, color: black });
          page.drawText('Qty', { x: margin + 280, y, size: 7, font: helveticaBold, color: black });
          page.drawText('Unit Cost', { x: margin + 330, y, size: 7, font: helveticaBold, color: black });
          page.drawText('Total Cost', { x: margin + 410, y, size: 7, font: helveticaBold, color: black });
          y -= 12;
          
          // Sub-parts rows
          for (const part of group.subParts) {
            if (y < 60) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            
            const partNumText = (part.part_number || '-').substring(0, 15);
            const descText = (part.description || '-').substring(0, 28);
            
            page.drawText(partNumText, { x: margin + 10, y, size: 7, font: helvetica, color: black });
            page.drawText(descText, { x: margin + 100, y, size: 7, font: helvetica, color: black });
            page.drawText(String(part.quantity || 0), { x: margin + 280, y, size: 7, font: helvetica, color: black });
            page.drawText(formatCurrency(part.total_cost_per_part), { x: margin + 330, y, size: 7, font: helvetica, color: orange });
            page.drawText(formatCurrency((part.total_cost_per_part || 0) * (part.quantity || 0)), { 
              x: margin + 410, y, size: 7, font: helvetica, color: orange 
            });
            y -= 10;
          }
          
          // Sub-total
          const subTotal = group.subParts.reduce((sum, p) => sum + ((p.total_cost_per_part || 0) * (p.quantity || 0)), 0);
          page.drawText('Components Total:', { x: margin + 280, y, size: 7, font: helveticaBold, color: black });
          page.drawText(formatCurrency(subTotal), { x: margin + 410, y, size: 7, font: helveticaBold, color: orange });
          y -= 15;
        }
        
        y -= 10;
      }
      
      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quotation.enquiry_no.replace(/\s+/g, '_')}_Cost_Breakdown.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Cost breakdown exported successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to export breakdown');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="View Cost Breakdown">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Cost Breakdown: {quotation.enquiry_no}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportBreakdownPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Export Breakdown
            </Button>
          </DialogTitle>
        </DialogHeader>
        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Assemblies</p>
            <p className="text-xl font-bold">{groupedParts.length}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(quotation.total_cost)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total NRE</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totalNRE)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Price</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(quotation.total_quoted_price)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Avg. Margin</p>
            <p className="text-xl font-bold">{formatPercent(quotation.average_margin)}</p>
          </div>
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-3 pr-4">
            {groupedParts.map((group) => {
              const groupId = group.topLevel.id;
              const isHidden = hiddenGroups.has(groupId);
              return (
              <Collapsible
                key={groupId}
                open={expandedGroups.has(groupId) && !isHidden}
                onOpenChange={() => !isHidden && toggleGroup(groupId)}
              >
                <CollapsibleTrigger asChild>
                  <div className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors border ${
                    isHidden 
                      ? 'bg-muted/10 opacity-50' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      {!isHidden && (expandedGroups.has(groupId) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      ))}
                      {isHidden && <div className="w-5" />}
                      <Package className={`h-5 w-5 ${isHidden ? 'text-muted-foreground' : 'text-primary'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${isHidden ? 'line-through text-muted-foreground' : ''}`}>
                            {group.topLevel.part_number || group.resource}
                          </span>
                          <Badge 
                            variant={group.resource.includes('Insourced') ? 'default' : 'secondary'}
                            className={`text-xs ${isHidden ? 'opacity-50' : ''}`}
                          >
                            {group.resource}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{group.topLevel?.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Button
                        variant={isHidden ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={(e) => toggleHidden(groupId, e)}
                        title={isHidden ? 'Include in total' : 'Exclude from total'}
                        className="h-8 w-8 p-0"
                      >
                        {isHidden ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Qty</div>
                        <div className="font-semibold">{group.topLevel?.quantity || 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">NRE</div>
                        <div className={`font-bold ${isHidden ? 'text-muted-foreground' : 'text-blue-600'}`}>
                          {formatCurrency(group.totals.totalNRE)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Unit Price</div>
                        <div className={`font-bold ${isHidden ? 'text-muted-foreground' : 'text-green-600'}`}>
                          {formatCurrency(group.topLevel?.unit_price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Total Quoted</div>
                        <div className={`font-bold text-lg ${isHidden ? 'text-muted-foreground' : 'text-green-600'}`}>
                          {formatCurrency(group.totals.totalQuotedPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Margin</div>
                        <div className={`font-semibold ${isHidden ? 'text-muted-foreground' : ''}`}>
                          {formatPercent(group.totals.totalMargin)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-8 border rounded-lg overflow-hidden">
                    {/* For single parts (no sub-parts), show detailed breakdown */}
                    {group.subParts.length === 0 ? (
                      <PartBreakdownDetail part={group.topLevel} formatCurrency={formatCurrency} formatPercent={formatPercent} />
                    ) : (
                      /* For assemblies with sub-parts, show the component table */
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">Part Number</th>
                            <th className="text-left p-3 font-medium">Description</th>
                            <th className="text-right p-3 font-medium">Qty</th>
                            <th className="text-right p-3 font-medium">Unit Cost</th>
                            <th className="text-right p-3 font-medium">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.subParts.map((part, idx) => (
                            <tr
                              key={part.id}
                              className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                            >
                              <td className="p-3 font-medium">{part.part_number || '-'}</td>
                              <td className="p-3 text-muted-foreground">{part.description || '-'}</td>
                              <td className="p-3 text-right">{part.quantity || 0}</td>
                              <td className="p-3 text-right font-medium text-orange-600">
                                {formatCurrency(part.total_cost_per_part)}
                              </td>
                              <td className="p-3 text-right font-medium">
                                {formatCurrency((part.total_cost_per_part || 0) * (part.quantity || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30 border-t">
                          <tr>
                            <td colSpan={3} className="p-3 font-semibold">Total Components Cost</td>
                            <td></td>
                            <td className="p-3 text-right font-bold text-orange-600">
                              {formatCurrency(
                                group.subParts.reduce(
                                  (sum, p) => sum + (p.total_cost_per_part || 0) * (p.quantity || 0),
                                  0,
                                )
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        {/* Grand Total */}
        <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-lg font-semibold">Grand Total Quotation</span>
              {hiddenGroups.size > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({hiddenGroups.size} excluded)
                </span>
              )}
            </div>
            <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
          </div>
          {hiddenGroups.size > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2">
              <span>Visible assemblies cost total</span>
              <span className="font-medium">{formatCurrency(visibleTotalCost)}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
