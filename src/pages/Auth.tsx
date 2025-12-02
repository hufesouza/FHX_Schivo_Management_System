import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!token);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Check invitation token
  useEffect(() => {
    if (token) {
      checkInvitation(token);
    }
  }, [token]);

  const checkInvitation = async (inviteToken: string) => {
    setInviteLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', inviteToken)
        .is('accepted_at', null)
        .single();

      if (error || !data) {
        setInviteError('Invalid or expired invitation link');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInviteError('This invitation has expired');
        return;
      }

      setInvitation(data as Invitation);
      setEmail(data.email);
      setMode('signup');
    } catch (err) {
      setInviteError('Failed to verify invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        // Signup with invitation
        if (!invitation) {
          toast.error('Valid invitation required to create an account');
          return;
        }

        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in.');
            setMode('login');
          } else if (error.message.includes('Signups not allowed')) {
            toast.error('Account creation is restricted. Please use a valid invitation link.');
          } else {
            toast.error(error.message);
          }
        } else {
          // Role is assigned automatically via database trigger
          toast.success('Account created successfully!');
          navigate('/');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Show error if invalid invitation
  if (token && inviteError) {
    return (
      <div className="min-h-screen flex flex-col bg-primary">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-accent/20 shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 bg-destructive/10 rounded-xl p-3 w-fit">
                <Mail className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-serif">Invalid Invitation</CardTitle>
              <CardDescription>{inviteError}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/auth')} variant="outline">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <footer className="p-4 text-center text-primary-foreground/60 text-sm">
          Solution by <span className="text-accent font-medium">FHX Engineering</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-primary">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Logo/Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/20 border-2 border-accent/30 mb-4">
              <span className="text-3xl font-heading font-bold text-accent">S</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-primary-foreground">
              Schivo Medical
            </h1>
            <p className="text-primary-foreground/70 font-medium">
              Blue Review Management System
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-accent/20 shadow-elegant bg-card">
            <CardHeader className="text-center pb-4">
              {invitation ? (
                <div className="mx-auto mb-2 bg-accent/10 rounded-xl p-3 w-fit">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
              ) : null}
              <CardTitle className="text-xl font-serif">
                {invitation ? 'Complete Your Registration' : 'Welcome Back'}
              </CardTitle>
              <CardDescription>
                {invitation 
                  ? `Create your account as ${invitation.role.replace('_', ' ')}`
                  : 'Sign in to access Blue Review forms'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@schivomedical.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting || !!invitation}
                    className="border-border focus:border-accent focus:ring-accent"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="border-border focus:border-accent focus:ring-accent"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    mode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </Button>
              </form>
              
              {!invitation && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Need an account? Contact your administrator.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security note */}
          <p className="text-center text-primary-foreground/50 text-xs">
            Secure access for authorized personnel only
          </p>
        </div>
      </div>

      {/* Footer with FHX branding */}
      <footer className="p-4 text-center border-t border-primary-foreground/10">
        <p className="text-primary-foreground/60 text-sm">
          Solution by <span className="text-accent font-semibold">FHX Engineering</span>
        </p>
      </footer>
    </div>
  );
}
