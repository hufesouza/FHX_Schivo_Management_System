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
  customerId: string | null;
  customerName: string | null;
  onCreated: (project: { id: string; project_name: string; customer_id: string | null }) => void;
};

export function QuickProjectDialog({ open, onOpenChange, customerId, customerName, onCreated }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); };

  const handleSave = async () => {
    if (!customerId) return toast.error('Select a customer first');
    if (!name.trim()) return toast.error('Project name required');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('npi_projects_planning')
      .insert({
        project_name: name.trim(),
        customer_id: customerId,
        customer_name: customerName,
        created_by: user?.id,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Project created');
    onCreated(data as any);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          {customerName && <p className="text-xs text-muted-foreground">For customer: {customerName}</p>}
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Project name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Project Alpha" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !customerId}>{saving ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
