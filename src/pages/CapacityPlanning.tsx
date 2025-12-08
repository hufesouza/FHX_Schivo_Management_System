import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  ArrowLeft, 
  LogOut, 
  Settings, 
  Users, 
  Shield, 
  User,
  LayoutDashboard,
  Clock,
  Table as TableIcon,
  Upload
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import fhxLogoFull from '@/assets/fhx-logo-full.png';
import { FileUpload } from '@/components/capacity/FileUpload';
import { CapacityDashboard } from '@/components/capacity/CapacityDashboard';
import { MachineTimeline } from '@/components/capacity/MachineTimeline';
import { JobExplorer } from '@/components/capacity/JobExplorer';
import { CapacityData } from '@/types/capacity';

const CapacityPlanning = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const [capacityData, setCapacityData] = useState<CapacityData | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

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

  const handleDataLoaded = (data: CapacityData) => {
    setCapacityData(data);
    setSelectedMachine(null);
    setSelectedJobId(null);
    setActiveTab('dashboard');
  };

  const handleSelectMachine = (machine: string) => {
    setSelectedMachine(machine);
    setActiveTab('timeline');
  };

  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    // Find the machine for this job and switch to timeline
    const job = capacityData?.jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedMachine(job.Machine);
      setActiveTab('timeline');
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedMachineData = capacityData?.machines.find(m => m.machine === selectedMachine);

  return (
    <AppLayout>
      {/* Header */}
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/production')}
              className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={fhxLogoFull} alt="FHX Engineering" className="h-10" />
            <div>
              <h1 className="font-heading font-semibold text-lg">Capacity Planning</h1>
              <p className="text-xs text-primary-foreground/70">Production • Schivo Management System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-primary-foreground/50 text-primary-foreground bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent">
                    <User className="h-4 w-4 mr-2" /> Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Upload Section - Always visible */}
        <div className="mb-6">
          <FileUpload onDataLoaded={handleDataLoaded} />
        </div>

        {/* Data Visualization - Only shown after upload */}
        {capacityData && (
          <div className="space-y-6">
            {/* File info */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{capacityData.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {capacityData.jobs.length} jobs • {capacityData.machines.length} machines • 
                    Uploaded {capacityData.uploadedAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2" disabled={!selectedMachine}>
                  <Clock className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="jobs" className="gap-2">
                  <TableIcon className="h-4 w-4" />
                  Jobs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <CapacityDashboard 
                  machines={capacityData.machines}
                  onSelectMachine={handleSelectMachine}
                  selectedMachine={selectedMachine}
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-6">
                {selectedMachineData ? (
                  <MachineTimeline 
                    machine={selectedMachineData}
                    ganttJobs={capacityData.ganttJobs}
                    onJobClick={setSelectedJobId}
                    selectedJobId={selectedJobId}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a machine from the Dashboard to view its timeline</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="jobs" className="mt-6">
                <JobExplorer 
                  jobs={capacityData.jobs}
                  machines={capacityData.machines.map(m => m.machine)}
                  onJobClick={handleJobClick}
                  selectedJobId={selectedJobId}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default CapacityPlanning;
