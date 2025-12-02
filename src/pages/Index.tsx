import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Loader2, 
  LogOut, 
  Calendar,
  MoreHorizontal,
  Trash2,
  Eye,
  Users,
  Settings,
  Shield,
  ClipboardList,
  Bell,
  BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InstallBanner } from '@/components/InstallBanner';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ReviewsByStatusChart } from '@/components/dashboard/ReviewsByStatusChart';
import { AgingChart } from '@/components/dashboard/AgingChart';
import { ReviewsByUserChart } from '@/components/dashboard/ReviewsByUserChart';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'in_review':
      return <Badge variant="outline" className="border-primary text-primary">In Review</Badge>;
    case 'completed':
      return <Badge className="bg-green-600">Completed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { workOrders, loading, createWorkOrder, deleteWorkOrder } = useWorkOrders();
  const { getMyTasks, tasks, loading: tasksLoading } = useTasks();

  const isAdmin = role === 'admin';
  const myTasks = getMyTasks();

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    
    const draftCount = workOrders.filter(wo => wo.status === 'draft').length;
    const inReviewCount = workOrders.filter(wo => wo.status === 'in_review').length;
    const completedCount = workOrders.filter(wo => wo.status === 'completed').length;
    const openCount = draftCount + inReviewCount;

    // Calculate days open for each work order
    const openWorkOrders = workOrders.filter(wo => wo.status !== 'completed');
    const agingData = openWorkOrders.map(wo => {
      const createdAt = new Date(wo.created_at);
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: wo.work_order_number || 'New',
        days: daysOpen,
        workOrderNumber: wo.work_order_number || 'New Review'
      };
    });

    const oldestOpenDays = agingData.length > 0 
      ? Math.max(...agingData.map(d => d.days)) 
      : 0;

    // Calculate average turnaround for completed reviews
    const completedOrders = workOrders.filter(wo => wo.status === 'completed');
    let avgTurnaround = 0;
    if (completedOrders.length > 0) {
      const totalDays = completedOrders.reduce((acc, wo) => {
        const created = new Date(wo.created_at);
        const updated = new Date(wo.updated_at);
        return acc + Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgTurnaround = totalDays / completedOrders.length;
    }

    // Group tasks by assigned user
    const tasksByUser = tasks.reduce((acc, task) => {
      const userId = task.assigned_to;
      if (!acc[userId]) {
        acc[userId] = { open: 0, completed: 0 };
      }
      if (task.status === 'completed') {
        acc[userId].completed++;
      } else {
        acc[userId].open++;
      }
      return acc;
    }, {} as Record<string, { open: number; completed: number }>);

    // Get user names from work orders (simplified - using email prefix)
    const userReviewData = Object.entries(tasksByUser).map(([userId, counts]) => {
      // Find a task with profile info or use ID
      const userTask = tasks.find(t => t.assigned_to === userId);
      const name = userId.substring(0, 8) + '...'; // Fallback to truncated ID
      return {
        name,
        open: counts.open,
        completed: counts.completed
      };
    });

    return {
      openCount,
      completedCount,
      inReviewCount,
      draftCount,
      avgTurnaround,
      oldestOpenDays,
      agingData,
      userReviewData
    };
  }, [workOrders, tasks]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleCreateWorkOrder = async () => {
    const newOrder = await createWorkOrder();
    if (newOrder) {
      navigate(`/work-order/${newOrder.id}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/10 rounded-lg p-2">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-semibold text-primary-foreground">Schivo</h1>
              <p className="text-sm text-primary-foreground/80">Blue Review | WD-FRM-0017</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Tasks Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/tasks')}
              className="relative border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Tasks
              {myTasks.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-2 -right-2">
                  {myTasks.length}
                </Badge>
              )}
            </Button>

            {role && (
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="hidden sm:flex bg-accent text-accent-foreground">
                {isAdmin && <Shield className="h-3 w-3 mr-1" />}
                {role}
              </Badge>
            )}
            <span className="text-sm text-primary-foreground/90 hidden sm:block">
              {user?.email}
            </span>
            
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent">
                    <Settings className="h-4 w-4 mr-2" /> Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                    <Users className="h-4 w-4 mr-2" /> User Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/form-fields')}>
                    <Settings className="h-4 w-4 mr-2" /> Form Fields
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* My Tasks Summary */}
        {myTasks.length > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">You have {myTasks.length} pending task{myTasks.length > 1 ? 's' : ''}</CardTitle>
                </div>
                <Button variant="link" onClick={() => navigate('/tasks')}>
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {myTasks.slice(0, 3).map(task => (
                  <Button 
                    key={task.id} 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/work-order/${task.work_order_id}`)}
                  >
                    {task.work_order?.work_order_number || 'New Review'} - {task.department.replace('_', ' ')}
                  </Button>
                ))}
                {myTasks.length > 3 && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                    +{myTasks.length - 3} more
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Analytics */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-heading font-semibold">Dashboard</h2>
          </div>
          
          <DashboardStats 
            openCount={dashboardMetrics.openCount}
            completedCount={dashboardMetrics.completedCount}
            avgTurnaround={dashboardMetrics.avgTurnaround}
            oldestOpenDays={dashboardMetrics.oldestOpenDays}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ReviewsByStatusChart 
              openCount={dashboardMetrics.draftCount}
              completedCount={dashboardMetrics.completedCount}
              inReviewCount={dashboardMetrics.inReviewCount}
            />
            <AgingChart data={dashboardMetrics.agingData} />
            <ReviewsByUserChart data={dashboardMetrics.userReviewData} />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-medium">Blue Reviews</h2>
            <p className="text-muted-foreground">Manage and review Blue Review forms</p>
          </div>
          <Button onClick={handleCreateWorkOrder}>
            <Plus className="h-4 w-4 mr-2" /> New Blue Review
          </Button>
        </div>

        {workOrders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="bg-muted rounded-full p-4 w-fit mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Blue Reviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Blue Review to get started
              </p>
              <Button onClick={handleCreateWorkOrder}>
                <Plus className="h-4 w-4 mr-2" /> Create Blue Review
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workOrders.map((wo, index) => (
              <Card 
                key={wo.id} 
                className="hover:shadow-elegant transition-smooth cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/work-order/${wo.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-medium">
                        {wo.work_order_number || 'New Blue Review'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {wo.customer || 'No customer assigned'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/work-order/${wo.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkOrder(wo.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(wo.status)}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(wo.updated_at)}
                    </div>
                  </div>
                  {wo.part_and_rev && (
                    <p className="text-sm text-muted-foreground mt-2 truncate">
                      Part: {wo.part_and_rev}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <InstallBanner />
    </AppLayout>
  );
};

export default Index;
