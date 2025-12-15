import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Loader2, 
  LogOut, 
  Settings, 
  Users, 
  Shield, 
  User,
  ChevronRight,
  ArrowLeft,
  PlusCircle,
  Cog,
  History,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

import { Calculator } from 'lucide-react';

const features = [
  {
    id: 'new-quote',
    title: 'New Quote',
    description: 'Create a new quotation by uploading a drawing and getting AI-powered cycle time estimates',
    icon: PlusCircle,
    href: '/npi/quotation/new',
    color: 'bg-primary/10 text-primary border-primary/20',
    available: true,
  },
  {
    id: 'estimator',
    title: 'PERT Estimator',
    description: 'Estimate material and post-processing costs using PERT statistical method with detailed breakdown',
    icon: Calculator,
    href: '/npi/quotation/estimator',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    available: true,
  },
  {
    id: 'machines',
    title: 'Machine Resources',
    description: 'View and manage CNC machines, parameters, and performance factors',
    icon: Cog,
    href: '/npi/quotation/machines',
    color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    available: true,
  },
  {
    id: 'history',
    title: 'Quote History',
    description: 'View and manage previous quotations',
    icon: History,
    href: '/npi/quotation/history',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    available: false,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure global defaults and preferences',
    icon: Settings,
    href: '/npi/quotation/settings',
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    available: false,
  },
];

const QuotationHub = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="CNC Smart Quoter" subtitle="IlluminAI Cycle Time Estimation" showBackButton backTo="/npi">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-semibold mb-3">Quotation System</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload machining drawings, get AI-powered technical interpretations, and estimate cycle times based on your machine capabilities.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
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
      </main>
    </AppLayout>
  );
};

export default QuotationHub;
