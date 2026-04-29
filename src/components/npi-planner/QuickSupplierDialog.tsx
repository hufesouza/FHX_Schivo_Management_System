import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export type Supplier = {
  id: string;
  supplier_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  default_lead_time_days: number | null;
  notes: string | null;
};

export function QuickSupplierDialog({
  open,
  onOpenChange,
  onCreated,
  initialName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (s: Supplier) => void;
  initialName?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier_name: initialName || '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    default_lead_time_days: '',
    notes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.supplier_name.trim()) return toast.error('Supplier name is required');
    setSaving(true);
    const { data, error } = await supabase
      .from('npi_suppliers')
      .insert({
        supplier_name: form.supplier_name.trim(),
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        default_lead_time_days: form.default_lead_time_days ? Number(form.default_lead_time_days) : null,
        notes: form.notes || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Supplier added');
    onCreated(data as any);
    onOpenChange(false);
    setForm({ supplier_name: '', contact_name: '', email: '', phone: '', address: '', default_lead_time_days: '', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New supplier</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="text-xs">Supplier name *</Label><Input value={form.supplier_name} onChange={(e) => set('supplier_name', e.target.value)} /></div>
          <div><Label className="text-xs">Contact name</Label><Input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></div>
          <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><Label className="text-xs">Default lead time (days)</Label><Input type="number" value={form.default_lead_time_days} onChange={(e) => set('default_lead_time_days', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Address</Label><Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save supplier'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
