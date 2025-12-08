import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Users,
  Shield,
  MoreHorizontal,
  Trash2,
  KeyRound,
  Edit
} from 'lucide-react';

type AppRole = 'admin' | 'engineering' | 'operations' | 'quality' | 'npi' | 'supply_chain';

interface UserWithRoles {
  user_id: string;
  roles: AppRole[];
  created_at: string;
  email?: string;
  full_name?: string;
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
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRoles, setNewUserRoles] = useState<AppRole[]>(['engineering']);
  const [creating, setCreating] = useState(false);
  
  // Edit role dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);
  const [updating, setUpdating] = useState(false);
  
  // Set password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserWithRoles | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && userRole !== null && userRole !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/');
    }
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
      // Fetch user roles with profile info
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles to get emails
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name');

      if (profilesError) throw profilesError;

      // Group roles by user_id
      const usersMap = new Map<string, UserWithRoles>();
      
      rolesData?.forEach((roleRecord: any) => {
        const existing = usersMap.get(roleRecord.user_id);
        if (existing) {
          existing.roles.push(roleRecord.role);
        } else {
          const profile = profilesData?.find(p => p.user_id === roleRecord.user_id);
          usersMap.set(roleRecord.user_id, {
            user_id: roleRecord.user_id,
            roles: [roleRecord.role],
            created_at: roleRecord.created_at,
            email: profile?.email || undefined,
            full_name: profile?.full_name || undefined,
          });
        }
      });

      setUsers(Array.from(usersMap.values()));
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || newUserRoles.length === 0) {
      toast.error('Please fill in all required fields and select at least one role');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'createUser',
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRoles[0], // Primary role for initial creation
          fullName: newUserFullName || newUserEmail
        },
      });

      if (error) throw error;

      // If multiple roles, add the rest
      if (newUserRoles.length > 1) {
        const { error: rolesError } = await supabase.functions.invoke('admin-users', {
          body: { 
            action: 'updateRoles',
            userId: data.userId,
            roles: newUserRoles
          },
        });
        if (rolesError) throw rolesError;
      }

      toast.success('User created successfully!');
      setCreateDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRoles(['engineering']);
      fetchData();
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast.error(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!editingUser || editRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'updateRoles',
          userId: editingUser.user_id,
          roles: editRoles
        },
      });

      if (error) throw error;

      toast.success('Roles updated successfully!');
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      console.error('Error updating roles:', err);
      toast.error(err.message || 'Failed to update roles');
    } finally {
      setUpdating(false);
    }
  };

  const handleSetPassword = async () => {
    if (!passwordUser || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'setPassword',
          userId: passwordUser.user_id,
          password: newPassword
        },
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      console.error('Error setting password:', err);
      toast.error(err.message || 'Failed to set password');
    } finally {
      setSettingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId: userToDelete.user_id },
      });

      if (error) throw error;

      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (ur: UserWithRoles) => {
    setEditingUser(ur);
    setEditRoles([...ur.roles]);
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (ur: UserWithRoles) => {
    setPasswordUser(ur);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const confirmDelete = (ur: UserWithRoles) => {
    setUserToDelete(ur);
    setDeleteDialogOpen(true);
  };

  const toggleRole = (role: AppRole, roles: AppRole[], setRoles: (roles: AppRole[]) => void) => {
    if (roles.includes(role)) {
      setRoles(roles.filter(r => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const isCurrentUser = (userId: string) => {
    return user?.id === userId;
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
            <p className="text-sm text-muted-foreground">Create and manage users</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Create User Button */}
        <div className="flex justify-end">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" /> Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with login credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@company.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((role) => (
                      <div key={role.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-role-${role.value}`}
                          checked={newUserRoles.includes(role.value)}
                          onCheckedChange={() => toggleRole(role.value, newUserRoles, setNewUserRoles)}
                        />
                        <Label htmlFor={`new-role-${role.value}`} className="text-sm font-normal cursor-pointer">
                          {role.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Users</CardTitle>
            </div>
            <CardDescription>
              {users.length} user(s) in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found. Create one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((ur) => (
                    <TableRow key={ur.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {ur.email || 'No email'}
                            {isCurrentUser(ur.user_id) && (
                              <span className="text-xs text-muted-foreground ml-2">(you)</span>
                            )}
                          </p>
                          {ur.full_name && (
                            <p className="text-sm text-muted-foreground">{ur.full_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ur.roles.map((role) => (
                            <Badge key={role} variant={role === 'admin' ? 'default' : 'outline'}>
                              {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(ur.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(ur)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Change Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordDialog(ur)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Set Password
                            </DropdownMenuItem>
                            {!isCurrentUser(ur.user_id) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => confirmDelete(ur)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Roles Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Roles</DialogTitle>
            <DialogDescription>
              Update roles for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-role-${role.value}`}
                      checked={editRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value, editRoles, setEditRoles)}
                    />
                    <Label htmlFor={`edit-role-${role.value}`} className="text-sm font-normal cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRoles} disabled={updating || editRoles.length === 0}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Roles'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={settingPassword}>
              {settingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
