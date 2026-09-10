export const ORDER_STATUSES = [
  'New',
  'Planning',
  'In Progress',
  'Waiting for Material',
  'Waiting for Customer',
  'On Hold',
  'Completed',
  'Shipped',
  'Cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CLOSED_STATUSES: OrderStatus[] = ['Completed', 'Shipped', 'Cancelled'];

export interface OtMachine {
  id: string;
  name: string;
}

export interface OtCustomer {
  id: string;
  name: string;
  customer_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OtPurchaseOrder {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  po_number: string | null;
  po_date: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  notes: string | null;
  currency: string | null;
  fx_rate_to_eur: number | null;
  created_at: string;
}

export interface OtOrder {
  id: string;
  purchase_order_id: string | null;
  customer_id: string | null;
  customer_name: string;
  po_number: string | null;
  po_date: string | null;
  line_number: number | null;
  part_number: string | null;
  part_revision: string | null;
  part_description: string | null;
  quantity: number | null;
  due_date: string | null;
  unit_price: number | null;
  total_price: number | null;
  notes: string | null;
  requirements: string | null;
  special_requirements: string | null;
  status: OrderStatus;
  machine_id: string | null;
  /** Date the line actually shipped — set when the status becomes Shipped. */
  shipped_date: string | null;

  /** Non-Recurring Engineering charge — not a manufactured part. */
  is_nre: boolean;
  /** Currency of the original purchase order document (ISO code). */
  currency: string | null;
  /** Unit price exactly as written on the PO, in the original currency. */
  original_unit_price: number | null;
  /** Total price exactly as written on the PO, in the original currency. */
  original_total_price: number | null;
  /** Multiplier used to convert the original currency into euro. */
  fx_rate_to_eur: number | null;
  created_at: string;
  updated_at: string;
}

export type DueBucketKey =
  | 'overdue' | 'd7' | 'd14' | 'd21' | 'd30' | 'd30plus' | 'none'
  | 'shipped' | 'shipped_late' | 'closed';


export interface DueBucket {
  key: DueBucketKey;
  label: string;
  /** lower number = more urgent */
  rank: number;
  /** hsl-based tailwind classes */
  className: string;
  dotClassName: string;
}

export const DUE_BUCKETS: Record<DueBucketKey, DueBucket> = {
  overdue: {
    key: 'overdue',
    label: 'OVERDUE',
    rank: 0,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    dotClassName: 'bg-destructive',
  },
  d7: {
    key: 'd7',
    label: '< 7 DAYS',
    rank: 1,
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    dotClassName: 'bg-orange-500',
  },
  d14: {
    key: 'd14',
    label: '< 14 DAYS',
    rank: 2,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    dotClassName: 'bg-amber-500',
  },
  d21: {
    key: 'd21',
    label: '< 21 DAYS',
    rank: 3,
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
    dotClassName: 'bg-yellow-500',
  },
  d30: {
    key: 'd30',
    label: '< 30 DAYS',
    rank: 4,
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
    dotClassName: 'bg-sky-500',
  },
  d30plus: {
    key: 'd30plus',
    label: '> 30 DAYS',
    rank: 5,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    dotClassName: 'bg-emerald-500',
  },
  none: {
    key: 'none',
    label: 'NO DUE DATE',
    rank: 6,
    className: 'bg-muted text-muted-foreground border-border',
    dotClassName: 'bg-muted-foreground',
  },
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Whole days from today until the due date. Negative = overdue. */
export const daysRemaining = (dueDate: string | null): number | null => {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T00:00:00`);
  if (isNaN(due.getTime())) return null;
  return Math.round((due.getTime() - startOfToday().getTime()) / 86400000);
};

export const dueBucket = (dueDate: string | null): DueBucket => {
  const days = daysRemaining(dueDate);
  if (days === null) return DUE_BUCKETS.none;
  if (days < 0) return DUE_BUCKETS.overdue;
  if (days <= 7) return DUE_BUCKETS.d7;
  if (days <= 14) return DUE_BUCKETS.d14;
  if (days <= 21) return DUE_BUCKETS.d21;
  if (days <= 30) return DUE_BUCKETS.d30;
  return DUE_BUCKETS.d30plus;
};

export const isOpen = (status: OrderStatus) => !CLOSED_STATUSES.includes(status);

export const fmtMoney = (v: number | null | undefined) =>
  v === null || v === undefined || isNaN(Number(v))
    ? '—'
    : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(v));

export const fmtDate = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(`${v}T00:00:00`);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtQty = (v: number | null | undefined) =>
  v === null || v === undefined || isNaN(Number(v)) ? '—' : new Intl.NumberFormat('en-IE').format(Number(v));
