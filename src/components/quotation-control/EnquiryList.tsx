import { useState, useMemo } from 'react';
import { EnquiryLog } from '@/types/enquiryLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  X,
  ChevronLeft,
  ChevronRight,
  Euro,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { format } from 'date-fns';

interface EnquiryListProps {
  enquiries: EnquiryLog[];
  initialFilters?: EnquiryListFilters;
  onSelectEnquiry?: (enquiry: EnquiryLog) => void;
}

export interface EnquiryListFilters {
  search?: string;
  status?: string;
  customer?: string;
  owner?: string;
  priority?: string;
  year?: string;
  quarter?: string;
}

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
  'OPEN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'QUOTED': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'WON': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'LOST': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'ON HOLD': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function EnquiryList({ enquiries, initialFilters, onSelectEnquiry }: EnquiryListProps) {
  const [filters, setFilters] = useState<EnquiryListFilters>(initialFilters || {});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const years = [...new Set(enquiries.map(e => {
      if (!e.date_received) return null;
      try {
        return new Date(e.date_received).getFullYear().toString();
      } catch {
        return null;
      }
    }).filter(Boolean))].sort().reverse() as string[];

    return {
      statuses: [...new Set(enquiries.map(e => e.status).filter(Boolean))].sort() as string[],
      customers: [...new Set(enquiries.map(e => e.customer).filter(Boolean))].sort() as string[],
      owners: [...new Set(enquiries.map(e => e.npi_owner).filter(Boolean))].sort() as string[],
      priorities: [...new Set(enquiries.map(e => e.priority).filter(Boolean))].sort() as string[],
      years,
    };
  }, [enquiries]);

  // Filter enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchFields = [
          e.enquiry_no,
          e.customer,
          e.details,
          e.npi_owner,
          e.commercial_owner,
        ].filter(Boolean).map(f => f!.toLowerCase());
        if (!searchFields.some(f => f.includes(search))) return false;
      }
      if (filters.status && e.status?.toUpperCase() !== filters.status.toUpperCase()) return false;
      if (filters.customer && e.customer !== filters.customer) return false;
      if (filters.owner && e.npi_owner !== filters.owner) return false;
      if (filters.priority && e.priority !== filters.priority) return false;
      
      // Year filter
      if (filters.year && e.date_received) {
        try {
          const year = new Date(e.date_received).getFullYear().toString();
          if (year !== filters.year) return false;
        } catch {
          return false;
        }
      } else if (filters.year && !e.date_received) {
        return false;
      }
      
      // Quarter filter
      if (filters.quarter && e.date_received) {
        try {
          const month = new Date(e.date_received).getMonth();
          const quarter = Math.floor(month / 3) + 1;
          if (quarter.toString() !== filters.quarter) return false;
        } catch {
          return false;
        }
      } else if (filters.quarter && !e.date_received) {
        return false;
      }
      
      return true;
    });
  }, [enquiries, filters]);

  // Paginate
  const totalPages = Math.ceil(filteredEnquiries.length / PAGE_SIZE);
  const paginatedEnquiries = filteredEnquiries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yy');
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

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Enquiry Log</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filteredEnquiries.length} enquiries</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary/10' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search enquiries..."
            value={filters.search || ''}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
              <Select
                value={filters.year || 'all'}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, year: v === 'all' ? undefined : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {filterOptions.years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quarter</label>
              <Select
                value={filters.quarter || 'all'}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, quarter: v === 'all' ? undefined : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All quarters</SelectItem>
                  <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer</label>
              <Select
                value={filters.customer || 'all'}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, customer: v === 'all' ? undefined : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {filterOptions.customers.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, status: v === 'all' ? undefined : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {filterOptions.statuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">NPI Owner</label>
              <Select
                value={filters.owner || 'all'}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, owner: v === 'all' ? undefined : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  {filterOptions.owners.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select
                value={filters.priority || 'all'}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, priority: v === 'all' ? undefined : v }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {filterOptions.priorities.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="col-span-full flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Enquiry #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="hidden lg:table-cell">Received</TableHead>
                <TableHead className="hidden lg:table-cell">ECD</TableHead>
                <TableHead className="text-right hidden md:table-cell">Quoted €</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEnquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No enquiries found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEnquiries.map((enquiry) => (
                  <TableRow 
                    key={enquiry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectEnquiry?.(enquiry)}
                  >
                    <TableCell className="font-medium">{enquiry.enquiry_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{enquiry.customer || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="truncate max-w-[200px] block text-sm text-muted-foreground">
                        {enquiry.details || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{enquiry.npi_owner || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(enquiry.date_received)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(enquiry.ecd_quote_submission)}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {enquiry.quoted_price_euro ? (
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(enquiry.quoted_price_euro)}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[enquiry.status?.toUpperCase() || 'OPEN'] || STATUS_COLORS['OPEN']}>
                        {enquiry.status || 'OPEN'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
