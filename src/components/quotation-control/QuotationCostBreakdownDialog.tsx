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
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Package, 
  Wrench, 
  FlaskConical, 
  DollarSign,
  Clock,
  Timer,
  Settings,
  Truck,
  Percent,
  Hammer,
  Users
} from 'lucide-react';
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

  const formatTime = (value: number | null, unit: string = 'min') => {
    if (value === null || value === undefined || value === 0) return '—';
    return `${value} ${unit}`;
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

        <ScrollArea className="max-h-[60vh]">
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
                  <div className="mt-2 space-y-3 pl-8">
                    {group.parts.map((part) => (
                      <div
                        key={part.id}
                        className="border rounded-lg p-4 bg-background hover:border-primary/30 transition-colors"
                      >
                        {/* Part Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{part.part_number || `Line ${part.line_number}`}</span>
                            {part.quantity && (
                              <Badge variant="outline" className="text-xs">
                                Qty: {part.quantity}
                              </Badge>
                            )}
                            {part.volume && (
                              <Badge variant="outline" className="text-xs">
                                Vol: {part.volume}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(part.unit_price)}
                              <span className="text-xs text-muted-foreground font-normal"> /unit</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Margin: <span className="font-medium">{formatPercent(part.margin)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {part.description && (
                          <p className="text-sm text-muted-foreground mb-3">{part.description}</p>
                        )}
                        
                        {/* Detailed Breakdown Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
                          {/* Material Section */}
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold border-b border-blue-200 dark:border-blue-800 pb-1">
                              <FlaskConical className="h-3 w-3" />
                              Material
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium truncate max-w-[100px]" title={part.material_name || ''}>
                                  {part.material_name || '—'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Qty/Unit:</span>
                                <span>{part.material_qty_per_unit || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Std Cost:</span>
                                <span>{formatCurrency(part.material_std_cost_est)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Markup:</span>
                                <span>{formatPercent(part.material_markup)}</span>
                              </div>
                              <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-1 font-semibold">
                                <span>Total:</span>
                                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(part.total_material)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Subcon Section */}
                          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold border-b border-purple-200 dark:border-purple-800 pb-1">
                              <Truck className="h-3 w-3" />
                              Subcon
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost:</span>
                                <span>{formatCurrency(part.subcon_cost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Markup:</span>
                                <span>{formatPercent(part.subcon_markup)}</span>
                              </div>
                              <div className="flex justify-between border-t border-purple-200 dark:border-purple-800 pt-1 font-semibold">
                                <span>Per Part:</span>
                                <span className="text-purple-600 dark:text-purple-400">{formatCurrency(part.subcon_cost_per_part)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Times Section */}
                          <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold border-b border-cyan-200 dark:border-cyan-800 pb-1">
                              <Clock className="h-3 w-3" />
                              Times
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Setup:</span>
                                <span>{formatTime(part.machine_setup)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Run Time:</span>
                                <span>{formatTime(part.machine_run_time)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Deburr:</span>
                                <span>{formatTime(part.part_deburr)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Wash:</span>
                                <span>{formatTime(part.wash)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Development Section */}
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold border-b border-emerald-200 dark:border-emerald-800 pb-1">
                              <Settings className="h-3 w-3" />
                              Development
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Dev Time:</span>
                                <span>{formatTime(part.development_time, 'hrs')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Days:</span>
                                <span>{part.days_dev_time || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shift:</span>
                                <span>{part.shift || '—'}</span>
                              </div>
                              <div className="flex justify-between border-t border-emerald-200 dark:border-emerald-800 pt-1 font-semibold">
                                <span>Cost:</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(part.dev_time_cost)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rates & Processing Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
                          {/* Rates Section */}
                          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold border-b border-amber-200 dark:border-amber-800 pb-1">
                              <Percent className="h-3 w-3" />
                              Rates
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Labour/hr:</span>
                                <span>{formatCurrency(part.labour_per_hr)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Overhead/hr:</span>
                                <span>{formatCurrency(part.overheads_per_hr)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Machine/min:</span>
                                <span>{formatCurrency(part.machine_cost_per_min)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sec Ops/min:</span>
                                <span>{formatCurrency(part.secondary_ops_cost_per_min)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Manning Section */}
                          <div className="bg-slate-50 dark:bg-slate-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 pb-1">
                              <Users className="h-3 w-3" />
                              Manning
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Machine:</span>
                                <span>{part.machine_manning || '—'}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 font-semibold">
                                <span>Processing:</span>
                                <span className="text-slate-600 dark:text-slate-400">{formatCurrency(part.labour_processing_cost)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* NRE & Tooling Section */}
                          <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold border-b border-rose-200 dark:border-rose-800 pb-1">
                              <Hammer className="h-3 w-3" />
                              NRE & Tooling
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tooling:</span>
                                <span>{formatCurrency(part.tooling)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">NRE:</span>
                                <span>{formatCurrency(part.nre)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Total Cost Section */}
                          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold border-b border-orange-200 dark:border-orange-800 pb-1">
                              <DollarSign className="h-3 w-3" />
                              Summary
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost/Part:</span>
                                <span className="font-semibold text-orange-600">{formatCurrency(part.total_cost_per_part)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Margin:</span>
                                <span className="font-semibold">{formatPercent(part.margin)}</span>
                              </div>
                              <div className="flex justify-between border-t border-orange-200 dark:border-orange-800 pt-1">
                                <span className="font-semibold">Unit Price:</span>
                                <span className="font-bold text-green-600">{formatCurrency(part.unit_price)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
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
