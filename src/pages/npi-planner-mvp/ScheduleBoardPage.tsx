import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import ScheduleBoard from './ScheduleBoard';

export default function ScheduleBoardPage() {
  const navigate = useNavigate();
  return (
    <AppLayout
      title="Schedule Board"
      subtitle="Operational view of scheduled jobs & resources"
      showBackButton
      backTo="/npi/capacity-planner-mvp"
    >
      <main className="container mx-auto px-4 py-6">
        <ScheduleBoard
          onOpenInGantt={() => navigate('/npi/capacity-planner-mvp/gantt')}
        />
      </main>
    </AppLayout>
  );
}
