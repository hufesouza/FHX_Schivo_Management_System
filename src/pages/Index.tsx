import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrders } from '@/hooks/useWorkOrders';
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
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InstallBanner } from '@/components/InstallBanner';

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
  const { workOrders, loading, createWorkOrder, deleteWorkOrder } = useWorkOrders();

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-medium">Blue Work Order Review</h1>
              <p className="text-sm text-muted-foreground">WD-FRM-0017</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-medium">Work Orders</h2>
            <p className="text-muted-foreground">Manage and review work order forms</p>
          </div>
          <Button onClick={handleCreateWorkOrder}>
            <Plus className="h-4 w-4 mr-2" /> New Work Order
          </Button>
        </div>

        {workOrders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="bg-muted rounded-full p-4 w-fit mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No work orders yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first work order to get started
              </p>
              <Button onClick={handleCreateWorkOrder}>
                <Plus className="h-4 w-4 mr-2" /> Create Work Order
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
                        {wo.work_order_number || 'New Work Order'}
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
    </div>
  );
};

export default Index;
