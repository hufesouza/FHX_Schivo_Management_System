import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulerNav } from '@/components/scheduler/SchedulerNav';
import { useScheduler } from '@/hooks/useScheduler';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const summarise = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'object') return String(value);
  const obj = value as Record<string, unknown>;
  const keys = ['job_number', 'name', 'code', 'start_date', 'development_hours', 'setter_id', 'machine_id', 'status', 'days', 'holiday_date'];
  const parts = keys
    .filter((k) => obj[k] !== undefined && obj[k] !== null)
    .map((k) => `${k}: ${typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k])}`);
  return parts.length ? parts.join(' · ') : JSON.stringify(obj).slice(0, 160);
};

const actionVariant = (action: string) =>
  action === 'delete' ? 'destructive' : action === 'create' ? 'default' : 'secondary';

export default function SchedulerAudit() {
  const { audit, loading } = useScheduler();

  return (
    <AppLayout title="Change History" subtitle="Audit log of scheduling changes" showBackButton backTo="/scheduling">
      <SchedulerNav />
      <div className="p-4">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">When</th>
                  <th className="text-left py-2 px-3">User</th>
                  <th className="text-left py-2 px-3">Action</th>
                  <th className="text-left py-2 px-3">Entity</th>
                  <th className="text-left py-2 px-3">Previous value</th>
                  <th className="text-left py-2 px-3">New value</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 last:border-0 align-top">
                    <td className="py-2 px-3 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">{a.user_email ?? '—'}</td>
                    <td className="py-2 px-3">
                      <Badge variant={actionVariant(a.action) as 'default' | 'secondary' | 'destructive'}>{a.action}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      {a.entity}
                      {a.entity_label ? ` · ${a.entity_label}` : ''}
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-xs break-words">{summarise(a.previous_value)}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-xs break-words">{summarise(a.new_value)}</td>
                  </tr>
                ))}
                {!loading && audit.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No changes recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
