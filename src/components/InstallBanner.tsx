import { Download, X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

export function InstallBanner() {
  const { canInstall, isInstalled, isOnline, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isInstalled || !canInstall) {
    return (
      <div className={cn(
        "fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-smooth",
        isOnline 
          ? "bg-green-100 text-green-700" 
          : "bg-amber-100 text-amber-700"
      )}>
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-elegant p-4 flex items-center gap-4 animate-fade-in max-w-md">
      <div className="bg-primary/10 rounded-lg p-2">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">Install Inkwell</p>
        <p className="text-xs text-muted-foreground">Access your notes anytime, even offline</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={promptInstall}>
          Install
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8" 
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
