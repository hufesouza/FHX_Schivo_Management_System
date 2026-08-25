import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { NpiSite } from '@/lib/npiSites';
import { SiteDataset, availableYears, computeSiteStats, loadSiteDataset } from '@/utils/npiOrderReport';
import { exportMultiSiteReport } from '@/utils/npiMultiSitePdf';
import { buildInteractiveGroupData, exportInteractiveGroupReport } from '@/utils/npiInteractivePdf';
import { fetchRevenueTargets } from '@/lib/npiRevenueTargets';


const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sites: NpiSite[];
};

export function GroupReportDialog({ open, onOpenChange, sites }: Props) {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<SiteDataset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [year, setYear] = useState('all');
  const [npiOnly, setNpiOnly] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [projected, setProjected] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [loadError, setLoadError] = useState('');




  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    (async () => {
      const results = await Promise.allSettled(sites.map(s => loadSiteDataset(s.id)));
      if (!active) return;
      const loaded = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      setDatasets(loaded);
      setSelected(loaded.filter(d => d.rows.length > 0).map(d => d.site));
      if (results.some(result => result.status === 'rejected')) {
        setLoadError('Some sites could not be loaded. Available sites can still be reported.');
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [open, sites]);

  const years = useMemo(() => availableYears(datasets), [datasets]);

  const chosen = useMemo(
    () => datasets.filter(d => selected.includes(d.site) && d.rows.length > 0),
    [datasets, selected]
  );

  const stats = useMemo(
    () => chosen.map(d => computeSiteStats(d, sites.find(s => s.id === d.site)?.title || d.site, year, npiOnly)),
    [chosen, sites, year, npiOnly]
  );

  const total = stats.reduce((a, s) => a + s.revenue, 0);

  // months present in the selected data (used for "data ends on" in the interactive PDF)
  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    chosen.forEach(d => d.rows.forEach(r => {
      if (!r.date) return;
      if (year !== 'all' && String(r.date.getFullYear()) !== year) return;
      keys.add(`${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`);
    }));
    return Array.from(keys).sort().map(k => {
      const [y, m] = k.split('-').map(Number);
      return { key: k, label: new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
    });
  }, [chosen, year]);

  useEffect(() => {
    if (!monthOptions.length) { setEndMonth(''); return; }
    setEndMonth(prev => (monthOptions.some(m => m.key === prev) ? prev : monthOptions[monthOptions.length - 1].key));
  }, [monthOptions]);



  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));

  const handleGenerate = () => {
    if (!stats.length) {
      toast.error('Select at least one site with uploaded data');
      return;
    }
    setGenerating(true);
    try {
      exportMultiSiteReport(stats, year);
      toast.success(`Group report generated for ${stats.length} site(s)`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Could not generate the report: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const openConfig = () => {
    if (!chosen.length) {
      toast.error('Select at least one site with uploaded data');
      return;
    }
    setConfigOpen(true);
  };

  const parseRevenue = (value: string) => {
    const clean = value.replace(/[€\s]/g, '');
    const normalized = clean.includes(',') && clean.includes('.')
      ? (clean.lastIndexOf(',') > clean.lastIndexOf('.')
          ? clean.replace(/\./g, '').replace(',', '.')
          : clean.replace(/,/g, ''))
      : clean.includes(',')
        ? clean.replace(/,/g, '')
        : clean.split('.').length > 2
          ? clean.replace(/\./g, '')
          : clean;
    const amount = Number(normalized.replace(/[^\d.-]/g, ''));
    return Number.isFinite(amount) ? amount : 0;
  };

  const handleInteractive = async () => {
    const projectedRevenue = parseRevenue(projected);
    if (projectedRevenue <= 0) {
      toast.error('Enter the projected company revenue');
      return;
    }
    setInteractive(true);
    try {
      const targets = await Promise.all(chosen.map(d => fetchRevenueTargets(d.site)));
      const data = buildInteractiveGroupData(
        chosen.map((d, i) => {
          const t = targets[i] || {};
          const rev = year === 'all'
            ? (t.all || Object.entries(t).filter(([k]) => k !== 'all').reduce((s, [, v]) => s + (v || 0), 0))
            : (t[year] || 0);
          return {
            ds: d,
            label: sites.find(s => s.id === d.site)?.title || d.site,
            companyRevenue: rev || undefined,
          };
        }),
        year,
        npiOnly,
        {
          projectedRevenue,
          npviBenchmark: 0,
          endMonthLabel: monthOptions.find(m => m.key === endMonth)?.label,
        }
      );

      await exportInteractiveGroupReport(data);
      toast.success(`Interactive group PDF generated for ${chosen.length} site(s)`);
      setConfigOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Could not generate the interactive PDF: ' + e.message);
    } finally {
      setInteractive(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate group report</DialogTitle>
          <DialogDescription>
            Select the sites and the year you want to consolidate. The PDF contains a group summary,
            a site-by-site comparison and one detail page per site.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading site data…
          </div>
        ) : configOpen ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="projected-rev">Projected company revenue (full year)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  id="projected-rev"
                  inputMode="decimal"
                  autoFocus
                  placeholder="114000000"
                  value={projected}
                  onChange={e => setProjected(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !interactive) void handleInteractive(); }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Total projected company revenue — not NPI revenue.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Data ends on (month)</Label>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used on the KPI card “NPI revenue (to the end of …)”.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              Generating for {chosen.length} site(s) · {year === 'all' ? 'All years' : year} · {fmtEur(total)} NPI revenue
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {loadError && <p className="text-sm text-destructive">{loadError}</p>}
            <div className="space-y-2">
              <Label>Sites</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {datasets.map(d => {
                  const site = sites.find(s => s.id === d.site);
                  const empty = d.rows.length === 0;
                  return (
                    <label
                      key={d.site}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${empty ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50'}`}
                    >
                      <Checkbox
                        checked={selected.includes(d.site)}
                        disabled={empty}
                        onCheckedChange={() => toggle(d.site)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{site?.title || d.site}</div>
                        <div className="text-xs text-muted-foreground">
                          {empty ? 'No data uploaded yet' : `${d.rows.length.toLocaleString('en-IE')} rows`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NPI lines only</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={npiOnly} onCheckedChange={setNpiOnly} />
                  <span className="text-xs text-muted-foreground">
                    Applies only to files that have an NPI column
                  </span>
                </div>
              </div>
            </div>

            {stats.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Preview</span>
                  <Badge variant="secondary">{stats.length} site(s)</Badge>
                </div>
                <div className="space-y-1">
                  {stats.map(s => (
                    <div key={s.site} className="flex items-center justify-between text-xs">
                      <span className="truncate">{s.label}</span>
                      <span className="font-medium">{fmtEur(s.revenue)} · {s.lines.toLocaleString('en-IE')} lines</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-1 border-t font-semibold">
                    <span>Group total</span>
                    <span>{fmtEur(total)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}


        {configOpen ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)} disabled={interactive}>Back</Button>
            <Button onClick={handleInteractive} disabled={interactive || !projected.trim()}>
              {interactive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate report
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="sm:items-center">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={openConfig}
              disabled={loading || interactive || chosen.length === 0}
            >
              {interactive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Interactive PDF
            </Button>
            <Button onClick={handleGenerate} disabled={loading || generating || stats.length === 0}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Standard PDF
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
