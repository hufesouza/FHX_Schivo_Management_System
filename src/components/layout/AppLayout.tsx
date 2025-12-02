import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, showFooter = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gold accent bar */}
      <div className="h-1 bg-gradient-to-r from-accent via-accent/80 to-accent" />
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
      
      {/* Footer */}
      {showFooter && (
        <footer className="border-t border-border bg-card/50 mt-auto">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
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
