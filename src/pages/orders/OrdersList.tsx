import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OrdersLayout } from '@/components/orders/OrdersLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Search, Trash2, Copy, ArrowUpDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMachines, useOrders } from '@/hooks/useOrderTracker';
import {
  DUE_BUCKETS, daysRemaining, dueBucket, fmtDate, fmtMoney, fmtQty, isOpen,
  type DueBucketKey, type OrderStatus, ORDER_STATUSES, type OtOrder,
} from '@/types/orderTracker';
import { StatusBadge } from '@/components/orders/StatusSelect';
import { cn } from '@/lib/utils';

const ALL = '__all__';
const PAGE_SIZE = 25;

type SortKey = 'priority' | 'due_date' | 'customer_name' | 'part_number' | 'status' | 'machine';

export default function OrdersList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { orders, loading, remove, duplicate } = useOrders();
  const { machines } = useMachines();

  const scope = params.get('scope') || 'all';
  const due = (params.get('due') || ALL) as DueBucketKey | typeof ALL;

  const [search, setSearch] = useState('');
  const [fCustomer, setFCustomer] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const [fMachine, setFMachine] = useState(ALL);
  const [fType, setFType] = useState<'all' | 'parts' | 'nre'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortKey>('priority');
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<OtOrder | null>(null);

  const machineName = (id: string | null) => machines.find((m) => m.id === id)?.name || '—';

  const customers = useMemo(
    () => [...new Set(orders.map((o) => o.customer_name).filter(Boolean))].sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (scope === 'open' && !isOpen(o.status)) return false;
      if (scope === 'completed' && !(o.status === 'Completed' || o.status === 'Shipped')) return false;
      if (scope === 'cancelled' && o.status !== 'Cancelled') return false;
      if (due !== ALL && dueBucket(o.due_date).key !== due) return false;
      if (fCustomer !== ALL && o.customer_name !== fCustomer) return false;
      if (fStatus !== ALL && o.status !== fStatus) return false;
      if (fMachine !== ALL && (o.machine_id || '') !== (fMachine === '__none__' ? '' : fMachine)) return false;
      if (fType === 'parts' && o.is_nre) return false;
      if (fType === 'nre' && !o.is_nre) return false;
      if (fromDate && (!o.due_date || o.due_date < fromDate)) return false;
      if (toDate && (!o.due_date || o.due_date > toDate)) return false;
      if (q) {
        const hay = [o.customer_name, o.po_number, o.part_number, o.part_description]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, scope, due, fCustomer, fStatus, fMachine, fType, fromDate, toDate, search]);

  const sorted = useMemo(() => {
    const dir = asc ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sort) {
        case 'priority': {
          const ra = dueBucket(a.due_date).rank;
          const rb = dueBucket(b.due_date).rank;
          if (ra !== rb) return (ra - rb) * dir;
          return ((a.due_date || '9999').localeCompare(b.due_date || '9999')) * dir;
        }
        case 'due_date':
          return ((a.due_date || '9999').localeCompare(b.due_date || '9999')) * dir;
        case 'customer_name':
          return (a.customer_name || '').localeCompare(b.customer_name || '') * dir;
        case 'part_number':
          return (a.part_number || '').localeCompare(b.part_number || '') * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'machine':
          return machineName(a.machine_id).localeCompare(machineName(b.machine_id)) * dir;
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sort, asc, machines]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAsc(!asc);
    else { setSort(key); setAsc(true); }
    setPage(0);
  };

  const clearAll = () => {
    setSearch(''); setFCustomer(ALL); setFStatus(ALL); setFMachine(ALL); setFType('all');
    setFromDate(''); setToDate(''); setPage(0); setParams({});
  };

  const activeChip = [
    scope !== 'all' ? scope : null,
    due !== ALL ? DUE_BUCKETS[due as DueBucketKey].label : null,
  ].filter(Boolean).join(' · ');

  const Th = ({ label, sortKey, className }: { label: string; sortKey?: SortKey; className?: string }) => (
    <th className={cn('px-3 py-2 text-left font-medium', className)}>
      {sortKey ? (
        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(sortKey)}>
          {label}
          <ArrowUpDown className={cn('h-3 w-3', sort === sortKey ? 'text-primary' : 'opacity-40')} />
        </button>
      ) : label}
    </th>
  );

  return (
    <OrdersLayout
      title="Orders"
      subtitle={`${sorted.length} order line${sorted.length === 1 ? '' : 's'} — sorted by urgency by default`}
      actions={
        <Button onClick={() => navigate('/orders/view/new')}>
          <Plus className="mr-2 h-4 w-4" /> New order
        </Button>
      }
    >
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search customer, PO, part number, description"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={fCustomer} onValueChange={(v) => { setFCustomer(v); setPage(0); }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All customers</SelectItem>
              {customers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={(v) => { setFStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fMachine} onValueChange={(v) => { setFMachine(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Machine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All machines</SelectItem>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fType} onValueChange={(v) => { setFType(v as 'all' | 'parts' | 'nre'); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Parts &amp; NRE</SelectItem>
              <SelectItem value="parts">Manufactured parts</SelectItem>
              <SelectItem value="nre">NRE only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Due from</label>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} className="w-[145px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Due to</label>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} className="w-[145px]" />
            </div>
          </div>
          {(activeChip || search || fCustomer !== ALL || fStatus !== ALL || fMachine !== ALL || fType !== 'all' || fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="mr-1 h-4 w-4" /> Clear {activeChip && <span className="ml-1 text-xs uppercase">({activeChip})</span>}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No orders match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th label="Customer" sortKey="customer_name" />
                    <Th label="PO number" />
                    <Th label="Part number" sortKey="part_number" />
                    <Th label="Description" />
                    <Th label="Qty" className="text-right" />
                    <Th label="Due date" sortKey="due_date" />
                    <Th label="Days" className="text-right" />
                    <Th label="Priority" />
                    <Th label="Status" sortKey="status" />
                    <Th label="Machine" sortKey="machine" />
                    <Th label="Unit price" className="text-right" />
                    <Th label="Total" className="text-right" />
                    <Th label="" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const b = dueBucket(o.due_date);
                    const days = daysRemaining(o.due_date);
                    return (
                      <tr
                        key={o.id}
                        onClick={() => navigate(`/orders/view/${o.id}`)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-3 py-2 font-medium">{o.customer_name || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{o.po_number || '—'}</td>
                        <td className="px-3 py-2">
                          {o.is_nre && (
                            <span className="mr-2 inline-flex rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600">
                              NRE
                            </span>
                          )}
                          {o.part_number || (o.is_nre ? 'Engineering charge' : '—')}
                          {o.part_revision ? ` Rev ${o.part_revision}` : ''}
                        </td>
                        <td className="max-w-[240px] truncate px-3 py-2 text-muted-foreground">{o.part_description || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtQty(o.quantity)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(o.due_date)}</td>
                        <td className={cn('px-3 py-2 text-right tabular-nums font-semibold', b.key === 'overdue' && 'text-destructive')}>
                          {days === null ? '—' : days}
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn('inline-flex whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium', b.className)}>
                            {b.label}
                          </span>
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={o.status} /></td>
                        <td className="px-3 py-2">{o.is_nre ? <span className="text-muted-foreground">n/a</span> : machineName(o.machine_id)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(o.unit_price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(o.total_price)}</td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicate"
                              onClick={() => duplicate.mutate(o)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete"
                              onClick={() => setPendingDelete(o)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Page {current + 1} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.customer_name} · {pendingDelete?.po_number || 'no PO'} · {pendingDelete?.part_number || 'no part'}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              Delete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrdersLayout>
  );
}
