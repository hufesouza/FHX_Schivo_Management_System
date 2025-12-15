import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProductionJobs } from '@/hooks/useProductionJobs';
import { useResourceConfigurations } from '@/hooks/useResourceConfigurations';
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
  Boxes,
  CircleDot,
  ArrowRightLeft,
  Settings2
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
import { MoveJobDialog } from '@/components/capacity/MoveJobDialog';
import { ResourceManager } from '@/components/capacity/ResourceManager';
import { CapacityData, CleanedJob } from '@/types/capacity';
import { parseCapacityFile, ParsedCapacityResult } from '@/utils/capacityParser';
import { toast } from 'sonner';

type DepartmentType = 'milling' | 'turning' | 'sliding_head' | 'misc';

const CapacityPlanning = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const {
    jobs,
    isLoading: dataLoading,
    mergeJobs,
    moveJob,
    getCapacityData,
    clearAllJobs,
    getMachinesForDepartment,
    findJob,
    refetch: refetchJobs,
  } = useProductionJobs();
  const { refetch: refetchConfigs } = useResourceConfigurations();

  const [activeDepartment, setActiveDepartment] = useState<DepartmentType | 'resources'>('milling');
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploading, setIsUploading] = useState(false);
  
  // Move job dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [jobToMove, setJobToMove] = useState<CleanedJob | null>(null);

  const isAdmin = role === 'admin';

  // Get capacity data for each department from jobs
  const millingData = getCapacityData('milling', 'Milling');
  const turningData = getCapacityData('turning', 'Turning');
  const slidingHeadData = getCapacityData('sliding_head', 'Sliding Heads');
  const miscData = getCapacityData('misc', 'Misc');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const result: ParsedCapacityResult = await parseCapacityFile(file);
      
      // Merge jobs for each department (smart merge: add new, remove completed, preserve manual)
      const results = await Promise.all([
        result.milling ? mergeJobs(result.milling.jobs, 'milling', user.id, file.name) : null,
        result.turning ? mergeJobs(result.turning.jobs, 'turning', user.id, file.name) : null,
        result.sliding_head ? mergeJobs(result.sliding_head.jobs, 'sliding_head', user.id, file.name) : null,
        result.misc ? mergeJobs(result.misc.jobs, 'misc', user.id, file.name) : null,
      ]);
      
      // Calculate totals
      const totals = results.reduce((acc, r) => {
        if (r) {
          acc.added += r.added;
          acc.removed += r.removed;
          acc.preserved += r.preserved;
        }
        return acc;
      }, { added: 0, removed: 0, preserved: 0 });
      
      setSelectedMachine(null);
      setSelectedJobId(null);
      setActiveTab('dashboard');
      
      toast.success(
        `Upload complete: ${totals.added} added, ${totals.removed} removed, ${totals.preserved} manual moves preserved`
      );
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSelectMachine = (machine: string) => {
    setSelectedMachine(machine);
    setActiveTab('timeline');
  };

  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    const currentData = activeDepartment === 'milling' ? millingData : 
                        activeDepartment === 'turning' ? turningData : 
                        activeDepartment === 'sliding_head' ? slidingHeadData : miscData;
    const job = currentData?.jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedMachine(job.Machine);
      setActiveTab('timeline');
    }
  };

  const handleClearData = async () => {
    try {
      await clearAllJobs();
      setSelectedMachine(null);
      setSelectedJobId(null);
      toast.success('All data cleared');
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  const handleMoveJob = (job: CleanedJob) => {
    setJobToMove(job);
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async (
    toMachine: string,
    newDuration: number,
    newStartDate: Date,
    newPriority: number,
    reason: string
  ) => {
    if (!jobToMove || !user?.id) return;
    if (activeDepartment === 'resources') return; // Can't move jobs from resources tab
    
    try {
      await moveJob(
        jobToMove.Process_Order,
        activeDepartment as DepartmentType,
        toMachine,
        newDuration,
        newStartDate,
        newPriority,
        user.id,
        reason
      );
      setMoveDialogOpen(false);
      setJobToMove(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move job');
    }
  };

  // Get all machines and their detected departments for the Resource Manager
  // These hooks must be called before any early returns
  const allMachines = useMemo(() => {
    const machines = new Set<string>();
    [millingData, turningData, slidingHeadData, miscData].forEach(data => {
      data?.machines.forEach(m => machines.add(m.machine));
    });
    return Array.from(machines);
  }, [millingData, turningData, slidingHeadData, miscData]);

  const jobDepartments = useMemo(() => {
    const depts: Record<string, DepartmentType> = {};
    millingData?.machines.forEach(m => { depts[m.machine] = 'milling'; });
    turningData?.machines.forEach(m => { depts[m.machine] = 'turning'; });
    slidingHeadData?.machines.forEach(m => { depts[m.machine] = 'sliding_head'; });
    miscData?.machines.forEach(m => { depts[m.machine] = 'misc'; });
    return depts;
  }, [millingData, turningData, slidingHeadData, miscData]);

  if (authLoading || roleLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentData = activeDepartment === 'milling' ? millingData : 
                      activeDepartment === 'turning' ? turningData : 
                      activeDepartment === 'sliding_head' ? slidingHeadData :
                      activeDepartment === 'misc' ? miscData : null;
  const selectedMachineData = currentData?.machines.find(m => m.machine === selectedMachine);
  const hasAnyData = millingData || turningData || slidingHeadData || miscData;

  return (
    <AppLayout title="Capacity Planning" subtitle="Production • Schivo Management System" showBackButton backTo="/production">
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
                  Upload your Excel file. New jobs are added, completed jobs are removed, manual moves are preserved.
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
                {slidingHeadData && (
                  <span className="flex items-center gap-1">
                    <CircleDot className="h-4 w-4" />
                    {slidingHeadData.machines.length} sliding heads, {slidingHeadData.jobs.length} jobs
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
            setActiveDepartment(v as DepartmentType | 'resources');
            setSelectedMachine(null);
            setSelectedJobId(null);
            setActiveTab('dashboard');
          }} className="mb-6">
            <TabsList className="grid w-full grid-cols-5 max-w-3xl">
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
              <TabsTrigger value="sliding_head" className="gap-2">
                <CircleDot className="h-4 w-4" />
                Sliding Heads
                {slidingHeadData && <Badge variant="secondary" className="ml-1">{slidingHeadData.machines.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="misc" className="gap-2">
                <Boxes className="h-4 w-4" />
                Misc
                {miscData && <Badge variant="secondary" className="ml-1">{miscData.machines.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Resources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="mt-6">
              <ResourceManager 
                allMachines={allMachines}
                jobDepartments={jobDepartments}
                onConfigChange={() => {
                  refetchConfigs();
                  refetchJobs();
                }}
              />
            </TabsContent>

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
                  onMoveJob={handleMoveJob}
                  allMachines={getMachinesForDepartment('milling')}
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
                  onMoveJob={handleMoveJob}
                  allMachines={getMachinesForDepartment('turning')}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No turning machines found in the uploaded file.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sliding_head" className="mt-6">
              {slidingHeadData ? (
                <DepartmentCapacityView
                  department="sliding_head"
                  data={slidingHeadData}
                  selectedMachine={selectedMachine}
                  selectedMachineData={activeDepartment === 'sliding_head' ? selectedMachineData : undefined}
                  selectedJobId={selectedJobId}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onSelectMachine={handleSelectMachine}
                  onJobClick={handleJobClick}
                  setSelectedJobId={setSelectedJobId}
                  onMoveJob={handleMoveJob}
                  allMachines={getMachinesForDepartment('sliding_head')}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CircleDot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sliding head machines found in the uploaded file.</p>
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
                  onMoveJob={handleMoveJob}
                  allMachines={getMachinesForDepartment('misc')}
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

      {/* Move Job Dialog */}
      {jobToMove && (
        <MoveJobDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          processOrder={jobToMove.Process_Order}
          currentMachine={jobToMove.Machine}
          currentDuration={jobToMove.Duration_Hours}
          currentStartDate={jobToMove.Start_DateTime}
          currentPriority={jobToMove.Priority}
          availableMachines={activeDepartment !== 'resources' ? getMachinesForDepartment(activeDepartment as DepartmentType) : []}
          onConfirm={handleConfirmMove}
        />
      )}
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
  onMoveJob: (job: CleanedJob) => void;
  allMachines: string[];
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
  onMoveJob,
  allMachines,
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
            onMoveJob={onMoveJob}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CapacityPlanning;
