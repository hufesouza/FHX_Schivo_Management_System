import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Users, ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

interface AppLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export function AppLayout({ children, showFooter = true, title, subtitle, showBackButton = false, backTo = '/' }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { getMyTasks } = useTasks();
  const [notificationCount, setNotificationCount] = useState(0);
  
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    // Get pending tasks count
    const myTasks = getMyTasks();
    const tasksCount = myTasks.length;

    // Get open meeting actions count
    const { data: actionsData } = await supabase
      .from('meeting_actions')
      .select('id, due_date')
      .eq('owner_id', user.id)
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    const actionsCount = actionsData?.length || 0;

    // Count overdue actions
    const overdueCount = actionsData?.filter(a => 
      a.due_date && new Date(a.due_date) < new Date()
    ).length || 0;

    // Get recent recognitions count (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: recognitionsData } = await supabase
      .from('meeting_recognitions')
      .select('id')
      .eq('recognized_user_id', user.id)
      .gte('created_at', weekAgo.toISOString());

    const recognitionsCount = recognitionsData?.length || 0;

    // Total notifications (tasks + actions + recognitions, but don't double-count overdue in actions)
    setNotificationCount(tasksCount + actionsCount + recognitionsCount);
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header bar */}
      <header className="h-14 bg-primary flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button 
              onClick={() => navigate(backTo)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src={fhxLogoFull} alt="FHX Engineering" className="h-10" />
            {title ? (
              <div className="hidden sm:block">
                <h1 className="font-heading font-semibold text-lg text-primary-foreground leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-primary-foreground/70">{subtitle}</p>
                )}
              </div>
            ) : (
              <h1 className="font-heading font-semibold text-lg text-primary-foreground hidden sm:block">
                Schivo Management System
              </h1>
            )}
          </button>
        </div>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none relative">
                <Avatar className="h-8 w-8 border-2 border-primary-foreground/30 hover:border-primary-foreground/60 transition-colors cursor-pointer">
                  <AvatarImage src="" alt={user.email || ''} />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs font-medium">
                    {getInitials(user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold border-2 border-primary">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                My Profile
                {notificationCount > 0 && (
                  <span className="ml-auto text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    User Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/form-fields')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Form Fields
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
      
      {/* Footer */}
      {showFooter && (
        <footer className="border-t border-border bg-card/50 mt-auto">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-heading font-semibold text-primary">Schivo Medical</span>
                <span className="text-muted-foreground hidden sm:inline">We make possible happen.</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Developed by <a href="https://fhxengineering.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(217,91%,60%)] hover:underline font-medium">FHX Engineering</a></span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
