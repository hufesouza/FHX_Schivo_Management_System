import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CalendarDays, Gauge, ListChecks, Cpu, Users, History, LayoutGrid, Factory, Code2 } from 'lucide-react';

const links = [
  { to: '/scheduling', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/scheduling/machines-calendar', label: 'Machine Calendars', icon: CalendarDays },
  { to: '/scheduling/programming', label: 'Programming Calendar', icon: Code2 },
  { to: '/scheduling/production', label: 'Production Calendar', icon: Factory },
  { to: '/scheduling/capacity', label: 'Capacity', icon: Gauge },
  { to: '/scheduling/jobs', label: 'Jobs', icon: ListChecks },
  { to: '/scheduling/machines', label: 'Machines', icon: Cpu },
  { to: '/scheduling/setters', label: 'Setters', icon: Users },
  { to: '/scheduling/audit', label: 'History', icon: History },
];


export function SchedulerNav() {
  return (
    <nav className="border-b border-border bg-card">
      <div className="px-4 flex items-center gap-1 overflow-x-auto">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
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
      </div>
    </nav>
  );
}
