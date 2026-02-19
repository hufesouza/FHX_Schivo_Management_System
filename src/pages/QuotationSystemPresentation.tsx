import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
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
  CircleDot
} from 'lucide-react';

interface Slide {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

const slides: Slide[] = [
  {
    title: 'Quotation System',
    subtitle: 'Digital Quotation Management for Schivo Medical',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-8">
        <div className="w-24 h-24 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <FileSpreadsheet className="h-12 w-12 text-teal-600" />
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl text-center leading-relaxed">
          A comprehensive digital quotation platform that replaces manual Excel-based costing 
          with structured routing sheets, BOM management, subcontractor tracking, and automated 
          cost calculations — all aligned with <strong>WD-FRM-0018</strong>.
        </p>
        <div className="flex gap-4 mt-4">
          {['Routing Sheets', 'BOM Management', 'Cost Calculations', 'Volume Pricing'].map(tag => (
            <span key={tag} className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'The Problem',
    subtitle: 'Why we needed a digital system',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center">
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-destructive">Before</h3>
          {[
            'Excel templates passed between engineers',
            'No version control or audit trail',
            'Manual cost calculations prone to errors',
            'Difficult to compare quotation revisions',
            'No centralised enquiry tracking',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-destructive mt-2 shrink-0" />
              <p className="text-muted-foreground text-lg">{item}</p>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-primary">After</h3>
          {[
            'Centralised web-based quotation system',
            'Full revision history and traceability',
            'Automated cost roll-ups and margin calculations',
            'Side-by-side quotation comparison',
            'Integrated enquiry and part management',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-1 shrink-0" />
              <p className="text-muted-foreground text-lg">{item}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'System Architecture',
    subtitle: 'How the modules connect',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
          {[
            { icon: FolderKanban, label: 'Enquiry Management', desc: 'Create & track customer enquiries with multiple parts' },
            { icon: Calculator, label: 'Part Quotation', desc: 'Routing sheets, BOM, subcon costs per part' },
            { icon: Layers, label: 'Volume Pricing', desc: 'Up to 5 volume tiers with margin calculations' },
            { icon: Search, label: 'Enquiry List', desc: 'Search, filter and manage all enquiries' },
            { icon: BarChart3, label: 'Comparison Tools', desc: 'Side-by-side quotation revision comparison' },
            { icon: Settings, label: 'System Settings', desc: 'Resource configs, material rates, markups' },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                <Icon className="h-6 w-6 text-teal-600" />
              </div>
              <h4 className="font-semibold">{label}</h4>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Quotation Workflow',
    subtitle: 'Step-by-step process',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-8">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {[
            { step: '1', label: 'Create Enquiry', desc: 'Add customer & part numbers' },
            { step: '2', label: 'Quote Parts', desc: 'Define routing, BOM & subcon' },
            { step: '3', label: 'Set Volumes', desc: 'Configure volume price breaks' },
            { step: '4', label: 'Review Costs', desc: 'Check margins & total pricing' },
            { step: '5', label: 'Submit', desc: 'Assign to enquiry & export' },
          ].map(({ step, label, desc }, i, arr) => (
            <div key={step} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2 w-36">
                <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{step}</span>
                </div>
                <h4 className="font-semibold text-sm">{label}</h4>
                <p className="text-xs text-muted-foreground text-center">{desc}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Part Quotation Detail',
    subtitle: 'What goes into each part quote',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center max-w-4xl mx-auto">
        <div className="space-y-5">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-teal-600" /> Routing Sheet
          </h3>
          <p className="text-muted-foreground">
            Define each manufacturing operation with resource assignment, setup time, run time, 
            and subcontractor processing. Operations are sequenced and costed automatically.
          </p>
          <h3 className="text-xl font-semibold flex items-center gap-2 pt-4">
            <CircleDot className="h-5 w-5 text-teal-600" /> Bill of Materials
          </h3>
          <p className="text-muted-foreground">
            List raw materials with vendor details, unit costs, quantities, and QA requirements. 
            Material markup is applied automatically.
          </p>
        </div>
        <div className="space-y-5">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-teal-600" /> Subcontractors
          </h3>
          <p className="text-muted-foreground">
            Track outsourced processes with vendor information, certification requirements, 
            and per-unit costs. Subcon markup is applied at the part level.
          </p>
          <h3 className="text-xl font-semibold flex items-center gap-2 pt-4">
            <CircleDot className="h-5 w-5 text-teal-600" /> Volume Pricing
          </h3>
          <p className="text-muted-foreground">
            Configure up to 5 volume tiers. The system calculates labour, material, subcon, 
            tooling, and carriage costs per tier, with margin-based unit pricing.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Enquiry Management',
    subtitle: 'Tracking the full lifecycle',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-8 max-w-3xl mx-auto">
        <div className="grid grid-cols-1 gap-4 w-full">
          {[
            { label: 'Create Enquiry', desc: 'Customer, enquiry number, and part list with drawing uploads' },
            { label: 'Assign Quoted Parts', desc: 'Link completed part quotations to the enquiry as snapshots' },
            { label: 'Review & Compare', desc: 'Side-by-side comparison of quotation revisions and cost breakdowns' },
            { label: 'Submit for Approval', desc: 'Route to reviewer with visibility of all cost details' },
            { label: 'Export PDF', desc: 'Generate professional quotation documents for the customer' },
          ].map(({ label, desc }, i) => (
            <div key={label} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">{i + 1}</span>
              </div>
              <div>
                <h4 className="font-semibold">{label}</h4>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Key Benefits',
    subtitle: 'What the system delivers',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center max-w-4xl mx-auto">
        {[
          { icon: ClipboardCheck, title: 'Compliance', desc: 'Aligned with WD-FRM-0018 and WD-PRO-0020 procedures' },
          { icon: Users, title: 'Collaboration', desc: 'Multiple engineers can quote parts for the same enquiry' },
          { icon: BarChart3, title: 'Visibility', desc: 'Real-time cost breakdowns, margin tracking, and dashboards' },
          { icon: Upload, title: 'Traceability', desc: 'Full audit trail of revisions, approvals, and cost changes' },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="p-8 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-muted-foreground">{desc}</p>
          </Card>
        ))}
      </div>
    ),
  },
  {
    title: 'Get Started',
    subtitle: 'Access the Quotation System from the NPI Hub',
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-8">
        <div className="w-20 h-20 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <FileSpreadsheet className="h-10 w-10 text-teal-600" />
        </div>
        <p className="text-xl text-muted-foreground max-w-xl text-center">
          Navigate to <strong>NPI Engineering → Quotation System</strong> to start creating 
          digital quotations for your customer enquiries.
        </p>
        <div className="flex gap-3 mt-4">
          <span className="px-4 py-2 rounded-lg bg-muted text-sm font-medium">NPI Hub</span>
          <ArrowRight className="h-5 w-5 text-muted-foreground self-center" />
          <span className="px-4 py-2 rounded-lg bg-teal-500/10 text-teal-600 text-sm font-medium border border-teal-500/20">Quotation System</span>
        </div>
      </div>
    ),
  },
];

const QuotationSystemPresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const goNext = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  const goPrev = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  const slide = slides[currentSlide];

  return (
    <AppLayout title="Quotation System Guide" subtitle="Presentation" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Slide */}
        <Card className="relative overflow-hidden min-h-[520px] flex flex-col">
          {/* Header */}
          <div className="p-8 pb-4 text-center border-b">
            <h1 className="text-3xl font-heading font-bold">{slide.title}</h1>
            {slide.subtitle && (
              <p className="text-muted-foreground mt-2 text-lg">{slide.subtitle}</p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            {slide.content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-6 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="gap-2"
            >
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

            <Button
              variant="outline"
              onClick={goNext}
              disabled={currentSlide === slides.length - 1}
              className="gap-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Slide counter */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Slide {currentSlide + 1} of {slides.length}
        </p>
      </main>
    </AppLayout>
  );
};

export default QuotationSystemPresentation;
