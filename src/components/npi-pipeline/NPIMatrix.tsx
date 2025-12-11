import { useState, useMemo } from 'react';
import { NPIJobWithRelations, getPrereqStatusColor } from '@/types/npi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NPIMatrixProps {
  jobs: NPIJobWithRelations[];
  onSelectJob: (job: NPIJobWithRelations) => void;
}

const prereqColumns = [
  { key: 'doc_control', label: 'Doc', shortLabel: 'DC' },
  { key: 'po_printed', label: 'PO', shortLabel: 'PO' },
  { key: 'packaging', label: 'Pkg', shortLabel: 'Pk' },
  { key: 'material', label: 'Mat', shortLabel: 'Ma' },
  { key: 'tooling', label: 'Tool', shortLabel: 'To' },
  { key: 'mc_prep', label: 'MC', shortLabel: 'MC' },
  { key: 'metr_prg', label: 'Metr P', shortLabel: 'MP' },
  { key: 'metr_fix', label: 'Metr F', shortLabel: 'MF' },
  { key: 'gauges', label: 'Gau', shortLabel: 'Ga' },
  { key: 'additional_reqs', label: 'Add', shortLabel: 'Ad' }
];

const postMcColumns = [
  { key: 'work_instructions', label: 'WI', shortLabel: 'WI' },
  { key: 'production_ims', label: 'Prod', shortLabel: 'Pr' },
  { key: 'qc_ims', label: 'QC', shortLabel: 'QC' },
  { key: 'fair', label: 'FAIR', shortLabel: 'FA' },
  { key: 're_rev_closure', label: 'Rev', shortLabel: 'Re' },
  { key: 'aging_days', label: 'Age', shortLabel: 'Ag' }
];

function CellBadge({ value, isNumeric = false }: { value: string | number | null; isNumeric?: boolean }) {
  if (isNumeric) {
    return (
      <div className="w-8 h-8 flex items-center justify-center text-xs font-medium">
        {value ?? '-'}
      </div>
    );
  }

  const color = getPrereqStatusColor(value as string | null);
  
  const colorClasses = {
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-400 text-yellow-900',
    red: 'bg-red-500 text-white',
    gray: 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded ${colorClasses[color]} cursor-default`}
        >
          {value ? String(value).charAt(0).toUpperCase() : '-'}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {value || 'Not set'}
      </TooltipContent>
    </Tooltip>
  );
}

export function NPIMatrix({ jobs, onSelectJob }: NPIMatrixProps) {
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [mcCellFilter, setMcCellFilter] = useState<string>('all');

  const uniqueCustomers = useMemo(() => 
    [...new Set(jobs.map(j => j.customer).filter(Boolean))].sort() as string[], 
    [jobs]
  );
  
  const uniqueMcCells = useMemo(() => 
    [...new Set(jobs.map(j => j.mc_cell).filter(Boolean))].sort() as string[], 
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          job.part?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower) ||
          job.customer?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (customerFilter !== 'all' && job.customer !== customerFilter) return false;
      if (mcCellFilter !== 'all' && job.mc_cell !== mcCellFilter) return false;
      return true;
    });
  }, [jobs, search, customerFilter, mcCellFilter]);

  return (
    <Tabs defaultValue="prereq" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="prereq">Pre-MC Prerequisites</TabsTrigger>
          <TabsTrigger value="postmc">Post-MC Activities</TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[180px]"
            />
          </div>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {uniqueCustomers.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mcCellFilter} onValueChange={setMcCellFilter}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="MC Cell" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cells</SelectItem>
              {uniqueMcCells.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TabsContent value="prereq">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pre-requisites Matrix</CardTitle>
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Complete (C/G)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-400 rounded" />
                <span>WIP</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>Not Started</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 rounded" />
                <span>N/A</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium sticky left-0 bg-background">Job</th>
                  <th className="text-left py-2 px-2 font-medium">Customer</th>
                  {prereqColumns.map(col => (
                    <th key={col.key} className="text-center py-2 px-1 font-medium">
                      <Tooltip>
                        <TooltipTrigger>{col.shortLabel}</TooltipTrigger>
                        <TooltipContent>{col.label}</TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => (
                  <tr 
                    key={job.id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => onSelectJob(job)}
                  >
                    <td className="py-2 px-2 font-medium sticky left-0 bg-background">
                      {job.part || job.dp1 || '-'}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {job.customer || '-'}
                    </td>
                    {prereqColumns.map(col => (
                      <td key={col.key} className="py-1 px-1 text-center">
                        <CellBadge 
                          value={job.prereq?.[col.key as keyof typeof job.prereq] as string | null} 
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredJobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No jobs match the current filters
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="postmc">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Post-MC Activities Matrix</CardTitle>
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Complete</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-400 rounded" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>Not Done</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium sticky left-0 bg-background">Job</th>
                  <th className="text-left py-2 px-2 font-medium">Customer</th>
                  {postMcColumns.map(col => (
                    <th key={col.key} className="text-center py-2 px-1 font-medium">
                      <Tooltip>
                        <TooltipTrigger>{col.shortLabel}</TooltipTrigger>
                        <TooltipContent>{col.label}</TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => (
                  <tr 
                    key={job.id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => onSelectJob(job)}
                  >
                    <td className="py-2 px-2 font-medium sticky left-0 bg-background">
                      {job.part || job.dp1 || '-'}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {job.customer || '-'}
                    </td>
                    {postMcColumns.map(col => (
                      <td key={col.key} className="py-1 px-1 text-center">
                        <CellBadge 
                          value={job.post_mc?.[col.key as keyof typeof job.post_mc] as string | number | null}
                          isNumeric={col.key === 'aging_days'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredJobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No jobs match the current filters
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
