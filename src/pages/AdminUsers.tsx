import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Loader2, 
  UserPlus, 
  ArrowLeft, 
  Mail, 
  Clock, 
  CheckCircle,
  XCircle,
  Users,
  Shield
} from 'lucide-react';

type AppRole = 'admin' | 'engineering' | 'operations' | 'quality' | 'npi' | 'supply_chain';

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface UserWithRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'quality', label: 'Quality' },
  { value: 'npi', label: 'NPI' },
  { value: 'supply_chain', label: 'Supply Chain' },
];

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userRoles, setUserRoles] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('engineering');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    // Only redirect if role loading is complete AND user has a role that's NOT admin
    // If userRole is null, it means no role was found - this user shouldn't have access
    if (!roleLoading && userRole !== null && userRole !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/');
    }
    // If no role found after loading, also deny access
    if (!roleLoading && !authLoading && isAuthenticated && userRole === null) {
      toast.error('Access denied. No role assigned.');
      navigate('/');
    }
  }, [userRole, roleLoading, authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchData();
    }
  }, [userRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invitations
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;
      setInvitations(inviteData as Invitation[]);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(rolesData as UserWithRole[]);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteRole) {
      toast.error('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { email: inviteEmail, role: inviteRole },
      });

      if (error) throw error;

      toast.success('Invitation sent successfully!');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('engineering');
      fetchData();
    } catch (err: any) {
      console.error('Error sending invite:', err);
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  const pendingInvitations = invitations.filter(i => !i.accepted_at && !isExpired(i.expires_at));
  const acceptedInvitations = invitations.filter(i => i.accepted_at);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-serif font-medium">User Management</h1>
            <p className="text-sm text-muted-foreground">Invite and manage users</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Invite Button */}
        <div className="flex justify-end">
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" /> Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an email invitation to add a new team member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvite} disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Pending Invitations</CardTitle>
            </div>
            <CardDescription>
              {pendingInvitations.length} invitation(s) waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvitations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending invitations
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.role}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(inv.created_at)}</TableCell>
                      <TableCell>{formatDate(inv.expires_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Active Users</CardTitle>
            </div>
            <CardDescription>
              {userRoles.length} user(s) with assigned roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((ur) => (
                    <TableRow key={ur.id}>
                      <TableCell className="font-mono text-xs">{ur.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant={ur.role === 'admin' ? 'default' : 'outline'}>
                          {ur.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                          {ur.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(ur.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Accepted Invitations */}
        {acceptedInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Accepted Invitations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Accepted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptedInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.role}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(inv.accepted_at!)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
