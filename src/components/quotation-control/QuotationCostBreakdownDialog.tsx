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
  Package, 
  DollarSign
} from 'lucide-react';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';

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
    partCount: number;
  };
}

export function QuotationCostBreakdownDialog({ quotation, parts }: QuotationCostBreakdownDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group parts by resource + assembly
  // Each top-level assembly gets its own group with its subparts
  const groupedParts: AssemblyGroup[] = (() => {
    // First, identify all top-level assemblies (those with unit_price set)
    const topLevelParts = parts.filter(p => p.unit_price !== null && p.unit_price > 0);
    const subParts = parts.filter(p => p.unit_price === null || p.unit_price === 0);
    
    // For each top-level, find its subparts based on resource and line_number range
    // Sort by resource then line_number to group correctly
    const sortedTopLevel = [...topLevelParts].sort((a, b) => {
      const resourceCompare = (a.resource || '').localeCompare(b.resource || '');
      if (resourceCompare !== 0) return resourceCompare;
      return a.line_number - b.line_number;
    });

    return sortedTopLevel.map((topLevel, idx) => {
      const resource = topLevel.resource || 'Unassigned';
      const currentLineNum = topLevel.line_number;
      
      // Find next top-level in same resource to determine line number range
      const nextTopLevelInResource = sortedTopLevel.find(
        t => t.resource === resource && t.line_number > currentLineNum
      );
      const maxLineNum = nextTopLevelInResource?.line_number ?? Infinity;
      
      // Get subparts for this assembly (same resource, line_number between current and next)
      const assemblySubParts = subParts.filter(
        p => p.resource === resource && 
             p.line_number > currentLineNum && 
             p.line_number < maxLineNum
      );

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

  // Calculate grand total
  const grandTotal = groupedParts.reduce((sum, g) => sum + g.totals.totalQuotedPrice, 0);

  // Expand all groups by default when dialog opens
  useEffect(() => {
    if (open) {
      setExpandedGroups(new Set(groupedParts.map(g => g.topLevel.id)));
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

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toFixed(1)}%`;
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
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Cost Breakdown: {quotation.enquiry_no}
          </DialogTitle>
        </DialogHeader>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Assemblies</p>
            <p className="text-xl font-bold">{groupedParts.length}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(quotation.total_cost)}</p>
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
              return (
              <Collapsible
                key={groupId}
                open={expandedGroups.has(groupId)}
                onOpenChange={() => toggleGroup(groupId)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(groupId) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{group.topLevel.part_number || group.resource}</span>
                          <Badge 
                            variant={group.resource.includes('Insourced') ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {group.resource}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{group.topLevel?.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Qty</div>
                        <div className="font-semibold">{group.topLevel?.quantity || 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Unit Price</div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(group.topLevel?.unit_price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Total Quoted</div>
                        <div className="font-bold text-green-600 text-lg">
                          {formatCurrency(group.totals.totalQuotedPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Margin</div>
                        <div className="font-semibold">{formatPercent(group.totals.totalMargin)}</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-8 border rounded-lg overflow-hidden">
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
                            {formatCurrency(group.subParts.reduce((sum, p) => sum + ((p.total_cost_per_part || 0) * (p.quantity || 0)), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        {/* Grand Total */}
        <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Grand Total Quotation</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
