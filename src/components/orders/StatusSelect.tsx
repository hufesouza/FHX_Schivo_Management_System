import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ORDER_STATUSES, type OrderStatus } from '@/types/orderTracker';
import { cn } from '@/lib/utils';

export const statusClass = (status: OrderStatus) => {
  switch (status) {
    case 'New':
      return 'bg-sky-500/10 text-sky-600 border-sky-500/30';
    case 'Planning':
      return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30';
    case 'In Progress':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    case 'Waiting for Material':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'Waiting for Customer':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    case 'On Hold':
      return 'bg-muted text-muted-foreground border-border';
    case 'Completed':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    case 'Shipped':
      return 'bg-teal-500/10 text-teal-600 border-teal-500/30';
    case 'Cancelled':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        statusClass(status),
        className,
      )}
    >
      {status}
    </span>
  );
}

export function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: OrderStatus;
  onChange: (s: OrderStatus) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as OrderStatus)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
