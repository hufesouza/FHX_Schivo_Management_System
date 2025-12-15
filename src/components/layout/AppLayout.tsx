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
import { User, LogOut, Home } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, showFooter = true }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { getMyTasks } = useTasks();
  const [notificationCount, setNotificationCount] = useState(0);

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
      {/* Compact header bar */}
      <header className="h-10 bg-primary/95 backdrop-blur-sm flex items-center justify-between px-3 shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="text-primary-foreground/90 hover:text-primary-foreground transition-colors p-1"
        >
          <Home className="h-4 w-4" />
        </button>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none relative">
                <Avatar className="h-6 w-6 border border-primary-foreground/40 hover:border-primary-foreground/70 transition-colors cursor-pointer">
                  <AvatarImage src="" alt={user.email || ''} />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-[10px] font-medium">
                    {getInitials(user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer text-sm">
                <User className="mr-2 h-3.5 w-3.5" />
                My Profile
                {notificationCount > 0 && (
                  <span className="ml-auto text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-sm text-destructive">
                <LogOut className="mr-2 h-3.5 w-3.5" />
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
