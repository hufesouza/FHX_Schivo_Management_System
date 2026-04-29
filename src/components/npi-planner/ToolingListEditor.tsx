import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Library, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToolLine = {
  catalog_tool_id?: string | null;
  tool_code?: string | null;
  tooling_description: string;
  supplier?: string | null;
  qty: number;
  unit_cost: number;
  expected_delivery_date?: string | null;
  ordered_status?: string;
  save_to_catalog?: boolean;
};

type CatalogTool = {
  id: string;
  tool_code: string | null;
  description: string;
  supplier: string | null;
  unit_cost: number | null;
};

const STATUSES = ['Not Ordered', 'Ordered', 'Received', 'Delayed', 'Issue'];

export function ToolingListEditor({
  lines,
  onChange,
}: {
  lines: ToolLine[];
  onChange: (lines: ToolLine[]) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogTool[]>([]);

  useEffect(() => {
    supabase
      .from('npi_tools_catalog')
      .select('id, tool_code, description, supplier, unit_cost')
      .order('description')
      .then(({ data }) => setCatalog((data as any) || []));
  }, []);

  const update = (i: number, patch: Partial<ToolLine>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  const addBlank = () =>
    onChange([
      ...lines,
      { tooling_description: '', qty: 1, unit_cost: 0, ordered_status: 'Not Ordered' },
    ]);

  const pickFromCatalog = (i: number, tool: CatalogTool) => {
    update(i, {
      catalog_tool_id: tool.id,
      tool_code: tool.tool_code,
      tooling_description: tool.description,
      supplier: tool.supplier,
      unit_cost: Number(tool.unit_cost) || 0,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Tools list</span>
        <Button type="button" size="sm" variant="outline" onClick={addBlank}>
          <Plus className="h-4 w-4 mr-1" /> Add tool
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="text-xs text-muted-foreground border rounded-md p-3 text-center">
          No tools added. Click "Add tool" to start.
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_90px_90px_90px_140px_120px_40px] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
            <div>Description</div>
            <div>Tool code</div>
            <div>Qty</div>
            <div>Unit €</div>
            <div>Total €</div>
            <div>Supplier</div>
            <div>Status</div>
            <div></div>
          </div>
          {lines.map((line, i) => {
            const total = (Number(line.qty) || 0) * (Number(line.unit_cost) || 0);
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_120px_90px_90px_90px_140px_120px_40px] gap-2 px-3 py-2 border-t items-center"
              >
                <div className="flex gap-1">
                  <Input
                    value={line.tooling_description}
                    onChange={(e) => update(i, { tooling_description: e.target.value, catalog_tool_id: null })}
                    placeholder="Tool description"
                    className="h-8"
                  />
                  <CatalogPicker catalog={catalog} onPick={(t) => pickFromCatalog(i, t)} />
                </div>
                <Input
                  value={line.tool_code || ''}
                  onChange={(e) => update(i, { tool_code: e.target.value })}
                  className="h-8"
                  placeholder="—"
                />
                <Input
                  type="number"
                  value={line.qty}
                  onChange={(e) => update(i, { qty: +e.target.value })}
                  className="h-8"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={line.unit_cost}
                  onChange={(e) => update(i, { unit_cost: +e.target.value })}
                  className="h-8"
                />
                <Input value={total.toFixed(2)} disabled className="h-8" />
                <Input
                  value={line.supplier || ''}
                  onChange={(e) => update(i, { supplier: e.target.value })}
                  className="h-8"
                  placeholder="Supplier"
                />
                <Select
                  value={line.ordered_status || 'Not Ordered'}
                  onValueChange={(v) => update(i, { ordered_status: v })}
                >
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)} className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        New tools are saved to the catalog automatically so you can reuse them on the next part.
      </p>
    </div>
  );
}

function CatalogPicker({
  catalog,
  onPick,
}: {
  catalog: CatalogTool[];
  onPick: (t: CatalogTool) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          title="Pick from catalog"
        >
          <Library className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command>
          <CommandInput placeholder="Search saved tools…" />
          <CommandList>
            <CommandEmpty>No matching tools</CommandEmpty>
            <CommandGroup>
              {catalog.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.tool_code || ''} ${t.description} ${t.supplier || ''}`}
                  onSelect={() => {
                    onPick(t);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4 opacity-0')} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {t.tool_code ? `${t.tool_code} · ` : ''}{t.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.supplier || '—'} · €{Number(t.unit_cost || 0).toFixed(2)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
