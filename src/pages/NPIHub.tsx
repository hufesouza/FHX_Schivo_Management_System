import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTasks } from '@/hooks/useTasks';
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
  FileCheck,
  Calculator,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
  Bell,
  CalendarDays
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

const subModules = [
  {
    id: 'blue-review',
    title: 'Blue Review',
    description: 'Work order review forms for new product introduction process (WD-FRM-0017)',
    icon: FileCheck,
    href: '/npi/blue-review',
    color: 'bg-primary/10 text-primary border-primary/20',
    available: true,
  },
  {
    id: 'daily-meeting',
    title: 'Daily Meeting',
    description: 'Track daily status with RAG flags per customer and topic, generate meeting minutes',
    icon: CalendarDays,
    href: '/npi/daily-meeting',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    available: true,
  },
  {
    id: 'quotation',
    title: 'Quotation System',
    description: 'Manage quotes and pricing for new product requests',
    icon: Calculator,
    href: '/npi/quotation',
    color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    available: false,
  },
];

const NPIHub = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { getMyTasks } = useTasks();

  const isAdmin = role === 'admin';
  const myTasks = getMyTasks();

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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={fhxLogoFull} alt="FHX Engineering" className="h-10" />
            <div>
              <h1 className="font-heading font-semibold text-lg">NPI Engineering</h1>
              <p className="text-sm text-primary-foreground/80">New Product Introduction</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Tasks Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/tasks')}
              className="relative border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Tasks
              {myTasks.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-2 -right-2">
                  {myTasks.length}
                </Badge>
              )}
            </Button>

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
        {/* Tasks notification */}
        {myTasks.length > 0 && (
          <Card className="mb-8 border-primary/50 bg-primary/5 max-w-3xl mx-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">You have {myTasks.length} pending task{myTasks.length > 1 ? 's' : ''}</CardTitle>
                </div>
                <Button variant="link" onClick={() => navigate('/tasks')}>
                  View all
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-semibold mb-3">NPI Engineering Modules</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select a tool to manage new product introduction processes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {subModules.map((module, index) => (
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
