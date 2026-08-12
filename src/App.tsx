import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NPIHub from "./pages/NPIHub";
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
import SchedulerOverview from "./pages/scheduler/SchedulerOverview";
import MachineCalendars from "./pages/scheduler/MachineCalendars";
import ProductionCalendar from "./pages/scheduler/ProductionCalendar";
import ProgrammingCalendar from '@/pages/scheduler/ProgrammingCalendar';

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
          <Route path="/npi/quotation-dashboard" element={<QuotationDashboard />} />
          <Route path="/npi/order-intelligence" element={<NPIOrderSiteSelect />} />
          <Route path="/npi/order-intelligence/:site" element={<NPIOrderIntelligence />} />




          {/* NPI Resource Scheduling & Capacity Planning */}
          <Route path="/scheduling" element={<SchedulerOverview />} />
          <Route path="/scheduling/machines-calendar" element={<MachineCalendars />} />
          <Route path="/scheduling/programming" element={<ProgrammingCalendar />} />
          <Route path="/scheduling/production" element={<ProductionCalendar />} />

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
          
          {/* Admin */}
          <Route path="/admin/users" element={<AdminUsers />} />

          {/* User */}
          <Route path="/profile" element={<Profile />} />

          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
