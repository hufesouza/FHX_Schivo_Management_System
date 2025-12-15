import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNPIJobs } from '@/hooks/useNPIJobs';
import { NPIJobWithRelations } from '@/types/npi';
import { AppLayout } from '@/components/layout/AppLayout';
import { NPIFileUpload } from '@/components/npi-pipeline/NPIFileUpload';
import { NPIDashboard, QuickFilterType } from '@/components/npi-pipeline/NPIDashboard';
import { NPIJobList, NPIJobListFilters } from '@/components/npi-pipeline/NPIJobList';
import { NPIJobDetail } from '@/components/npi-pipeline/NPIJobDetail';
import { NPIMatrix } from '@/components/npi-pipeline/NPIMatrix';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Loader2, 
  ArrowLeft, 
  Upload, 
  LayoutDashboard, 
  List, 
  Grid3X3,
  Trash2,
  Settings,
  User,
  Users,
  LogOut,
  Shield,
  RefreshCw
} from 'lucide-react';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

const NPIPipeline = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { jobs, loading, uploading, stats, uploadData, clearAllData, fetchJobs } = useNPIJobs();
  
  const [selectedJob, setSelectedJob] = useState<NPIJobWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobListFilters, setJobListFilters] = useState<NPIJobListFilters | undefined>(undefined);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSelectJob = (job: NPIJobWithRelations) => {
    setSelectedJob(job);
    setDetailOpen(true);
  };

  const handleQuickFilter = (filter: QuickFilterType) => {
    let newFilters: NPIJobListFilters = {};
    
    switch (filter.type) {
      case 'all':
        newFilters = {};
        break;
      case 'ready':
        newFilters = { ready: 'ready' };
        break;
      case 'released':
        newFilters = { ready: 'released' };
        break;
      case 'overdue':
        newFilters = { ready: 'overdue' };
        break;
      case 'status':
        newFilters = { status: filter.value };
        break;
      case 'mcCell':
        newFilters = { mcCell: filter.value };
        break;
      case 'customer':
        newFilters = { customer: filter.value };
        break;
    }
    
    setJobListFilters(newFilters);
    setActiveTab('jobs');
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="NPI Pipeline" subtitle="Track and manage NPI projects" showBackButton backTo="/npi">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Job List
              </TabsTrigger>
              <TabsTrigger value="matrix" className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Matrix View
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchJobs()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {isAdmin && jobs.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all NPI data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {jobs.length} NPI jobs and their associated prerequisites and post-MC activities. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="dashboard" className="mt-0">
                {jobs.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No NPI Data Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload your NPI Excel file to get started
                      </p>
                      <Button onClick={() => setActiveTab('upload')}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <NPIDashboard jobs={jobs} stats={stats} onQuickFilter={handleQuickFilter} />
                )}
              </TabsContent>

              <TabsContent value="jobs" className="mt-0">
                {jobs.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">
                        No jobs available. Upload an Excel file to populate the job list.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <NPIJobList jobs={jobs} onSelectJob={handleSelectJob} initialFilters={jobListFilters} />
                )}
              </TabsContent>

              <TabsContent value="matrix" className="mt-0">
                {jobs.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">
                        No jobs available. Upload an Excel file to view the matrix.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <NPIMatrix jobs={jobs} onSelectJob={handleSelectJob} />
                )}
              </TabsContent>

              <TabsContent value="upload" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload NPI Excel File</CardTitle>
                    <CardDescription>
                      Upload your NPI tracking spreadsheet to import jobs, prerequisites, and post-MC activities.
                      This will replace all existing data with the contents of the new file.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <NPIFileUpload 
                      onFileProcessed={uploadData} 
                      isUploading={uploading}
                    />
                    
                    {jobs.length > 0 && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Current data:</strong> {jobs.length} NPI jobs loaded
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Job Detail Dialog */}
        <NPIJobDetail 
          job={selectedJob} 
          open={detailOpen} 
          onOpenChange={setDetailOpen} 
        />
      </main>
    </AppLayout>
  );
};

export default NPIPipeline;
