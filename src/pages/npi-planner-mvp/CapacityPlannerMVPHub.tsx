import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ListChecks, PlusCircle, CalendarRange, Settings as SettingsIcon, Cog, Library, Briefcase,
  LayoutGrid, List, ChevronRight,
} from 'lucide-react';

const groups = [
  {
    title: 'Quick actions',
    tiles: [
      { id: 'jobs-mvp', title: 'Jobs', desc: 'Create production jobs from Part Library templates', icon: Briefcase, href: '/npi/capacity-planner-mvp/jobs-mvp', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      { id: 'part-library', title: 'Part Library', desc: 'Reusable part templates with routing operations', icon: Library, href: '/npi/capacity-planner-mvp/part-library', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    ],
  },
  {
    title: 'Trackers',
    tiles: [
      { id: 'jobs', title: 'Job Tracker', desc: 'All parts/jobs, ship status, and reallocation recommendations', icon: ListChecks, href: '/npi/capacity-planner-mvp/jobs', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
      { id: 'calendar', title: 'Machine Calendar', desc: 'Visual calendar of allocations and free gaps', icon: CalendarRange, href: '/npi/capacity-planner-mvp/calendar', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
    ],
  },
  {
    title: 'Configuration',
    tiles: [
      { id: 'resources', title: 'Resources', desc: 'Production resources (machines, stations) with hours and shifts', icon: Cog, href: '/npi/capacity-planner-mvp/resources', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
      { id: 'settings', title: 'Settings', desc: 'Customers, projects, calendar, suppliers, email recipients', icon: SettingsIcon, href: '/npi/capacity-planner-mvp/settings', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
    ],
  },
];

export default function CapacityPlannerMVPHub() {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>(() => (localStorage.getItem('npi-mvp-hub-view') as 'grid' | 'list') || 'grid');
  useEffect(() => { localStorage.setItem('npi-mvp-hub-view', view); }, [view]);

  return (
    <AppLayout title="MVP Simples Capacity Planner" subtitle="Versão simplificada do planner" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-heading font-semibold mb-2">MVP Simples Capacity Planner</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Versão enxuta: cadastro de peças, job tracker e calendário das máquinas.
          </p>
        </div>
        <div className="max-w-6xl mx-auto flex justify-end mb-4">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as 'grid' | 'list')} size="sm">
            <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="max-w-6xl mx-auto space-y-10">
          {groups.map(g => (
            <section key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">{g.title}</h3>
              {view === 'grid' ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {g.tiles.map(t => (
                    <Card key={t.id} className="cursor-pointer hover:shadow-elegant hover:-translate-y-1 transition-all"
                      onClick={() => navigate(t.href)}>
                      <CardHeader>
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center border ${t.color} mb-2`}>
                          <t.icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{t.title}</CardTitle>
                        <CardDescription className="text-xs">{t.desc}</CardDescription>
                      </CardHeader>
                      <CardContent />
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-card divide-y">
                  {g.tiles.map(t => (
                    <button key={t.id} onClick={() => navigate(t.href)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${t.color} shrink-0`}>
                        <t.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{t.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{t.desc}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
