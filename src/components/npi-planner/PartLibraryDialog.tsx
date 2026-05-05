import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export type CatalogPart = {
  id: string;
  part_number: string;
  part_revision: string | null;
  description: string | null;
  customer_id: string | null;
  customer_name: string | null;
  material: string | null;
  material_lead_time: number | null;
  material_supplier_id: string | null;
  material_supplier_name: string | null;
  tooling: string | null;
  tooling_lead_time: number | null;
  cycle_time: number | null;
  development_time: number | null;
  backend_time: number | null;
  subcon: boolean | null;
  subcon_supplier_id: string | null;
  supplier_name: string | null;
  type_of_service: string | null;
  subcon_lead_time: number | null;
  sales_price: number | null;
  notes: string | null;
  dev_allow_weekends: boolean | null;
  prod_allow_weekends: boolean | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (p: CatalogPart) => void;
  title?: string;
};

export function PartLibraryDialog({ open, onOpenChange, onPick, title = 'Load part from library' }: Props) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CatalogPart[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from('npi_parts_catalog').select('*').order('part_number').limit(500)
      .then(({ data }) => { setItems((data as any) || []); setLoading(false); });
  }, [open]);

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      i.part_number?.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.customer_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input placeholder="Search by part number, description or customer…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        <div className="max-h-[55vh] overflow-y-auto border rounded-md divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">No parts found in library.</p>
          ) : filtered.map(p => (
            <button
              key={p.id}
              className="w-full text-left p-3 hover:bg-muted/50 focus:bg-muted/50 outline-none"
              onClick={() => { onPick(p); onOpenChange(false); }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">
                    {p.part_number}{p.part_revision ? ` rev ${p.part_revision}` : ''}
                  </div>
                  {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {p.customer_name && <div>{p.customer_name}</div>}
                  {p.material && <div>{p.material}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
