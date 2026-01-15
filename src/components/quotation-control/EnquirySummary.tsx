import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Package,
  Loader2
} from 'lucide-react';
import { EnquiryPart } from '@/hooks/useQuotationEnquiries';
import { SystemQuotation, QuotationVolumePricing } from '@/hooks/useQuotationSystem';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface EnquirySummaryProps {
  enquiryNo: string;
  customerName: string;
  salesRep: string | null;
  parts: EnquiryPart[];
  quotations: SystemQuotation[];
  notes: string | null;
  onSummaryCalculated?: (totalValue: number, averageMargin: number) => void;
}

interface QuotationWithPricing {
  quotation: SystemQuotation;
  volumePricing: QuotationVolumePricing[];
  totalPrice: number;
  totalCost: number;
  margin: number;
  unitPriceQuoted: number;
}

export function EnquirySummary({
  enquiryNo,
  customerName,
  salesRep,
  parts,
  quotations,
  notes,
  onSummaryCalculated
}: EnquirySummaryProps) {
  const [loading, setLoading] = useState(true);
  const [quotationPricing, setQuotationPricing] = useState<Map<string, QuotationWithPricing>>(new Map());

  // Fetch volume pricing for all quotations
  useEffect(() => {
    const fetchPricing = async () => {
      if (quotations.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const quotationIds = quotations.map(q => q.id);
        const { data, error } = await supabase
          .from('quotation_volume_pricing')
          .select('*')
          .in('quotation_id', quotationIds);

        if (error) throw error;

        const pricingMap = new Map<string, QuotationWithPricing>();
        
        for (const quotation of quotations) {
          const pricing = (data || []).filter(p => p.quotation_id === quotation.id) as QuotationVolumePricing[];
          // Get the first volume pricing (usually the won_volume or first quantity)
          const firstPricing = pricing[0];
          const totalPrice = firstPricing?.total_price || 0;
          const costPerUnit = firstPricing?.cost_per_unit || 0;
          const qty = firstPricing?.quantity || 1;
          const totalCost = costPerUnit * qty;
          const margin = firstPricing?.margin || 0;
          const unitPriceQuoted = firstPricing?.unit_price_quoted || 0;

          pricingMap.set(quotation.id, {
            quotation,
            volumePricing: pricing,
            totalPrice,
            totalCost,
            margin,
            unitPriceQuoted
          });
        }

        setQuotationPricing(pricingMap);
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [quotations]);

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let quotedPartsCount = 0;

    const partDetails = parts.map(part => {
      const quotation = quotations.find(q => q.enquiry_part_id === part.id);
      if (quotation) {
        quotedPartsCount++;
        const pricing = quotationPricing.get(quotation.id);
        const value = pricing?.totalPrice || 0;
        const cost = pricing?.totalCost || 0;
        const margin = pricing?.margin || 0;
        const unitPrice = pricing?.unitPriceQuoted || 0;
        const costPerUnit = pricing?.totalCost && pricing?.volumePricing[0]?.quantity 
          ? pricing.totalCost / pricing.volumePricing[0].quantity 
          : 0;
        totalValue += value;
        totalCost += cost;
        return {
          ...part,
          quotation,
          unitPrice,
          cost: costPerUnit,
          margin
        };
      }
      return { ...part, quotation: null, unitPrice: 0, cost: 0, margin: 0 };
    });

    const averageMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

    return {
      partDetails,
      totalValue,
      totalCost,
      averageMargin,
      quotedPartsCount,
      allQuoted: quotedPartsCount === parts.length && parts.length > 0
    };
  }, [parts, quotations, quotationPricing]);

  // Notify parent of calculated values
  useEffect(() => {
    if (!loading && onSummaryCalculated) {
      onSummaryCalculated(summary.totalValue, summary.averageMargin);
    }
  }, [loading, summary.totalValue, summary.averageMargin, onSummaryCalculated]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading summary...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Quotation Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Enquiry No</p>
            <p className="font-mono font-medium">{enquiryNo}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{customerName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sales Rep</p>
            <p className="font-medium">{salesRep || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{format(new Date(), 'dd MMM yyyy')}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {summary.quotedPartsCount}/{parts.length}
            </div>
            <div className="text-xs text-muted-foreground">Parts Quoted</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold text-green-600">
              €{summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-amber-600" />
            <div className="text-2xl font-bold text-amber-600">
              €{summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">Total Cost</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">
              {summary.averageMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Margin</div>
          </div>
        </div>

        {/* Parts Detail Table */}
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.partDetails.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {part.line_number}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {part.part_number}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {part.description || '-'}
                  </TableCell>
                  <TableCell>{part.revision || '-'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {part.quotation ? `€${part.unitPrice.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {part.quotation ? `€${part.cost.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {part.quotation ? (
                      <Badge 
                        variant="outline" 
                        className={part.margin >= 20 ? 'text-green-600' : part.margin >= 10 ? 'text-amber-600' : 'text-red-600'}
                      >
                        {part.margin.toFixed(1)}%
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {part.quotation ? (
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Quoted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Notes */}
        {notes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
