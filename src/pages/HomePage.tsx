import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Loader2, 
  Cog,
  FileCheck,
  Factory,
  Gauge,
  ChevronRight
} from 'lucide-react';

const modules = [
  {
    id: 'npi',
    title: 'NPI Engineering',
    description: 'New Product Introduction management including Blue Reviews and Quotations',
    icon: FileCheck,
    href: '/npi',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    available: true,
  },
  {
    id: 'production',
    title: 'Production',
    description: 'Capacity planning, machine scheduling, and production resource management',
    icon: Gauge,
    href: '/production',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    available: true,
  },
  {
    id: 'change-control',
    title: 'Change Control',
    description: 'Manage Internal Change Notices (ICN) and Engineering Change Notices (ECN)',
    icon: Cog,
    href: '/change-control',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    available: false,
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing Engineering',
    description: 'Scrap Management, Projects, and manufacturing operations',
    icon: Factory,
    href: '/manufacturing',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    available: false,
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-semibold mb-3">Welcome to Schivo Management System</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select a module below to access the management tools for your department.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {modules.map((module, index) => (
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
                    Enter Module
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

export default HomePage;
