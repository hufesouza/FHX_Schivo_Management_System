import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, X } from 'lucide-react';
import { useMachines } from '@/hooks/useOrderTracker';

const NONE = '__none__';

interface Props {
  value: string | null;
  onChange: (machineId: string | null) => void;
  className?: string;
  placeholder?: string;
}

/** Machine picker with an inline "add machine" option — no separate page needed. */
export function MachineSelect({ value, onChange, className, placeholder = 'No machine' }: Props) {
  const { machines, create } = useMachines();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    const created = await create.mutateAsync(name.trim());
    onChange(created.id);
    setName('');
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={name}
          placeholder="Machine name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
            if (e.key === 'Escape') setAdding(false);
          }}
          className="h-9"
        />
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={add} disabled={create.isPending}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setAdding(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        if (v === '__add__') {
          setAdding(true);
          return;
        }
        onChange(v === NONE ? null : v);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {machines.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
        <SelectItem value="__add__">
          <span className="flex items-center gap-2 text-primary">
            <Plus className="h-3.5 w-3.5" /> Add machine
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
