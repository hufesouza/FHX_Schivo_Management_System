import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Shield,
  Lock,
  FileText,
  Server,
  Eye,
  Database,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

interface ComplianceSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
}

const QuotationComplianceSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  const isAdmin = role === 'admin';

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !roleLoading && !isAdmin) {
      toast.error('Admin access required');
      navigate('/npi/quotation');
    }
  }, [authLoading, roleLoading, isAdmin, navigate]);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['compliance-settings-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_settings')
        .select('*')
        .order('setting_key');
      if (error) throw error;
      return data as ComplianceSetting[];
    },
    enabled: isAdmin,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('compliance_settings')
        .update({ 
          setting_value: value,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-settings-full'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-settings'] });
      toast.success('Setting updated');
    },
    onError: (error) => {
      toast.error('Failed to update setting: ' + (error as Error).message);
    },
  });

  const getSettingValue = (key: string) => {
    return settings.find(s => s.setting_key === key)?.setting_value || '';
  };

  const handleToggle = (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    updateSettingMutation.mutate({ key, value: newValue });
  };

  if (authLoading || roleLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout title="Compliance & Data Handling" subtitle="21 CFR Part 11-Ready Settings" showBackButton backTo="/npi/quotation">

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Security Overview Banner */}
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">FDA 21 CFR Part 11-Ready Architecture</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            This application is designed to support regulatory compliance requirements including audit trails, 
            user authentication, deterministic AI processing, and secure data handling.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          {/* API Mode Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                API Mode Configuration
              </CardTitle>
              <CardDescription>
                Controls how AI processing is performed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">API Mode</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {getSettingValue('api_mode') === 'openai_api_no_training' 
                        ? 'OpenAI API (No Training)' 
                        : getSettingValue('api_mode')}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-600">Active</Badge>
              </div>
              
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Data Privacy Guarantee:</strong> OpenAI API data is NOT used for model training. 
                  All drawings and inputs are processed transiently and not logged by OpenAI for improvement.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• All AI calls go through server-side backend only</p>
                <p>• No browser-client LLM calls</p>
                <p>• API keys are stored securely as environment variables</p>
                <p>• No data sent to ChatGPT UI or consumer endpoints</p>
              </div>
            </CardContent>
          </Card>

          {/* Drawing Storage Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Drawing Storage
              </CardTitle>
              <CardDescription>
                Control whether uploaded drawings are persisted after processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Store Uploaded Drawings</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, drawings are processed transiently and deleted after AI interpretation
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('store_uploaded_drawings') === 'true'}
                  onCheckedChange={() => handleToggle('store_uploaded_drawings', getSettingValue('store_uploaded_drawings'))}
                  disabled={updateSettingMutation.isPending}
                />
              </div>
              
              {getSettingValue('store_uploaded_drawings') !== 'true' && (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    <strong>Privacy Mode Active:</strong> Drawings are processed in memory and automatically 
                    deleted after AI interpretation completes.
                  </AlertDescription>
                </Alert>
              )}

              {getSettingValue('store_uploaded_drawings') === 'true' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Storage Enabled:</strong> Drawings will be retained for audit purposes. 
                    Ensure proper access controls are in place.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Audit Logging Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Audit Logging
              </CardTitle>
              <CardDescription>
                21 CFR Part 11 audit trail for all AI operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Audit Logs</Label>
                  <p className="text-sm text-muted-foreground">
                    Records all drawing uploads, AI interpretations, machine selections, and calculations
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('enable_audit_logs') !== 'false'}
                  onCheckedChange={() => handleToggle('enable_audit_logs', getSettingValue('enable_audit_logs') || 'true')}
                  disabled={updateSettingMutation.isPending}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground">Audit Trail Captures:</Label>
                <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                  <li>When drawings are uploaded</li>
                  <li>Which user uploaded them</li>
                  <li>When AI API calls are made</li>
                  <li>What machine was selected</li>
                  <li>Final cycle time outputs</li>
                  <li>AI prompt version used</li>
                  <li>Request payload (excluding drawing data)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* AI Prompt Version Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                AI Prompt Version
              </CardTitle>
              <CardDescription>
                Deterministic prompt versioning for reproducibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Current Version</p>
                  <p className="text-sm text-muted-foreground">
                    Stored with each API call for compliance tracking
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {getSettingValue('ai_prompt_version') || 'v1.0'}
                </Badge>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Prompt versioning ensures reproducibility - a key 21 CFR Part 11 requirement. 
                  Every API call includes the prompt version for audit purposes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Security Summary */}
          <Card className="border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Compliance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">OpenAI API (No Training Mode)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Server-side AI processing only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">API keys secured in environment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">No browser-side LLM calls</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">User authentication required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Audit trail framework</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Deterministic request structure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Versioned prompts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
};

export default QuotationComplianceSettings;