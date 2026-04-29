import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (customer: { id: string; customer_name: string; customer_code?: string | null }) => void;
};

export function QuickCustomerDialog({ open, onOpenChange, onCreated }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setCode(''); setName(''); };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Customer name required');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('npi_customers')
      .insert({ customer_name: name.trim(), customer_code: code.trim() || null, created_by: user?.id })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Customer created');
    onCreated(data as any);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Customer code</Label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. ACME" />
          </div>
          <div>
            <Label className="text-xs">Customer name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
