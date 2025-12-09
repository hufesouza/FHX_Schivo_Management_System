import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  RotateCcw,
  Search,
  X,
  Boxes
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import fhxLogoFull from '@/assets/fhx-logo-full.png';
import { CapacityDashboard } from '@/components/capacity/CapacityDashboard';
import { MachineTimeline } from '@/components/capacity/MachineTimeline';
import { JobExplorer } from '@/components/capacity/JobExplorer';
import { CapacityData } from '@/types/capacity';
import { parseCapacityFile, ParsedCapacityResult } from '@/utils/capacityParser';
import { toast } from 'sonner';

const STORAGE_KEY_MILLING = 'capacity_data_milling';
const STORAGE_KEY_TURNING = 'capacity_data_turning';
const STORAGE_KEY_MISC = 'capacity_data_misc';

type DepartmentType = 'milling' | 'turning' | 'misc';

const CapacityPlanning = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const [millingData, setMillingData] = useState<CapacityData | null>(null);
  const [turningData, setTurningData] = useState<CapacityData | null>(null);
  const [miscData, setMiscData] = useState<CapacityData | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<DepartmentType>('milling');
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploading, setIsUploading] = useState(false);

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
    setMiscData(loadStoredData(STORAGE_KEY_MISC));
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result: ParsedCapacityResult = await parseCapacityFile(file);
      
      // Update milling data
      if (result.milling) {
        setMillingData(result.milling);
        saveToStorage(STORAGE_KEY_MILLING, result.milling);
      } else {
        setMillingData(null);
        localStorage.removeItem(STORAGE_KEY_MILLING);
      }
      
      // Update turning data
      if (result.turning) {
        setTurningData(result.turning);
        saveToStorage(STORAGE_KEY_TURNING, result.turning);
      } else {
        setTurningData(null);
        localStorage.removeItem(STORAGE_KEY_TURNING);
      }
      
      // Update misc data
      if (result.misc) {
        setMiscData(result.misc);
        saveToStorage(STORAGE_KEY_MISC, result.misc);
      } else {
        setMiscData(null);
        localStorage.removeItem(STORAGE_KEY_MISC);
      }
      
      setSelectedMachine(null);
      setSelectedJobId(null);
      setActiveTab('dashboard');
      
      const millingCount = result.milling?.jobs.length || 0;
      const turningCount = result.turning?.jobs.length || 0;
      const miscCount = result.misc?.jobs.length || 0;
      toast.success(`File loaded: ${millingCount} milling, ${turningCount} turning, ${miscCount} misc jobs`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-uploaded
      event.target.value = '';
    }
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

  const handleClearData = () => {
    setMillingData(null);
    setTurningData(null);
    setMiscData(null);
    localStorage.removeItem(STORAGE_KEY_MILLING);
    localStorage.removeItem(STORAGE_KEY_TURNING);
    localStorage.removeItem(STORAGE_KEY_MISC);
    setSelectedMachine(null);
    setSelectedJobId(null);
    toast.success('All data cleared');
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentData = activeDepartment === 'milling' ? millingData : activeDepartment === 'turning' ? turningData : miscData;
  const selectedMachineData = currentData?.machines.find(m => m.machine === selectedMachine);
  const hasAnyData = millingData || turningData || miscData;

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
        {/* Upload Section */}
        <Card className="border-dashed mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Production Schedule
                </CardTitle>
                <CardDescription>
                  Upload your Excel file. Machines are automatically categorized into Milling, Turning, and Misc.
                </CardDescription>
              </div>
              {hasAnyData && (
                <Button variant="outline" size="sm" onClick={handleClearData}>
                  Clear All Data
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <span className="text-sm">Click to upload Excel file (.xlsx, .xls)</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
            {hasAnyData && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {millingData && (
                  <span className="flex items-center gap-1">
                    <Wrench className="h-4 w-4" />
                    {millingData.machines.length} milling, {millingData.jobs.length} jobs
                  </span>
                )}
                {turningData && (
                  <span className="flex items-center gap-1">
                    <RotateCcw className="h-4 w-4" />
                    {turningData.machines.length} turning, {turningData.jobs.length} jobs
                  </span>
                )}
                {miscData && (
                  <span className="flex items-center gap-1">
                    <Boxes className="h-4 w-4" />
                    {miscData.machines.length} misc, {miscData.jobs.length} jobs
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Selection */}
        {hasAnyData && (
          <Tabs value={activeDepartment} onValueChange={(v) => {
            setActiveDepartment(v as DepartmentType);
            setSelectedMachine(null);
            setSelectedJobId(null);
            setActiveTab('dashboard');
          }} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 max-w-xl">
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
              <TabsTrigger value="misc" className="gap-2">
                <Boxes className="h-4 w-4" />
                Misc
                {miscData && <Badge variant="secondary" className="ml-1">{miscData.machines.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="milling" className="mt-6">
              {millingData ? (
                <DepartmentCapacityView
                  department="milling"
                  data={millingData}
                  selectedMachine={selectedMachine}
                  selectedMachineData={activeDepartment === 'milling' ? selectedMachineData : undefined}
                  selectedJobId={selectedJobId}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onSelectMachine={handleSelectMachine}
                  onJobClick={handleJobClick}
                  setSelectedJobId={setSelectedJobId}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No milling machines found in the uploaded file.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="turning" className="mt-6">
              {turningData ? (
                <DepartmentCapacityView
                  department="turning"
                  data={turningData}
                  selectedMachine={selectedMachine}
                  selectedMachineData={activeDepartment === 'turning' ? selectedMachineData : undefined}
                  selectedJobId={selectedJobId}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onSelectMachine={handleSelectMachine}
                  onJobClick={handleJobClick}
                  setSelectedJobId={setSelectedJobId}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No turning machines found in the uploaded file.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="misc" className="mt-6">
              {miscData ? (
                <DepartmentCapacityView
                  department="misc"
                  data={miscData}
                  selectedMachine={selectedMachine}
                  selectedMachineData={activeDepartment === 'misc' ? selectedMachineData : undefined}
                  selectedJobId={selectedJobId}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onSelectMachine={handleSelectMachine}
                  onJobClick={handleJobClick}
                  setSelectedJobId={setSelectedJobId}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No misc machines found in the uploaded file.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </AppLayout>
  );
};

interface DepartmentCapacityViewProps {
  department: DepartmentType;
  data: CapacityData;
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
  selectedMachine,
  selectedMachineData,
  selectedJobId,
  activeTab,
  setActiveTab,
  onSelectMachine,
  onJobClick,
  setSelectedJobId,
}: DepartmentCapacityViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query
  const filteredData = {
    ...data,
    jobs: data.jobs.filter(job => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        job.Process_Order?.toLowerCase().includes(query) ||
        job.End_Product?.toLowerCase().includes(query)
      );
    }),
    ganttJobs: data.ganttJobs.filter(job => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        job.processOrder?.toLowerCase().includes(query) ||
        job.endProduct?.toLowerCase().includes(query)
      );
    }),
  };

  // Get machines that have matching jobs
  const filteredMachines = data.machines.filter(m => filteredData.jobs.some(j => j.Machine === m.machine));

  return (
    <div className="space-y-6">
      {/* File info and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{data.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {filteredData.jobs.length === data.jobs.length 
                ? `${data.jobs.length} jobs` 
                : `${filteredData.jobs.length} of ${data.jobs.length} jobs`
              } • {data.machines.length} machines • 
              Uploaded {data.uploadedAt.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Process Order or Part Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
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
            machines={searchQuery ? filteredMachines : data.machines}
            onSelectMachine={onSelectMachine}
            selectedMachine={selectedMachine}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {selectedMachineData ? (
            <MachineTimeline 
              machine={selectedMachineData}
              ganttJobs={filteredData.ganttJobs}
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
            jobs={filteredData.jobs}
            machines={data.machines.map(m => m.machine)}
            onJobClick={onJobClick}
            selectedJobId={selectedJobId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CapacityPlanning;
