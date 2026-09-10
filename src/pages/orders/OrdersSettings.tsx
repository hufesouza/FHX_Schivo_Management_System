import { useState } from 'react';
import { OrdersLayout } from '@/components/orders/OrdersLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useMachines, useOrders } from '@/hooks/useOrderTracker';
import { ORDER_STATUSES } from '@/types/orderTracker';
import { StatusBadge } from '@/components/orders/StatusSelect';
import type { OtMachine } from '@/types/orderTracker';

export default function OrdersSettings() {
  const { machines, loading, create, rename, remove } = useMachines();
  const { orders } = useOrders();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<OtMachine | null>(null);

  const usage = (id: string) => orders.filter((o) => o.machine_id === id).length;

  return (
    <OrdersLayout title="Settings" subtitle="Machines and order statuses">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Machines</CardTitle>
            <CardDescription>Used by the Machine field on every order. You can also add one directly from an order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New machine name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) { create.mutate(newName.trim()); setNewName(''); }
                }}
              />
              <Button
                disabled={!newName.trim() || create.isPending}
                onClick={() => { create.mutate(newName.trim()); setNewName(''); }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : machines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No machines yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded border border-border">
                {machines.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    {editId === m.id ? (
                      <>
                        <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={async () => { await rename.mutateAsync({ id: m.id, name: editName }); setEditId(null); }}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{usage(m.id)} order{usage(m.id) === 1 ? '' : 's'}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => { setEditId(m.id); setEditName(m.name); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setPendingDelete(m)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order statuses</CardTitle>
            <CardDescription>The fixed set of statuses available on every order.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((s) => <StatusBadge key={s} status={s} />)}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Orders using this machine will be left with no machine assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              Delete machine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrdersLayout>
  );
}
