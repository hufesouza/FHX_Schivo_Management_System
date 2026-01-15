import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTasks } from '@/hooks/useTasks';
import { useQuotationReviewTasks, QuotationReviewTask } from '@/hooks/useQuotationReviewTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Loader2, 
  ArrowLeft,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDepartmentBadge(department: string) {
  const colors: Record<string, string> = {
    engineering: 'bg-blue-600',
    operations: 'bg-orange-600',
    quality: 'bg-green-600',
    npi: 'bg-purple-600',
    supply_chain: 'bg-cyan-600',
  };
  return (
    <Badge className={colors[department] || 'bg-gray-600'}>
      {department.replace('_', ' ')}
    </Badge>
  );
}

const Tasks = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { tasks, loading, getMyTasks, getAllPendingTasks } = useTasks();
  const { tasks: quotationReviewTasks, loading: quotationLoading } = useQuotationReviewTasks();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || loading || roleLoading || quotationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const myTasks = getMyTasks();
  const allPending = getAllPendingTasks();
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalMyTasks = myTasks.length + quotationReviewTasks.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-serif font-medium">Tasks</h1>
              <p className="text-sm text-muted-foreground">Manage your assigned reviews</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="my-tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-tasks" className="relative">
              My Tasks
              {totalMyTasks > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {totalMyTasks}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quotation-reviews" className="relative">
              Quotation Reviews
              {quotationReviewTasks.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {quotationReviewTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all-pending">All Pending ({allPending.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="my-tasks">
            {myTasks.length === 0 && quotationReviewTasks.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="bg-muted rounded-full p-4 w-fit mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No pending tasks</h3>
                  <p className="text-muted-foreground">
                    You're all caught up! New tasks will appear here when assigned to you.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Quotation Review Tasks */}
                {quotationReviewTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Quotation Reviews ({quotationReviewTasks.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {quotationReviewTasks.map((task, index) => (
                        <QuotationReviewCard key={task.id} task={task} index={index} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Work Order Review Tasks */}
                {myTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Work Order Reviews ({myTasks.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {myTasks.map((task, index) => (
                        <TaskCard key={task.id} task={task} index={index} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Quotation Reviews Tab */}
          <TabsContent value="quotation-reviews">
            {quotationReviewTasks.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="bg-muted rounded-full p-4 w-fit mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No quotation reviews</h3>
                  <p className="text-muted-foreground">
                    Quotation reviews assigned to you will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quotationReviewTasks.map((task, index) => (
                  <QuotationReviewCard key={task.id} task={task} index={index} navigate={navigate} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-pending">
            {allPending.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">No pending tasks</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allPending.map((task, index) => (
                  <TaskCard key={task.id} task={task} index={index} navigate={navigate} showAssignee />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedTasks.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">No completed tasks yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedTasks.slice(0, 20).map((task, index) => (
                  <TaskCard key={task.id} task={task} index={index} navigate={navigate} showAssignee />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Quotation Review Card Component
interface QuotationReviewCardProps {
  task: QuotationReviewTask;
  index: number;
  navigate: (path: string) => void;
}

function QuotationReviewCard({ task, index, navigate }: QuotationReviewCardProps) {
  return (
    <Card 
      className="hover:shadow-elegant transition-smooth cursor-pointer animate-fade-in border-l-4 border-l-green-500"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => navigate(`/npi/quotation-system/enquiry/${task.enquiry_id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              {task.enquiry?.enquiry_no || 'Quotation Review'}
            </CardTitle>
            <CardDescription className="mt-1">
              {task.enquiry?.customer_name || 'No customer'}
            </CardDescription>
          </div>
          <Badge className="bg-green-600">Review</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {task.enquiry?.total_quoted_value && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>€{task.enquiry.total_quoted_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {task.enquiry?.average_margin && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{task.enquiry.average_margin.toFixed(1)}% margin</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Assigned {formatDate(task.created_at)}
            </div>
          </div>
          {task.comments && (
            <p className="text-xs text-muted-foreground italic truncate">
              "{task.comments}"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskCardProps {
  task: ReturnType<typeof useTasks>['tasks'][0];
  index: number;
  navigate: (path: string) => void;
  showAssignee?: boolean;
}

function TaskCard({ task, index, navigate, showAssignee }: TaskCardProps) {
  return (
    <Card 
      className="hover:shadow-elegant transition-smooth cursor-pointer animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => navigate(`/work-order/${task.work_order_id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {task.work_order?.work_order_number || 'New Review'}
            </CardTitle>
            <CardDescription className="mt-1">
              {task.work_order?.customer || 'No customer'}
            </CardDescription>
          </div>
          {getDepartmentBadge(task.department)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {task.work_order?.part_and_rev && (
            <p className="text-muted-foreground truncate">
              Part: {task.work_order.part_and_rev}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {task.status === 'pending' ? (
                <Clock className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              )}
              {task.status === 'completed' && task.completed_at 
                ? `Completed ${formatDate(task.completed_at)}`
                : `Assigned ${formatDate(task.created_at)}`
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Tasks;
