-- Create quotation_tools table for storing tool costs
CREATE TABLE public.quotation_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.system_quotations(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL DEFAULT 1,
  tool_name TEXT,
  quantity NUMERIC DEFAULT 1,
  price NUMERIC DEFAULT 0,
  markup NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_tools ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all tools" ON public.quotation_tools FOR SELECT USING (true);
CREATE POLICY "Users can insert tools" ON public.quotation_tools FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tools" ON public.quotation_tools FOR UPDATE USING (true);
CREATE POLICY "Users can delete tools" ON public.quotation_tools FOR DELETE USING (true);

-- Create tool_library table for reusable tool definitions
CREATE TABLE public.quotation_tool_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  default_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  site TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_tool_library ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all tool library" ON public.quotation_tool_library FOR SELECT USING (true);
CREATE POLICY "Users can insert tool library" ON public.quotation_tool_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tool library" ON public.quotation_tool_library FOR UPDATE USING (true);
CREATE POLICY "Users can delete tool library" ON public.quotation_tool_library FOR DELETE USING (true);