import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileBarChart, LineChart, Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { addCustomSite, getAllSites, removeCustomSite } from '@/lib/npiSites';
import { GroupReportDialog } from '@/components/npi-order/GroupReportDialog';

export default function NPIOrderSiteSelect() {
  const navigate = useNavigate();
  const [sites, setSites] = useState(() => getAllSites());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const handleAdd = () => {
    const created = addCustomSite(name);
    if (!created) {
      toast({ title: 'Could not add site', description: 'Enter a unique site name.', variant: 'destructive' });
      return;
    }
    setSites(getAllSites());
    setName('');
    setOpen(false);
    toast({ title: 'Site added', description: `${created.title} is ready to receive uploads.` });
  };

  const handleRemove = (id: string) => {
    removeCustomSite(id);
    setSites(getAllSites());
  };

  return (
    <AppLayout title="NPI Order Dashboard" subtitle="Select a site to open its dashboard" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto mb-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReportOpen(true)}>
            <FileBarChart className="h-4 w-4 mr-2" />
            Generate group report
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add site
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {sites.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-lg transition relative"
              onClick={() => navigate(`/npi/order-intelligence/${s.id}`)}
            >
              {s.custom && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); handleRemove(s.id); }}
                  aria-label={`Remove ${s.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <CardHeader>
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-lg border ${s.color} mb-3`}>
                  <Building2 className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  {s.title}
                </CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-primary font-medium">Open dashboard →</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <GroupReportDialog open={reportOpen} onOpenChange={setReportOpen} sites={sites} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add site</DialogTitle>
            <DialogDescription>
              Creates a new dashboard card with the same upload, compare and PDF export features. All sites report in euro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="site-name">Site name</Label>
            <Input
              id="site-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Schivo Galway"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!name.trim()}>Add site</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
