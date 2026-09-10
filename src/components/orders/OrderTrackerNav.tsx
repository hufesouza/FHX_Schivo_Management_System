import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Upload, Building2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/orders', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders/list', label: 'Orders', icon: ClipboardList, end: false },
  { to: '/orders/upload', label: 'Upload PO', icon: Upload, end: false },
  { to: '/orders/customers', label: 'Customers', icon: Building2, end: false },
  { to: '/orders/settings', label: 'Settings', icon: Settings, end: false },
];

export function OrderTrackerNav() {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
