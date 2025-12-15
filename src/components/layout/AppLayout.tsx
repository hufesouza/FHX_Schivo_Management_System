import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gold accent bar with profile avatar */}
      <div className="h-12 bg-gradient-to-r from-primary via-primary/90 to-primary flex items-center justify-between px-4">
        <button 
          onClick={() => navigate('/')}
          className="text-primary-foreground hover:text-primary-foreground/80 transition-colors"
        >
          <Home className="h-5 w-5" />
        </button>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-8 w-8 border-2 border-primary-foreground/30 hover:border-primary-foreground/60 transition-colors cursor-pointer">
                  <AvatarImage src="" alt={user.email || ''} />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs font-medium">
                    {getInitials(user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
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
