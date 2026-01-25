import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateEnquiryWithPartsDialog } from '@/components/quotation-system/CreateEnquiryWithPartsDialog';
import { 
  Loader2, 
  Search, 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  Send,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  TrendingDown,
  ChevronRight,
  MoreHorizontal,
  Download,
  GitCompare
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ExportSystemQuotationPDF } from '@/components/quotation-system/ExportSystemQuotationPDF';
import { ExportBreakdownPDF } from '@/components/quotation-system/ExportBreakdownPDF';
import { SystemQuotationCompareDialog } from '@/components/quotation-system/SystemQuotationCompareDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuotationEnquiries, EnquiryStatus } from '@/hooks/useQuotationEnquiries';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const { enquiries, loading, fetchEnquiries } = useQuotationEnquiries();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Export/Compare state
  const [selectedEnquiryForExport, setSelectedEnquiryForExport] = useState<string | null>(null);
  const [exportQuotationOpen, setExportQuotationOpen] = useState(false);
  const [exportBreakdownOpen, setExportBreakdownOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

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

  const handleEnquiryCreated = (enquiryId: string) => {
    fetchEnquiries();
    navigate(`/npi/quotation-system/enquiry/${enquiryId}`);
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
                          <div className="flex items-center justify-end gap-1">
                            {/* Make export actions visible per-enquiry (desktop) */}
                            <div className="hidden md:flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEnquiryForExport(enquiry.enquiry_no);
                                      setExportQuotationOpen(true);
                                    }}
                                    aria-label="Export quotation"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Export quotation</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEnquiryForExport(enquiry.enquiry_no);
                                      setExportBreakdownOpen(true);
                                    }}
                                    aria-label="Export breakdown"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Export breakdown</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEnquiryForExport(enquiry.enquiry_no);
                                      setCompareDialogOpen(true);
                                    }}
                                    aria-label="Compare quotations"
                                  >
                                    <GitCompare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Compare quotations</TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Overflow menu (mobile) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="md:hidden"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="More actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => navigate(`/npi/quotation-system/enquiry/${enquiry.id}`)}>
                                  <ChevronRight className="h-4 w-4 mr-2" />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEnquiryForExport(enquiry.enquiry_no);
                                    setExportQuotationOpen(true);
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export quotation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEnquiryForExport(enquiry.enquiry_no);
                                    setExportBreakdownOpen(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Export breakdown
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEnquiryForExport(enquiry.enquiry_no);
                                    setCompareDialogOpen(true);
                                  }}
                                >
                                  <GitCompare className="h-4 w-4 mr-2" />
                                  Compare quotations
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/npi/quotation-system/enquiry/${enquiry.id}`);
                              }}
                              aria-label="Open enquiry"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
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
        {user && (
          <CreateEnquiryWithPartsDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            userId={user.id}
            onCreated={handleEnquiryCreated}
          />
        )}

        {/* Export Quotation Dialog */}
        {selectedEnquiryForExport && (
          <ExportSystemQuotationPDF
            enquiryNo={selectedEnquiryForExport}
            open={exportQuotationOpen}
            onOpenChange={(open) => {
              setExportQuotationOpen(open);
              if (!open) setSelectedEnquiryForExport(null);
            }}
          />
        )}

        {/* Export Breakdown Dialog */}
        {selectedEnquiryForExport && (
          <ExportBreakdownPDF
            enquiryNo={selectedEnquiryForExport}
            open={exportBreakdownOpen}
            onOpenChange={(open) => {
              setExportBreakdownOpen(open);
              if (!open) setSelectedEnquiryForExport(null);
            }}
          />
        )}

        {/* Compare Quotations Dialog */}
        {selectedEnquiryForExport && (
          <SystemQuotationCompareDialog
            enquiryNo={selectedEnquiryForExport}
            open={compareDialogOpen}
            onOpenChange={(open) => {
              setCompareDialogOpen(open);
              if (!open) setSelectedEnquiryForExport(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default EnquiryList;
