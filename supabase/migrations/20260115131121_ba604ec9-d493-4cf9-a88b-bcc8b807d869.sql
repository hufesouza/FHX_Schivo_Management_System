-- Create customers table for quotation system
CREATE TABLE public.quotation_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bp_code TEXT NOT NULL UNIQUE,
  bp_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_customers ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view customers"
  ON public.quotation_customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON public.quotation_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.quotation_customers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON public.quotation_customers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_quotation_customers_updated_at
  BEFORE UPDATE ON public.quotation_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert customer data
INSERT INTO public.quotation_customers (bp_code, bp_name) VALUES
('CA0003', 'Alcon Ireland Ltd'),
('CA0010', 'Atlas Box & Crating Company Ireland Ltd'),
('CA0011', 'Allsop Europe Ltd'),
('CA0012', 'Arkopharma Ireland Ltd'),
('CA0017', 'AOTI Ltd.'),
('CA0018', 'Assembly Techniques Ltd'),
('CA0022', 'Advanced Sensors Ltd.'),
('CA0023', 'AK Envirotek Manufacturing Ltd.'),
('CA0024', 'Andor Technology'),
('CA0025', 'ABEC Technologies Europe Ltd.'),
('CA0026', 'Arrotek Medical Ltd.'),
('CA0027', 'AK Envirotek Manufacturing Ltd.'),
('CA0028', 'Artesyn Biosolutions Ireland Ltd'),
('CA0029', 'Asahi Intecc Co. Ltd.'),
('CA0030', 'Alrad Imaging'),
('CA0031', 'AventaMed DAC'),
('CA0032', 'Abbott Ireland Vascular Division'),
('CA0033', 'Adaptas Solutions'),
('CA0034', 'AltaScience Ltd.'),
('CA0035', 'APN Inc.'),
('CB0001', 'Bausch & Lomb Ireland Ltd.'),
('CB0002', 'Benchmark Electronics BV'),
('CB0004', 'Baker Hughes'),
('CB0006', 'Brian Reece Scientific Ltd'),
('CB0007', 'Bausch & Lomb, Inc.'),
('CB0012', 'Borgwarner Tralee Ltd.'),
('CB0013', 'BD Gencell'),
('CB0014', 'BL Industria Otica Ltd'),
('CC0002', 'Carten Controls Ltd'),
('CC0004', 'Cathx Ocean Ltd.'),
('CC0005', 'Caulfield Industrial Ltd.'),
('CC0008', 'Acra Control Ltd T/A Curtis Wright'),
('CC0009', 'Commerc Service spol s.r.o.'),
('CC0010', 'CMR Surgical Ltd.'),
('CC0011', 'CarThéra'),
('CC0012', 'Cardinal Health Ire Mfg Ltd.'),
('CC0013', 'Creganna Medical Ireland Ltd.'),
('CC0014', 'Clearstream Technologies T/A BD Enniscorthy'),
('CC0016', 'Cable Accessories Ltd'),
('CD0003', 'DePuy (Ireland)'),
('CD0005', 'DFL Fit Outs & Joinery'),
('CD0006', 'Diamond Precision Engineering Ltd'),
('CD0007', 'Diba Industries'),
('CD0008', 'Distalmotion SA'),
('CE0003', 'EMC Information Systems International'),
('CE0009', 'Ecoburner Products Ltd.'),
('CE0010', 'EMC Corporation'),
('CE0012', 'EMC Corporation'),
('CE0013', 'ELC Laser Group'),
('CE0014', 'Atalys Asheboro'),
('CF0003', 'Fiber Tek Manufacturing Ltd'),
('CF0004', 'FineHeart'),
('CF0005', 'Flextronics Manufacturing (Singapore) Pte Ltd.'),
('CF0006', 'ForSight Robotics'),
('CG0002', 'Nova Precision Ltd'),
('CG0003', 'GE Healthcare'),
('CG0004', 'GES Singapore Pte Ltd'),
('CH0001', 'Hanley Controls'),
('CH0002', 'Harte Designs Ltd'),
('CH0003', 'Hattori'),
('CH0004', 'Garrett Motion Ireland Limited'),
('CH0013', 'Honeywell (HPS) Hubco'),
('CH0016', 'Honeywell Limited (Canada)'),
('CH0017', 'Hyperfine-Research Inc.'),
('CH0019', 'Hartzell Engine Technologies LLC'),
('CI0005', 'Integra Lifesciences Ireland Ltd'),
('CI0006', 'Innalabs Limited'),
('CI0007', 'Intuitive Surgical Sarl'),
('CI0008', 'Intuitive Surgical Operations Inc.'),
('CK0001', 'Knauer Wissenschaftliche Gerate GmbH'),
('CL0001', 'Lake Region Medical Ltd.'),
('CL0002', 'Loci Orthopaedics Ltd.'),
('CM0001', 'M&M Qualtech Ltd'),
('CM0003', 'Moog Ltd'),
('CM0007', 'Misc Customer'),
('CM0008', 'MKS Instruments UK Ltd-Telvac Engineering'),
('CM0009', 'Midland Precision Equipment Co. Ltd.'),
('CM0010', 'MicroGroup'),
('CM0011', 'MOBILion Systems Inc.'),
('CM0012', 'Momentis Surgical Ltd.'),
('CM0013', 'Midland Precision Equipment Co Ltd.'),
('CN0002', 'NT-MDT Service & Logistics Ltd'),
('CN0003', 'Nypro Ltd'),
('CN0004', 'Neurent Medical'),
('CN0005', 'Nypro Ltd'),
('CN0006', 'Nypro Plastics & Metal Products (Shenzhen) Co. Ltd.'),
('CN0007', 'Natus Medical Inc.'),
('CO0001', 'OrthoXel Ltd.'),
('CP0003', 'Pharrais Ltd T/A Qubos'),
('CP0004', 'Penlon Ltd.'),
('CQ0001', 'Quantum3 Aluminium Ltd.'),
('CR0004', 'RIM Plastics Technology Ltd.'),
('CR0005', 'Realtime Technologies Ltd'),
('CR0006', 'RAIS Slovakia sro'),
('CS0001', 'Stratasys GmbH'),
('CS0008', 'Stryker Ireland Ltd'),
('CS0017', 'Sterimed'),
('CS0020', 'Sumitomo (SHI) Cryogenics of America Inc.'),
('CS0021', 'Sterimed'),
('CS0022', 'Sterimed Mena LLC'),
('CS0023', 'Schivo NI Ltd.'),
('CS0024', 'Schivo NI Ltd.'),
('CS0025', 'Sterimed Latin America LLC'),
('CS0026', 'SiriusXT Ltd.'),
('CS0028', 'Signum Surgical'),
('CS0029', 'Synoste Oy'),
('CS0030', 'Stryker NV Operations Ltd.'),
('CS0031', 'Sensor Kinesis'),
('CS0032', 'Supreme Screw Products Inc.'),
('CT0002', 'TCAD Services & Prototyping'),
('CT0008', 'TFC Cable Assemblies'),
('CT0009', 'TT Electronics Integrated Manufacturing Services (Suzhou) Ltd.'),
('CT0010', '3Dispense LLC'),
('CT0011', 'Terumo Cardiovascular Systems Corporation'),
('CT0013', 'TFC Cable Assemblies sro'),
('CT0015', 'Thermo Fisher Scientific'),
('CT0016', 'ThermoExpert Deutschland GmbH'),
('CU0001', 'United Metal Recycling (Irl) Ltd.'),
('CU0002', 'Unique Perspectives Ltd'),
('CU0003', 'Utah Medical Products Ltd.'),
('CV0001', 'Varian Medical Systems UK Ltd'),
('CV0002', 'Vasorum Ltd.'),
('CV0003', 'Valcare Med Ltd.'),
('CW0003', 'Waters Corporation'),
('CW0004', 'Micromass UK Ltd.'),
('CW0005', 'Waters Technologies Ireland Ltd'),
('CW0007', 'South East Technological University'),
('CW0008', 'Micromass UK Ltd.'),
('CX0001', 'X-Bolt Orthopaedics');