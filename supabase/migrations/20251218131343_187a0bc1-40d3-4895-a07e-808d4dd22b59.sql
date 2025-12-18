-- NPI Projects main table
CREATE TABLE public.npi_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_number TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  customer TEXT,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'simple' CHECK (project_type IN ('simple', 'complex')),
  current_phase TEXT NOT NULL DEFAULT 'planning' CHECK (current_phase IN ('planning', 'execution', 'process_qualification', 'completed', 'on_hold')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  project_manager_id UUID REFERENCES auth.users(id),
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Charter details (WD-FRM-0012)
CREATE TABLE public.npi_project_charter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  scope TEXT,
  objectives TEXT,
  deliverables TEXT,
  success_criteria TEXT,
  constraints TEXT,
  assumptions TEXT,
  risks TEXT,
  budget_notes TEXT,
  approved_by TEXT,
  approved_date DATE,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Design Transfer Checklist items (WD-FRM-0013)
CREATE TABLE public.npi_design_transfer_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL DEFAULT 'planning' CHECK (phase IN ('planning', 'execution', 'process_qualification')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'not_applicable')),
  owner_id UUID REFERENCES auth.users(id),
  owner_name TEXT,
  due_date DATE,
  completed_date DATE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Team Members
CREATE TABLE public.npi_project_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL,
  responsibilities TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Project Milestones / Gate Reviews
CREATE TABLE public.npi_project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.npi_projects(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('planning', 'execution', 'process_qualification')),
  target_date DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  notes TEXT,
  approved_by TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link NPI Projects to Blue Reviews
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS npi_project_id UUID REFERENCES public.npi_projects(id);

-- Link NPI Projects to NPI Pipeline Jobs
ALTER TABLE public.npi_jobs ADD COLUMN IF NOT EXISTS npi_project_id UUID REFERENCES public.npi_projects(id);

-- Create sequence for project numbers
CREATE SEQUENCE IF NOT EXISTS npi_project_number_seq START 1;

-- Enable RLS
ALTER TABLE public.npi_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_project_charter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_design_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for npi_projects
CREATE POLICY "Authenticated users can view npi_projects" ON public.npi_projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert npi_projects" ON public.npi_projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update npi_projects" ON public.npi_projects FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete npi_projects" ON public.npi_projects FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for npi_project_charter
CREATE POLICY "Authenticated users can view npi_project_charter" ON public.npi_project_charter FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert npi_project_charter" ON public.npi_project_charter FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update npi_project_charter" ON public.npi_project_charter FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete npi_project_charter" ON public.npi_project_charter FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for npi_design_transfer_items
CREATE POLICY "Authenticated users can view npi_design_transfer_items" ON public.npi_design_transfer_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert npi_design_transfer_items" ON public.npi_design_transfer_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update npi_design_transfer_items" ON public.npi_design_transfer_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete npi_design_transfer_items" ON public.npi_design_transfer_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for npi_project_team
CREATE POLICY "Authenticated users can view npi_project_team" ON public.npi_project_team FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage npi_project_team" ON public.npi_project_team FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for npi_project_milestones
CREATE POLICY "Authenticated users can view npi_project_milestones" ON public.npi_project_milestones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert npi_project_milestones" ON public.npi_project_milestones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update npi_project_milestones" ON public.npi_project_milestones FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete npi_project_milestones" ON public.npi_project_milestones FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_npi_projects_updated_at BEFORE UPDATE ON public.npi_projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_npi_project_charter_updated_at BEFORE UPDATE ON public.npi_project_charter FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_npi_design_transfer_items_updated_at BEFORE UPDATE ON public.npi_design_transfer_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_npi_project_milestones_updated_at BEFORE UPDATE ON public.npi_project_milestones FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX idx_npi_projects_status ON public.npi_projects(status);
CREATE INDEX idx_npi_projects_current_phase ON public.npi_projects(current_phase);
CREATE INDEX idx_npi_design_transfer_items_project ON public.npi_design_transfer_items(project_id);
CREATE INDEX idx_npi_project_milestones_project ON public.npi_project_milestones(project_id);
CREATE INDEX idx_work_orders_npi_project ON public.work_orders(npi_project_id);
CREATE INDEX idx_npi_jobs_npi_project ON public.npi_jobs(npi_project_id);