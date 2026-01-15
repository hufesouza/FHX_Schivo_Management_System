import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTasks } from '@/hooks/useTasks';
import { useQuotationReviewTasks } from '@/hooks/useQuotationReviewTasks';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Loader2, 
  User,
  Shield,
  KeyRound,
  Mail,
  Plus,
  Trash2,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Award,
  Clock,
  ListTodo
} from 'lucide-react';
import { z } from 'zod';

interface MeetingRecognition {
  id: string;
  reason: string;
  recognized_by_name: string;
  created_at: string;
  meeting?: {
    meeting_date: string;
  };
}

interface MeetingAction {
  id: string;
  action: string;
  priority: string;
  status: string;
  due_date: string | null;
  comments: string | null;
  meeting_id: string;
  meeting?: {
    meeting_date: string;
  };
}

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ActionPriority = 'low' | 'medium' | 'high' | 'critical';
type ActionStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

interface PersonalAction {
  id: string;
  action: string;
  owner_id: string | null;
  owner_name: string | null;
  priority: ActionPriority;
  due_date: string | null;
  status: ActionStatus;
  comments: string | null;
}

const MANAGER_EMAIL = 'hferreira@schivomedical.com';

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { getMyTasks, loading: tasksLoading, tasks: allTasks } = useTasks();
  const { tasks: quotationReviewTasks, loading: quotationTasksLoading } = useQuotationReviewTasks();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  // Meeting Actions state
  const [meetingActions, setMeetingActions] = useState<MeetingAction[]>([]);
  const [loadingMeetingActions, setLoadingMeetingActions] = useState(false);

  // Recognition state
  const [recognitions, setRecognitions] = useState<MeetingRecognition[]>([]);
  const [loadingRecognitions, setLoadingRecognitions] = useState(false);

  // Action Manager state
  const [actions, setActions] = useState<PersonalAction[]>([]);
  const [allUsers, setAllUsers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [showAddAction, setShowAddAction] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [newAction, setNewAction] = useState<Partial<PersonalAction>>({
    action: '',
    owner_id: null,
    owner_name: null,
    priority: 'medium',
    due_date: null,
    status: 'open',
    comments: null
  });

  const isManager = user?.email === MANAGER_EMAIL;
  const myTasks = getMyTasks();
  const totalPendingTasks = myTasks.length + quotationReviewTasks.length;

  // Load meeting actions and recognitions assigned to user
  useEffect(() => {
    if (user) {
      loadMeetingActions();
      loadRecognitions();
    }
  }, [user]);

  const loadRecognitions = async () => {
    if (!user) return;
    setLoadingRecognitions(true);
    
    const { data, error } = await supabase
      .from('meeting_recognitions')
      .select(`
        id, reason, recognized_by_name, created_at,
        meeting:daily_meetings(meeting_date)
      `)
      .eq('recognized_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      const transformed = data.map(r => ({
        ...r,
        meeting: r.meeting as { meeting_date: string } | undefined
      }));
      setRecognitions(transformed);
    }
    setLoadingRecognitions(false);
  };

  const loadMeetingActions = async () => {
    if (!user) return;
    setLoadingMeetingActions(true);
    
    const { data, error } = await supabase
      .from('meeting_actions')
      .select(`
        id, action, priority, status, due_date, comments, meeting_id,
        meeting:daily_meetings(meeting_date)
      `)
      .eq('owner_id', user.id)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true, nullsFirst: false });
    
    if (!error && data) {
      const transformed = data.map(a => ({
        ...a,
        meeting: a.meeting as { meeting_date: string } | undefined
      }));
      setMeetingActions(transformed);
    }
    setLoadingMeetingActions(false);
  };

  useEffect(() => {
    if (isManager && user) {
      loadActions();
      loadUsers();
    }
  }, [isManager, user]);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email');
    
    if (!error && data) {
      setAllUsers(data.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || '',
        email: p.email || ''
      })));
    }
  };

  const loadActions = async () => {
    if (!user) return;
    setLoadingActions(true);
    
    const { data, error } = await supabase
      .from('personal_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setActions(data as PersonalAction[]);
    }
    setLoadingActions(false);
  };

  const addAction = async () => {
    if (!newAction.action?.trim() || !user) return;
    
    const { data, error } = await supabase
      .from('personal_actions')
      .insert({
        user_id: user.id,
        action: newAction.action,
        owner_id: newAction.owner_id,
        owner_name: newAction.owner_name,
        priority: newAction.priority || 'medium',
        due_date: newAction.due_date,
        status: newAction.status || 'open',
        comments: newAction.comments
      })
      .select()
      .single();
    
    if (!error && data) {
      setActions(prev => [data as PersonalAction, ...prev]);
      setNewAction({
        action: '',
        owner_id: null,
        owner_name: null,
        priority: 'medium',
        due_date: null,
        status: 'open',
        comments: null
      });
      setShowAddAction(false);
      toast.success('Action added');
    } else {
      toast.error('Failed to add action');
    }
  };

  const updateAction = async (id: string, updates: Partial<PersonalAction>) => {
    const { error } = await supabase
      .from('personal_actions')
      .update(updates)
      .eq('id', id);
    
    if (!error) {
      setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }
  };

  const deleteAction = async (id: string) => {
    const { error } = await supabase
      .from('personal_actions')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setActions(prev => prev.filter(a => a.id !== id));
      toast.success('Action deleted');
    }
  };

  const handleChangePassword = async () => {
    setErrors({});
    
    const result = passwordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: { newPassword?: string; confirmPassword?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === 'newPassword') fieldErrors.newPassword = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Calculate KPIs
  const overdueActions = meetingActions.filter(a => a.due_date && new Date(a.due_date) < new Date()).length;

  return (
    <AppLayout title="My Dashboard" subtitle="Your tasks, actions, and recognition" showBackButton backTo="/">
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/tasks')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                  <p className="text-3xl font-bold text-blue-600">{totalPendingTasks}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => document.getElementById('actions-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Actions</p>
                  <p className="text-3xl font-bold text-amber-600">{meetingActions.length}</p>
                </div>
                <ListTodo className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => document.getElementById('actions-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{overdueActions}</p>
                </div>
                <Clock className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => document.getElementById('recognitions-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recognitions</p>
                  <p className="text-3xl font-bold text-green-600">{recognitions.length}</p>
                </div>
                <Award className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recognitions Section */}
        {recognitions.length > 0 && (
          <Card id="recognitions-section" className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg text-green-700">Recognition Received</CardTitle>
              </div>
              <CardDescription>Kudos from your team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recognitions.map(recognition => (
                  <div 
                    key={recognition.id} 
                    className="p-4 border border-green-500/20 rounded-lg bg-green-50/50 dark:bg-green-950/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-700">{recognition.reason}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>From: {recognition.recognized_by_name}</span>
                          {recognition.meeting?.meeting_date && (
                            <>
                              <span>•</span>
                              <span>{format(new Date(recognition.meeting.meeting_date), 'MMM d, yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Account Information</CardTitle>
            </div>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <div className="mt-1">
                  <Badge variant={role === 'admin' ? 'default' : 'outline'}>
                    {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                    {role?.replace('_', ' ') || 'No role assigned'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Change Password</CardTitle>
            </div>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={errors.newPassword ? 'border-destructive' : ''}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={updating || !newPassword || !confirmPassword}
              className="w-full sm:w-auto"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Work Order Tasks */}
        <Card id="tasks-section">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">My Work Order Tasks</CardTitle>
            </div>
            <CardDescription>Blue Review tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No pending work order tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/npi/blue-review/${task.work_order_id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">
                            {task.department.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="font-medium truncate">
                          {task.work_order?.work_order_number || 'Work Order'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {task.work_order?.customer} - {task.work_order?.part_and_rev}
                        </p>
                      </div>
                      <Badge className="shrink-0 bg-amber-500/20 text-amber-600 hover:bg-amber-500/30">
                        Pending Review
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meeting Actions */}
        <Card id="actions-section">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">My Daily Meeting Actions</CardTitle>
            </div>
            <CardDescription>Action items assigned to you from daily meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMeetingActions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : meetingActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No pending action items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetingActions.map(action => {
                  const isOverdue = action.due_date && new Date(action.due_date) < new Date();
                  return (
                    <div 
                      key={action.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        const meetingDate = action.meeting?.meeting_date || format(new Date(), 'yyyy-MM-dd');
                        navigate(`/npi/daily-meeting?date=${meetingDate}`);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={
                                action.priority === 'critical' ? 'border-red-500 text-red-500' :
                                action.priority === 'high' ? 'border-orange-500 text-orange-500' :
                                action.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                                'border-muted-foreground'
                              }
                            >
                              {action.priority}
                            </Badge>
                            {action.meeting?.meeting_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(action.meeting.meeting_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                          <p className="font-medium">{action.action}</p>
                          {action.comments && (
                            <p className="text-sm text-muted-foreground mt-1">{action.comments}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {action.due_date && (
                            <Badge 
                              variant={isOverdue ? 'destructive' : 'secondary'}
                              className="mb-1"
                            >
                              Due: {format(new Date(action.due_date), 'MMM d')}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className="block capitalize"
                          >
                            {action.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Manager - Only for specific user */}
        {isManager && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Action Manager</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAddAction(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Action
                </Button>
              </div>
              <CardDescription>Your personal action items</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm table-fixed">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium w-[40%]">Action</th>
                        <th className="text-left p-2 font-medium w-28">Owner</th>
                        <th className="text-center p-2 font-medium w-24">Priority</th>
                        <th className="text-center p-2 font-medium w-28">Due Date</th>
                        <th className="text-center p-2 font-medium w-24">Status</th>
                        <th className="text-left p-2 font-medium w-32">Comments</th>
                        <th className="text-center p-2 font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map(action => (
                        <tr key={action.id} className="border-b hover:bg-muted/30">
                          <td className="p-2">
                            <textarea
                              value={action.action}
                              onChange={(e) => updateAction(action.id, { action: e.target.value })}
                              className="w-full min-h-[60px] p-2 text-sm border border-input rounded-md bg-background resize-y"
                              rows={2}
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={action.owner_id || ''}
                              onValueChange={(value) => {
                                const owner = allUsers.find(u => u.user_id === value);
                                updateAction(action.id, { 
                                  owner_id: value || null, 
                                  owner_name: owner?.full_name || owner?.email || null 
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allUsers.map(u => (
                                  <SelectItem key={u.user_id} value={u.user_id}>
                                    {u.full_name || u.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-center">
                            <Select
                              value={action.priority}
                              onValueChange={(value: ActionPriority) => updateAction(action.id, { priority: value })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-center">
                            <Input
                              type="date"
                              value={action.due_date || ''}
                              onChange={(e) => updateAction(action.id, { due_date: e.target.value || null })}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Select
                              value={action.status}
                              onValueChange={(value: ActionStatus) => updateAction(action.id, { status: value })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              value={action.comments || ''}
                              onChange={(e) => updateAction(action.id, { comments: e.target.value || null })}
                              placeholder="Notes..."
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteAction(action.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Add new action row */}
                      {showAddAction && (
                        <tr className="border-b bg-primary/5">
                          <td className="p-2">
                            <textarea
                              value={newAction.action || ''}
                              onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))}
                              placeholder="Enter action..."
                              className="w-full min-h-[60px] p-2 text-sm border border-input rounded-md bg-background resize-y"
                              rows={2}
                              autoFocus
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={newAction.owner_id || ''}
                              onValueChange={(value) => {
                                const owner = allUsers.find(u => u.user_id === value);
                                setNewAction(prev => ({ 
                                  ...prev, 
                                  owner_id: value || null,
                                  owner_name: owner?.full_name || owner?.email || null
                                }));
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allUsers.map(u => (
                                  <SelectItem key={u.user_id} value={u.user_id}>
                                    {u.full_name || u.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-center">
                            <Select
                              value={newAction.priority || 'medium'}
                              onValueChange={(value: ActionPriority) => setNewAction(prev => ({ ...prev, priority: value }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-center">
                            <Input
                              type="date"
                              value={newAction.due_date || ''}
                              onChange={(e) => setNewAction(prev => ({ ...prev, due_date: e.target.value || null }))}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Select
                              value={newAction.status || 'open'}
                              onValueChange={(value: ActionStatus) => setNewAction(prev => ({ ...prev, status: value }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              value={newAction.comments || ''}
                              onChange={(e) => setNewAction(prev => ({ ...prev, comments: e.target.value || null }))}
                              placeholder="Notes..."
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-primary"
                                onClick={addAction}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setShowAddAction(false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {actions.length === 0 && !showAddAction && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No actions yet. Click "Add Action" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </AppLayout>
  );
}
