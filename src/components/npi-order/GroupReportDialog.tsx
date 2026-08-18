import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { NpiSite } from '@/lib/npiSites';
import { SiteDataset, availableYears, computeSiteStats, loadSiteDataset } from '@/utils/npiOrderReport';
import { exportMultiSiteReport } from '@/utils/npiMultiSitePdf';
import { buildInteractiveGroupData, exportInteractiveGroupReport } from '@/utils/npiInteractivePdf';


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



  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    (async () => {
      const loaded = await Promise.all(sites.map(s => loadSiteDataset(s.id)));
      if (!active) return;
      setDatasets(loaded);
      setSelected(loaded.filter(d => d.rows.length > 0).map(d => d.site));
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

  const handleInteractive = async () => {
    if (!chosen.length) {
      toast.error('Select at least one site with uploaded data');
      return;
    }
    setInteractive(true);
    try {
      const data = buildInteractiveGroupData(
        chosen.map(d => ({ ds: d, label: sites.find(s => s.id === d.site)?.title || d.site })),
        year,
        npiOnly
      );
      await exportInteractiveGroupReport(data);
      toast.success(`Interactive group PDF generated for ${chosen.length} site(s) — open it in Adobe Acrobat Reader`);
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
        ) : (
          <div className="space-y-5">
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

            <div className="rounded-lg border border-dashed p-3 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" /> Interactive report (test)
                </div>
                <p className="text-xs text-muted-foreground">
                  One self-contained PDF with clickable month and customer controls (AcroForm + Acrobat
                  JavaScript). Open it in Adobe Acrobat Reader — browser viewers ignore PDF form logic.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label>Site for the interactive PDF</Label>
                  <Select value={interactiveSite} onValueChange={setInteractiveSite}>
                    <SelectTrigger><SelectValue placeholder="Select a site" /></SelectTrigger>
                    <SelectContent>
                      {datasets.filter(d => d.rows.length > 0).map(d => (
                        <SelectItem key={d.site} value={d.site}>
                          {sites.find(s => s.id === d.site)?.title || d.site}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="secondary" onClick={handleInteractive} disabled={interactive || !interactiveSite}>
                  {interactive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Generate Interactive Group Report
                </Button>
              </div>
            </div>
          </div>
        )}


        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={loading || generating || stats.length === 0}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
