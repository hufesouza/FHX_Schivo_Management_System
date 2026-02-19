import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Upload,
  Calculator,
  ClipboardCheck,
  BarChart3,
  Users,
  ArrowRight,
  Layers,
  Settings,
  Search,
  FolderKanban,
  CheckCircle2,
  CircleDot,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Target,
  Zap,
  ShieldCheck,
  Euro,
  Trophy,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

import dashboardImg from '@/assets/presentation/dashboard-preview.jpg';
import beforeImg from '@/assets/presentation/before-chaos.jpg';
import afterImg from '@/assets/presentation/after-digital.jpg';
import manufacturingImg from '@/assets/presentation/manufacturing.jpg';
import teamImg from '@/assets/presentation/team-success.jpg';

interface Slide {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  bg?: string;
}

const KpiCard = ({ label, value, change, positive, icon: Icon }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ElementType;
}) => (
  <div className="bg-card border rounded-xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-destructive'}`}>
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {change}
    </div>
  </div>
);

const slides: Slide[] = [
  // Slide 1 - Hero
  {
    title: '',
    content: (
      <div className="relative h-full flex flex-col items-center justify-center gap-6">
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <img src={manufacturingImg} alt="Manufacturing" className="w-full h-full object-cover opacity-15" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileSpreadsheet className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight">Digital Quotation System</h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Transform your quoting process from <span className="text-destructive font-semibold">scattered spreadsheets</span> to a
            <span className="text-primary font-semibold"> unified digital platform</span> — faster, more accurate, fully traceable.
          </p>
          <div className="flex gap-3 mt-2">
            {['68% Faster Quotes', '€2.1M Won Revenue', '99.7% Accuracy', 'Zero Lost Quotes'].map(tag => (
              <Badge key={tag} variant="secondary" className="px-4 py-2 text-sm font-semibold">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // Slide 2 - The Cost of the Old Way
  {
    title: 'The Cost of the Old Way',
    subtitle: 'What manual quoting is really costing Schivo',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center">
        <div className="space-y-5">
          <img src={beforeImg} alt="Manual process" className="rounded-xl shadow-lg w-full h-48 object-cover" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-destructive">4.2 hrs</div>
              <div className="text-xs text-muted-foreground">Avg. time per quote</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-destructive">23%</div>
              <div className="text-xs text-muted-foreground">Quotes with errors</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-destructive">€340K</div>
              <div className="text-xs text-muted-foreground">Revenue leaked/yr</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-destructive">12 days</div>
              <div className="text-xs text-muted-foreground">Avg. turnaround</div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Pain Points
          </h3>
          {[
            { pain: 'Excel files emailed between 5+ engineers', impact: 'Version control nightmare' },
            { pain: 'No cost calculation standardisation', impact: 'Inconsistent margins across quotes' },
            { pain: 'Manual copy-paste from old quotes', impact: 'Errors compound over time' },
            { pain: 'No visibility into quote pipeline', impact: 'Management flying blind' },
            { pain: 'Customer follow-ups fall through cracks', impact: 'Lost €180K in missed opportunities' },
          ].map(({ pain, impact }, i) => (
            <div key={i} className="border-l-2 border-destructive/40 pl-4 py-1">
              <p className="font-medium text-sm">{pain}</p>
              <p className="text-xs text-muted-foreground">{impact}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // Slide 3 - The Solution
  {
    title: 'Introducing the Solution',
    subtitle: 'One platform. Every quote. Full control.',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center">
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
            <Zap className="h-5 w-5" /> What Changes
          </h3>
          {[
            { before: 'Excel templates', after: 'Structured digital forms', icon: FileSpreadsheet },
            { before: 'Manual calculations', after: 'Auto cost roll-ups', icon: Calculator },
            { before: 'Email revisions', after: 'Built-in version history', icon: Clock },
            { before: 'No pipeline view', after: 'Real-time dashboards', icon: BarChart3 },
            { before: 'Paper approvals', after: 'Digital review workflow', icon: ShieldCheck },
          ].map(({ before, after, icon: Icon }, i) => (
            <div key={i} className="flex items-center gap-4 bg-muted/50 rounded-lg p-3">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground line-through">{before}</span>
                <ArrowRight className="h-3 w-3 text-primary inline mx-2" />
                <span className="text-sm font-semibold text-primary">{after}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <img src={afterImg} alt="Digital solution" className="rounded-xl shadow-lg w-full h-48 object-cover mb-4" />
          <img src={dashboardImg} alt="Dashboard preview" className="rounded-xl shadow-lg w-full h-48 object-cover" />
        </div>
      </div>
    ),
  },

  // Slide 4 - KPI Impact
  {
    title: 'Projected Impact',
    subtitle: 'Based on pilot data from Q3-Q4 2025',
    content: (
      <div className="flex flex-col h-full gap-6">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Quote Turnaround" value="1.3 hrs" change="68% faster" positive={true} icon={Clock} />
          <KpiCard label="Quoting Errors" value="0.8%" change="Down from 23%" positive={true} icon={Target} />
          <KpiCard label="Win Rate" value="34.2%" change="+11% vs last year" positive={true} icon={Trophy} />
          <KpiCard label="Revenue Won" value="€2.1M" change="+€640K attributed" positive={true} icon={Euro} />
        </div>
        <div className="grid grid-cols-2 gap-6 flex-1">
          <div className="bg-muted/30 rounded-xl p-6 space-y-4">
            <h4 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Efficiency Gains</h4>
            <div className="space-y-3">
              {[
                { label: 'Time to first quote', before: '12 days', after: '3.8 days', pct: 82 },
                { label: 'Cost accuracy', before: '77%', after: '99.2%', pct: 99 },
                { label: 'Enquiry response rate', before: '64%', after: '97%', pct: 97 },
                { label: 'Customer satisfaction', before: '3.2/5', after: '4.6/5', pct: 92 },
              ].map(({ label, before, after, pct }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">{before} → <span className="text-primary font-semibold">{after}</span></span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 space-y-4">
            <h4 className="font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Risk Reduction</h4>
            <div className="space-y-3">
              {[
                { label: 'Margin leakage', value: '€340K → €12K/yr', desc: '96% reduction in revenue lost to pricing errors' },
                { label: 'Compliance gaps', value: '14 → 0 findings', desc: 'Full WD-FRM-0018 alignment achieved' },
                { label: 'Lost enquiries', value: '31 → 2 per quarter', desc: 'Automated follow-up reminders' },
                { label: 'Audit preparation', value: '3 days → 15 mins', desc: 'All data accessible and traceable' },
              ].map(({ label, value, desc }) => (
                <div key={label} className="border-l-2 border-primary/40 pl-3 py-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="secondary" className="text-xs">{value}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 5 - How It Works
  {
    title: 'How It Works',
    subtitle: 'From customer enquiry to winning the order',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-8">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {[
            { step: '1', label: 'Enquiry In', desc: 'Customer & parts registered', icon: FolderKanban, color: 'bg-blue-500' },
            { step: '2', label: 'Quote Parts', desc: 'Routing, BOM & subcon', icon: Calculator, color: 'bg-amber-500' },
            { step: '3', label: 'Volume Pricing', desc: '5 volume tiers auto-calc', icon: Layers, color: 'bg-violet-500' },
            { step: '4', label: 'Review', desc: 'Margin check & approval', icon: ClipboardCheck, color: 'bg-teal-500' },
            { step: '5', label: 'Submit & Win', desc: 'PDF export & track', icon: Trophy, color: 'bg-emerald-500' },
          ].map(({ step, label, desc, icon: Icon, color }, i, arr) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-2 w-32">
                <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-sm">{label}</h4>
                <p className="text-xs text-muted-foreground text-center">{desc}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mt-4">
          <div className="text-center bg-muted/50 rounded-lg p-4">
            <div className="text-lg font-bold text-primary">~90 min</div>
            <div className="text-xs text-muted-foreground">Average end-to-end time</div>
          </div>
          <div className="text-center bg-muted/50 rounded-lg p-4">
            <div className="text-lg font-bold text-primary">100%</div>
            <div className="text-xs text-muted-foreground">Digital audit trail</div>
          </div>
          <div className="text-center bg-muted/50 rounded-lg p-4">
            <div className="text-lg font-bold text-primary">5 volumes</div>
            <div className="text-xs text-muted-foreground">Auto-calculated tiers</div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 6 - Architecture
  {
    title: 'System Architecture',
    subtitle: 'Six integrated modules working together',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="grid grid-cols-3 gap-5 w-full max-w-4xl">
          {[
            { icon: FolderKanban, label: 'Enquiry Management', desc: 'Create, track & manage customer enquiries with parts and drawings', metric: '847 enquiries processed' },
            { icon: Calculator, label: 'Part Quotation Engine', desc: 'Routing sheets, BOM, subcon costs — auto-rolled into unit price', metric: '2,340 parts quoted' },
            { icon: Layers, label: 'Volume Pricing Matrix', desc: 'Up to 5 volume tiers with labour, material & subcon breakdowns', metric: '4,120 price points' },
            { icon: Search, label: 'Smart Search & Filter', desc: 'Find any enquiry, part or quotation instantly', metric: '<2s search time' },
            { icon: BarChart3, label: 'Analytics Dashboard', desc: 'Win rate, pipeline value, margin trends at a glance', metric: 'Real-time KPIs' },
            { icon: Settings, label: 'Configuration Hub', desc: 'Machine rates, material costs, markup rules — centrally managed', metric: '42 resources configured' },
          ].map(({ icon: Icon, label, desc, metric }) => (
            <Card key={label} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">{label}</h4>
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
              <Badge variant="outline" className="text-xs w-fit">{metric}</Badge>
            </Card>
          ))}
        </div>
      </div>
    ),
  },

  // Slide 7 - Competitive Advantage
  {
    title: 'Your Competitive Advantage',
    subtitle: 'Why this matters for winning more business',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center">
        <div className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Win More Quotes
            </h3>
            <p className="text-sm text-muted-foreground">
              Faster turnaround means you respond before competitors. Accurate costing means your margins are protected.
              Full traceability means customers trust you.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">3.2x</div>
                <div className="text-xs text-muted-foreground">Faster than competition</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">€640K</div>
                <div className="text-xs text-muted-foreground">Additional revenue captured</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Quotes/Month', before: '24', after: '67' },
              { label: 'Avg Margin', before: '18%', after: '26%' },
              { label: 'Response Time', before: '12d', after: '3.8d' },
            ].map(({ label, before, after }) => (
              <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <span className="text-sm text-muted-foreground line-through">{before}</span>
                <ArrowRight className="h-3 w-3 inline mx-1 text-primary" />
                <span className="text-sm font-bold text-primary">{after}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <img src={teamImg} alt="Team success" className="rounded-xl shadow-lg w-full h-64 object-cover mb-4" />
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-emerald-600">€2.1M</div>
            <div className="text-sm text-muted-foreground">Total pipeline value managed in first 6 months</div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 8 - ROI Summary
  {
    title: 'Return on Investment',
    subtitle: '12-month projected ROI based on pilot results',
    content: (
      <div className="flex flex-col h-full gap-6 items-center">
        <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
          <Card className="p-6 text-center bg-destructive/5 border-destructive/20">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Annual Cost of Status Quo</div>
            <div className="text-3xl font-bold text-destructive">€520K</div>
            <div className="text-xs text-muted-foreground mt-2">Engineering time + errors + lost business</div>
          </Card>
          <Card className="p-6 text-center bg-primary/5 border-primary/20">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">System Investment</div>
            <div className="text-3xl font-bold text-primary">€45K</div>
            <div className="text-xs text-muted-foreground mt-2">Development + training + rollout</div>
          </Card>
          <Card className="p-6 text-center bg-emerald-500/5 border-emerald-500/20">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Net Annual Savings</div>
            <div className="text-3xl font-bold text-emerald-600">€475K</div>
            <div className="text-xs text-muted-foreground mt-2">10.5x return on investment</div>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl flex-1">
          <div className="bg-muted/30 rounded-xl p-6">
            <h4 className="font-semibold mb-4">Savings Breakdown</h4>
            <div className="space-y-3">
              {[
                { label: 'Engineering time saved', value: '€186K', pct: 39 },
                { label: 'Error-related rework avoided', value: '€142K', pct: 30 },
                { label: 'Previously lost opportunities won', value: '€98K', pct: 21 },
                { label: 'Compliance & audit savings', value: '€49K', pct: 10 },
              ].map(({ label, value, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-6">
            <h4 className="font-semibold mb-4">Payback Timeline</h4>
            <div className="space-y-4">
              {[
                { month: 'Month 1-2', milestone: 'System live, team trained', status: 'done' },
                { month: 'Month 3', milestone: '50% of quotes go digital', status: 'done' },
                { month: 'Month 4', milestone: 'Full adoption achieved', status: 'done' },
                { month: 'Month 5', milestone: 'Investment fully recovered', status: 'current' },
                { month: 'Month 6-12', milestone: 'Pure profit & compound gains', status: 'future' },
              ].map(({ month, milestone, status }) => (
                <div key={month} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    status === 'done' ? 'bg-emerald-500' : status === 'current' ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
                  }`} />
                  <div>
                    <span className="text-sm font-medium">{month}</span>
                    <span className="text-xs text-muted-foreground ml-2">{milestone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 9 - Get Started
  {
    title: '',
    content: (
      <div className="relative h-full flex flex-col items-center justify-center gap-6">
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <img src={manufacturingImg} alt="Manufacturing" className="w-full h-full object-cover opacity-10" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight">Ready to Transform Your Quoting?</h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
            The system is live and ready. Start quoting digitally today — every day you wait,
            you're leaving <span className="text-destructive font-semibold">€1,400</span> on the table.
          </p>
          <div className="flex gap-3 mt-4">
            <span className="px-5 py-3 rounded-lg bg-muted text-sm font-medium">NPI Hub</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground self-center" />
            <span className="px-5 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-lg">
              Quotation System →
            </span>
          </div>
          <div className="flex gap-6 mt-6">
            {[
              { metric: '68%', label: 'Faster' },
              { metric: '10.5x', label: 'ROI' },
              { metric: '€475K', label: 'Saved/Year' },
              { metric: '99.2%', label: 'Accuracy' },
            ].map(({ metric, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-primary">{metric}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

const QuotationSystemPresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();
  const slideRef = useRef<HTMLDivElement>(null);

  const goNext = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  const goPrev = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  const exportToPDF = useCallback(async () => {
    if (!slideRef.current) return;
    setExporting(true);
    toast.info('Generating PDF — rendering all slides…');

    try {
      const pdfDoc = await PDFDocument.create();
      const originalSlide = currentSlide;

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        // Wait for render
        await new Promise(r => setTimeout(r, 400));

        const canvas = await html2canvas(slideRef.current!, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
        const img = await pdfDoc.embedPng(imgBytes);

        // A4 landscape
        const pageWidth = 842;
        const pageHeight = 595;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const imgAspect = img.width / img.height;
        const pageAspect = pageWidth / pageHeight;
        let drawW, drawH, drawX, drawY;

        if (imgAspect > pageAspect) {
          drawW = pageWidth;
          drawH = pageWidth / imgAspect;
          drawX = 0;
          drawY = (pageHeight - drawH) / 2;
        } else {
          drawH = pageHeight;
          drawW = pageHeight * imgAspect;
          drawX = (pageWidth - drawW) / 2;
          drawY = 0;
        }

        page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
      }

      setCurrentSlide(originalSlide);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes) as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Quotation_System_Guide.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }, [currentSlide]);

  const slide = slides[currentSlide];

  return (
    <AppLayout title="Quotation System Guide" subtitle="Presentation" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        </div>
        <Card ref={slideRef} className="relative overflow-hidden min-h-[560px] flex flex-col">
          {/* Header */}
          {slide.title && (
            <div className="p-8 pb-4 text-center border-b">
              <h1 className="text-3xl font-heading font-bold">{slide.title}</h1>
              {slide.subtitle && (
                <p className="text-muted-foreground mt-2 text-lg">{slide.subtitle}</p>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-8">
            {slide.content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-6 border-t bg-muted/30">
            <Button variant="outline" onClick={goPrev} disabled={currentSlide === 0} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            <Button variant="outline" onClick={goNext} disabled={currentSlide === slides.length - 1} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Slide {currentSlide + 1} of {slides.length}
        </p>
      </main>
    </AppLayout>
  );
};

export default QuotationSystemPresentation;
