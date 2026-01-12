import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GitCompare, TrendingDown, TrendingUp, Minus, ArrowRight } from 'lucide-react';
import { EnquiryQuotation, EnquiryQuotationPart } from '@/hooks/useEnquiryQuotations';

interface QuotationCompareDialogProps {
  quotations: EnquiryQuotation[];
  partsMap: Record<string, EnquiryQuotationPart[]>;
  currentQuotation?: EnquiryQuotation;
}

export function QuotationCompareDialog({ quotations, partsMap, currentQuotation }: QuotationCompareDialogProps) {
  const [open, setOpen] = useState(false);
  const [leftQuotationId, setLeftQuotationId] = useState<string>('');
  const [rightQuotationId, setRightQuotationId] = useState<string>('');

  useEffect(() => {
    if (currentQuotation && open) {
      // Find related quotations (same base enquiry number)
      const baseEnquiry = currentQuotation.enquiry_no.replace(/_Mex$/i, '').replace(/Mex$/i, '');
      const relatedQuotations = quotations.filter(q => 
        q.enquiry_no.replace(/_Mex$/i, '').replace(/Mex$/i, '') === baseEnquiry
      );
      
      if (relatedQuotations.length >= 2) {
        const original = relatedQuotations.find(q => !q.enquiry_no.includes('Mex'));
        const mex = relatedQuotations.find(q => q.enquiry_no.includes('Mex'));
        if (original) setLeftQuotationId(original.id);
        if (mex) setRightQuotationId(mex.id);
      }
    }
  }, [currentQuotation, quotations, open]);

  const leftQuotation = quotations.find(q => q.id === leftQuotationId);
  const rightQuotation = quotations.find(q => q.id === rightQuotationId);
  const leftParts = partsMap[leftQuotationId] || [];
  const rightParts = partsMap[rightQuotationId] || [];

  // Get only assembly parts (with unit_price)
  const leftAssemblies = leftParts.filter(p => p.unit_price !== null);
  const rightAssemblies = rightParts.filter(p => p.unit_price !== null);

  // Create comparison data
  const comparisonData = leftAssemblies.map(leftPart => {
    const rightPart = rightAssemblies.find(r => r.part_number === leftPart.part_number);
    const leftPrice = leftPart.unit_price || 0;
    const rightPrice = rightPart?.unit_price || 0;
    const difference = rightPrice - leftPrice;
    const percentChange = leftPrice > 0 ? ((difference / leftPrice) * 100) : 0;

    return {
      partNumber: leftPart.part_number,
      description: leftPart.description,
      quantity: leftPart.quantity,
      leftPrice,
      rightPrice,
      difference,
      percentChange,
      leftCost: leftPart.total_cost_per_part || 0,
      rightCost: rightPart?.total_cost_per_part || 0,
      leftNre: leftPart.nre || 0,
      rightNre: rightPart?.nre || 0,
    };
  });

  const totalLeftPrice = comparisonData.reduce((sum, item) => sum + (item.leftPrice * (item.quantity || 1)), 0);
  const totalRightPrice = comparisonData.reduce((sum, item) => sum + (item.rightPrice * (item.quantity || 1)), 0);
  const totalDifference = totalRightPrice - totalLeftPrice;
  const totalPercentChange = totalLeftPrice > 0 ? ((totalDifference / totalLeftPrice) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getDifferenceColor = (diff: number) => {
    if (diff < 0) return 'text-green-600';
    if (diff > 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCompare className="h-4 w-4 mr-2" />
          Compare Prices
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Price Comparison
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quotation Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Original Quotation</label>
              <Select value={leftQuotationId} onValueChange={setLeftQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quotation" />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.enquiry_no} - {q.customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comparison Quotation</label>
              <Select value={rightQuotationId} onValueChange={setRightQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quotation" />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.enquiry_no} - {q.customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          {leftQuotation && rightQuotation && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{leftQuotation.enquiry_no}</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalLeftPrice)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{rightQuotation.enquiry_no}</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalRightPrice)}</div>
                </CardContent>
              </Card>
              <Card className={totalDifference < 0 ? 'border-green-200 bg-green-50' : totalDifference > 0 ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Difference</div>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${getDifferenceColor(totalDifference)}`}>
                    {getDifferenceIcon(totalDifference)}
                    {formatCurrency(Math.abs(totalDifference))}
                    <span className="text-sm">({formatPercent(totalPercentChange)})</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison Table */}
          {leftQuotation && rightQuotation && comparisonData.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">{leftQuotation.enquiry_no}</TableHead>
                    <TableHead className="text-center w-12"></TableHead>
                    <TableHead className="text-right">{rightQuotation.enquiry_no}</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.leftPrice)}</TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.rightPrice)}</TableCell>
                      <TableCell className={`text-right font-medium ${getDifferenceColor(item.difference)}`}>
                        {formatCurrency(item.difference)}
                      </TableCell>
                      <TableCell className={`text-right ${getDifferenceColor(item.difference)}`}>
                        <Badge variant={item.difference < 0 ? 'default' : item.difference > 0 ? 'destructive' : 'secondary'}>
                          {formatPercent(item.percentChange)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Cost and NRE Comparison */}
          {leftQuotation && rightQuotation && comparisonData.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Unit Cost Comparison</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead className="text-right">Original</TableHead>
                        <TableHead className="text-right">Comparison</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.partNumber}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.leftCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.rightCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">NRE Comparison</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead className="text-right">Original</TableHead>
                        <TableHead className="text-right">Comparison</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.partNumber}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.leftNre)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.rightNre)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {(!leftQuotation || !rightQuotation) && (
            <div className="text-center py-8 text-muted-foreground">
              Select two quotations to compare prices
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
