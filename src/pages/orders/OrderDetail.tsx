import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrdersLayout } from '@/components/orders/OrdersLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Save, Trash2, Copy, FileText, ArrowLeft } from 'lucide-react';
import { MachineSelect } from '@/components/orders/MachineSelect';
import { StatusSelect } from '@/components/orders/StatusSelect';
import { ensureCustomer, getPoFileUrl, useOrder, useOrders, usePurchaseOrder } from '@/hooks/useOrderTracker';
import { daysRemaining, dueBucket, fmtDate, type OtOrder } from '@/types/orderTracker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyOrder = (): Partial<OtOrder> => ({
  customer_name: '',
  po_number: '',
  po_date: null,
  part_number: '',
  part_description: '',
  quantity: null,
  due_date: null,
  unit_price: null,
  total_price: null,
  notes: '',
  requirements: '',
  special_requirements: '',
  status: 'New',
  machine_id: null,
});

const num = (v: string) => (v === '' ? null : Number(v));

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { data, isLoading } = useOrder(isNew ? undefined : id);
  const { save, remove, duplicate } = useOrders();
  const [form, setForm] = useState<Partial<OtOrder>>(emptyOrder());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: po } = usePurchaseOrder(form.purchase_order_id);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof OtOrder>(key: K, value: OtOrder[K] | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const bucket = useMemo(() => dueBucket(form.due_date ?? null), [form.due_date]);
  const days = daysRemaining(form.due_date ?? null);

  const onSave = async () => {
    if (!form.customer_name?.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const customer_id = form.customer_id || (await ensureCustomer(form.customer_name));
    const payload = { ...form, customer_id };
    const savedId = await save.mutateAsync(payload);
    if (isNew) navigate(`/orders/view/${savedId}`, { replace: true });
  };

  const openFile = async () => {
    if (!po?.file_path) return;
    const url = await getPoFileUrl(po.file_path);
    if (url) window.open(url, '_blank', 'noopener');
    else toast.error('Could not open the original file');
  };

  if (!isNew && isLoading) {
    return (
      <OrdersLayout title="Order">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </OrdersLayout>
    );
  }

  if (!isNew && !data) {
    return (
      <OrdersLayout title="Order not found">
        <Button variant="outline" onClick={() => navigate('/orders/list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to orders
        </Button>
      </OrdersLayout>
    );
  }

  return (
    <OrdersLayout
      title={isNew ? 'New order' : `${form.customer_name || 'Order'} · ${form.part_number || ''}`}
      subtitle={isNew ? 'Create an order manually' : `PO ${form.po_number || '—'} · created ${fmtDate((form.created_at || '').slice(0, 10))}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/orders/list')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Orders
          </Button>
          {po?.file_path && (
            <Button variant="outline" onClick={openFile}>
              <FileText className="mr-2 h-4 w-4" /> Original PO
            </Button>
          )}
          {!isNew && (
            <>
              <Button variant="outline" onClick={async () => {
                const newId = await duplicate.mutateAsync(form as OtOrder);
                navigate(`/orders/view/${newId}`);
              }}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          )}
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Order details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Customer name</Label>
              <Input value={form.customer_name || ''} onChange={(e) => set('customer_name', e.target.value)} />
            </div>
            <div>
              <Label>Customer PO number</Label>
              <Input value={form.po_number || ''} onChange={(e) => set('po_number', e.target.value)} />
            </div>
            <div>
              <Label>PO date</Label>
              <Input type="date" value={form.po_date || ''} onChange={(e) => set('po_date', e.target.value || null)} />
            </div>
            <div>
              <Label>Part number</Label>
              <Input value={form.part_number || ''} onChange={(e) => set('part_number', e.target.value)} />
            </div>
            <div>
              <Label>Line number</Label>
              <Input type="number" value={form.line_number ?? ''} onChange={(e) => set('line_number', num(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Part description</Label>
              <Input value={form.part_description || ''} onChange={(e) => set('part_description', e.target.value)} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" step="any" value={form.quantity ?? ''} onChange={(e) => set('quantity', num(e.target.value))} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value || null)} />
            </div>
            <div>
              <Label>Unit price</Label>
              <Input
                type="number" step="any" value={form.unit_price ?? ''}
                onChange={(e) => {
                  const v = num(e.target.value);
                  setForm((f) => ({
                    ...f,
                    unit_price: v,
                    total_price: v !== null && f.quantity ? Number((v * Number(f.quantity)).toFixed(2)) : f.total_price,
                  }));
                }}
              />
            </div>
            <div>
              <Label>Total price</Label>
              <Input type="number" step="any" value={form.total_price ?? ''} onChange={(e) => set('total_price', num(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Customer requirements</Label>
              <Textarea rows={3} value={form.requirements || ''} onChange={(e) => set('requirements', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Special requirements</Label>
              <Textarea rows={3} value={form.special_requirements || ''} onChange={(e) => set('special_requirements', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <StatusSelect value={form.status || 'New'} onChange={(s) => set('status', s)} />
              </div>
              <div>
                <Label>Machine</Label>
                <MachineSelect value={form.machine_id ?? null} onChange={(m) => set('machine_id', m)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Due date status</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span className="font-medium">{fmtDate(form.due_date ?? null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days remaining</span>
                <span className={cn('font-semibold tabular-nums', bucket.key === 'overdue' && 'text-destructive')}>
                  {days === null ? '—' : days}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category</span>
                <span className={cn('rounded border px-2 py-0.5 text-xs font-medium', bucket.className)}>{bucket.label}</span>
              </div>
            </CardContent>
          </Card>

          {po && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Source purchase order</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{po.po_number || 'No PO number'}</p>
                <p className="text-muted-foreground">{po.file_name || 'Manually created'}</p>
                <p className="text-muted-foreground">Uploaded {fmtDate((po.created_at || '').slice(0, 10))}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { await remove.mutateAsync(id!); navigate('/orders/list'); }}
            >
              Delete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrdersLayout>
  );
}
