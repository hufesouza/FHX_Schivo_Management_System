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
import { ChevronDown, ChevronRight, Eye, Package, Wrench, FlaskConical, DollarSign } from 'lucide-react';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';

interface QuotationCostBreakdownDialogProps {
  quotation: EnquiryQuotation;
  parts: EnquiryQuotationPart[];
}

interface GroupedParts {
  resource: string;
  parts: EnquiryQuotationPart[];
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

  // Group parts by resource
  const groupedParts: GroupedParts[] = (() => {
    const groupMap = new Map<string, EnquiryQuotationPart[]>();
    
    parts.forEach(part => {
      const resource = part.resource || 'Unassigned';
      if (!groupMap.has(resource)) {
        groupMap.set(resource, []);
      }
      groupMap.get(resource)!.push(part);
    });

    return Array.from(groupMap.entries()).map(([resource, groupParts]) => {
      const totals = groupParts.reduce(
        (acc, part) => {
          const qty = part.quantity || 0;
          const cost = (part.total_cost_per_part || 0) * qty;
          const price = (part.unit_price || 0) * qty;
          return {
            totalCost: acc.totalCost + cost,
            totalQuotedPrice: acc.totalQuotedPrice + price,
            totalMargin: acc.totalMargin + (part.margin || 0),
            partCount: acc.partCount + 1,
          };
        },
        { totalCost: 0, totalQuotedPrice: 0, totalMargin: 0, partCount: 0 }
      );

      return {
        resource,
        parts: groupParts,
        totals: {
          ...totals,
          totalMargin: totals.partCount > 0 ? totals.totalMargin / totals.partCount : 0,
        },
      };
    }).sort((a, b) => b.totals.totalQuotedPrice - a.totals.totalQuotedPrice);
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
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Cost Breakdown: {quotation.enquiry_no}
          </DialogTitle>
        </DialogHeader>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Parts</p>
            <p className="text-xl font-bold">{parts.length}</p>
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
            {groupedParts.map((group) => (
              <Collapsible
                key={group.resource}
                open={expandedGroups.has(group.resource)}
                onOpenChange={() => toggleGroup(group.resource)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(group.resource) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{group.resource}</span>
                      <Badge variant="secondary">{group.totals.partCount} parts</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cost: </span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(group.totals.totalCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price: </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(group.totals.totalQuotedPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin: </span>
                        <span className="font-medium">{formatPercent(group.totals.totalMargin)}</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 pl-8">
                    {group.parts.map((part) => (
                      <div
                        key={part.id}
                        className="border rounded-lg p-3 bg-background hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{part.part_number || `Line ${part.line_number}`}</span>
                            {part.quantity && (
                              <Badge variant="outline" className="text-xs">
                                Qty: {part.quantity}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(part.unit_price)}
                              <span className="text-xs text-muted-foreground font-normal"> /unit</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Margin: {formatPercent(part.margin)}
                            </div>
                          </div>
                        </div>
                        
                        {part.description && (
                          <p className="text-sm text-muted-foreground mb-3">{part.description}</p>
                        )}
                        
                        {/* Cost Breakdown Grid */}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {/* Material */}
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium mb-1">
                              <FlaskConical className="h-3 w-3" />
                              Material
                            </div>
                            <div className="text-foreground">
                              {part.material_name || '—'}
                            </div>
                            <div className="font-medium">
                              {formatCurrency(part.total_material)}
                            </div>
                          </div>
                          
                          {/* Subcon */}
                          <div className="bg-purple-50 dark:bg-purple-950/30 rounded p-2">
                            <div className="text-purple-600 dark:text-purple-400 font-medium mb-1">
                              Subcon
                            </div>
                            <div className="font-medium">
                              {formatCurrency(part.subcon_cost_per_part)}
                            </div>
                            <div className="text-muted-foreground">
                              +{formatPercent(part.subcon_markup)} markup
                            </div>
                          </div>
                          
                          {/* Labour/Processing */}
                          <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                            <div className="text-amber-600 dark:text-amber-400 font-medium mb-1">
                              Processing
                            </div>
                            <div className="font-medium">
                              {formatCurrency(part.labour_processing_cost)}
                            </div>
                            <div className="text-muted-foreground">
                              Setup: {part.machine_setup || 0}min
                            </div>
                          </div>
                          
                          {/* Total Cost */}
                          <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                            <div className="text-orange-600 dark:text-orange-400 font-medium mb-1">
                              Total Cost
                            </div>
                            <div className="font-medium text-orange-600">
                              {formatCurrency(part.total_cost_per_part)}
                            </div>
                            <div className="text-muted-foreground">
                              per unit
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Details */}
                        {(part.tooling || part.nre || part.dev_time_cost) && (
                          <div className="mt-2 pt-2 border-t flex gap-4 text-xs text-muted-foreground">
                            {part.tooling !== null && part.tooling > 0 && (
                              <span>Tooling: {formatCurrency(part.tooling)}</span>
                            )}
                            {part.nre !== null && part.nre > 0 && (
                              <span>NRE: {formatCurrency(part.nre)}</span>
                            )}
                            {part.dev_time_cost !== null && part.dev_time_cost > 0 && (
                              <span>Dev Cost: {formatCurrency(part.dev_time_cost)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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
