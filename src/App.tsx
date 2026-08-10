import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NPIHub from "./pages/NPIHub";
import NPIProjects from "./pages/NPIProjects";
import NPIProjectDetail from "./pages/NPIProjectDetail";
import ChangeControlHub from "./pages/ChangeControlHub";
import ManufacturingHub from "./pages/ManufacturingHub";
import ProductionHub from "./pages/ProductionHub";
import CapacityPlanning from "./pages/CapacityPlanning";
import Auth from "./pages/Auth";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import QuotationDashboard from "./pages/QuotationDashboard";
import NPIOrderIntelligence from "./pages/NPIOrderIntelligence";
import NPIOrderSiteSelect from "./pages/NPIOrderSiteSelect";
import NPICapacityPlannerHub from "./pages/npi-planner/CapacityPlannerHub";
import PlannerDashboard from "./pages/npi-planner/PlannerDashboard";
import PartSetup from "./pages/npi-planner/PartSetup";
import JobList from "./pages/npi-planner/JobList";
import JobKanban from "./pages/npi-planner/JobKanban";
import JobDetail from "./pages/npi-planner/JobDetail";
import MachineCalendar from "./pages/npi-planner/MachineCalendar";
import MachineCapacity from "./pages/npi-planner/MachineCapacity";
import ToolingTracker from "./pages/npi-planner/ToolingTracker";
import MaterialTracker from "./pages/npi-planner/MaterialTracker";
import MaterialsCatalog from "./pages/npi-planner/MaterialsCatalog";
import PartToolingStatus from "./pages/npi-planner/PartToolingStatus";
import PlannerReports from "./pages/npi-planner/Reports";
import PlannerSettings from "./pages/npi-planner/PlannerSettings";
import CapacityPlannerMVPHub from "./pages/npi-planner-mvp/CapacityPlannerMVPHub";
import MVPResources from "./pages/npi-planner-mvp/Resources";
import MVPPartLibrary from "./pages/npi-planner-mvp/PartLibrary";
import MVPPartLibraryDetail from "./pages/npi-planner-mvp/PartLibraryDetail";
import MVPJobEntryList from "./pages/npi-planner-mvp/JobEntryList";
import MVPJobEntryDetail from "./pages/npi-planner-mvp/JobEntryDetail";
import MVPSchedulingEngine from "./pages/npi-planner-mvp/SchedulingEngine";
import MVPGanttChart from "./pages/npi-planner-mvp/GanttChart";
import MVPScheduleBoard from "./pages/npi-planner-mvp/ScheduleBoardPage";
import SchedulerOverview from "./pages/scheduler/SchedulerOverview";
import MachineCalendars from "./pages/scheduler/MachineCalendars";
import SchedulerCapacity from "./pages/scheduler/SchedulerCapacity";
import SchedulerJobs from "./pages/scheduler/SchedulerJobs";
import SchedulerMachines from "./pages/scheduler/SchedulerMachines";
import SchedulerSetters from "./pages/scheduler/SchedulerSetters";
import SchedulerAudit from "./pages/scheduler/SchedulerAudit";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main Home */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* NPI Engineering Module */}
          <Route path="/npi" element={<NPIHub />} />
          <Route path="/npi/blue-review" element={<BlueReviewDashboard />} />
          <Route path="/npi/daily-meeting" element={<DailyMeeting />} />
          <Route path="/npi/quotation" element={<QuotationHub />} />
          <Route path="/npi/quotation/new" element={<QuotationNew />} />
          <Route path="/npi/quotation/machines" element={<QuotationMachines />} />
          <Route path="/npi/quotation/estimator" element={<PertEstimator />} />
          <Route path="/npi/quotation/compliance" element={<QuotationComplianceSettings />} />
          <Route path="/npi/quotation-dashboard" element={<QuotationDashboard />} />
          <Route path="/npi/order-intelligence" element={<NPIOrderSiteSelect />} />
          <Route path="/npi/order-intelligence/:site" element={<NPIOrderIntelligence />} />
          
          <Route path="/npi/quotation-control" element={<QuotationControlHub />} />
          <Route path="/npi/quotation-system" element={<QuotationSystemHub />} />
          <Route path="/npi/quotation-system/enquiries" element={<EnquiryList />} />
          <Route path="/npi/quotation-system/enquiry/:id" element={<EnquiryDetail />} />
          <Route path="/npi/quotation-system/new" element={<QuotationSystemNew />} />
          <Route path="/npi/quotation-system/edit/:id" element={<QuotationSystemNew />} />
          <Route path="/npi/quotation-system/list" element={<QuotationSystemList />} />
          <Route path="/npi/quotation-system/settings" element={<QuotationSystemSettings />} />
          <Route path="/npi/projects" element={<NPIProjects />} />
          <Route path="/npi/projects/:id" element={<NPIProjectDetail />} />
          <Route path="/npi/drawing-translate" element={<DrawingTranslate />} />
          <Route path="/npi/balloon-dwg" element={<BalloonDWG />} />
          <Route path="/npi/quotation-system/guide" element={<QuotationSystemPresentation />} />

          {/* NPI Capacity Planner */}
          <Route path="/npi/capacity-planner" element={<NPICapacityPlannerHub />} />
          <Route path="/npi/capacity-planner/dashboard" element={<PlannerDashboard />} />
          <Route path="/npi/capacity-planner/parts/new" element={<PartSetup />} />
          <Route path="/npi/capacity-planner/parts/:id" element={<JobDetail />} />
          <Route path="/npi/capacity-planner/jobs" element={<JobList />} />
          <Route path="/npi/capacity-planner/kanban" element={<JobKanban />} />
          <Route path="/npi/capacity-planner/calendar" element={<MachineCalendar />} />
          <Route path="/npi/capacity-planner/capacity" element={<MachineCapacity />} />
          <Route path="/npi/capacity-planner/tooling" element={<ToolingTracker />} />
          <Route path="/npi/capacity-planner/material" element={<MaterialTracker />} />
          <Route path="/npi/capacity-planner/materials-catalog" element={<MaterialsCatalog />} />
          <Route path="/npi/capacity-planner/tooling-status" element={<PartToolingStatus />} />
          <Route path="/npi/capacity-planner/reports" element={<PlannerReports />} />
          <Route path="/npi/capacity-planner/settings" element={<PlannerSettings />} />

          {/* NPI Capacity Planner MVP (simplified) */}
          <Route path="/npi/capacity-planner-mvp" element={<CapacityPlannerMVPHub />} />
          <Route path="/npi/capacity-planner-mvp/parts/new" element={<PartSetup />} />
          <Route path="/npi/capacity-planner-mvp/parts/:id" element={<JobDetail />} />
          <Route path="/npi/capacity-planner-mvp/jobs" element={<JobList />} />
          <Route path="/npi/capacity-planner-mvp/gantt" element={<MVPGanttChart />} />
          <Route path="/npi/capacity-planner-mvp/schedule-board" element={<MVPScheduleBoard />} />
          <Route path="/npi/capacity-planner-mvp/resources" element={<MVPResources />} />
          <Route path="/npi/capacity-planner-mvp/part-library" element={<MVPPartLibrary />} />
          <Route path="/npi/capacity-planner-mvp/part-library/:id" element={<MVPPartLibraryDetail />} />
          <Route path="/npi/capacity-planner-mvp/jobs-mvp" element={<MVPJobEntryList />} />
          <Route path="/npi/capacity-planner-mvp/jobs-mvp/new" element={<MVPJobEntryDetail />} />
          <Route path="/npi/capacity-planner-mvp/jobs-mvp/:id" element={<MVPJobEntryDetail />} />
          <Route path="/npi/capacity-planner-mvp/scheduling" element={<MVPSchedulingEngine />} />
          <Route path="/npi/capacity-planner-mvp/settings" element={<PlannerSettings />} />


          {/* NPI Resource Scheduling & Capacity Planning */}
          <Route path="/scheduling" element={<SchedulerOverview />} />
          <Route path="/scheduling/machines-calendar" element={<MachineCalendars />} />
          <Route path="/scheduling/capacity" element={<SchedulerCapacity />} />
          <Route path="/scheduling/jobs" element={<SchedulerJobs />} />
          <Route path="/scheduling/machines" element={<SchedulerMachines />} />
          <Route path="/scheduling/setters" element={<SchedulerSetters />} />
          <Route path="/scheduling/audit" element={<SchedulerAudit />} />

          {/* Change Control Module */}
          <Route path="/change-control" element={<ChangeControlHub />} />
          
          {/* Production Module */}
          <Route path="/production" element={<ProductionHub />} />
          <Route path="/production/capacity" element={<CapacityPlanning />} />
          
          {/* Manufacturing Engineering Module */}
          <Route path="/manufacturing" element={<ManufacturingHub />} />
          
          {/* Work Order (shared) */}
          <Route path="/work-order/:id" element={<WorkOrderForm />} />
          
          {/* Admin */}
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/form-fields" element={<AdminFormFields />} />
          
          {/* User */}
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
