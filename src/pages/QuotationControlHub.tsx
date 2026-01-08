import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useEnquiryLog } from '@/hooks/useEnquiryLog';
import { EnquiryLog } from '@/types/enquiryLog';
import { AppLayout } from '@/components/layout/AppLayout';
import { EnquiryLogUpload } from '@/components/quotation-control/EnquiryLogUpload';
import { EnquiryDashboard } from '@/components/quotation-control/EnquiryDashboard';
import { EnquiryList, EnquiryListFilters } from '@/components/quotation-control/EnquiryList';
import { EnquiryWorkflow } from '@/components/quotation-control/EnquiryWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Loader2, 
  Upload, 
  LayoutDashboard, 
  List,
  Trash2,
  RefreshCw,
  Calendar,
  Building,
  User,
  Euro,
  FileText,
  Kanban
} from 'lucide-react';
import { format } from 'date-fns';

const WORKFLOW_STATUSES = [
  'OPEN',
  'IN REVIEW',
  'QUOTED',
  'WON',
  'LOST',
  'ON HOLD',
  'CANCELLED'
];

const QuotationControlHub = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { enquiries, loading, uploading, stats, uploadData, clearAllData, fetchEnquiries, updateEnquiry } = useEnquiryLog();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [listFilters, setListFilters] = useState<EnquiryListFilters | undefined>(undefined);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleFilterByStatus = (status: string) => {
    setListFilters({ status });
    setActiveTab('list');
  };

  const handleFilterByOwner = (owner: string) => {
    setListFilters({ owner });
    setActiveTab('list');
  };

  const handleSelectEnquiry = (enquiry: EnquiryLog) => {
    setSelectedEnquiry(enquiry);
    setDetailOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="Quotation Control" subtitle="Track and manage quotation enquiries" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="workflow" className="flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Enquiry Log
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchEnquiries()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {isAdmin && enquiries.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all enquiry data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {enquiries.length} enquiry records. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="dashboard" className="mt-0">
                {enquiries.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Enquiry Data Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload your Enquiry Log Excel file to get started
                      </p>
                      <Button onClick={() => setActiveTab('upload')}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <EnquiryDashboard 
                    enquiries={enquiries}
                    onFilterByStatus={handleFilterByStatus}
                    onFilterByOwner={handleFilterByOwner}
                  />
                )}
              </TabsContent>

              <TabsContent value="workflow" className="mt-0">
                {enquiries.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">
                        No enquiries available. Upload an Excel file to track workflow.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <EnquiryWorkflow
                    enquiries={enquiries}
                    onSelectEnquiry={handleSelectEnquiry}
                    onUpdateStatus={(id, status) => updateEnquiry(id, { status })}
                  />
                )}
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                {enquiries.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">
                        No enquiries available. Upload an Excel file to populate the list.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <EnquiryList 
                    enquiries={enquiries} 
                    initialFilters={listFilters}
                    onSelectEnquiry={handleSelectEnquiry}
                  />
                )}
              </TabsContent>

              <TabsContent value="upload" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Enquiry Log</CardTitle>
                    <CardDescription>
                      Upload your Enquiry Log Excel file to import all enquiry data.
                      This will replace all existing data with the contents of the new file.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EnquiryLogUpload 
                      onFileProcessed={uploadData} 
                      isUploading={uploading}
                    />
                    
                    {enquiries.length > 0 && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Current data:</strong> {enquiries.length} enquiries loaded
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Enquiry Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Enquiry {selectedEnquiry?.enquiry_no}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEnquiry && (
              <div className="space-y-6">
                {/* Status Update */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                    <Select
                      value={selectedEnquiry.status || 'OPEN'}
                      onValueChange={(value) => {
                        updateEnquiry(selectedEnquiry.id, { status: value });
                        setSelectedEnquiry({ ...selectedEnquiry, status: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedEnquiry.priority && (
                    <Badge variant="outline">Priority: {selectedEnquiry.priority}</Badge>
                  )}
                  {selectedEnquiry.customer_type && (
                    <Badge variant="outline">{selectedEnquiry.customer_type}</Badge>
                  )}
                </div>

                <Separator />

                {/* Main Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{selectedEnquiry.customer || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">NPI Owner</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{selectedEnquiry.npi_owner || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Commercial Owner</p>
                    <p className="font-medium">{selectedEnquiry.commercial_owner || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Business Type</p>
                    <p className="font-medium">{selectedEnquiry.business_type || '-'}</p>
                  </div>
                </div>

                {/* Details */}
                {selectedEnquiry.details && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Details</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedEnquiry.details}</p>
                  </div>
                )}

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date Received</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{formatDate(selectedEnquiry.date_received)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ECD Quote</p>
                    <p className="font-medium">{formatDate(selectedEnquiry.ecd_quote_submission)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Quote Submitted</p>
                    <p className="font-medium">{formatDate(selectedEnquiry.date_quote_submitted)}</p>
                  </div>
                </div>

                <Separator />

                {/* Financials */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Quoted Price</p>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-emerald-600" />
                      <p className="font-medium text-emerald-600">
                        {formatCurrency(selectedEnquiry.quoted_price_euro)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">PO Value</p>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-green-600" />
                      <p className="font-medium text-green-600">
                        {formatCurrency(selectedEnquiry.po_value_euro)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Aging (Days)</p>
                    <p className="font-medium">{selectedEnquiry.aging || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Turnaround (Days)</p>
                    <p className="font-medium">{selectedEnquiry.turnaround_days || '-'}</p>
                  </div>
                </div>

                {/* Comments */}
                {selectedEnquiry.comments && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Comments</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedEnquiry.comments}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
};

export default QuotationControlHub;
