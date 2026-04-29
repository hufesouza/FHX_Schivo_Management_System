import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  LayoutDashboard, ListChecks, PlusCircle, CalendarRange, Gauge,
  Wrench, FileBarChart2, Settings as SettingsIcon, Cog, Package,
  LayoutGrid, List, ChevronRight,
} from 'lucide-react';

const groups = [
  {
    title: 'Quick actions',
    tiles: [
      { id: 'new-part', title: 'New Part / Job', desc: 'Guided form to set up a new NPI part with allocation', icon: PlusCircle, href: '/npi/capacity-planner/parts/new', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    ],
  },
  {
    title: 'Insights & KPIs',
    tiles: [
      { id: 'dashboard', title: 'Dashboard', desc: 'KPIs, bottlenecks, late jobs, capacity, sales by customer', icon: LayoutDashboard, href: '/npi/capacity-planner/dashboard', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      { id: 'capacity', title: 'Machine Capacity', desc: 'Per-machine load, available hours and bottlenecks', icon: Gauge, href: '/npi/capacity-planner/capacity', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      { id: 'reports', title: 'Reports', desc: 'Sales, capacity, late jobs, at-risk, project progress', icon: FileBarChart2, href: '/npi/capacity-planner/reports', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    ],
  },
  {
    title: 'Trackers',
    tiles: [
      { id: 'jobs', title: 'Job Tracker', desc: 'All parts/jobs, ship status, and reallocation recommendations', icon: ListChecks, href: '/npi/capacity-planner/jobs', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
      { id: 'material', title: 'Material Tracker', desc: 'Update per-part material status (Ordered starts the lead-time clock)', icon: Package, href: '/npi/capacity-planner/material', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      { id: 'tooling-status', title: 'Tooling Tracker', desc: 'Update per-part tooling status (Ordered starts the lead-time clock)', icon: Wrench, href: '/npi/capacity-planner/tooling-status', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
      { id: 'calendar', title: 'Machine Calendar', desc: 'Visual calendar of allocations and free gaps', icon: CalendarRange, href: '/npi/capacity-planner/calendar', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
    ],
  },
  {
    title: 'Catalogs (reusable libraries)',
    tiles: [
      { id: 'materials-catalog', title: 'Materials Catalog', desc: 'Reusable material library — set up once, pick from Material Tracker', icon: Package, href: '/npi/capacity-planner/materials-catalog', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      { id: 'tooling', title: 'Tooling Catalog', desc: 'Reusable tool library — set up once, link to many PNs from Tooling Tracker', icon: Wrench, href: '/npi/capacity-planner/tooling', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
    ],
  },
  {
    title: 'Configuration',
    tiles: [
      { id: 'machines', title: 'Machines', desc: 'Set up machines available for NPI (name, type, daily hours)', icon: Cog, href: '/npi/capacity-planner/settings?tab=machines', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
      { id: 'settings', title: 'Settings', desc: 'Customers, projects, calendar, suppliers, email recipients', icon: SettingsIcon, href: '/npi/capacity-planner/settings', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
    ],
  },
];

export default function NPICapacityPlannerHub() {
  const navigate = useNavigate();
  return (
    <AppLayout title="NPI Capacity Planner" subtitle="Job planning, machine allocation & capacity" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-heading font-semibold mb-2">NPI Capacity Planner</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Plan jobs, allocate the best machine, find the next available gap, and track tooling, material and subcon status.
          </p>
        </div>
        <div className="max-w-6xl mx-auto space-y-10">
          {groups.map(g => (
            <section key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">{g.title}</h3>
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
            </section>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
