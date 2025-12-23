import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NPIHub from "./pages/NPIHub";
import BlueReviewDashboard from "./pages/BlueReviewDashboard";
import DailyMeeting from "./pages/DailyMeeting";
import QuotationHub from "./pages/QuotationHub";
import QuotationNew from "./pages/QuotationNew";
import QuotationMachines from "./pages/QuotationMachines";
import QuotationComplianceSettings from "./pages/QuotationComplianceSettings";
import PertEstimator from "./pages/PertEstimator";
import NPIPipeline from "./pages/NPIPipeline";
import QuotationControlHub from "./pages/QuotationControlHub";
import NPIProjects from "./pages/NPIProjects";
import NPIProjectDetail from "./pages/NPIProjectDetail";
import DrawingTranslate from "./pages/DrawingTranslate";
import ChangeControlHub from "./pages/ChangeControlHub";
import ManufacturingHub from "./pages/ManufacturingHub";
import ProductionHub from "./pages/ProductionHub";
import CapacityPlanning from "./pages/CapacityPlanning";
import Auth from "./pages/Auth";
import WorkOrderForm from "./pages/WorkOrderForm";
import AdminUsers from "./pages/AdminUsers";
import AdminFormFields from "./pages/AdminFormFields";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

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
          <Route path="/npi/pipeline" element={<NPIPipeline />} />
          <Route path="/npi/quotation-control" element={<QuotationControlHub />} />
          <Route path="/npi/projects" element={<NPIProjects />} />
          <Route path="/npi/projects/:id" element={<NPIProjectDetail />} />
          <Route path="/npi/drawing-translate" element={<DrawingTranslate />} />
          
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
