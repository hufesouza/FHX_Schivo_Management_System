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

interface GroupedParts {
  resource: string;
  parts: EnquiryQuotationPart[];
  topLevel: EnquiryQuotationPart | null;
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

  // Helper to check if a resource is a top-level assembly (e.g., "ASSY 1" not "ASSY 1.1")
  const isTopLevelAssembly = (resource: string | null): boolean => {
    if (!resource) return false;
    // Match patterns like "ASSY 1", "ASSY 2" but not "ASSY 1.1", "ASSY 2.3"
    const match = resource.match(/^ASSY\s+(\d+)$/i);
    return match !== null;
  };

  // Helper to get parent assembly from sub-assembly (e.g., "ASSY 1.1" -> "ASSY 1")
  const getParentAssembly = (resource: string | null): string => {
    if (!resource) return 'Unassigned';
    const match = resource.match(/^ASSY\s+(\d+)/i);
    return match ? `ASSY ${match[1]}` : resource;
  };

  // Get top-level parts and their sub-assemblies
  const groupedParts: GroupedParts[] = (() => {
    const groupMap = new Map<string, { topLevel: EnquiryQuotationPart | null; subParts: EnquiryQuotationPart[] }>();
    
    parts.forEach(part => {
      const resource = part.resource || 'Unassigned';
      const parentKey = getParentAssembly(resource);
      
      if (!groupMap.has(parentKey)) {
        groupMap.set(parentKey, { topLevel: null, subParts: [] });
      }
      
      const group = groupMap.get(parentKey)!;
      if (isTopLevelAssembly(resource)) {
        group.topLevel = part;
      } else {
        group.subParts.push(part);
      }
    });

    return Array.from(groupMap.entries()).map(([resource, { topLevel, subParts }]) => {
      // Calculate totals from sub-parts only (costs)
      const subPartsTotals = subParts.reduce(
        (acc, part) => {
          const qty = part.quantity || 0;
          const cost = (part.total_cost_per_part || 0) * qty;
          return {
            totalCost: acc.totalCost + cost,
            partCount: acc.partCount + 1,
          };
        },
        { totalCost: 0, partCount: 0 }
      );

      // Use top-level part for price/margin, sub-parts for cost breakdown
      const topLevelQty = topLevel?.quantity || 0;
      const topLevelPrice = (topLevel?.unit_price || 0) * topLevelQty;
      const topLevelMargin = topLevel?.margin || 0;

      return {
        resource,
        parts: subParts, // Only sub-parts for breakdown
        topLevel, // Keep reference to top-level
        totals: {
          totalCost: subPartsTotals.totalCost,
          totalQuotedPrice: topLevelPrice,
          totalMargin: topLevelMargin,
          partCount: subParts.length,
        },
      };
    }).filter(g => g.topLevel !== null) // Only show groups that have a top-level assembly
      .sort((a, b) => {
        // Sort by assembly number
        const aNum = parseInt(a.resource.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.resource.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      });
  })();

  // Expand all groups by default when dialog opens
  useEffect(() => {
    if (open) {
      setExpandedGroups(new Set(groupedParts.map(g => g.resource)));
    }
  }, [open, groupedParts.length]);

  const toggleGroup = (resource: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
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

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-4">
            {groupedParts.map((group) => (
              <Collapsible
                key={group.resource}
                open={expandedGroups.has(group.resource)}
                onOpenChange={() => toggleGroup(group.resource)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(group.resource) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-bold text-lg">{group.topLevel?.part_number || group.resource}</span>
                        <p className="text-sm text-muted-foreground">{group.topLevel?.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        Qty: {group.topLevel?.quantity || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Unit Price</div>
                        <div className="font-bold text-green-600 text-lg">
                          {formatCurrency(group.topLevel?.unit_price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Margin</div>
                        <div className="font-semibold">{formatPercent(group.totals.totalMargin)}</div>
                      </div>
                      <Badge variant="secondary">{group.totals.partCount} components</Badge>
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
                        {group.parts.map((part, idx) => (
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
                            {formatCurrency(group.parts.reduce((sum, p) => sum + ((p.total_cost_per_part || 0) * (p.quantity || 0)), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
