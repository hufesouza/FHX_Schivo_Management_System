import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Plus, Eye, FileText, CheckCircle, Clock, XCircle, Pencil, Package, Link2, Link2Off } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSystemQuotations } from '@/hooks/useQuotationSystem';
import { format } from 'date-fns';

type AssignmentFilter = 'all' | 'unassigned' | 'assigned';

const QuotationSystemList = () => {
  const navigate = useNavigate();
  const { quotations, loading } = useSystemQuotations();
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = 
        (q.enquiry_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        q.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.part_number.toLowerCase().includes(searchTerm.toLowerCase());

      // Type assertion for assignment_status since it's a new column
      const assignmentStatus = (q as any).assignment_status || 'unassigned';
      
      if (assignmentFilter === 'unassigned') {
        return matchesSearch && assignmentStatus === 'unassigned';
      } else if (assignmentFilter === 'assigned') {
        return matchesSearch && assignmentStatus === 'assigned';
      }
      
      return matchesSearch;
    });
  }, [quotations, searchTerm, assignmentFilter]);

  const unassignedCount = quotations.filter(q => (q as any).assignment_status !== 'assigned').length;
  const assignedCount = quotations.filter(q => (q as any).assignment_status === 'assigned').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
    }
  };

  const getAssignmentBadge = (status: string) => {
    if (status === 'assigned') {
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
          <Link2 className="h-3 w-3 mr-1" />
          Assigned
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
        <Link2Off className="h-3 w-3 mr-1" />
        Unassigned
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppLayout title="Quotation List" showBackButton backTo="/npi/quotation-system">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quotation List" subtitle="View and manage all quoted parts" showBackButton backTo="/npi/quotation-system">
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  All Quoted Parts
                </CardTitle>
                <CardDescription>
                  Quote parts individually, then group them into enquiries
                </CardDescription>
              </div>
              <Button onClick={() => navigate('/npi/quotation-system/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Quotation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as AssignmentFilter)} className="mb-4">
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  All
                  <Badge variant="secondary" className="ml-1">{quotations.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="gap-2">
                  <Link2Off className="h-4 w-4" />
                  Unassigned
                  <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">{unassignedCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="assigned" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Assigned to Enquiry
                  <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700">{assignedCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, or part..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filteredQuotations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {assignmentFilter === 'unassigned' 
                    ? 'No unassigned quotations'
                    : assignmentFilter === 'assigned'
                    ? 'No assigned quotations'
                    : 'No quotations found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : assignmentFilter === 'unassigned'
                    ? 'All quotations have been assigned to enquiries'
                    : 'Create your first quotation to get started'}
                </p>
                {!searchTerm && assignmentFilter === 'all' && (
                  <Button onClick={() => navigate('/npi/quotation-system/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quotation
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quoted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-medium">{quotation.customer}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {quotation.part_number}
                          {quotation.revision && <span className="text-muted-foreground ml-1">Rev {quotation.revision}</span>}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {quotation.description || '-'}
                        </TableCell>
                        <TableCell>{quotation.quoted_by || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(quotation.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                        <TableCell>{getAssignmentBadge((quotation as any).assignment_status || 'unassigned')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => navigate(`/npi/quotation-system/edit/${quotation.id}`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Quotation</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
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
      </div>
    </AppLayout>
  );
};

export default QuotationSystemList;
