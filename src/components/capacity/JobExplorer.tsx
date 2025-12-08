import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CleanedJob } from '@/types/capacity';
import { format } from 'date-fns';
import { Search, X, Filter } from 'lucide-react';

interface JobExplorerProps {
  jobs: CleanedJob[];
  machines: string[];
  onJobClick?: (jobId: string) => void;
  selectedJobId?: string | null;
}

export function JobExplorer({ jobs, machines, onJobClick, selectedJobId }: JobExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get unique values for filters
  const priorities = useMemo(() => 
    [...new Set(jobs.map(j => j.Priority))].filter(p => p > 0).sort((a, b) => a - b),
    [jobs]
  );
  
  const statuses = useMemo(() => 
    [...new Set(jobs.map(j => j.Status).filter(s => s))],
    [jobs]
  );

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          job.Process_Order.toLowerCase().includes(search) ||
          job.Production_Order.toLowerCase().includes(search) ||
          job.End_Product.toLowerCase().includes(search) ||
          job.Item_Name.toLowerCase().includes(search) ||
          job.Customer.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Machine filter
      if (machineFilter !== 'all' && job.Machine !== machineFilter) return false;
      
      // Priority filter
      if (priorityFilter !== 'all' && job.Priority !== parseInt(priorityFilter)) return false;
      
      // Status filter
      if (statusFilter !== 'all' && job.Status !== statusFilter) return false;
      
      return true;
    });
  }, [jobs, searchTerm, machineFilter, priorityFilter, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setMachineFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const hasFilters = searchTerm || machineFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Job Explorer
        </CardTitle>
        <CardDescription>
          Search and filter all jobs in the production schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order, product, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <label className="text-sm font-medium mb-1.5 block">Machine</label>
            <Select value={machineFilter} onValueChange={setMachineFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Machines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {machines.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-36">
            <label className="text-sm font-medium mb-1.5 block">Priority</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {priorities.map(p => (
                  <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-40">
            <label className="text-sm font-medium mb-1.5 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </p>
          {selectedJobId && (
            <Badge variant="secondary">
              Job selected - view in timeline
            </Badge>
          )}
        </div>

        {/* Jobs Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Process Order</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No jobs match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow 
                    key={job.id}
                    className={`cursor-pointer transition-colors ${
                      selectedJobId === job.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onJobClick?.(job.id)}
                  >
                    <TableCell className="font-medium">{job.Machine}</TableCell>
                    <TableCell>{job.Process_Order}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{job.End_Product}</TableCell>
                    <TableCell>{job.Customer}</TableCell>
                    <TableCell>{format(job.Start_DateTime, 'MMM d, HH:mm')}</TableCell>
                    <TableCell className="text-right">{job.Duration_Hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{job.Qty}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{job.Priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {job.Status || 'N/A'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
