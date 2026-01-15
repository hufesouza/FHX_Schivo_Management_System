import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  Loader2, 
  Search, 
  Plus, 
  Eye, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  TrendingDown,
  ChevronRight,
  Check
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuotationEnquiries, EnquiryStatus } from '@/hooks/useQuotationEnquiries';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  bp_code: string;
  bp_name: string;
}

const statusConfig: Record<EnquiryStatus, { label: string; icon: React.ElementType; color: string }> = {
  open: { label: 'Open', icon: FileText, color: 'bg-slate-500' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'bg-amber-500' },
  submitted_for_review: { label: 'Submitted for Review', icon: Send, color: 'bg-blue-500' },
  approved: { label: 'Approved', icon: ThumbsUp, color: 'bg-emerald-500' },
  declined: { label: 'Declined', icon: ThumbsDown, color: 'bg-red-500' },
  submitted: { label: 'Submitted', icon: CheckCircle, color: 'bg-violet-500' },
  won: { label: 'Won', icon: Trophy, color: 'bg-green-600' },
  lost: { label: 'Lost', icon: TrendingDown, color: 'bg-gray-500' }
};

const EnquiryList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enquiries, loading, createEnquiry } = useQuotationEnquiries();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [enquiryNo, setEnquiryNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [salesRep, setSalesRep] = useState('');
  const [notes, setNotes] = useState('');
  
  // Customer search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const fetchCustomers = async (search: string) => {
    if (search.length < 2) return;
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
    } finally {
      setLoadingCustomers(false);
    }
  };

  const filteredEnquiries = enquiries.filter(e => {
    const matchesSearch = 
      e.enquiry_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.sales_representative?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: EnquiryStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={cn(config.color, 'text-white')}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleCreateEnquiry = async () => {
    if (!enquiryNo.trim()) {
      toast.error('Please enter an enquiry number');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Please select or enter a customer');
      return;
    }
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    setCreating(true);
    const result = await createEnquiry({
      enquiry_no: enquiryNo.trim(),
      customer_name: customerName.trim(),
      customer_id: customerId,
      sales_representative: salesRep.trim() || null,
      notes: notes.trim() || null,
      created_by: user.id
    });

    setCreating(false);
    
    if (result) {
      setCreateDialogOpen(false);
      resetForm();
      navigate(`/npi/quotation-system/enquiry/${result.id}`);
    }
  };

  const resetForm = () => {
    setEnquiryNo('');
    setCustomerName('');
    setCustomerId(null);
    setSalesRep('');
    setNotes('');
  };

  if (loading) {
    return (
      <AppLayout title="Enquiries" showBackButton backTo="/npi/quotation-system">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Enquiries" subtitle="Manage quotation enquiries" showBackButton backTo="/npi/quotation-system">
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Enquiries</CardTitle>
                <CardDescription>
                  {filteredEnquiries.length} enquiry(ies) found
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Enquiry
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ENQ, customer, or sales rep..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EnquiryStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredEnquiries.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No enquiries found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Create your first enquiry to get started'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Enquiry
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ENQ #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Rep</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnquiries.map((enquiry) => (
                      <TableRow 
                        key={enquiry.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/npi/quotation-system/enquiry/${enquiry.id}`)}
                      >
                        <TableCell className="font-mono font-medium">
                          {enquiry.enquiry_no}
                        </TableCell>
                        <TableCell>{enquiry.customer_name}</TableCell>
                        <TableCell>{enquiry.sales_representative || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(enquiry.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/npi/quotation-system/enquiry/${enquiry.id}`);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Enquiry Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Enquiry</DialogTitle>
              <DialogDescription>
                Enter the details for the new quotation enquiry.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
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
                <Label>Customer *</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="justify-between font-normal"
                    >
                      {customerName || "Search or enter customer..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search customers..." 
                        onValueChange={(v) => {
                          setCustomerName(v);
                          fetchCustomers(v);
                        }}
                      />
                      <CommandList>
                        {loadingCustomers && (
                          <div className="py-2 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        )}
                        <CommandEmpty>
                          {customerName.length >= 2 ? (
                            <div className="p-2">
                              <p className="text-sm text-muted-foreground mb-2">No customer found.</p>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                onClick={() => {
                                  setCustomerId(null);
                                  setCustomerSearchOpen(false);
                                }}
                              >
                                Use "{customerName}" as customer name
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground p-2">
                              Type at least 2 characters to search
                            </p>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              onSelect={() => {
                                setCustomerId(customer.id);
                                setCustomerName(customer.bp_name);
                                setCustomerSearchOpen(false);
                              }}
                            >
                              <Check className={cn(
                                "mr-2 h-4 w-4",
                                customerId === customer.id ? "opacity-100" : "opacity-0"
                              )} />
                              <span className="font-mono text-xs mr-2">{customer.bp_code}</span>
                              {customer.bp_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default EnquiryList;
