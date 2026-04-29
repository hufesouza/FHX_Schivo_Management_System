import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Library, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickSupplierDialog, type Supplier } from './QuickSupplierDialog';

export type ToolLine = {
  catalog_tool_id?: string | null;
  tool_code?: string | null;
  tooling_description: string;
  supplier?: string | null;
  supplier_id?: string | null;
  qty: number;
  unit_cost: number;
  lead_time_days?: number | null;
  expected_delivery_date?: string | null;
  ordered_status?: string;
  save_to_catalog?: boolean;
};

type CatalogTool = {
  id: string;
  tool_code: string | null;
  description: string;
  supplier: string | null;
  supplier_id: string | null;
  default_unit_cost: number | null;
  default_lead_time_days: number | null;
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierTargetIdx, setSupplierTargetIdx] = useState<number | null>(null);

  const loadCatalog = useCallback(async () => {
    const { data } = await supabase
      .from('npi_tooling_catalog')
      .select('id, tool_code, tooling_description, supplier, supplier_id, default_unit_cost, default_lead_time_days')
      .order('tooling_description');
    setCatalog(((data as any) || []).map((t: any) => ({
      id: t.id,
      tool_code: t.tool_code,
      description: t.tooling_description,
      supplier: t.supplier,
      supplier_id: t.supplier_id,
      default_unit_cost: t.default_unit_cost,
      default_lead_time_days: t.default_lead_time_days,
    })));
  }, []);

  const loadSuppliers = useCallback(async () => {
    const { data } = await supabase
      .from('npi_suppliers')
      .select('*')
      .order('supplier_name');
    setSuppliers((data as any) || []);
  }, []);

  useEffect(() => { loadCatalog(); loadSuppliers(); }, [loadCatalog, loadSuppliers]);

  const update = (i: number, patch: Partial<ToolLine>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  const addBlank = () =>
    onChange([
      ...lines,
      { tooling_description: '', qty: 1, unit_cost: 0, lead_time_days: 0, ordered_status: 'Not Ordered' },
    ]);

  const pickFromCatalog = (i: number, tool: CatalogTool) => {
    update(i, {
      catalog_tool_id: tool.id,
      tool_code: tool.tool_code,
      tooling_description: tool.description,
      supplier: tool.supplier,
      supplier_id: tool.supplier_id,
      unit_cost: Number(tool.default_unit_cost) || 0,
      lead_time_days: tool.default_lead_time_days ?? 0,
    });
  };

  const pickSupplier = (i: number, s: Supplier) => {
    update(i, {
      supplier_id: s.id,
      supplier: s.supplier_name,
      lead_time_days: lines[i].lead_time_days || s.default_lead_time_days || 0,
    });
  };

  const totalLeadTime = lines.reduce((max, t) => Math.max(max, Number(t.lead_time_days) || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Tools list</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Total lead time: <strong>{totalLeadTime} days</strong> (max across tools)
          </span>
          <Button type="button" size="sm" variant="outline" onClick={addBlank}>
            <Plus className="h-4 w-4 mr-1" /> Add tool
          </Button>
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="text-xs text-muted-foreground border rounded-md p-3 text-center">
          No tools added. Click "Add tool" to start.
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <div className="grid grid-cols-[1fr_110px_70px_80px_80px_180px_90px_110px_40px] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground min-w-[1000px]">
            <div>Description</div>
            <div>Tool code</div>
            <div>Qty</div>
            <div>Unit €</div>
            <div>Total €</div>
            <div>Supplier</div>
            <div>Lead (d)</div>
            <div>Status</div>
            <div></div>
          </div>
          {lines.map((line, i) => {
            const total = (Number(line.qty) || 0) * (Number(line.unit_cost) || 0);
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_110px_70px_80px_80px_180px_90px_110px_40px] gap-2 px-3 py-2 border-t items-center min-w-[1000px]"
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
                <SupplierPicker
                  suppliers={suppliers}
                  value={line.supplier_id || null}
                  displayName={line.supplier || ''}
                  onPick={(s) => pickSupplier(i, s)}
                  onNew={() => { setSupplierTargetIdx(i); setSupplierDialogOpen(true); }}
                />
                <Input
                  type="number"
                  value={line.lead_time_days ?? 0}
                  onChange={(e) => update(i, { lead_time_days: +e.target.value })}
                  className="h-8"
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
        Tools and suppliers are saved automatically for reuse on the next part.
      </p>

      <QuickSupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(s) => {
          loadSuppliers();
          if (supplierTargetIdx !== null) pickSupplier(supplierTargetIdx, s);
        }}
      />
    </div>
  );
}

function CatalogPicker({ catalog, onPick }: { catalog: CatalogTool[]; onPick: (t: CatalogTool) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" title="Pick from catalog">
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
                  onSelect={() => { onPick(t); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4 opacity-0')} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {t.tool_code ? `${t.tool_code} · ` : ''}{t.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.supplier || '—'} · €{Number(t.unit_cost || 0).toFixed(2)} · {t.lead_time_days ?? 0}d
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

function SupplierPicker({
  suppliers,
  value,
  displayName,
  onPick,
  onNew,
}: {
  suppliers: Supplier[];
  value: string | null;
  displayName: string;
  onPick: (s: Supplier) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = suppliers.find((s) => s.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-8 justify-between font-normal text-xs px-2">
          <span className="truncate">{current?.supplier_name || displayName || 'Pick supplier'}</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command>
          <CommandInput placeholder="Search suppliers…" />
          <CommandList>
            <CommandEmpty>No suppliers</CommandEmpty>
            <CommandGroup>
              {suppliers.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.supplier_name} ${s.contact_name || ''} ${s.email || ''}`}
                  onSelect={() => { onPick(s); setOpen(false); }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{s.supplier_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.contact_name || '—'} · {s.email || '—'} · {s.default_lead_time_days ?? 0}d
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start h-8 text-xs"
                onClick={() => { setOpen(false); onNew(); }}
              >
                <Plus className="h-3 w-3 mr-1" /> New supplier
              </Button>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
