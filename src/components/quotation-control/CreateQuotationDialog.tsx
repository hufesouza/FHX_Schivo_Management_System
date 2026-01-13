import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Upload, 
  Loader2, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Package,
  Euro,
  Percent
} from 'lucide-react';
import { parseQuotationTemplateExcel, ParsedQuotationData } from '@/utils/quotationTemplateParser';
import { useEnquiryQuotations } from '@/hooks/useEnquiryQuotations';
import { EnquiryLog } from '@/types/enquiryLog';

interface CreateQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiries: EnquiryLog[];
  onSuccess?: () => void;
}

export function CreateQuotationDialog({ 
  open, 
  onOpenChange, 
  enquiries,
  onSuccess 
}: CreateQuotationDialogProps) {
  const { createQuotation, creating } = useEnquiryQuotations();
  
  const [step, setStep] = useState<'select' | 'upload' | 'preview'>('select');
  const [enquiryNo, setEnquiryNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedQuotationData | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const resetForm = useCallback(() => {
    setStep('select');
    setEnquiryNo('');
    setCustomer('');
    setNotes('');
    setFile(null);
    setParsedData(null);
  }, []);

  const handleEnquirySelect = (value: string) => {
    setEnquiryNo(value);
    // Auto-fill customer from selected enquiry
    const enquiry = enquiries.find(e => e.enquiry_no === value);
    if (enquiry?.customer) {
      setCustomer(enquiry.customer);
    }
  };

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const data = await parseQuotationTemplateExcel(selectedFile);
      setParsedData(data);
      setStep('preview');
      toast.success(`Parsed ${data.parts.length} parts from template`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse template: ' + (error as Error).message);
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleCreate = async () => {
    if (!enquiryNo || !customer || !parsedData || !file) {
      toast.error('Please fill in all required fields');
      return;
    }

    const result = await createQuotation(
      enquiryNo,
      customer,
      parsedData,
      file.name,
      notes || undefined
    );

    if (result) {
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Create Quotation from Template
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select the enquiry and customer for this quotation'}
            {step === 'upload' && 'Upload your filled quotation template Excel file'}
            {step === 'preview' && 'Review the parsed data before saving'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Select Enquiry */}
          {step === 'select' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="enquiry">Enquiry Number *</Label>
                <Select value={enquiryNo} onValueChange={handleEnquirySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type enquiry number" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[9999]">
                    {enquiries.slice(0, 50).map((e) => (
                      <SelectItem key={e.id} value={e.enquiry_no}>
                        {e.enquiry_no} - {e.customer || 'No customer'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Or enter a new enquiry number:</p>
                <Input 
                  value={enquiryNo}
                  onChange={(e) => setEnquiryNo(e.target.value)}
                  placeholder="e.g., ENQ-2025-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer">Customer Name *</Label>
                <Input 
                  id="customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setStep('upload')}
                  disabled={!enquiryNo || !customer}
                >
                  Next: Upload Template
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <Badge variant="outline">{enquiryNo}</Badge>
                <span>{customer}</span>
              </div>

              <div
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={parsing}
                />
                
                <div className="flex flex-col items-center gap-4">
                  {parsing ? (
                    <>
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                      <p className="font-medium">Parsing template...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Drag and drop your quotation template</p>
                        <p className="text-sm text-muted-foreground">or click to browse (.xlsx, .xls)</p>
                      </div>
                      <Button variant="secondary" size="sm">
                        Select File
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('select')}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && parsedData && (
            <div className="space-y-4 py-4 flex flex-col h-full">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">{enquiryNo}</Badge>
                <span className="text-muted-foreground">{customer}</span>
                <Badge variant="secondary" className="ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {file?.name}
                </Badge>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Parts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold">{parsedData.parts.length}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Total Quote
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold">{formatCurrency(parsedData.totals.total_quoted_price)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Avg Margin
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold">{formatPercent(parsedData.totals.average_margin)}</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Parts Table */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-[300px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.parts.map((part) => (
                        <TableRow key={part.line_number}>
                          <TableCell className="font-medium">{part.line_number}</TableCell>
                          <TableCell>{part.part_number || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{part.description || '-'}</TableCell>
                          <TableCell className="text-right">{part.quantity?.toLocaleString() || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(part.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatPercent(part.margin)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedData(null);
                }}>
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Quotation
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
