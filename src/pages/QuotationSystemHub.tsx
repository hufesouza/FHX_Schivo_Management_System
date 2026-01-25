import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuotationEnquiries } from '@/hooks/useQuotationEnquiries';
import { useSystemQuotations } from '@/hooks/useQuotationSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { QuotationSystemDashboard } from '@/components/quotation-system/QuotationSystemDashboard';
import { 
  Loader2, 
  ChevronRight,
  PlusCircle,
  Settings,
  FileSpreadsheet,
  Calculator,
  ClipboardList,
  BarChart3,
  LayoutDashboard
} from 'lucide-react';

const features = [
  {
    id: 'new-quotation',
    title: 'New Quotation',
    description: 'Quote individual parts with full routing, materials, and cost breakdown',
    icon: PlusCircle,
    href: '/npi/quotation-system/new',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    available: true,
  },
  {
    id: 'quotation-list',
    title: 'Quoted Parts',
    description: 'View all quoted parts and their assignment status',
    icon: FileSpreadsheet,
    href: '/npi/quotation-system/list',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    available: true,
  },
  {
    id: 'enquiries',
    title: 'Enquiries',
    description: 'Create and manage enquiries by selecting quoted parts',
    icon: ClipboardList,
    href: '/npi/quotation-system/enquiries',
    color: 'bg-primary/10 text-primary border-primary/20',
    available: true,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure resource ratings, margins, and system defaults',
    icon: Settings,
    href: '/npi/quotation-system/settings',
    color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    available: true,
  },
];

const QuotationSystemHub = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loading: roleLoading } = useUserRole();
  const { enquiries, loading: enquiriesLoading } = useQuotationEnquiries();
  const { quotations, loading: quotationsLoading } = useSystemQuotations();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dataLoading = enquiriesLoading || quotationsLoading;

  return (
    <AppLayout title="Quotation System" subtitle="Digital Quotation & Routing Sheet Management" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-heading font-semibold mb-3">Quotation System</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Digitalize your quotation process with full routing sheets, BOM management, subcon tracking, and automated cost calculations.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <QuotationSystemDashboard enquiries={enquiries} quotations={quotations} />
            )}
          </TabsContent>

          <TabsContent value="features" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <Card 
                  key={feature.id}
                  className={`relative overflow-hidden transition-all duration-300 animate-fade-in ${
                    feature.available 
                      ? 'hover:shadow-elegant cursor-pointer hover:-translate-y-1' 
                      : 'opacity-60'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => feature.available && navigate(feature.href)}
                >
                  {!feature.available && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${feature.color} mb-3`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {feature.available && (
                      <Button variant="ghost" className="w-full justify-between group">
                        Open {feature.title}
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info Section */}
            <div className="mt-12 max-w-4xl mx-auto">
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">WD-FRM-0018</div>
                      <p className="text-sm text-muted-foreground">Standard Form Reference</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">Automated</div>
                      <p className="text-sm text-muted-foreground">Cost Calculations</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-violet-600">5 Volumes</div>
                      <p className="text-sm text-muted-foreground">Volume Pricing Support</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
};

export default QuotationSystemHub;
