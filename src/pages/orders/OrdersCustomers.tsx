import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersLayout } from '@/components/orders/OrdersLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useCustomers, useOrders } from '@/hooks/useOrderTracker';
import { daysRemaining, dueBucket, fmtDate, fmtMoney, isOpen, type OtCustomer } from '@/types/orderTracker';
import { StatusBadge } from '@/components/orders/StatusSelect';
import { cn } from '@/lib/utils';

export default function OrdersCustomers() {
  const navigate = useNavigate();
  const { customers, loading, save, remove } = useCustomers();
  const { orders } = useOrders();
  const [editing, setEditing] = useState<Partial<OtCustomer> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OtCustomer | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const summary = useMemo(() => {
    const map = new Map<string, { open: number; overdue: number; upcoming: number; total: number; value: number }>();
    customers.forEach((c) => map.set(c.id, { open: 0, overdue: 0, upcoming: 0, total: 0, value: 0 }));
    orders.forEach((o) => {
      if (!o.customer_id || !map.has(o.customer_id)) return;
      const s = map.get(o.customer_id)!;
      s.total += 1;
      if (isOpen(o.status)) {
        s.open += 1;
        s.value += Number(o.total_price) || 0;
        const d = daysRemaining(o.due_date);
        if (d !== null && d < 0) s.overdue += 1;
        else if (d !== null) s.upcoming += 1;
      }
    });
    return map;
  }, [customers, orders]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => o.customer_id === selected)
      .sort((a, b) => dueBucket(a.due_date).rank - dueBucket(b.due_date).rank || (a.due_date || '9999').localeCompare(b.due_date || '9999')),
    [orders, selected],
  );
  const selectedCustomer = customers.find((c) => c.id === selected) || null;

  return (
    <OrdersLayout
      title="Customers"
      subtitle="Customer records and their order activity"
      actions={
        <Button onClick={() => setEditing({ name: '' })}>
          <Plus className="mr-2 h-4 w-4" /> New customer
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {customers.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  No customers yet. They are created automatically when you upload a purchase order.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Customer</th>
                        <th className="px-3 py-2 text-left font-medium">Customer ID</th>
                        <th className="px-3 py-2 text-left font-medium">Contact</th>
                        <th className="px-3 py-2 text-right font-medium">Open</th>
                        <th className="px-3 py-2 text-right font-medium">Overdue</th>
                        <th className="px-3 py-2 text-right font-medium">Open value</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => {
                        const s = summary.get(c.id)!;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelected(c.id)}
                            className={cn(
                              'cursor-pointer border-b border-border last:border-0 hover:bg-muted/50',
                              selected === c.id && 'bg-muted/60',
                            )}
                          >
                            <td className="px-3 py-2 font-medium">{c.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{c.customer_code || '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{c.contact_name || c.contact_email || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{s.open}</td>
                            <td className={cn('px-3 py-2 text-right tabular-nums', s.overdue > 0 && 'font-semibold text-destructive')}>{s.overdue}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(s.value)}</td>
                            <td className="px-2 py-2">
                              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(c)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setPendingDelete(c)}>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedCustomer ? selectedCustomer.name : 'Select a customer'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedCustomer ? (
                <p className="text-sm text-muted-foreground">Pick a customer to see their open, overdue and upcoming orders.</p>
              ) : (
                <>
                  {selectedCustomer.notes && <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>}
                  {selectedOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders for this customer yet.</p>
                  ) : (
                    <div className="max-h-[520px] space-y-2 overflow-y-auto">
                      {selectedOrders.map((o) => {
                        const b = dueBucket(o.due_date);
                        return (
                          <button
                            key={o.id}
                            onClick={() => navigate(`/orders/view/${o.id}`)}
                            className="w-full rounded border border-border p-2 text-left text-sm hover:bg-muted/50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{o.part_number || 'No part number'}</span>
                              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', b.className)}>{b.label}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>PO {o.po_number || '—'} · due {fmtDate(o.due_date)}</span>
                              <StatusBadge status={o.status} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit customer' : 'New customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer name</Label>
              <Input value={editing?.name || ''} onChange={(e) => setEditing((c) => ({ ...c!, name: e.target.value }))} />
            </div>
            <div>
              <Label>Customer ID</Label>
              <Input value={editing?.customer_code || ''} onChange={(e) => setEditing((c) => ({ ...c!, customer_code: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact name</Label>
                <Input value={editing?.contact_name || ''} onChange={(e) => setEditing((c) => ({ ...c!, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label>Contact phone</Label>
                <Input value={editing?.contact_phone || ''} onChange={(e) => setEditing((c) => ({ ...c!, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Contact email</Label>
              <Input value={editing?.contact_email || ''} onChange={(e) => setEditing((c) => ({ ...c!, contact_email: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={editing?.notes || ''} onChange={(e) => setEditing((c) => ({ ...c!, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={!editing?.name?.trim() || save.isPending}
              onClick={async () => {
                await save.mutateAsync(editing as OtCustomer);
                setEditing(null);
              }}
            >
              Save customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their orders stay in the system but will no longer be linked to a customer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              Delete customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrdersLayout>
  );
}
