import { ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderTrackerNav } from './OrderTrackerNav';

export function OrdersLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <AppLayout title="Order Tracker" subtitle="Purchase order management" showBackButton backTo="/npi">
      <OrderTrackerNav />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </AppLayout>
  );
}
