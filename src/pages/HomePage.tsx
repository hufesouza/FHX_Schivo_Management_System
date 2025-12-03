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
  Cog,
  FileCheck,
  Factory,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

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
    <AppLayout>
      {/* Header */}
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={fhxLogoFull} alt="FHX Engineering" className="h-10" />
            <div>
              <h1 className="font-heading font-semibold text-lg">Schivo Management System</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {role && (
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="hidden sm:flex bg-accent text-accent-foreground">
                {isAdmin && <Shield className="h-3 w-3 mr-1" />}
                {role}
              </Badge>
            )}
            <span className="text-sm text-primary-foreground/90 hidden sm:block">
              {user?.email}
            </span>
            
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent">
                    <Settings className="h-4 w-4 mr-2" /> Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                    <Users className="h-4 w-4 mr-2" /> User Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/form-fields')}>
                    <Settings className="h-4 w-4 mr-2" /> Form Fields
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent">
                    <User className="h-4 w-4 mr-2" /> Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

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
