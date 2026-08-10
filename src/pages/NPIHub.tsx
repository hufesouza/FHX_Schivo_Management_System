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
  ClipboardList,
  CalendarDays,
  FolderKanban,
  Gauge
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

import { BarChart3, LineChart } from 'lucide-react';

const subModules = [
  {
    id: 'resource-scheduling',
    title: 'Resource Scheduling',
    description: 'Shared NPI calendar with setter/machine capacity, overbooking prevention and live multi-user updates',
    icon: CalendarDays,
    href: '/scheduling',
    color: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    available: true,
  },
  {
    id: 'quotation-dashboard',
    title: 'Quotation Dashboard',
    description: 'Upload enquiry log Excel and view KPIs, charts, and analytics',
    icon: BarChart3,
    href: '/npi/quotation-dashboard',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    available: true,
  },
  {
    id: 'order-intelligence',
    title: 'NPI Order Dashboard',
    description: 'Upload NPI order Excel and get KPIs, NPVI, customer/commodity analysis and monthly trends',
    icon: LineChart,
    href: '/npi/order-intelligence',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    available: true,
  },
  {
    id: 'capacity-planner-mvp',
    title: 'MVP Simples Capacity Planner',
    description: 'Versão simplificada do planner: cadastro de peças, job tracker e calendário das máquinas',
    icon: Gauge,
    href: '/npi/capacity-planner-mvp',
    color: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    available: true,
  },
];


const NPIHub = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const isAdmin = role === 'admin';
  
  // Filter modules based on user access
  const visibleModules = subModules.filter(module => {
    // NPI Projects only available to hferreira@schivomedical.com
    if (module.id === 'npi-projects') {
      return user?.email === 'hferreira@schivomedical.com';
    }
    return true;
  });

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
    <AppLayout title="NPI Engineering" subtitle="New Product Introduction" showBackButton backTo="/">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-semibold mb-3">NPI Engineering Modules</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select a tool to manage new product introduction processes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {visibleModules.map((module, index) => (
            <Card 
              key={module.id}
              className={`relative overflow-hidden transition-all duration-300 animate-fade-in ${
                module.available 
                  ? 'hover:shadow-elegant cursor-pointer hover:-translate-y-1' 
                  : 'opacity-60'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => module.available && navigate(module.href)}
            >
              {!module.available && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              )}
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${module.color} mb-3`}>
                  <module.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{module.title}</CardTitle>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {module.available && (
                  <Button variant="ghost" className="w-full justify-between group">
                    Open {module.title}
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

export default NPIHub;
