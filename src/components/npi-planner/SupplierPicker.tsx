import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { QuickSupplierDialog, type Supplier } from './QuickSupplierDialog';

export function SupplierPicker({
  value,
  displayName,
  onPick,
  className,
  placeholder = 'Pick supplier',
}: {
  value: string | null;
  displayName?: string;
  onPick: (s: Supplier) => void;
  className?: string;
  placeholder?: string;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('npi_suppliers').select('*').order('supplier_name');
    setSuppliers((data as any) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = suppliers.find((s) => s.id === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={`h-10 w-full justify-between font-normal ${className || ''}`}>
            <span className="truncate text-sm">{current?.supplier_name || displayName || placeholder}</span>
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
                <Button type="button" variant="ghost" className="w-full justify-start h-8 text-xs"
                  onClick={() => { setOpen(false); setDialogOpen(true); }}>
                  <Plus className="h-3 w-3 mr-1" /> New supplier
                </Button>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <QuickSupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(s) => { load(); onPick(s); }}
      />
    </>
  );
}
