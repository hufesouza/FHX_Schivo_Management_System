import { useState } from 'react';
import { Factory, Save, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUpdatePartSourcing } from '@/hooks/useAssemblyExplorer';
import type { AePart, AeSourcingType } from '@/types/assemblyExplorer';

export default function PartSourcingEditor({ part }: { part: AePart }) {
  const [type, setType] = useState<AeSourcingType>(part.sourcing_type ?? 'unknown');
  const [location, setLocation] = useState(part.manufacturing_location ?? '');
  const [supplier, setSupplier] = useState(part.supplier_name ?? '');
  const save = useUpdatePartSourcing();

  return (
    <section className="space-y-3 border-y py-4">
      <h4 className="text-sm font-semibold">Part sourcing</h4>
      <ToggleGroup type="single" value={type} onValueChange={(value) => {
        if (value) setType(value as AeSourcingType);
      }} className="justify-start flex-wrap">
        <ToggleGroupItem value="manufactured"><Factory className="mr-1.5 h-4 w-4" /> Manufactured</ToggleGroupItem>
        <ToggleGroupItem value="purchased"><ShoppingCart className="mr-1.5 h-4 w-4" /> Purchased</ToggleGroupItem>
        <ToggleGroupItem value="unknown">Not classified</ToggleGroupItem>
      </ToggleGroup>
      {type === 'manufactured' && <div className="space-y-1.5">
        <Label htmlFor="manufacturing-location">Manufacturing location</Label>
        <Input id="manufacturing-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site, workshop or manufacturing partner" />
      </div>}
      {type === 'purchased' && <div className="space-y-1.5">
        <Label htmlFor="part-supplier">Supplier</Label>
        <Input id="part-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" />
      </div>}
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ id: part.id, sourcing: {
        sourcing_type: type, manufacturing_location: location, supplier_name: supplier,
      } })}><Save className="mr-2 h-4 w-4" />{save.isPending ? 'Saving…' : 'Save sourcing'}</Button>
    </section>
  );
}