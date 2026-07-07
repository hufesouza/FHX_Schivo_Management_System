import { useNavigate } from 'react-router-dom';
import { Building2, LineChart } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SITES = [
  {
    id: 'waterford',
    title: 'Schivo Waterford',
    description: 'Upload and analyse NPI orders for the Waterford site.',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  {
    id: 'plainview',
    title: 'Schivo PlainView',
    description: 'Upload and analyse NPI orders for the PlainView site.',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
];

export default function NPIOrderSiteSelect() {
  const navigate = useNavigate();
  return (
    <AppLayout title="NPI Order Dashboard" subtitle="Select a site to open its dashboard" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {SITES.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-lg transition"
              onClick={() => navigate(`/npi/order-intelligence/${s.id}`)}
            >
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
    </AppLayout>
  );
}
