import { useState, useMemo } from 'react';
import { NPIJobWithRelations, getPrereqStatusColor } from '@/types/npi';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface NPIJobListProps {
  jobs: NPIJobWithRelations[];
  onSelectJob: (job: NPIJobWithRelations) => void;
}

export function NPIJobList({ jobs, onSelectJob }: NPIJobListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [mcCellFilter, setMcCellFilter] = useState<string>('all');
  const [readyFilter, setReadyFilter] = useState<string>('all');

  // Extract unique values for filters
  const uniqueStatuses = useMemo(() => 
    [...new Set(jobs.map(j => j.status).filter(Boolean))].sort() as string[], 
    [jobs]
  );
  
  const uniqueCustomers = useMemo(() => 
    [...new Set(jobs.map(j => j.customer).filter(Boolean))].sort() as string[], 
    [jobs]
  );
  
  const uniqueMcCells = useMemo(() => 
    [...new Set(jobs.map(j => j.mc_cell).filter(Boolean))].sort() as string[], 
    [jobs]
  );

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          job.part?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower) ||
          job.customer?.toLowerCase().includes(searchLower) ||
          job.npi_pm?.toLowerCase().includes(searchLower) ||
          job.mc?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;

      // Customer filter
      if (customerFilter !== 'all' && job.customer !== customerFilter) return false;

      // MC Cell filter
      if (mcCellFilter !== 'all' && job.mc_cell !== mcCellFilter) return false;

      // Ready for MC filter
      if (readyFilter === 'ready' && !job.ready_for_mc) return false;
      if (readyFilter === 'not_ready' && job.ready_for_mc) return false;
      if (readyFilter === 'released' && !job.fully_released) return false;

      return true;
    });
  }, [jobs, search, statusFilter, customerFilter, mcCellFilter, readyFilter]);

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'complete': return 'default';
      case 'in-process': return 'secondary';
      case 'qa': return 'outline';
      case 'not started': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {uniqueStatuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {uniqueCustomers.map(customer => (
              <SelectItem key={customer} value={customer}>{customer}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mcCellFilter} onValueChange={setMcCellFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="MC Cell" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cells</SelectItem>
            {uniqueMcCells.map(cell => (
              <SelectItem key={cell} value={cell}>{cell}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={readyFilter} onValueChange={setReadyFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Readiness" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="ready">Ready for MC</SelectItem>
            <SelectItem value="not_ready">Not Ready</SelectItem>
            <SelectItem value="released">Fully Released</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Part</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Customer</TableHead>
              <TableHead className="w-[80px]">MC Cell</TableHead>
              <TableHead className="w-[80px]">MC</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[70px]">% Done</TableHead>
              <TableHead className="w-[80px]">Ready?</TableHead>
              <TableHead className="w-[100px]">Gate Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No jobs found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow 
                  key={job.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectJob(job)}
                >
                  <TableCell className="font-medium">
                    {job.part || job.dp1 || '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {job.description || '-'}
                  </TableCell>
                  <TableCell>{job.customer || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.mc_cell || '-'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{job.mc || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(job.status)}>
                      {job.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${job.percent_complete || 0}%` }}
                        />
                      </div>
                      <span className="text-xs">{job.percent_complete || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.ready_for_mc ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {job.gate_commit_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(job.gate_commit_date), 'dd MMM')}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
