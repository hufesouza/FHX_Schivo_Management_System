import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Plus, 
  Save,
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  TrendingDown,
  Upload,
  Trash2,
  ExternalLink,
  Calculator,
  Eye,
  ChevronRight,
  Pencil,
  FileUp
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuotationEnquiries, useEnquiryParts, EnquiryStatus, EnquiryWithParts, EnquiryPart } from '@/hooks/useQuotationEnquiries';
import { useSystemQuotations, SystemQuotation } from '@/hooks/useQuotationSystem';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

const statusFlow: EnquiryStatus[] = [
  'open',
  'in_progress',
  'submitted_for_review',
  'approved',
  'submitted',
  'won'
];

const EnquiryDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { updateEnquiry, updateEnquiryStatus, deleteEnquiry } = useQuotationEnquiries();
  const { parts, addPart, updatePart, deletePart, uploadDrawing, loading: partsLoading } = useEnquiryParts(id);
  const { quotations } = useSystemQuotations();
  
  const [enquiry, setEnquiry] = useState<EnquiryWithParts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [salesRep, setSalesRep] = useState('');
  const [notes, setNotes] = useState('');
  
  // Add part dialog
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartDescription, setNewPartDescription] = useState('');
  const [newPartRevision, setNewPartRevision] = useState('');
  const [addingPart, setAddingPart] = useState(false);
  
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDrawingId, setUploadingDrawingId] = useState<string | null>(null);

  // Get quotations for this enquiry's parts
  const partQuotations = quotations.filter(q => 
    parts.some(p => q.enquiry_part_id === p.id)
  );

  // Fetch enquiry directly to avoid dependency loop
  const loadEnquiry = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: enquiryData, error: enquiryError } = await supabase
        .from('quotation_enquiries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (enquiryError) throw enquiryError;
      
      if (enquiryData) {
        setEnquiry({
          ...(enquiryData as any),
          parts: []
        });
        setSalesRep(enquiryData.sales_representative || '');
        setNotes(enquiryData.notes || '');
      } else {
        setEnquiry(null);
      }
    } catch (error) {
      console.error('Error fetching enquiry:', error);
      toast.error('Failed to load enquiry details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEnquiry();
  }, [loadEnquiry]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    await updateEnquiry(id, {
      sales_representative: salesRep.trim() || null,
      notes: notes.trim() || null
    });
    setSaving(false);
    loadEnquiry();
  };

  const handleStatusChange = async (newStatus: EnquiryStatus) => {
    if (!id) return;
    await updateEnquiryStatus(id, newStatus);
    loadEnquiry();
  };

  const handleAddPart = async () => {
    if (!id || !newPartNumber.trim()) {
      toast.error('Part number is required');
      return;
    }

    setAddingPart(true);
    const nextLineNumber = parts.length > 0 
      ? Math.max(...parts.map(p => p.line_number)) + 1 
      : 1;

    const result = await addPart({
      enquiry_id: id,
      line_number: nextLineNumber,
      part_number: newPartNumber.trim(),
      description: newPartDescription.trim() || null,
      revision: newPartRevision.trim() || null,
      drawing_url: null,
      drawing_file_name: null
    });

    if (result) {
      setAddPartOpen(false);
      setNewPartNumber('');
      setNewPartDescription('');
      setNewPartRevision('');
    }
    setAddingPart(false);
  };

  const handleDeletePart = async (partId: string) => {
    await deletePart(partId);
  };

  const handleFileUpload = async (partId: string, file: File) => {
    setUploadingDrawingId(partId);
    await uploadDrawing(partId, file);
    setUploadingDrawingId(null);
  };

  const triggerFileInput = (partId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-part-id', partId);
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const partId = e.target.getAttribute('data-part-id');
    if (file && partId) {
      handleFileUpload(partId, file);
    }
    e.target.value = '';
  };

  const getPartQuotation = (partId: string): SystemQuotation | undefined => {
    return quotations.find(q => q.enquiry_part_id === partId);
  };

  const handleDelete = async () => {
    if (!id) return;
    const success = await deleteEnquiry(id);
    if (success) {
      navigate('/npi/quotation-system/enquiries');
    }
  };

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

  if (loading) {
    return (
      <AppLayout title="Enquiry Details" showBackButton backTo="/npi/quotation-system/enquiries">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!enquiry) {
    return (
      <AppLayout title="Enquiry Not Found" showBackButton backTo="/npi/quotation-system/enquiries">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Enquiry not found</h3>
                <p className="text-muted-foreground mb-4">
                  The enquiry you're looking for doesn't exist or has been deleted.
                </p>
                <Button onClick={() => navigate('/npi/quotation-system/enquiries')}>
                  Back to Enquiries
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={`Enquiry: ${enquiry.enquiry_no}`} 
      subtitle={enquiry.customer_name}
      showBackButton 
      backTo="/npi/quotation-system/enquiries"
    >
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
        />

        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <span className="font-mono">{enquiry.enquiry_no}</span>
                  {getStatusBadge(enquiry.status)}
                </CardTitle>
                <CardDescription>
                  Created on {format(new Date(enquiry.created_at), 'dd MMM yyyy HH:mm')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={enquiry.status} 
                  onValueChange={(v) => handleStatusChange(v as EnquiryStatus)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this enquiry? This will also delete all parts and quotations associated with it. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input value={enquiry.customer_name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Sales Representative</Label>
                <Input 
                  value={salesRep} 
                  onChange={(e) => setSalesRep(e.target.value)}
                  placeholder="Enter sales representative"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Parts Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parts to Quote</CardTitle>
                <CardDescription>
                  {parts.length} part(s) in this enquiry
                </CardDescription>
              </div>
              <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Part
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Part</DialogTitle>
                    <DialogDescription>
                      Enter the part details to add to this enquiry.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Part Number *</Label>
                      <Input
                        value={newPartNumber}
                        onChange={(e) => setNewPartNumber(e.target.value)}
                        placeholder="e.g., 12345-ABC"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input
                        value={newPartDescription}
                        onChange={(e) => setNewPartDescription(e.target.value)}
                        placeholder="Part description"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Revision</Label>
                      <Input
                        value={newPartRevision}
                        onChange={(e) => setNewPartRevision(e.target.value)}
                        placeholder="e.g., A, 01, Rev.1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddPartOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPart} disabled={addingPart}>
                      {addingPart ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Part
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {partsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : parts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">No parts added yet</p>
                <Button variant="outline" onClick={() => setAddPartOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Part
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Rev</TableHead>
                      <TableHead>Drawing</TableHead>
                      <TableHead>Quotation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((part) => {
                      const quotation = getPartQuotation(part.id);
                      return (
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
                          <TableCell>
                            {part.drawing_url ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {part.drawing_file_name?.slice(0, 15)}...
                                </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => window.open(part.drawing_url!, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Drawing</TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => triggerFileInput(part.id)}
                                disabled={uploadingDrawingId === part.id}
                              >
                                {uploadingDrawingId === part.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    Upload
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            {quotation ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Quoted
                                </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => navigate(`/npi/quotation-system/edit/${quotation.id}`)}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Quotation</TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/npi/quotation-system/new?enquiryPartId=${part.id}&enquiryNo=${enquiry.enquiry_no}&partNumber=${part.part_number}&customer=${encodeURIComponent(enquiry.customer_name)}`)}
                              >
                                <Calculator className="h-3 w-3 mr-1" />
                                Quote
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => triggerFileInput(part.id)}
                                  >
                                    <FileUp className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Upload Drawing</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Part</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete part "{part.part_number}"? Any associated quotation will be unlinked.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePart(part.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Status</CardTitle>
            <CardDescription>
              Track the progress of this enquiry through the quotation workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {statusFlow.map((status, idx) => {
                const config = statusConfig[status];
                const Icon = config.icon;
                const isActive = enquiry.status === status;
                const isPast = statusFlow.indexOf(enquiry.status) > idx;
                const isDeclined = enquiry.status === 'declined';
                const isLost = enquiry.status === 'lost';
                
                return (
                  <div key={status} className="flex items-center">
                    <button
                      onClick={() => handleStatusChange(status)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-[80px]",
                        isActive && "bg-primary/10 ring-2 ring-primary",
                        isPast && "opacity-60",
                        !isActive && !isPast && "opacity-40 hover:opacity-70"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isActive ? config.color : isPast ? "bg-muted" : "bg-muted/50"
                      )}>
                        <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center",
                        isActive && "text-primary"
                      )}>
                        {config.label}
                      </span>
                    </button>
                    {idx < statusFlow.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {(enquiry.status === 'declined' || enquiry.status === 'lost') && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive flex items-center gap-2">
                  {enquiry.status === 'declined' ? (
                    <>
                      <ThumbsDown className="h-4 w-4" />
                      This enquiry was declined. You can update the status to continue the workflow.
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4" />
                      This enquiry was lost. The quotation was not successful.
                    </>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default EnquiryDetail;
