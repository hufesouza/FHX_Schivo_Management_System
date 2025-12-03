import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NPIHub from "./pages/NPIHub";
import BlueReviewDashboard from "./pages/BlueReviewDashboard";
import ChangeControlHub from "./pages/ChangeControlHub";
import ManufacturingHub from "./pages/ManufacturingHub";
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
          
          {/* Change Control Module */}
          <Route path="/change-control" element={<ChangeControlHub />} />
          
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
