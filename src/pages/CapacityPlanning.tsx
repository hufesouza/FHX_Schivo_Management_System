import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Upload,
  Wrench,
  RotateCcw
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

const STORAGE_KEY_MILLING = 'capacity_data_milling';
const STORAGE_KEY_TURNING = 'capacity_data_turning';

type DepartmentType = 'milling' | 'turning';

const CapacityPlanning = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const [millingData, setMillingData] = useState<CapacityData | null>(null);
  const [turningData, setTurningData] = useState<CapacityData | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<DepartmentType>('milling');
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const isAdmin = role === 'admin';

  // Load data from localStorage on mount
  useEffect(() => {
    const loadStoredData = (key: string): CapacityData | null => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          return {
            ...parsed,
            uploadedAt: new Date(parsed.uploadedAt),
            jobs: parsed.jobs.map((job: any) => ({
              ...job,
              Start_DateTime: new Date(job.Start_DateTime),
              End_DateTime: new Date(job.End_DateTime),
            })),
            machines: parsed.machines.map((machine: any) => ({
              ...machine,
              nextFreeDate: new Date(machine.nextFreeDate),
            })),
            ganttJobs: parsed.ganttJobs.map((job: any) => ({
              ...job,
              Start_DateTime: new Date(job.Start_DateTime),
              End_DateTime: new Date(job.End_DateTime),
            })),
          };
        }
      } catch (error) {
        console.error('Error loading stored data:', error);
      }
      return null;
    };

    setMillingData(loadStoredData(STORAGE_KEY_MILLING));
    setTurningData(loadStoredData(STORAGE_KEY_TURNING));
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const saveToStorage = (key: string, data: CapacityData) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const handleDataLoaded = (data: CapacityData, department: DepartmentType) => {
    if (department === 'milling') {
      setMillingData(data);
      saveToStorage(STORAGE_KEY_MILLING, data);
    } else {
      setTurningData(data);
      saveToStorage(STORAGE_KEY_TURNING, data);
    }
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
    const currentData = activeDepartment === 'milling' ? millingData : turningData;
    const job = currentData?.jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedMachine(job.Machine);
      setActiveTab('timeline');
    }
  };

  const handleClearData = (department: DepartmentType) => {
    if (department === 'milling') {
      setMillingData(null);
      localStorage.removeItem(STORAGE_KEY_MILLING);
    } else {
      setTurningData(null);
      localStorage.removeItem(STORAGE_KEY_TURNING);
    }
    setSelectedMachine(null);
    setSelectedJobId(null);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentData = activeDepartment === 'milling' ? millingData : turningData;
  const selectedMachineData = currentData?.machines.find(m => m.machine === selectedMachine);

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
        {/* Department Selection */}
        <Tabs value={activeDepartment} onValueChange={(v) => {
          setActiveDepartment(v as DepartmentType);
          setSelectedMachine(null);
          setSelectedJobId(null);
          setActiveTab('dashboard');
        }} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="milling" className="gap-2">
              <Wrench className="h-4 w-4" />
              Milling
              {millingData && <Badge variant="secondary" className="ml-1">{millingData.machines.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="turning" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Turning
              {turningData && <Badge variant="secondary" className="ml-1">{turningData.machines.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="milling" className="mt-6">
            <DepartmentCapacityView
              department="milling"
              data={millingData}
              onDataLoaded={(data) => handleDataLoaded(data, 'milling')}
              onClearData={() => handleClearData('milling')}
              selectedMachine={selectedMachine}
              selectedMachineData={activeDepartment === 'milling' ? selectedMachineData : undefined}
              selectedJobId={selectedJobId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onSelectMachine={handleSelectMachine}
              onJobClick={handleJobClick}
              setSelectedJobId={setSelectedJobId}
            />
          </TabsContent>

          <TabsContent value="turning" className="mt-6">
            <DepartmentCapacityView
              department="turning"
              data={turningData}
              onDataLoaded={(data) => handleDataLoaded(data, 'turning')}
              onClearData={() => handleClearData('turning')}
              selectedMachine={selectedMachine}
              selectedMachineData={activeDepartment === 'turning' ? selectedMachineData : undefined}
              selectedJobId={selectedJobId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onSelectMachine={handleSelectMachine}
              onJobClick={handleJobClick}
              setSelectedJobId={setSelectedJobId}
            />
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
};

interface DepartmentCapacityViewProps {
  department: DepartmentType;
  data: CapacityData | null;
  onDataLoaded: (data: CapacityData) => void;
  onClearData: () => void;
  selectedMachine: string | null;
  selectedMachineData: any;
  selectedJobId: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectMachine: (machine: string) => void;
  onJobClick: (jobId: string) => void;
  setSelectedJobId: (id: string | null) => void;
}

const DepartmentCapacityView = ({
  department,
  data,
  onDataLoaded,
  onClearData,
  selectedMachine,
  selectedMachineData,
  selectedJobId,
  activeTab,
  setActiveTab,
  onSelectMachine,
  onJobClick,
  setSelectedJobId,
}: DepartmentCapacityViewProps) => {
  const departmentLabel = department === 'milling' ? 'Milling' : 'Turning';

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {departmentLabel} Production Schedule
              </CardTitle>
              <CardDescription>
                Upload your {departmentLabel.toLowerCase()} department Excel file. Data will persist until replaced.
              </CardDescription>
            </div>
            {data && (
              <Button variant="outline" size="sm" onClick={onClearData}>
                Clear Data
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <FileUpload onDataLoaded={onDataLoaded} />
        </CardContent>
      </Card>

      {/* Data Visualization - Only shown after upload */}
      {data && (
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{data.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {data.jobs.length} jobs • {data.machines.length} machines • 
                  Uploaded {data.uploadedAt.toLocaleString()}
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
                machines={data.machines}
                onSelectMachine={onSelectMachine}
                selectedMachine={selectedMachine}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              {selectedMachineData ? (
                <MachineTimeline 
                  machine={selectedMachineData}
                  ganttJobs={data.ganttJobs}
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
                jobs={data.jobs}
                machines={data.machines.map(m => m.machine)}
                onJobClick={onJobClick}
                selectedJobId={selectedJobId}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default CapacityPlanning;
