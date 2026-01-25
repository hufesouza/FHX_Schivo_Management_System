import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, Plus, Package, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Customer {
  id: string;
  bp_code: string;
  bp_name: string;
}

interface SystemQuotation {
  id: string;
  customer: string;
  part_number: string;
  revision: string | null;
  description: string | null;
  quoted_by: string | null;
  status: string;
  created_at: string;
  assignment_status: string;
}

interface CreateEnquiryWithPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: (enquiryId: string) => void;
}

export function CreateEnquiryWithPartsDialog({
  open,
  onOpenChange,
  userId,
  onCreated
}: CreateEnquiryWithPartsDialogProps) {
  // Step tracking: 1 = customer selection, 2 = part selection, 3 = enquiry details
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  // Quotations state
  const [quotations, setQuotations] = useState<SystemQuotation[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<string[]>([]);
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('');

  // Enquiry details state
  const [enquiryNo, setEnquiryNo] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = useCallback(() => {
    setStep(1);
    setCustomerId(null);
    setCustomerName('');
    setCustomerSearchTerm('');
    setCustomers([]);
    setQuotations([]);
    setSelectedQuotationIds([]);
    setQuotationSearchTerm('');
    setEnquiryNo('');
    setSalesRep('');
    setNotes('');
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const fetchCustomers = async (search: string) => {
    if (search.length < 2) {
      setCustomers([]);
      return;
    }
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('quotation_customers')
        .select('id, bp_code, bp_name')
        .or(`bp_code.ilike.%${search}%,bp_name.ilike.%${search}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchQuotationsForCustomer = async (customer: string) => {
    setLoadingQuotations(true);
    try {
      const { data, error } = await supabase
        .from('system_quotations')
        .select('id, customer, part_number, revision, description, quoted_by, status, created_at, assignment_status')
        .eq('customer', customer)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations((data || []) as SystemQuotation[]);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setQuotations([]);
    } finally {
      setLoadingQuotations(false);
    }
  };

  const handleCustomerSelect = async (customer: Customer | null, name: string) => {
    setCustomerId(customer?.id || null);
    setCustomerName(name);
    setCustomerSearchOpen(false);
    
    // Fetch quotations for this customer
    await fetchQuotationsForCustomer(name);
    setStep(2);
  };

  const handleToggleQuotation = (quotationId: string) => {
    setSelectedQuotationIds(prev => 
      prev.includes(quotationId)
        ? prev.filter(id => id !== quotationId)
        : [...prev, quotationId]
    );
  };

  const handleSelectAll = () => {
    const filtered = filteredQuotations;
    if (selectedQuotationIds.length === filtered.length) {
      setSelectedQuotationIds([]);
    } else {
      setSelectedQuotationIds(filtered.map(q => q.id));
    }
  };

  const filteredQuotations = quotations.filter(q =>
    q.part_number.toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
    (q.description?.toLowerCase() || '').includes(quotationSearchTerm.toLowerCase())
  );

  const handleCreateEnquiry = async () => {
    if (!enquiryNo.trim()) {
      toast.error('Please enter an enquiry number');
      return;
    }

    setCreating(true);
    try {
      // 1. Create the enquiry
      const { data: newEnquiry, error: enquiryError } = await supabase
        .from('quotation_enquiries')
        .insert({
          enquiry_no: enquiryNo.trim(),
          customer_name: customerName.trim(),
          customer_id: customerId,
          sales_representative: salesRep.trim() || null,
          notes: notes.trim() || null,
          created_by: userId,
          status: 'open'
        })
        .select()
        .single();

      if (enquiryError) {
        if (enquiryError.code === '23505') {
          toast.error('An enquiry with this number already exists');
        } else {
          throw enquiryError;
        }
        return;
      }

      // 2. Copy selected quotations to the enquiry
      for (const quotationId of selectedQuotationIds) {
        // Get source quotation
        const { data: quotation } = await supabase
          .from('system_quotations')
          .select('*')
          .eq('id', quotationId)
          .single();

        if (!quotation) continue;

        // Insert enquiry quoted part
        const { data: newPart, error: partError } = await supabase
          .from('enquiry_quoted_parts')
          .insert({
            enquiry_id: newEnquiry.id,
            source_quotation_id: quotationId,
            part_number: quotation.part_number,
            revision: quotation.revision,
            description: quotation.description,
            customer: quotation.customer,
            customer_code: quotation.customer_code,
            qty_per: quotation.qty_per,
            manufacture_type: quotation.manufacture_type,
            blue_review_required: quotation.blue_review_required,
            batch_traceable: quotation.batch_traceable,
            rohs_compliant: quotation.rohs_compliant,
            serial_traceable: quotation.serial_traceable,
            material_markup: quotation.material_markup,
            subcon_markup: quotation.subcon_markup,
            vol_1: quotation.vol_1,
            vol_2: quotation.vol_2,
            vol_3: quotation.vol_3,
            vol_4: quotation.vol_4,
            vol_5: quotation.vol_5,
            won_volume: quotation.won_volume,
            notes: quotation.notes,
          })
          .select()
          .single();

        if (partError || !newPart) continue;

        // Copy routings
        const { data: routings } = await supabase
          .from('quotation_routings')
          .select('*')
          .eq('quotation_id', quotationId);

        if (routings && routings.length > 0) {
          await supabase.from('enquiry_quoted_part_routings').insert(
            routings.map(r => ({
              enquiry_quoted_part_id: newPart.id,
              op_no: r.op_no,
              sublevel_bom: r.sublevel_bom,
              part_number: r.part_number,
              resource_id: r.resource_id,
              resource_no: r.resource_no,
              operation_details: r.operation_details,
              subcon_processing_time: r.subcon_processing_time,
              setup_time: r.setup_time,
              run_time: r.run_time,
              cost: r.cost,
            }))
          );
        }

        // Copy materials
        const { data: materials } = await supabase
          .from('quotation_materials')
          .select('*')
          .eq('quotation_id', quotationId);

        if (materials && materials.length > 0) {
          await supabase.from('enquiry_quoted_part_materials').insert(
            materials.map(m => ({
              enquiry_quoted_part_id: newPart.id,
              line_number: m.line_number,
              vendor_no: m.vendor_no,
              vendor_name: m.vendor_name,
              part_number: m.part_number,
              material_description: m.material_description,
              mat_category: m.mat_category,
              uom: m.uom,
              qty_per_unit: m.qty_per_unit,
              qa_inspection_required: m.qa_inspection_required,
              std_cost_est: m.std_cost_est,
              certification_required: m.certification_required,
              purchaser: m.purchaser,
              description_for_qa: m.description_for_qa,
              total_material: m.total_material,
            }))
          );
        }

        // Copy subcons
        const { data: subcons } = await supabase
          .from('quotation_subcons')
          .select('*')
          .eq('quotation_id', quotationId);

        if (subcons && subcons.length > 0) {
          await supabase.from('enquiry_quoted_part_subcons').insert(
            subcons.map(s => ({
              enquiry_quoted_part_id: newPart.id,
              line_number: s.line_number,
              vendor_no: s.vendor_no,
              vendor_name: s.vendor_name,
              part_number: s.part_number,
              process_description: s.process_description,
              std_cost_est: s.std_cost_est,
              certification_required: s.certification_required,
              total_subcon: s.total_subcon,
            }))
          );
        }

        // Copy volume pricing
        const { data: volumes } = await supabase
          .from('quotation_volume_pricing')
          .select('*')
          .eq('quotation_id', quotationId);

        if (volumes && volumes.length > 0) {
          await supabase.from('enquiry_quoted_part_volume_pricing').insert(
            volumes.map(v => ({
              enquiry_quoted_part_id: newPart.id,
              quantity: v.quantity,
              hours: v.hours,
              cost_per_hour: v.cost_per_hour,
              labour_cost: v.labour_cost,
              material_cost: v.material_cost,
              subcon_cost: v.subcon_cost,
              tooling_cost: v.tooling_cost,
              carriage: v.carriage,
              misc: v.misc,
              total_price: v.total_price,
              unit_price_quoted: v.unit_price_quoted,
              cost_per_unit: v.cost_per_unit,
              margin: v.margin,
            }))
          );
        }

        // Update the source quotation assignment status
        await supabase
          .from('system_quotations')
          .update({ assignment_status: 'assigned' })
          .eq('id', quotationId);
      }

      toast.success('Enquiry created successfully');
      onOpenChange(false);
      onCreated(newEnquiry.id);
    } catch (error) {
      console.error('Error creating enquiry:', error);
      toast.error('Failed to create enquiry');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Enquiry
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Step 1: Select a customer'}
            {step === 2 && 'Step 2: Select quoted parts to include'}
            {step === 3 && 'Step 3: Enter enquiry details'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s}
              </div>
              {s < 3 && (
                <ArrowRight className={cn(
                  "h-4 w-4 mx-2",
                  step > s ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="py-4">
            <Label className="mb-2 block">Select Customer</Label>
            <Popover open={customerSearchOpen} onOpenChange={(open) => {
              setCustomerSearchOpen(open);
              if (open) {
                setCustomerSearchTerm('');
                setCustomers([]);
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {customerName || "Search customer..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Type to search customers..." 
                    value={customerSearchTerm}
                    onValueChange={(v) => {
                      setCustomerSearchTerm(v);
                      fetchCustomers(v);
                    }}
                  />
                  <CommandList>
                    {loadingCustomers && (
                      <div className="py-4 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    )}
                    {!loadingCustomers && customerSearchTerm.length < 2 && (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        Type at least 2 characters to search
                      </div>
                    )}
                    {!loadingCustomers && customerSearchTerm.length >= 2 && customers.length === 0 && (
                      <div className="p-2">
                        <p className="text-sm text-muted-foreground mb-2 text-center">No customer found.</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleCustomerSelect(null, customerSearchTerm)}
                        >
                          Use "{customerSearchTerm}" as customer name
                        </Button>
                      </div>
                    )}
                    {!loadingCustomers && customers.length > 0 && (
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={() => handleCustomerSelect(customer, customer.bp_name)}
                          >
                            <Check className={cn(
                              "mr-2 h-4 w-4",
                              customerId === customer.id ? "opacity-100" : "opacity-0"
                            )} />
                            <span className="font-mono text-xs mr-2 text-muted-foreground">{customer.bp_code}</span>
                            {customer.bp_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Step 2: Part Selection */}
        {step === 2 && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-base">Select Parts</Label>
                <p className="text-sm text-muted-foreground">
                  Customer: <strong>{customerName}</strong>
                </p>
              </div>
              <Badge variant="outline">{selectedQuotationIds.length} selected</Badge>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={quotationSearchTerm}
                onChange={(e) => setQuotationSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingQuotations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No quoted parts found for this customer.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Quote parts first, then create an enquiry.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedQuotationIds.length === filteredQuotations.length && filteredQuotations.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Select all ({filteredQuotations.length})
                  </Label>
                </div>
                <ScrollArea className="h-[250px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {filteredQuotations.map((q) => (
                      <div 
                        key={q.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedQuotationIds.includes(q.id) 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleToggleQuotation(q.id)}
                      >
                        <Checkbox
                          checked={selectedQuotationIds.includes(q.id)}
                          onCheckedChange={() => handleToggleQuotation(q.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{q.part_number}</span>
                            {q.revision && (
                              <span className="text-xs text-muted-foreground">Rev {q.revision}</span>
                            )}
                            {q.assignment_status === 'assigned' && (
                              <Badge variant="outline" className="text-xs">Already in enquiry</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{q.description || 'No description'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Quoted {format(new Date(q.created_at), 'dd MMM yyyy')} by {q.quoted_by || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {/* Step 3: Enquiry Details */}
        {step === 3 && (
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm">
                <strong>Customer:</strong> {customerName}
              </p>
              <p className="text-sm">
                <strong>Parts:</strong> {selectedQuotationIds.length} selected
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="enquiry-no">Enquiry Number *</Label>
              <Input
                id="enquiry-no"
                placeholder="e.g., ENQ-2025-001"
                value={enquiryNo}
                onChange={(e) => setEnquiryNo(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sales-rep">Sales Representative</Label>
              <Input
                id="sales-rep"
                placeholder="Enter sales representative name"
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="sm:mr-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          
          {step === 2 && (
            <Button 
              onClick={() => setStep(3)} 
              disabled={selectedQuotationIds.length === 0 && quotations.length > 0}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 2 && quotations.length === 0 && (
            <Button onClick={() => setStep(3)}>
              Continue without parts
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {step === 3 && (
            <Button onClick={handleCreateEnquiry} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Enquiry
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
