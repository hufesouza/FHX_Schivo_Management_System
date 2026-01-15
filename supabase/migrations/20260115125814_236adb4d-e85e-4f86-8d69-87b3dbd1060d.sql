-- Create subcon vendors table for quotation system
CREATE TABLE public.quotation_subcon_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bp_code VARCHAR(20) NOT NULL UNIQUE,
  bp_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_subcon_vendors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all vendors
CREATE POLICY "Authenticated users can view vendors"
ON public.quotation_subcon_vendors
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert vendors
CREATE POLICY "Authenticated users can insert vendors"
ON public.quotation_subcon_vendors
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update vendors
CREATE POLICY "Authenticated users can update vendors"
ON public.quotation_subcon_vendors
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete vendors
CREATE POLICY "Authenticated users can delete vendors"
ON public.quotation_subcon_vendors
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_quotation_subcon_vendors_updated_at
BEFORE UPDATE ON public.quotation_subcon_vendors
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial vendor data
INSERT INTO public.quotation_subcon_vendors (bp_name, bp_code) VALUES
('Aalberts Surface Technologies GmbH', 'SA0122'),
('Acktar Ltd', 'SA0121'),
('Aerospace Metal Finishers Ltd.', 'SA0085'),
('Blosch AG', 'SB0045'),
('Bodycote Heat Treatment', 'SB0028'),
('Computer Plating Specialists Limited', 'SC0087'),
('Computer Plating Specialists Ltd.', 'SC0062'),
('DOT GmbH', 'SD0053'),
('ES Precision Ltd.', 'SE0057'),
('Extrude Hone Ltd.', 'SE0015'),
('Galvotech Ltd', 'SG0031'),
('Graph Engineering', 'SG0011'),
('Heimerle + Meule GmbH', 'SH0058'),
('Manchester Electroplating Ltd', 'SM0028'),
('Metalcraft Plastic Coatings Ltd', 'SM0050'),
('Moulding Technology Ltd.', 'SM0102'),
('National Heat Treatment', 'SN0002'),
('Neil Marchant', 'SN0004'),
('OMC Technologies DAC', 'SO0034'),
('Rosler UK', 'SR0034'),
('Specialty Coating Systems', 'SS0119'),
('Surface Technology Scotland', 'SS0040'),
('Wallwork Heat Treatment', 'SW0028'),
('Waterford Plating Ltd', 'SW0004'),
('WS2 Coatings', 'SW0011'),
('Xometry Europe GmbH', 'SX0004');