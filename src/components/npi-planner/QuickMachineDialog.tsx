import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MACHINE_TYPES = ['Mill', 'Turn', 'Mill/Turn', 'Swiss Turn'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (machine: { id: string; machine_name: string }) => void;
  defaultName?: string;
}

export function QuickMachineDialog({ open, onOpenChange, onCreated, defaultName = '' }: Props) {
  const [name, setName] = useState(defaultName);
  const [type, setType] = useState('Mill');
  const [hours, setHours] = useState(24);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Machine name required');
    setSaving(true);
    const { data, error } = await supabase.from('npi_machines').insert({
      machine_name: name.trim(),
      machine_type: type,
      daily_available_hours: hours,
      status: 'Available',
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Machine added');
    onCreated({ id: data.id, machine_name: data.machine_name });
    setName(''); setType('Mill'); setHours(24);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add NPI machine</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Daily available hours</Label><Input type="number" value={hours} onChange={e => setHours(+e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}