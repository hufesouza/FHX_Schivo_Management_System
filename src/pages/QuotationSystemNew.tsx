import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, Trash2, Calculator, FileText, Package, Truck, ListOrdered, HelpCircle, Info, ChevronRight, ChevronLeft, RefreshCw, AlertTriangle, Check, Pencil, X, CheckCircle, Upload, Eye, FileUp, Wrench, Factory, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useQuotationResources, useQuotationSettings } from '@/hooks/useQuotationSystem';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DrawingPreviewDialog } from '@/components/drawings/DrawingPreviewDialog';

type CalculationExplainer = 'setupCost' | 'routingCost' | 'material' | 'subcon' | 'totalCost' | 'costPerPart' | 'unitPrice' | 'ratePerHour' | 'margin' | null;

interface MaterialLine {
  line_number: number;
  vendor_no: string;
  vendor_name: string;
  part_number: string;
  material_description: string;
  mat_category: string;
  uom: string;
  qty_per_unit: number;
  qa_inspection_required: boolean;
  std_cost_est: number;
  certification_required: string;
  purchaser: string;
  length: number;
  diameter: number;
  cut_off: number;
  overhead: number;
  // Per-volume qty overrides (null = use calculated value)
  qty_vol_1?: number | null;
  qty_vol_2?: number | null;
  qty_vol_3?: number | null;
  qty_vol_4?: number | null;
  qty_vol_5?: number | null;
}

interface ToolLine {
  id?: string;
  line_number: number;
  tool_name: string;
  price: number;
  markup: number;
  // Per-volume quantities
  qty_vol_1?: number;
  qty_vol_2?: number;
  qty_vol_3?: number;
  qty_vol_4?: number;
  qty_vol_5?: number;
}

interface SubconLine {
  line_number: number;
  subcon_id: number; // Groups rows for the same subcon type
  vendor_no: string;
  vendor_name: string;
  part_number: string;
  process_description: string;
  quantity: number;
  std_cost_est: number;
  certification_required: boolean;
}

interface RoutingLine {
  op_no: number;
  sublevel_bom: boolean;
  part_number: string;
  resource_no: string;
  operation_details: string;
  subcon_processing_time: number;
  setup_time: number;
  run_time: number;
  override_cost?: number | null;
  include_setup_calc: boolean;
}

interface VolumePricing {
  quantity: number;
  margin: number;
}

interface Customer {
  id: string;
  bp_code: string;
  bp_name: string;
  is_active: boolean;
}

interface SubconVendor {
  id: string;
  bp_code: string;
  bp_name: string;
  is_active: boolean;
}

interface MaterialSupplier {
  id: string;
  bp_code: string;
  bp_name: string;
  is_active: boolean;
}

const QuotationSystemNew = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { resources, loading: resourcesLoading } = useQuotationResources();
  const { settings, getSettingValue, loading: settingsLoading } = useQuotationSettings();
  const [saving, setSaving] = useState(false);
  const [finishingQuote, setFinishingQuote] = useState(false);
  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [activeTab, setActiveTab] = useState('header');
  const [quotationId, setQuotationId] = useState<string | null>(editId || null);
  const [enquiryPartId, setEnquiryPartId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subconVendors, setSubconVendors] = useState<SubconVendor[]>([]);
  const [materialSuppliers, setMaterialSuppliers] = useState<MaterialSupplier[]>([]);
  const [explainerOpen, setExplainerOpen] = useState<CalculationExplainer>(null);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [materialVendorPopoverOpen, setMaterialVendorPopoverOpen] = useState<number | null>(null);
  const [subconVendorPopoverOpen, setSubconVendorPopoverOpen] = useState<number | null>(null);
  // Initialize with non-development operations included in setup calculation
  // (Saw, Machine Setup, Machine Parts Complete, Deburr, Wash, QA ops)
  const [setupIncludedOps, setSetupIncludedOps] = useState<Set<number>>(new Set([20, 40, 60, 70, 80, 90, 100, 110]));
  // Exclude subcon from margin calculation when subcon cost warning is triggered
  const [excludeSubconFromMargin, setExcludeSubconFromMargin] = useState(false);
  
  // Drawing state
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null);
  const [extractingFromDrawing, setExtractingFromDrawing] = useState(false);
  const [drawingPreviewOpen, setDrawingPreviewOpen] = useState(false);
  const drawingInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state for routing
  const [draggedRoutingIdx, setDraggedRoutingIdx] = useState<number | null>(null);

  const tabOrder = ['header', 'materials', 'tools', 'subcon', 'production', 'secondary', 'pricing']; // 'routings' hidden for now


  // Fetch customers, subcon vendors, and material suppliers lists
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('quotation_customers')
        .select('*')
        .eq('is_active', true)
        .order('bp_name');
      
      if (!error && data) {
        setCustomers(data);
      }
    };
    
    const fetchSubconVendors = async () => {
      const { data, error } = await supabase
        .from('quotation_subcon_vendors')
        .select('*')
        .eq('is_active', true)
        .order('bp_name');
      
      if (!error && data) {
        setSubconVendors(data);
      }
    };

    const fetchMaterialSuppliers = async () => {
      const { data, error } = await supabase
        .from('quotation_material_suppliers')
        .select('*')
        .eq('is_active', true)
        .order('bp_name');
      
      if (!error && data) {
        setMaterialSuppliers(data);
      }
    };
    
    fetchCustomers();
    fetchSubconVendors();
    fetchMaterialSuppliers();
  }, []);

  // Auto-update customer code when customer name changes (uses site-filtered list)
  const getCustomerCode = (customerName: string): string => {
    const match = siteCustomers.find(c => 
      c.bp_name.toLowerCase() === customerName.toLowerCase()
    );
    return match ? match.bp_code : 'N/A';
  };

  // Check if customer is in the list (uses site-filtered list)
  const isKnownCustomer = (customerName: string): boolean => {
    if (!customerName.trim()) return true; // Empty is fine
    return siteCustomers.some(c => 
      c.bp_name.toLowerCase() === customerName.toLowerCase()
    );
  };

  // Filter customers by search term (uses site-filtered list)
  const getFilteredCustomers = (searchTerm: string) => {
    if (!searchTerm.trim()) return siteCustomers;
    return siteCustomers.filter(c => 
      c.bp_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bp_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Auto-update vendor code when vendor name changes (uses site-filtered list)
  const getVendorCode = (vendorName: string): string => {
    const match = siteSubconVendors.find(v => 
      v.bp_name.toLowerCase() === vendorName.toLowerCase()
    );
    return match ? match.bp_code : 'N/A';
  };

  // Check if subcon vendor is in the list (uses site-filtered list)
  const isKnownSubconVendor = (vendorName: string): boolean => {
    if (!vendorName.trim()) return true;
    return siteSubconVendors.some(v => 
      v.bp_name.toLowerCase() === vendorName.toLowerCase()
    );
  };

  // Filter subcon vendors by search term (uses site-filtered list)
  const getFilteredSubconVendors = (searchTerm: string) => {
    if (!searchTerm.trim()) return siteSubconVendors;
    return siteSubconVendors.filter(v => 
      v.bp_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.bp_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Auto-update material supplier code when name changes (uses site-filtered list)
  const getMaterialSupplierCode = (supplierName: string): string => {
    const match = siteMaterialSuppliers.find(s => 
      s.bp_name.toLowerCase() === supplierName.toLowerCase()
    );
    return match ? match.bp_code : 'N/A';
  };

  // Check if material supplier is in the list (uses site-filtered list)
  const isKnownMaterialSupplier = (supplierName: string): boolean => {
    if (!supplierName.trim()) return true;
    return siteMaterialSuppliers.some(s => 
      s.bp_name.toLowerCase() === supplierName.toLowerCase()
    );
  };

  // Filter material suppliers by search term (uses site-filtered list)
  const getFilteredMaterialSuppliers = (searchTerm: string) => {
    if (!searchTerm.trim()) return siteMaterialSuppliers;
    return siteMaterialSuppliers.filter(s => 
      s.bp_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bp_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Site selection
  const [site, setSite] = useState<'waterford' | 'mexico'>('waterford');

  // Header state
  const [header, setHeader] = useState({
    enquiry_no: '',
    customer: '',
    customer_code: '',
    quoted_by: '',
    part_number: '',
    revision: '',
    description: '',
    qty_per: 1,
    manufacture_type: 'Manufacture',
    blue_review_required: false,
    batch_traceable: false,
    rohs_compliant: true,
    serial_traceable: false,
    material_markup: 20,
    subcon_markup: 20,
    status: 'draft',
  });

  // Filter data by selected site
  const siteResources = useMemo(() => {
    const seen = new Set<string>();
    return resources
      .filter(r => r.site === site && r.is_active)
      .filter(r => {
        if (seen.has(r.resource_no)) return false;
        seen.add(r.resource_no);
        return true;
      });
  }, [resources, site]);

  const siteCustomers = useMemo(() => 
    customers.filter(c => (c as any).site === site || !(c as any).site),
    [customers, site]
  );

  const siteSubconVendors = useMemo(() => 
    subconVendors.filter(v => (v as any).site === site || !(v as any).site),
    [subconVendors, site]
  );

  const siteMaterialSuppliers = useMemo(() => 
    materialSuppliers.filter(s => (s as any).site === site || !(s as any).site),
    [materialSuppliers, site]
  );

  // Currency state
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'CAD' | 'GBP'>('EUR');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [baseRates, setBaseRates] = useState<Record<string, number>>({ EUR: 1.0, USD: 1.08, GBP: 0.86, CAD: 1.47 });
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesSource, setRatesSource] = useState('');

  const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    CAD: 'C$',
    GBP: '£'
  };

  // Volume state
  const [volumes, setVolumes] = useState<VolumePricing[]>([
    { quantity: 500, margin: 45 },
    { quantity: 750, margin: 40 },
    { quantity: 1000, margin: 35 },
  ]);

  // Materials state
  const [materialUnits, setMaterialUnits] = useState<'metric' | 'imperial'>('metric');
  const [materials, setMaterials] = useState<MaterialLine[]>([
    { line_number: 1, vendor_no: '', vendor_name: '', part_number: '', material_description: '', mat_category: '', uom: 'Each', qty_per_unit: 1, qa_inspection_required: false, std_cost_est: 0, certification_required: '', purchaser: '', length: 0, diameter: 0, cut_off: 0, overhead: 0 }
  ]);

  // Subcon state - generate initial lines based on volumes
  const generateSubconLines = (subconId: number, vendorNo: string, vendorName: string, processDesc: string, costs: number[], certReq: boolean): SubconLine[] => {
    return volumes.map((vol, idx) => ({
      line_number: (subconId - 1) * volumes.length + idx + 1,
      subcon_id: subconId,
      vendor_no: vendorNo,
      vendor_name: vendorName,
      part_number: `${header.part_number}Rev${header.revision}SCL${subconId}`,
      process_description: processDesc,
      quantity: vol.quantity,
      std_cost_est: costs[idx] || 0,
      certification_required: certReq
    }));
  };

  const [subcons, setSubcons] = useState<SubconLine[]>([]);

  // Production Planning state
  const [productionPlanning, setProductionPlanning] = useState({
    cycle_time_per_piece: 0, // seconds
    production_hours_per_day: 18,
    production_effectiveness: 85, // percentage
    hourly_rate: 0,
    programming_hours: undefined as number | undefined,
    programming_rate: undefined as number | undefined,
    setup_hours: undefined as number | undefined,
    setup_rate: undefined as number | undefined,
    production_profit_percent: undefined as number | undefined,
    production_sales_commission_percent: undefined as number | undefined,
  });

  // Production Planning calculated values
  const productionCalculations = useMemo(() => {
    const cycleTimeSeconds = productionPlanning.cycle_time_per_piece || 0;
    const hoursPerDay = productionPlanning.production_hours_per_day || 18;
    const effectiveness = productionPlanning.production_effectiveness || 85;
    const hourlyRate = productionPlanning.hourly_rate || 0;

    console.log('Production Planning Debug:', {
      cycleTimeSeconds,
      hoursPerDay,
      effectiveness,
      hourlyRate,
      rawHourlyRate: productionPlanning.hourly_rate
    });

    // Programming cost = hours × rate
    const programmingCost = (productionPlanning.programming_hours || 0) * (productionPlanning.programming_rate || 0);
    // Setup cost = hours × rate
    const setupCost = (productionPlanning.setup_hours || 0) * (productionPlanning.setup_rate || 0);

    // Calculate per-volume metrics
    return volumes.map(vol => {
      const quantity = vol.quantity || 0;
      
      // Correct formula:
      // 1) Effective production seconds per day = hours/day × 3600 × (effectiveness / 100)
      // 2) Pieces per day = effective seconds per day / cycle time per piece
      // 3) Days needed = ceil(quantity / pieces per day)
      const effectiveSecondsPerDay = hoursPerDay * 3600 * (effectiveness / 100);
      const piecesPerDay = cycleTimeSeconds > 0 ? effectiveSecondsPerDay / cycleTimeSeconds : 0;
      const timeNeededDays = piecesPerDay > 0 ? Math.ceil(quantity / piecesPerDay) : 0;

      // Cost per detail = (Cycle time / 3600) × Hourly rate × (100 / effectiveness)
      const effectivenessFactor = effectiveness > 0 ? 100 / effectiveness : 0;
      const costPerDetail = cycleTimeSeconds > 0 && effectiveness > 0 
        ? (cycleTimeSeconds / 3600) * hourlyRate * effectivenessFactor 
        : 0;

      // Total cost = Quantity × Cost per detail
      const totalCost = quantity * costPerDetail;

      return {
        quantity,
        timeNeededDays,
        costPerDetail,
        totalCost,
        programmingCost,
        setupCost,
      };
    });
  }, [productionPlanning, volumes]);

  const [tools, setTools] = useState<ToolLine[]>([]);
  const [toolLibrary, setToolLibrary] = useState<{id: string; tool_name: string; default_price: number}[]>([]);
  const [newToolDialogOpen, setNewToolDialogOpen] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [newToolPrice, setNewToolPrice] = useState(0);

  // Secondary Operations state
  interface SecondaryOp {
    id: string;
    operation: string;
    cost_type: 'per_piece' | 'per_run' | 'total';
    quantity_per_run: number;
    cost: number;
    lead_time: string;
    markup: number;
    notes: string;
  }
  const [secondaryOps, setSecondaryOps] = useState<SecondaryOp[]>([]);
  const [secondaryOpForm, setSecondaryOpForm] = useState<Omit<SecondaryOp, 'id'>>({
    operation: '',
    cost_type: 'per_run',
    quantity_per_run: 0,
    cost: 0,
    lead_time: '',
    markup: 0,
    notes: ''
  });

  // Secondary operations use resources from the database
  // Fetch tool library
  useEffect(() => {
    const fetchToolLibrary = async () => {
      const { data, error } = await supabase
        .from('quotation_tool_library')
        .select('*')
        .eq('is_active', true)
        .order('tool_name');
      
      if (!error && data) {
        setToolLibrary(data);
      }
    };
    fetchToolLibrary();
  }, []);

  // Calculate tool cost for a specific volume tier
  const calculateToolTotalForVolume = (tool: ToolLine, volumeIndex: number): number => {
    const qtyKey = `qty_vol_${volumeIndex + 1}` as keyof ToolLine;
    const qty = (tool[qtyKey] as number) || 0;
    return qty * tool.price * (1 + tool.markup / 100);
  };

  // Get total tools cost for the first active volume (for display in summary)
  const totalToolsCost = useMemo(() => {
    return tools.reduce((sum, t) => sum + calculateToolTotalForVolume(t, 0), 0);
  }, [tools]);

  // Get total tools cost for a specific volume tier
  const getTotalToolsCostForVolume = (volumeIndex: number): number => {
    return tools.reduce((sum, t) => sum + calculateToolTotalForVolume(t, volumeIndex), 0);
  };

  const addToolLine = (selectedToolName?: string) => {
    const selectedTool = selectedToolName ? toolLibrary.find(t => t.tool_name === selectedToolName) : undefined;
    setTools([...tools, {
      line_number: tools.length + 1,
      tool_name: selectedTool?.tool_name || '',
      price: selectedTool?.default_price || 0,
      markup: 0
    } as ToolLine]);
  };

  const removeToolLine = (lineNumber: number) => {
    setTools(tools.filter(t => t.line_number !== lineNumber).map((t, idx) => ({ ...t, line_number: idx + 1 })));
  };

  const addNewToolToLibrary = async () => {
    if (!newToolName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('quotation_tool_library')
        .insert({ tool_name: newToolName.trim(), default_price: newToolPrice, site: site })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setToolLibrary([...toolLibrary, data]);
        // Add this new tool to the current quote
        addToolLine(data.tool_name);
        setNewToolDialogOpen(false);
        setNewToolName('');
        setNewToolPrice(0);
        toast.success('Tool added to library');
      }
    } catch (error) {
      console.error('Error adding tool to library:', error);
      toast.error('Failed to add tool');
    }
  };

  // Generate virtual subcon resources from subcon lines (available only in this quotation)
  const subconResources = useMemo(() => {
    const subconIds = [...new Set(subcons.map(s => s.subcon_id))];
    return subconIds.map(id => {
      const firstLine = subcons.find(s => s.subcon_id === id);
      const partNumber = `${header.part_number}Rev${header.revision}SCL${id}`;
      return {
        id: `subcon-${id}`,
        resource_no: partNumber,
        resource_description: `Subcon: ${firstLine?.process_description || 'External Process'}`,
        cost_per_minute: 0, // Subcon cost is handled separately
        is_active: true,
        site: site,
        is_subcon: true,
        subcon_id: id,
      };
    });
  }, [subcons, header.part_number, header.revision, site]);

  // Combined resources: site resources + virtual subcon resources
  const allAvailableResources = useMemo(() => {
    return [...siteResources, ...subconResources];
  }, [siteResources, subconResources]);

  // Standard routing template - auto-populated for new quotations
  const defaultRoutings: RoutingLine[] = [
    { op_no: 10, sublevel_bom: false, part_number: '', resource_no: 'ManuEng', operation_details: 'REVIEW PROCESS, METHOD & FILL IN BLUE REVIEW - REQUEST IF NOT SUPPLIED', subcon_processing_time: 0, setup_time: 0.1, run_time: 0, include_setup_calc: false },
    { op_no: 20, sublevel_bom: false, part_number: '', resource_no: 'Saw', operation_details: 'BOOK OUT ALLOCATED MATERIAL', subcon_processing_time: 0, setup_time: 10, run_time: 0, include_setup_calc: true },
    { op_no: 30, sublevel_bom: false, part_number: '', resource_no: 'DoosanMX1600', operation_details: 'DEVELOPMENT TIME', subcon_processing_time: 1440, setup_time: 0, run_time: 0, include_setup_calc: false },
    { op_no: 40, sublevel_bom: false, part_number: '', resource_no: 'DoosanMX1600', operation_details: 'MACHINE SETUP', subcon_processing_time: 0, setup_time: 240, run_time: 0, include_setup_calc: true },
    { op_no: 50, sublevel_bom: false, part_number: '', resource_no: 'DoosanMX1600', operation_details: 'FIRST ARTICLE INSPECTION & BUILD QA PACK', subcon_processing_time: 0, setup_time: 0, run_time: 0.1, include_setup_calc: false },
    { op_no: 60, sublevel_bom: false, part_number: '', resource_no: 'DoosanMX1600', operation_details: 'MACHINE PARTS COMPLETE', subcon_processing_time: 0, setup_time: 0, run_time: 11, include_setup_calc: true },
    { op_no: 70, sublevel_bom: false, part_number: '', resource_no: 'Debur1', operation_details: 'REMOVING BURRS:', subcon_processing_time: 0, setup_time: 0, run_time: 0.5, include_setup_calc: true },
    { op_no: 80, sublevel_bom: false, part_number: '', resource_no: 'Wash', operation_details: 'WASH PARTS as per WD-WI-0048', subcon_processing_time: 0, setup_time: 0, run_time: 0.5, include_setup_calc: true },
    { op_no: 90, sublevel_bom: false, part_number: '', resource_no: 'QA1', operation_details: 'PRE SUBCON INSPECT PER WD-WI-0017', subcon_processing_time: 0, setup_time: 0, run_time: 0.1, include_setup_calc: true },
    { op_no: 100, sublevel_bom: false, part_number: '', resource_no: 'QA1', operation_details: 'POST SUBCON INSPECT PER WD-WI-0017', subcon_processing_time: 0, setup_time: 0, run_time: 0.1, include_setup_calc: true },
    { op_no: 110, sublevel_bom: false, part_number: '', resource_no: 'QA4', operation_details: 'RELEASE TO STOCK AS PER WD-PRO-0011', subcon_processing_time: 0, setup_time: 0, run_time: 0.1, include_setup_calc: true },
    { op_no: 120, sublevel_bom: false, part_number: '', resource_no: 'Dispatch', operation_details: 'Dispatch Shipping times', subcon_processing_time: 2400, setup_time: 0, run_time: 0, include_setup_calc: false },
  ];

  // Routing state - initialized with standard template
  const [routings, setRoutings] = useState<RoutingLine[]>(defaultRoutings);

  // Keep setupIncludedOps in sync when routing lines are removed
  useEffect(() => {
    setSetupIncludedOps((prev) => {
      const existingOpNos = new Set(routings.map((r) => r.op_no));
      return new Set([...prev].filter((opNo) => existingOpNos.has(opNo)));
    });
  }, [routings]);

  // Set default markups from settings
  useEffect(() => {
    if (settings.length > 0) {
      setHeader(prev => ({
        ...prev,
        material_markup: getSettingValue('material_markup_default') || 20,
        subcon_markup: getSettingValue('subcon_markup_default') || 20,
      }));
      setVolumes([
        { quantity: 500, margin: getSettingValue('margin_vol_1') || 45 },
        { quantity: 750, margin: getSettingValue('margin_vol_2') || 40 },
        { quantity: 1000, margin: getSettingValue('margin_vol_3') || 35 },
      ]);
    }
  }, [settings]);

  // Fetch exchange rates
  const fetchExchangeRates = async () => {
    setFetchingRates(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-exchange-rates');
      
      if (error) throw error;
      
      setBaseRates({
        EUR: data.EUR || 1.0,
        USD: data.USD || 1.08,
        GBP: data.GBP || 0.86,
        CAD: data.CAD || 1.47
      });
      setRatesSource(`${data.source} (${data.date})`);
      
      // Update current exchange rate based on selected currency
      setExchangeRate(data[currency] || 1.0);
      
      toast.success('Exchange rates updated');
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast.error('Failed to fetch exchange rates, using defaults');
    } finally {
      setFetchingRates(false);
    }
  };

  // Handle drawing upload and extraction
  const handleDrawingUpload = async (file: File) => {
    setDrawingFile(file);
    setExtractingFromDrawing(true);
    
    // Create a local URL for preview
    const localUrl = URL.createObjectURL(file);
    setDrawingUrl(localUrl);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-part-from-drawing`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (response.status === 402) {
          toast.error('AI credits depleted. Please add credits to continue.');
        } else {
          throw new Error('Failed to extract part details');
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.part_number) {
        setHeader(prev => ({ ...prev, part_number: data.part_number }));
      }
      if (data.description) {
        setHeader(prev => ({ ...prev, description: data.description }));
      }
      if (data.revision) {
        setHeader(prev => ({ ...prev, revision: data.revision }));
      }
      
      if (data.part_number || data.description || data.revision) {
        toast.success('Part details extracted from drawing');
      } else {
        toast.info('Could not extract details - please enter manually');
      }
    } catch (error) {
      console.error('Error extracting part details:', error);
      toast.error('Failed to extract part details from drawing');
    } finally {
      setExtractingFromDrawing(false);
    }
  };

  const handleDrawingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDrawingUpload(file);
    }
    e.target.value = '';
  };

  const clearDrawing = () => {
    if (drawingUrl) {
      URL.revokeObjectURL(drawingUrl);
    }
    setDrawingFile(null);
    setDrawingUrl(null);
  };

  // Fetch rates on mount
  useEffect(() => {
    fetchExchangeRates();
  }, []);

  // Update exchange rate when currency changes
  useEffect(() => {
    setExchangeRate(baseRates[currency] || 1.0);
  }, [currency, baseRates]);

  // Pre-populate from enquiry part when coming from enquiry
  useEffect(() => {
    const loadEnquiryData = async () => {
      const partId = searchParams.get('enquiryPartId');
      const enquiryNo = searchParams.get('enquiryNo');
      const customer = searchParams.get('customer');
      
      if (!partId || editId || searchParams.get('quotationId')) return; // Only for new quotations from enquiry
      
      // Store the enquiry part ID for linking
      setEnquiryPartId(partId);
      
      try {
        // Fetch the enquiry part with its parent enquiry
        const { data: partData, error: partError } = await supabase
          .from('enquiry_parts')
          .select(`
            *,
            enquiry:quotation_enquiries(*)
          `)
          .eq('id', partId)
          .maybeSingle();
        
        if (partError) throw partError;
        
        if (partData) {
          // Pre-populate header with enquiry data
          setHeader(prev => ({
            ...prev,
            enquiry_no: enquiryNo || (partData.enquiry as any)?.enquiry_no || '',
            customer: customer || (partData.enquiry as any)?.customer_name || '',
            part_number: partData.part_number || '',
            revision: partData.revision || '',
            description: partData.description || '',
          }));

          // Try to get customer code
          const customerName = customer || (partData.enquiry as any)?.customer_name;
          if (customerName) {
            const { data: customerData } = await supabase
              .from('quotation_customers')
              .select('bp_code')
              .ilike('bp_name', customerName)
              .maybeSingle();
            
            if (customerData) {
              setHeader(prev => ({
                ...prev,
                customer_code: customerData.bp_code
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error loading enquiry data:', error);
      }
    };
    
    loadEnquiryData();
  }, [searchParams, editId]);

  // Load existing quotation for editing (from route param OR search param)
  useEffect(() => {
    const loadQuotation = async () => {
      const quotationIdFromUrl = searchParams.get('quotationId');
      const idToLoad = editId || quotationIdFromUrl;
      
      if (!idToLoad) return;
      
      // Set the quotation ID for updates
      setQuotationId(idToLoad);
      
      setLoadingQuotation(true);
      try {
        // Load main quotation
        const { data: quotation, error: quotationError } = await supabase
          .from('system_quotations')
          .select('*')
          .eq('id', idToLoad)
          .single();
        
        if (quotationError) throw quotationError;
        
        if (quotation) {
          // Set site first so filtering works correctly
          setSite((quotation as any).site || 'waterford');
          
          // Set enquiry_part_id for linking
          setEnquiryPartId(quotation.enquiry_part_id || null);
          
          setHeader({
            enquiry_no: quotation.enquiry_no || '',
            customer: quotation.customer || '',
            customer_code: quotation.customer_code || '',
            quoted_by: quotation.quoted_by || '',
            part_number: quotation.part_number || '',
            revision: quotation.revision || '',
            description: quotation.description || '',
            qty_per: quotation.qty_per || 1,
            manufacture_type: quotation.manufacture_type || 'Manufacture',
            blue_review_required: quotation.blue_review_required || false,
            batch_traceable: quotation.batch_traceable || false,
            rohs_compliant: quotation.rohs_compliant ?? true,
            serial_traceable: quotation.serial_traceable || false,
            material_markup: quotation.material_markup || 20,
            subcon_markup: quotation.subcon_markup || 20,
            status: quotation.status || 'draft',
          });

          // Load production planning data
          setProductionPlanning({
            cycle_time_per_piece: (quotation as any).cycle_time_per_piece || 0,
            production_hours_per_day: (quotation as any).production_hours_per_day || 18,
            production_effectiveness: (quotation as any).production_effectiveness || 85,
            hourly_rate: (quotation as any).hourly_rate || 0,
            programming_hours: (quotation as any).programming_hours ?? undefined,
            programming_rate: (quotation as any).programming_rate ?? undefined,
            setup_hours: (quotation as any).setup_hours ?? undefined,
            setup_rate: (quotation as any).setup_rate ?? undefined,
            production_profit_percent: (quotation as any).production_profit_percent ?? undefined,
            production_sales_commission_percent: (quotation as any).production_sales_commission_percent ?? undefined,
          });
        }

        // Load volume pricing (for volumes and margins)
        const { data: volumeData } = await supabase
          .from('quotation_volume_pricing')
          .select('*')
          .eq('quotation_id', idToLoad)
          .order('quantity', { ascending: true });
        
        if (volumeData && volumeData.length > 0) {
          setVolumes(volumeData.map(v => ({
            quantity: v.quantity,
            margin: v.margin || 35
          })));
        }

        // Load materials
        const { data: materialsData } = await supabase
          .from('quotation_materials')
          .select('*')
          .eq('quotation_id', idToLoad)
          .order('line_number', { ascending: true });
        
        if (materialsData && materialsData.length > 0) {
          setMaterials(materialsData.map(m => ({
            line_number: m.line_number,
            vendor_no: m.vendor_no || '',
            vendor_name: m.vendor_name || '',
            part_number: m.part_number || '',
            material_description: m.material_description || '',
            mat_category: m.mat_category || '',
            uom: m.uom || 'Each',
            qty_per_unit: m.qty_per_unit || 1,
            qa_inspection_required: m.qa_inspection_required || false,
            std_cost_est: m.std_cost_est || 0,
            certification_required: m.certification_required || '',
            purchaser: m.purchaser || '',
            length: (m as any).length || 0,
            diameter: (m as any).diameter || 0,
            cut_off: (m as any).cut_off || 0,
            overhead: (m as any).overhead || 0
          })));
        }

        // Load subcons
        const { data: subconsData } = await supabase
          .from('quotation_subcons')
          .select('*')
          .eq('quotation_id', idToLoad)
          .order('line_number', { ascending: true });
        
        if (subconsData && subconsData.length > 0) {
          // Group subcons by part_number pattern to reconstruct subcon_id
          const subconGroups = new Map<string, number>();
          let subconIdCounter = 1;
          
          setSubcons(subconsData.map((s, idx) => {
            // Extract SCL number from part_number if exists
            const match = s.part_number?.match(/SCL(\d+)$/);
            let subconId = 1;
            if (match) {
              const sclNum = parseInt(match[1]);
              const key = `${s.vendor_no}-${s.process_description}-${sclNum}`;
              if (!subconGroups.has(key)) {
                subconGroups.set(key, sclNum);
              }
              subconId = subconGroups.get(key) || sclNum;
            }
            
            return {
              line_number: s.line_number,
              subcon_id: subconId,
              vendor_no: s.vendor_no || '',
              vendor_name: s.vendor_name || '',
              part_number: s.part_number || '',
              process_description: s.process_description || '',
              quantity: volumeData?.find((v, i) => i === (idx % (volumeData?.length || 1)))?.quantity || 0,
              std_cost_est: s.std_cost_est || 0,
              certification_required: s.certification_required || false
            };
          }));
        }

        // Load routings
        const { data: routingsData } = await supabase
          .from('quotation_routings')
          .select('*')
          .eq('quotation_id', idToLoad)
          .order('op_no', { ascending: true });
        
        if (routingsData && routingsData.length > 0) {
          const loadedRoutings = routingsData.map(r => ({
            op_no: r.op_no,
            sublevel_bom: r.sublevel_bom || false,
            part_number: r.part_number || '',
            resource_no: r.resource_no || '',
            operation_details: r.operation_details || '',
            subcon_processing_time: r.subcon_processing_time || 0,
            setup_time: r.setup_time || 0,
            run_time: r.run_time || 0,
            override_cost: r.override_cost ?? null,
            include_setup_calc: r.include_setup_calc !== false // default to true
          }));
          setRoutings(loadedRoutings);
          // Initialize setupIncludedOps from loaded data
          setSetupIncludedOps(new Set(
            loadedRoutings.filter(r => r.include_setup_calc).map(r => r.op_no)
          ));
        }

        // Load tools
        const { data: toolsData } = await supabase
          .from('quotation_tools')
          .select('*')
          .eq('quotation_id', idToLoad)
          .order('line_number', { ascending: true });
        
        if (toolsData && toolsData.length > 0) {
          setTools(toolsData.map(t => ({
            id: t.id,
            line_number: t.line_number,
            tool_name: t.tool_name || '',
            price: t.price || 0,
            markup: t.markup || 0,
            qty_vol_1: (t as any).qty_vol_1,
            qty_vol_2: (t as any).qty_vol_2,
            qty_vol_3: (t as any).qty_vol_3,
            qty_vol_4: (t as any).qty_vol_4,
            qty_vol_5: (t as any).qty_vol_5
          })));
        }

      } catch (error) {
        console.error('Error loading quotation:', error);
        toast.error('Failed to load quotation');
      } finally {
        setLoadingQuotation(false);
      }
    };

    loadQuotation();
  }, [editId, searchParams]);

  const addMaterialLine = () => {
    setMaterials([...materials, {
      line_number: materials.length + 1,
      vendor_no: '', vendor_name: '', part_number: '', material_description: '',
      mat_category: '', uom: 'Each', qty_per_unit: 1, qa_inspection_required: false,
      std_cost_est: 0, certification_required: '', purchaser: '',
      length: 0, diameter: 0, cut_off: 0, overhead: 0
    }]);
  };

  const addSubconLine = () => {
    const maxSubconId = subcons.length > 0 ? Math.max(...subcons.map(s => s.subcon_id)) : 0;
    const newSubconId = maxSubconId + 1;
    const newLines: SubconLine[] = volumes.map((vol, idx) => ({
      line_number: subcons.length + idx + 1,
      subcon_id: newSubconId,
      vendor_no: '',
      vendor_name: '',
      part_number: `${header.part_number}Rev${header.revision}SCL${newSubconId}`,
      process_description: '',
      quantity: vol.quantity,
      std_cost_est: 0,
      certification_required: false
    }));
    setSubcons([...subcons, ...newLines]);
  };

  const removeSubconGroup = (subconId: number) => {
    setSubcons(subcons.filter(s => s.subcon_id !== subconId));
  };

  // Get unique subcon types for display
  const getUniqueSubconTypes = () => {
    const subconIds = [...new Set(subcons.map(s => s.subcon_id))];
    return subconIds.map(id => {
      const firstLine = subcons.find(s => s.subcon_id === id);
      const lines = subcons.filter(s => s.subcon_id === id);
      return { subconId: id, firstLine, lines };
    });
  };

  const addRoutingLine = () => {
    const lastOpNo = routings.length > 0 ? routings[routings.length - 1].op_no : 0;
    const nextOpNo = lastOpNo + 10;

    setRoutings((prev) => [
      ...prev,
      {
        op_no: nextOpNo,
        sublevel_bom: false,
        part_number: header.part_number + 'Rev' + header.revision,
        resource_no: '',
        operation_details: '',
        subcon_processing_time: 0,
        setup_time: 0,
        run_time: 0,
        include_setup_calc: true,
      },
    ]);

    // Default new operations to be included in setup calc
    setSetupIncludedOps((prev) => {
      const next = new Set(prev);
      next.add(nextOpNo);
      return next;
    });
  };

  const getResourceCost = (resourceNo: string): number => {
    // Check if it's a subcon resource (cost is 0, actual cost handled separately)
    const subconResource = subconResources.find(r => r.resource_no === resourceNo);
    if (subconResource) {
      return 0; // Subcon cost is calculated from subcon lines, not here
    }
    const resource = siteResources.find(r => r.resource_no === resourceNo);
    return resource?.cost_per_minute || 0;
  };

  // Check if a resource is a subcon resource
  const isSubconResource = (resourceNo: string): boolean => {
    return subconResources.some(r => r.resource_no === resourceNo);
  };

  const calculateRoutingCost = (line: RoutingLine): number => {
    if (line.override_cost !== null && line.override_cost !== undefined) {
      return line.override_cost;
    }
    const costPerMin = getResourceCost(line.resource_no);
    return (line.setup_time + line.run_time) * costPerMin;
  };

  // Calculate subcon cost for a specific quantity
  const getSubconCostForQuantity = (quantity: number): number => {
    const matchingSubcons = subcons.filter(s => s.quantity === quantity);
    return matchingSubcons.reduce((sum, s) => sum + s.std_cost_est, 0);
  };

  const calculateTotals = () => {
    const totalMaterialCost = materials.reduce((sum, m) => sum + (m.std_cost_est * m.qty_per_unit), 0);
    // For display, show the sum of all subcon costs (first quantity tier)
    const firstQty = volumes[0]?.quantity || 0;
    const totalSubconCost = getSubconCostForQuantity(firstQty);
    // Routing section disabled - set routing values to 0
    const totalSetupTime = 0; // routings disabled
    const totalRunTime = 0; // routings disabled
    const totalSetupCost = 0; // routings disabled
    const selectedSetupTime = 0; // routings disabled
    
    // totalRoutingCost = only production cost per detail (routing disabled)
    const productionCostPerDetail = productionCalculations[0]?.costPerDetail || 0;
    const totalRoutingCost = productionCostPerDetail;
    const costPerHour = getSettingValue('cost_per_hour') || 55;

    return {
      totalMaterialCost: totalMaterialCost * (1 + header.material_markup / 100),
      totalSubconCost: totalSubconCost * (1 + header.subcon_markup / 100),
      totalSetupTime,
      selectedSetupTime,
      totalRunTime,
      totalSetupCost,
      totalRoutingCost,
      costPerHour
    };
  };

  const totals = calculateTotals();

  // Active volumes (those with qty > 0) - used across multiple tabs
  const activeVolumes = useMemo(() => volumes.filter(v => v.quantity > 0), [volumes]);

  // Handle finishing the quote - saves and updates part status to 'quoted'
  const handleFinishQuote = async () => {
    // Use the stored enquiryPartId state (works for both new and edit flows)
    const partIdToUpdate = enquiryPartId || searchParams.get('enquiryPartId');
    
    setFinishingQuote(true);
    try {
      // First save the quote
      const saved = await handleSave(false, false);
      if (!saved) {
        setFinishingQuote(false);
        return;
      }

      // Update the part status to 'quoted' if we have an enquiry part ID
      if (partIdToUpdate) {
        const { error: updateError } = await supabase
          .from('enquiry_parts')
          .update({ quote_status: 'quoted' })
          .eq('id', partIdToUpdate);

        if (updateError) {
          console.error('Error updating part status:', updateError);
          toast.error('Quote saved but failed to update part status');
        } else {
          toast.success('Quote completed! Part status updated to Quoted');
        }
      } else {
        toast.success('Quote saved successfully');
      }

      // Navigate back to the enquiry - use header.enquiry_no which is always populated
      const enquiryNo = header.enquiry_no || searchParams.get('enquiryNo');
      if (enquiryNo) {
        // Find the enquiry ID and navigate to it
        const { data: enquiryData } = await supabase
          .from('quotation_enquiries')
          .select('id')
          .eq('enquiry_no', enquiryNo)
          .maybeSingle();
        
        if (enquiryData) {
          navigate(`/npi/quotation-system/enquiry/${enquiryData.id}`);
        } else {
          navigate('/npi/quotation-system');
        }
      } else {
        navigate('/npi/quotation-system');
      }
    } catch (error) {
      console.error('Error finishing quote:', error);
      toast.error('Failed to finish quote');
    } finally {
      setFinishingQuote(false);
    }
  };


  const handleSave = async (showSuccessToast = true, navigateAfter = true): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    if (!header.customer || !header.part_number) {
      toast.error('Please fill in required fields (Customer, Part Number)');
      return false;
    }

    setSaving(true);
    // Safety net: when editing, keep a copy of existing rows so a failed save can't wipe data
    let currentQuotationId = quotationId;
    let backup: {
      materials: any[];
      subcons: any[];
      routings: any[];
      volumes: any[];
      tools: any[];
    } | null = null;

    try {
      if (currentQuotationId) {
        // Update existing quotation header first
        const { error: updateError } = await supabase
          .from('system_quotations')
          .update({
            ...header,
            site,
            customer_code: getCustomerCode(header.customer),
            vol_1: volumes[0]?.quantity || null,
            vol_2: volumes[1]?.quantity || null,
            vol_3: volumes[2]?.quantity || null,
            // Production planning fields
            cycle_time_per_piece: productionPlanning.cycle_time_per_piece || 0,
            production_hours_per_day: productionPlanning.production_hours_per_day || 18,
            production_effectiveness: productionPlanning.production_effectiveness || 85,
            hourly_rate: productionPlanning.hourly_rate || 0,
            programming_hours: productionPlanning.programming_hours ?? null,
            programming_rate: productionPlanning.programming_rate ?? null,
            setup_hours: productionPlanning.setup_hours ?? null,
            setup_rate: productionPlanning.setup_rate ?? null,
            production_profit_percent: productionPlanning.production_profit_percent ?? null,
            production_sales_commission_percent: productionPlanning.production_sales_commission_percent ?? null,
          })
          .eq('id', currentQuotationId);

        if (updateError) throw updateError;

        // Backup current related rows BEFORE deleting anything
        const [mRes, sRes, rRes, vRes, tRes] = await Promise.all([
          supabase.from('quotation_materials').select('*').eq('quotation_id', currentQuotationId),
          supabase.from('quotation_subcons').select('*').eq('quotation_id', currentQuotationId),
          supabase.from('quotation_routings').select('*').eq('quotation_id', currentQuotationId),
          supabase.from('quotation_volume_pricing').select('*').eq('quotation_id', currentQuotationId),
          supabase.from('quotation_tools').select('*').eq('quotation_id', currentQuotationId),
        ]);

        backup = {
          materials: mRes.data ?? [],
          subcons: sRes.data ?? [],
          routings: rRes.data ?? [],
          volumes: vRes.data ?? [],
          tools: tRes.data ?? [],
        };

        // Delete existing related data to re-insert
        const [dm, ds, dr, dv, dt] = await Promise.all([
          supabase.from('quotation_materials').delete().eq('quotation_id', currentQuotationId),
          supabase.from('quotation_subcons').delete().eq('quotation_id', currentQuotationId),
          supabase.from('quotation_routings').delete().eq('quotation_id', currentQuotationId),
          supabase.from('quotation_volume_pricing').delete().eq('quotation_id', currentQuotationId),
          supabase.from('quotation_tools').delete().eq('quotation_id', currentQuotationId),
        ]);

        if (dm.error) throw dm.error;
        if (ds.error) throw ds.error;
        if (dr.error) throw dr.error;
        if (dv.error) throw dv.error;
        if (dt.error) throw dt.error;
      } else {
        // Create quotation header
        const { data: quotation, error: quotationError } = await supabase
          .from('system_quotations')
          .insert({
            ...header,
            site,
            customer_code: getCustomerCode(header.customer),
            vol_1: volumes[0]?.quantity || null,
            vol_2: volumes[1]?.quantity || null,
            vol_3: volumes[2]?.quantity || null,
            enquiry_part_id: enquiryPartId,
            created_by: user.id,
            // Production planning fields
            cycle_time_per_piece: productionPlanning.cycle_time_per_piece || 0,
            production_hours_per_day: productionPlanning.production_hours_per_day || 18,
            production_effectiveness: productionPlanning.production_effectiveness || 85,
            hourly_rate: productionPlanning.hourly_rate || 0,
            programming_hours: productionPlanning.programming_hours ?? null,
            programming_rate: productionPlanning.programming_rate ?? null,
            setup_hours: productionPlanning.setup_hours ?? null,
            setup_rate: productionPlanning.setup_rate ?? null,
            production_profit_percent: productionPlanning.production_profit_percent ?? null,
            production_sales_commission_percent: productionPlanning.production_sales_commission_percent ?? null,
          })
          .select()
          .single();

        if (quotationError) throw quotationError;
        currentQuotationId = quotation.id;
        setQuotationId(quotation.id);
      }

      // Insert materials
      const materialInserts = materials.filter(m => m.vendor_no || m.material_description).map(m => ({
        quotation_id: currentQuotationId,
        ...m,
        total_material: m.std_cost_est * m.qty_per_unit * (1 + header.material_markup / 100)
      }));

      if (materialInserts.length > 0) {
        const { error: materialError } = await supabase
          .from('quotation_materials')
          .insert(materialInserts);
        if (materialError) throw materialError;
      }

      // Insert subcons - update part numbers with current header values
      const subconInserts = subcons.filter(s => s.vendor_no || s.process_description).map(s => ({
        quotation_id: currentQuotationId,
        line_number: s.line_number,
        vendor_no: s.vendor_no,
        vendor_name: s.vendor_name,
        part_number: `${header.part_number}Rev${header.revision}SCL${s.subcon_id}`,
        process_description: s.process_description,
        std_cost_est: s.std_cost_est,
        certification_required: s.certification_required,
        total_subcon: s.std_cost_est * (1 + header.subcon_markup / 100)
      }));

      if (subconInserts.length > 0) {
        const { error: subconError } = await supabase
          .from('quotation_subcons')
          .insert(subconInserts);
        if (subconError) throw subconError;
      }

      // Insert routings
      const routingInserts = routings.filter(r => r.resource_no || r.operation_details).map(r => ({
        quotation_id: currentQuotationId,
        op_no: r.op_no,
        sublevel_bom: r.sublevel_bom,
        part_number: r.part_number,
        resource_no: r.resource_no,
        operation_details: r.operation_details,
        subcon_processing_time: r.subcon_processing_time,
        setup_time: r.setup_time,
        run_time: r.run_time,
        override_cost: r.override_cost ?? null,
        cost: calculateRoutingCost(r),
        include_setup_calc: setupIncludedOps.has(r.op_no)
      }));

      if (routingInserts.length > 0) {
        const { error: routingError } = await supabase
          .from('quotation_routings')
          .insert(routingInserts);
        if (routingError) throw routingError;
      }

      // Insert volume pricing - MUST match display calculation exactly
      const costPerHour = getSettingValue('cost_per_hour') || 55;
      const volumeInserts = volumes.map(v => {
        // Match the display calculation from the Pricing tab exactly:
        const setupCost = totals.totalSetupCost; // Full setup cost (not divided by qty)
        const routingCost = totals.totalRoutingCost * v.quantity;
        const materialCost = totals.totalMaterialCost * v.quantity;
        const subconCost = totals.totalSubconCost * v.quantity; // Use totals.totalSubconCost like display
        const totalCost = setupCost + routingCost + materialCost + subconCost;
        const unitPrice = totalCost / v.quantity / (1 - v.margin / 100);

        return {
          quotation_id: currentQuotationId,
          quantity: v.quantity,
          hours: (totals.totalSetupTime + totals.totalRunTime * v.quantity) / 60,
          cost_per_hour: costPerHour,
          labour_cost: routingCost + setupCost, // Include setup in labour for this qty tier
          material_cost: materialCost,
          subcon_cost: subconCost,
          tooling_cost: 0,
          carriage: 0,
          misc: 0,
          total_price: unitPrice * v.quantity,
          unit_price_quoted: unitPrice,
          cost_per_unit: totalCost / v.quantity,
          margin: v.margin
        };
      });

      const { error: volumeError } = await supabase
        .from('quotation_volume_pricing')
        .insert(volumeInserts);
      if (volumeError) throw volumeError;

      // Insert tools with per-volume quantities
      const toolInserts = tools.filter(t => t.tool_name).map(t => ({
        quotation_id: currentQuotationId,
        line_number: t.line_number,
        tool_name: t.tool_name,
        quantity: t.qty_vol_1, // Legacy field, use vol1 as default
        price: t.price,
        markup: t.markup,
        total: calculateToolTotalForVolume(t, 0),
        qty_vol_1: t.qty_vol_1,
        qty_vol_2: t.qty_vol_2,
        qty_vol_3: t.qty_vol_3,
        qty_vol_4: t.qty_vol_4,
        qty_vol_5: t.qty_vol_5
      }));

      if (toolInserts.length > 0) {
        const { error: toolError } = await supabase
          .from('quotation_tools')
          .insert(toolInserts);
        if (toolError) throw toolError;
      }

      if (showSuccessToast) {
        toast.success('Quotation saved successfully');
      }
      if (navigateAfter) {
        navigate('/npi/quotation-system/list');
      }
      return true;
    } catch (error) {
      console.error('Error saving quotation:', error);

      // If we were editing an existing quotation, try to restore the previous rows
      if (currentQuotationId && backup) {
        try {
          await Promise.all([
            supabase.from('quotation_materials').delete().eq('quotation_id', currentQuotationId),
            supabase.from('quotation_subcons').delete().eq('quotation_id', currentQuotationId),
            supabase.from('quotation_routings').delete().eq('quotation_id', currentQuotationId),
            supabase.from('quotation_volume_pricing').delete().eq('quotation_id', currentQuotationId),
            supabase.from('quotation_tools').delete().eq('quotation_id', currentQuotationId),
          ]);

          if (backup.materials.length > 0) {
            const { error: restoreMaterialsError } = await supabase
              .from('quotation_materials')
              .insert(backup.materials);
            if (restoreMaterialsError) throw restoreMaterialsError;
          }

          if (backup.subcons.length > 0) {
            const { error: restoreSubconsError } = await supabase
              .from('quotation_subcons')
              .insert(backup.subcons);
            if (restoreSubconsError) throw restoreSubconsError;
          }

          if (backup.routings.length > 0) {
            const { error: restoreRoutingsError } = await supabase
              .from('quotation_routings')
              .insert(backup.routings);
            if (restoreRoutingsError) throw restoreRoutingsError;
          }

          if (backup.volumes.length > 0) {
            const { error: restoreVolumesError } = await supabase
              .from('quotation_volume_pricing')
              .insert(backup.volumes);
            if (restoreVolumesError) throw restoreVolumesError;
          }

          if (backup.tools.length > 0) {
            const { error: restoreToolsError } = await supabase
              .from('quotation_tools')
              .insert(backup.tools);
            if (restoreToolsError) throw restoreToolsError;
          }

          toast.error('Save failed — previous data was restored');
        } catch (restoreError) {
          console.error('Error restoring previous data after failed save:', restoreError);
          toast.error('Failed to save quotation');
        }
      } else {
        toast.error('Failed to save quotation');
      }

      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      const saved = await handleSave(false, false);
      if (saved) {
        toast.success('Progress saved');
        setActiveTab(tabOrder[currentIndex + 1]);
      }
    }
  };

  const handleBack = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const handleFinalSave = async () => {
    await handleSave(true, true);
  };

  const pageTitle = (editId || searchParams.get('quotationId')) ? 'Edit Quotation' : 'New Quotation';

  if (resourcesLoading || settingsLoading || loadingQuotation) {
    return (
      <AppLayout title={pageTitle} showBackButton backTo="/npi/quotation-system/list">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={pageTitle} subtitle="WD-FRM-0018 Quotation/Routing Sheet" showBackButton backTo="/npi/quotation-system/list">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleFinalSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Quotation
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-4xl">
            <TabsTrigger value="header" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Header
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-1 text-xs">
              <Package className="h-3 w-3" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-1 text-xs">
              <Wrench className="h-3 w-3" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="subcon" className="flex items-center gap-1 text-xs">
              <Truck className="h-3 w-3" />
              Subcon
            </TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-1 text-xs">
              <Factory className="h-3 w-3" />
              Production
            </TabsTrigger>
            {/* Routings tab hidden for now
            <TabsTrigger value="routings" className="flex items-center gap-1 text-xs">
              <ListOrdered className="h-3 w-3" />
              Routings
            </TabsTrigger>
            */}
            <TabsTrigger value="secondary" className="flex items-center gap-1 text-xs">
              <Wrench className="h-3 w-3" />
              Secondary Ops
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs">
              <Calculator className="h-3 w-3" />
              Pricing
            </TabsTrigger>
          </TabsList>

          {/* Header Tab */}
          <TabsContent value="header">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Part & Customer Details
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Enter the basic information about the quotation including customer details, part identification, and compliance requirements.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Enter the basic quotation information from the customer RFQ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Site Selection - First thing to choose */}
                <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-4">
                    <Label className="text-base font-semibold">Site *</Label>
                    <Select
                      value={site}
                      onValueChange={(v: 'waterford' | 'mexico') => setSite(v)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waterford">🇮🇪 Waterford</SelectItem>
                        <SelectItem value="mexico">🇲🇽 Mexico</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Select the site first — this filters customers, vendors, suppliers, and resources.
                    </p>
                  </div>
                </div>

                <Alert className="bg-muted/50 border-primary/20">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>Required fields:</strong> Customer and Part Number are mandatory. Upload a drawing to auto-extract part details.
                  </AlertDescription>
                </Alert>

                {/* Drawing Upload Section */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileUp className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Drawing (Optional)</Label>
                        <p className="text-xs text-muted-foreground">Upload a drawing to auto-extract Part Number, Description & Revision</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {drawingFile ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDrawingPreviewOpen(true)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Badge variant="secondary" className="gap-1">
                            <FileText className="h-3 w-3" />
                            {drawingFile.name.length > 20 ? drawingFile.name.slice(0, 20) + '...' : drawingFile.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearDrawing}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => drawingInputRef.current?.click()}
                          disabled={extractingFromDrawing}
                          className="gap-2"
                        >
                          {extractingFromDrawing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Extracting...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Drawing
                            </>
                          )}
                        </Button>
                      )}
                      <input
                        ref={drawingInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={handleDrawingFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Customer *
                      {header.customer && !isKnownCustomer(header.customer) && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          New Customer
                        </Badge>
                      )}
                    </Label>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Input
                            value={header.customer}
                            onChange={(e) => {
                              setHeader({ ...header, customer: e.target.value });
                              if (e.target.value) setCustomerPopoverOpen(true);
                            }}
                            onFocus={() => setCustomerPopoverOpen(true)}
                            placeholder="Start typing to search..."
                            className={header.customer && !isKnownCustomer(header.customer) ? 'border-amber-300 pr-8' : ''}
                          />
                          {header.customer && isKnownCustomer(header.customer) && (
                            <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search customers..." 
                            value={header.customer}
                            onValueChange={(value) => setHeader({ ...header, customer: value })}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-2 px-4 text-sm text-muted-foreground">
                                No customer found. You can still use "{header.customer}" as a new customer.
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {getFilteredCustomers(header.customer).slice(0, 10).map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.bp_name}
                                  onSelect={() => {
                                    setHeader({ ...header, customer: customer.bp_name });
                                    setCustomerPopoverOpen(false);
                                  }}
                                >
                                  <div className="flex justify-between w-full">
                                    <span>{customer.bp_name}</span>
                                    <span className="text-muted-foreground text-xs">{customer.bp_code}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Code</Label>
                    <Input
                      value={getCustomerCode(header.customer)}
                      readOnly
                      className={`bg-muted ${header.customer && !isKnownCustomer(header.customer) ? 'text-amber-600' : ''}`}
                      placeholder="Auto-filled from customer name"
                    />
                    <p className="text-xs text-muted-foreground">
                      {header.customer && !isKnownCustomer(header.customer) 
                        ? 'Customer not in list - code shows N/A'
                        : 'Auto-populated from customer list'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Quoted By</Label>
                    <Input
                      value={header.quoted_by}
                      onChange={(e) => setHeader({ ...header, quoted_by: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={header.status} onValueChange={(v) => setHeader({ ...header, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Part Number *</Label>
                    <Input
                      value={header.part_number}
                      onChange={(e) => setHeader({ ...header, part_number: e.target.value })}
                      placeholder="e.g., 323013-05"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revision</Label>
                    <Input
                      value={header.revision}
                      onChange={(e) => setHeader({ ...header, revision: e.target.value })}
                      placeholder="e.g., A"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={header.description}
                      onChange={(e) => setHeader({ ...header, description: e.target.value })}
                      placeholder="Part description"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Qty Per</Label>
                    <Input
                      type="number"
                      value={header.qty_per}
                      onChange={(e) => setHeader({ ...header, qty_per: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={header.manufacture_type} onValueChange={(v) => setHeader({ ...header, manufacture_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manufacture">Manufacture</SelectItem>
                        <SelectItem value="Assembly">Assembly</SelectItem>
                        <SelectItem value="Subcon">Subcon Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Quote Currency</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>Select the currency for the final quote. Costs are calculated in EUR, then converted using the exchange rate.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={currency} onValueChange={(v: 'EUR' | 'USD' | 'CAD' | 'GBP') => setCurrency(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                        <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                        <SelectItem value="CAD">C$ Canadian Dollar (CAD)</SelectItem>
                        <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Exchange Rate</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>1 EUR = {exchangeRate.toFixed(4)} {currency}. Rate from ECB. Edit if needed.</p>
                          {ratesSource && <p className="text-xs mt-1">{ratesSource}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.0001"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                        className="flex-1"
                        disabled={currency === 'EUR'}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={fetchExchangeRates}
                        disabled={fetchingRates}
                        title="Refresh rates from ECB"
                      >
                        <RefreshCw className={`h-4 w-4 ${fetchingRates ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="flex items-center space-x-2">
                    <Switch checked={header.blue_review_required} onCheckedChange={(c) => setHeader({ ...header, blue_review_required: c })} />
                    <Label>Blue Review Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={header.batch_traceable} onCheckedChange={(c) => setHeader({ ...header, batch_traceable: c })} />
                    <Label>Batch Traceable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={header.rohs_compliant} onCheckedChange={(c) => setHeader({ ...header, rohs_compliant: c })} />
                    <Label>RoHS Compliant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={header.serial_traceable} onCheckedChange={(c) => setHeader({ ...header, serial_traceable: c })} />
                    <Label>Serial Traceable</Label>
                  </div>
                </div>

                {/* Volume quantities */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Volume Quantities</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>Define volume tiers for pricing. Enter the quantities you want to quote for. Margins can be adjusted in the Pricing tab.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVolumes([...volumes, { quantity: 0, margin: 30 }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Volume
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter different order quantities to quote. Margins can be adjusted in the Pricing section.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {volumes.map((vol, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground w-12">Qty {idx + 1}</span>
                        <Input
                          type="number"
                          value={vol.quantity}
                          onChange={(e) => {
                            const newVols = [...volumes];
                            newVols[idx].quantity = parseInt(e.target.value) || 0;
                            setVolumes(newVols);
                          }}
                          placeholder="Qty"
                          className="w-24 border-primary/50 bg-primary/5 focus:border-primary"
                        />
                        {volumes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const newVols = volumes.filter((_, i) => i !== idx);
                              setVolumes(newVols);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Materials
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    BOM / Materials
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>List all raw materials, components, and consumables required to manufacture this part. The markup percentage from the Header tab is applied to calculate final material costs.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Enter material components and their costs</CardDescription>
                </div>
                <Button onClick={addMaterialLine} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Line
                </Button>
              </CardHeader>
              <CardContent>
                {/* Part Details Section */}
                <div className="border rounded-lg p-4 bg-muted/30 mb-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Part Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Row 1: Units toggle and Length/Diameter */}
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium whitespace-nowrap">Measurement units</Label>
                      <RadioGroup
                        value={materialUnits}
                        onValueChange={(v) => setMaterialUnits(v as 'metric' | 'imperial')}
                        className="flex items-center gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="imperial" id="imperial" />
                          <Label htmlFor="imperial" className="font-normal cursor-pointer">Imperial</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="metric" id="metric" />
                          <Label htmlFor="metric" className="font-normal cursor-pointer">Metric</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Length</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={materials[0]?.length || ''}
                          onChange={(e) => {
                            const newMats = [...materials];
                            if (newMats[0]) newMats[0].length = parseFloat(e.target.value) || 0;
                            setMaterials(newMats);
                          }}
                          className="w-24"
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">{materialUnits === 'metric' ? 'mm' : 'in'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Diameter</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={materials[0]?.diameter || ''}
                          onChange={(e) => {
                            const newMats = [...materials];
                            if (newMats[0]) newMats[0].diameter = parseFloat(e.target.value) || 0;
                            setMaterials(newMats);
                          }}
                          className="w-24"
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">{materialUnits === 'metric' ? 'mm' : 'in'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Row 2: Cut off and Overhead */}
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Cut off</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={materials[0]?.cut_off || ''}
                        onChange={(e) => {
                          const newMats = [...materials];
                          if (newMats[0]) newMats[0].cut_off = parseFloat(e.target.value) || 0;
                          setMaterials(newMats);
                        }}
                        className="w-24"
                        placeholder="0"
                      />
                      <span className="text-sm text-muted-foreground">{materialUnits === 'metric' ? 'mm' : 'in'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Overhead</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={materials[0]?.overhead || ''}
                        onChange={(e) => {
                          const newMats = [...materials];
                          if (newMats[0]) newMats[0].overhead = parseFloat(e.target.value) || 0;
                          setMaterials(newMats);
                        }}
                        className="w-20"
                        placeholder="0"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  
                  {/* Material Calculation Display */}
                  {(() => {
                    const partLength = materials[0]?.length || 0;
                    const cutOff = materials[0]?.cut_off || 0;
                    const overhead = (materials[0]?.overhead || 0) / 100;
                    const uom = materials[0]?.uom || 'Metre';
                    
                    // Convert to cm if metric (mm), or convert inches to cm if imperial
                    const lengthCm = materialUnits === 'metric' ? partLength / 10 : partLength * 2.54;
                    const cutOffCm = materialUnits === 'metric' ? cutOff / 10 : cutOff * 2.54;
                    
                    // Calculate base meters value
                    const getMetersValue = (qty: number) => ((lengthCm + cutOffCm) / 100) * qty * (1 + overhead);
                    
                    // Convert meters to the selected UOM
                    const convertToUom = (meters: number, qty: number): number => {
                      switch (uom) {
                        case 'MM': return meters * 1000; // meters to mm
                        case 'Inch': return meters / 0.0254; // meters to inches
                        case 'Each': return qty; // just quantity
                        case 'Plate': return qty; // just quantity
                        case 'Metre': 
                        default: return meters;
                      }
                    };
                    
                    const hasVolumes = volumes.some(v => v.quantity > 0);
                    
                    if (!hasVolumes || (partLength === 0 && cutOff === 0)) return null;
                    
                    return (
                      <div className="mt-4 p-3 bg-muted/50 border rounded-lg">
                        <h5 className="text-xs font-semibold text-foreground mb-2">Calculated Material Required ({uom})</h5>
                        <div className="flex flex-wrap gap-4">
                          {volumes.map((vol, idx) => vol.quantity > 0 && (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">Vol {idx + 1} ({vol.quantity.toLocaleString()} pcs):</span>{' '}
                              <span className="font-medium">{convertToUom(getMetersValue(vol.quantity), vol.quantity).toFixed(2)} {uom}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Formula: ((Length + Cut off) / 1000) × Qty × (1 + Overhead%) {uom !== 'Metre' && `→ converted to ${uom}`}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Material / Supplier Details Section */}
                <div className="border rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Material / Supplier Details</h4>
                  {(() => {
                    const partLength = materials[0]?.length || 0;
                    const cutOff = materials[0]?.cut_off || 0;
                    const overhead = (materials[0]?.overhead || 0) / 100;
                    
                    // Convert to cm if metric (mm), or convert inches to cm if imperial
                    const lengthCm = materialUnits === 'metric' ? partLength / 10 : partLength * 2.54;
                    const cutOffCm = materialUnits === 'metric' ? cutOff / 10 : cutOff * 2.54;
                    
                    // Calculate base meters value
                    const getBaseMeters = (qty: number) => {
                      if (partLength === 0 && cutOff === 0) return 0;
                      return ((lengthCm + cutOffCm) / 100) * qty * (1 + overhead);
                    };
                    
                    // Convert meters to material's UOM
                    const getQtyInUom = (qty: number, uom: string): number => {
                      const meters = getBaseMeters(qty);
                      switch (uom) {
                        case 'MM': return meters * 1000; // meters to mm
                        case 'Inch': return meters / 0.0254; // meters to inches
                        case 'Each': return qty; // just quantity
                        case 'Plate': return qty; // just quantity
                        case 'Metre': 
                        default: return meters;
                      }
                    };
                    
                    const activeVolumes = volumes.filter(v => v.quantity > 0);
                    
                    return (
                      <>
                        <Alert className="bg-muted/50 border-primary/20 mb-4">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertDescription className="text-sm text-muted-foreground">
                            Enter vendor details, part numbers, and standard costs. <strong>Qty to Buy</strong> is auto-calculated from Part Details for each volume tier. <strong>Total</strong> = Qty to Buy × Std Cost × (1 + {header.material_markup}% markup).
                          </AlertDescription>
                        </Alert>
                        <div className="border rounded-lg overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Vendor No.</TableHead>
                              <TableHead>Vendor Name</TableHead>
                              <TableHead>Part Number</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>UOM</TableHead>
                              <TableHead className="text-right">Std Cost (€)</TableHead>
                              {activeVolumes.length === 0 && (
                                <TableHead className="text-right">Qty to Buy</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {materials.map((mat, idx) => {
                              // Helper to get qty override key
                              const getQtyKey = (volIndex: number): keyof MaterialLine => {
                                const keys: (keyof MaterialLine)[] = ['qty_vol_1', 'qty_vol_2', 'qty_vol_3', 'qty_vol_4', 'qty_vol_5'];
                                return keys[volIndex];
                              };
                              
                              // Get effective qty for a volume (override or calculated)
                              const getEffectiveQty = (volIndex: number, volQty: number, uom: string): number => {
                                const key = getQtyKey(volIndex);
                                const override = mat[key] as number | null | undefined;
                                if (override !== null && override !== undefined && override > 0) {
                                  return override;
                                }
                                return getQtyInUom(volQty, uom);
                              };
                              
                              return (
                                <React.Fragment key={idx}>
                                  {/* Main row with material details */}
                                  <TableRow className={activeVolumes.length > 0 ? "border-b-0" : ""}>
                                    <TableCell className="font-medium">{mat.line_number}</TableCell>
                                    <TableCell>
                                      <Input
                                        value={getMaterialSupplierCode(mat.vendor_name)}
                                        readOnly
                                        className={`w-24 bg-muted ${mat.vendor_name && !isKnownMaterialSupplier(mat.vendor_name) ? 'text-amber-600' : ''}`}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Popover open={materialVendorPopoverOpen === idx} onOpenChange={(open) => setMaterialVendorPopoverOpen(open ? idx : null)}>
                                        <PopoverTrigger asChild>
                                          <div className="relative">
                                            <Input
                                              value={mat.vendor_name}
                                              onChange={(e) => {
                                                const newMats = [...materials];
                                                newMats[idx].vendor_name = e.target.value;
                                                setMaterials(newMats);
                                                if (e.target.value) setMaterialVendorPopoverOpen(idx);
                                              }}
                                              onFocus={() => setMaterialVendorPopoverOpen(idx)}
                                              placeholder="Search..."
                                              className={mat.vendor_name && !isKnownMaterialSupplier(mat.vendor_name) ? 'border-amber-300 pr-8' : ''}
                                            />
                                            {mat.vendor_name && isKnownMaterialSupplier(mat.vendor_name) && (
                                              <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                            )}
                                            {mat.vendor_name && !isKnownMaterialSupplier(mat.vendor_name) && (
                                              <AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                            )}
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0" align="start">
                                          <Command>
                                            <CommandInput 
                                              placeholder="Search suppliers..." 
                                              value={mat.vendor_name}
                                              onValueChange={(value) => {
                                                const newMats = [...materials];
                                                newMats[idx].vendor_name = value;
                                                setMaterials(newMats);
                                              }}
                                            />
                                            <CommandList>
                                              <CommandEmpty>
                                                <div className="py-2 px-4 text-sm text-muted-foreground">
                                                  No supplier found.
                                                </div>
                                              </CommandEmpty>
                                              <CommandGroup>
                                                {getFilteredMaterialSuppliers(mat.vendor_name).slice(0, 8).map((supplier) => (
                                                  <CommandItem
                                                    key={supplier.id}
                                                    value={supplier.bp_name}
                                                    onSelect={() => {
                                                      const newMats = [...materials];
                                                      newMats[idx].vendor_name = supplier.bp_name;
                                                      setMaterials(newMats);
                                                      setMaterialVendorPopoverOpen(null);
                                                    }}
                                                  >
                                                    <div className="flex justify-between w-full">
                                                      <span className="truncate">{supplier.bp_name}</span>
                                                      <span className="text-muted-foreground text-xs ml-2">{supplier.bp_code}</span>
                                                    </div>
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={mat.part_number}
                                        onChange={(e) => {
                                          const newMats = [...materials];
                                          newMats[idx].part_number = e.target.value;
                                          setMaterials(newMats);
                                        }}
                                        className="w-32"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={mat.material_description}
                                        onChange={(e) => {
                                          const newMats = [...materials];
                                          newMats[idx].material_description = e.target.value;
                                          setMaterials(newMats);
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select 
                                        value={mat.uom} 
                                        onValueChange={(v) => {
                                          const newMats = [...materials];
                                          newMats[idx].uom = v;
                                          setMaterials(newMats);
                                        }}
                                      >
                                        <SelectTrigger className="w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="kg">kg</SelectItem>
                                          <SelectItem value="Bar">Bar</SelectItem>
                                          <SelectItem value="Billet">Billet</SelectItem>
                                          <SelectItem value="Each">Each</SelectItem>
                                          <SelectItem value="Inch">Inch</SelectItem>
                                          <SelectItem value="Metre">Metre</SelectItem>
                                          <SelectItem value="MM">MM</SelectItem>
                                          <SelectItem value="Plate">Plate</SelectItem>
                                          <SelectItem value="cc">cc</SelectItem>
                                          <SelectItem value="Feet">Feet</SelectItem>
                                          <SelectItem value="ML">ML</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={mat.std_cost_est}
                                        onChange={(e) => {
                                          const newMats = [...materials];
                                          newMats[idx].std_cost_est = parseFloat(e.target.value) || 0;
                                          setMaterials(newMats);
                                        }}
                                        className="w-24 text-right"
                                      />
                                    </TableCell>
                                    {activeVolumes.length === 0 && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={mat.qty_per_unit}
                                          onChange={(e) => {
                                            const newMats = [...materials];
                                            newMats[idx].qty_per_unit = parseFloat(e.target.value) || 0;
                                            setMaterials(newMats);
                                          }}
                                          className="w-20 text-right"
                                        />
                                      </TableCell>
                                    )}
                                  </TableRow>
                                  
                                  {/* Volume breakdown sub-rows */}
                                  {activeVolumes.length > 0 && (
                                    <TableRow className="bg-muted/30">
                                      <TableCell colSpan={7} className="py-2">
                                        <div className="pl-6 space-y-2">
                                          <div className="text-xs font-medium text-muted-foreground mb-2">Volume Breakdown:</div>
                                          <div className="grid gap-2">
                                            {activeVolumes.map((vol, volIdx) => {
                                              const originalVolIndex = volumes.indexOf(vol);
                                              const calculatedQty = getQtyInUom(vol.quantity, mat.uom);
                                              const key = getQtyKey(originalVolIndex);
                                              const currentOverride = mat[key] as number | null | undefined;
                                              const effectiveQty = getEffectiveQty(originalVolIndex, vol.quantity, mat.uom);
                                              const totalCost = effectiveQty * mat.std_cost_est * (1 + header.material_markup / 100);
                                              
                                              return (
                                                <div key={volIdx} className="flex items-center gap-4 p-2 bg-background rounded border">
                                                  <div className="min-w-[100px]">
                                                    <span className="text-sm font-medium">Vol {originalVolIndex + 1}</span>
                                                    <span className="text-xs text-muted-foreground ml-1">({vol.quantity.toLocaleString()} pcs)</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Qty to Buy ({mat.uom}):</Label>
                                                    <Input
                                                      type="number"
                                                      step="0.01"
                                                      value={currentOverride ?? calculatedQty.toFixed(2)}
                                                      onChange={(e) => {
                                                        const newMats = [...materials];
                                                        const val = parseFloat(e.target.value);
                                                        (newMats[idx] as any)[key] = isNaN(val) ? null : val;
                                                        setMaterials(newMats);
                                                      }}
                                                      className="w-24 text-right text-sm h-8"
                                                      placeholder={calculatedQty.toFixed(2)}
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Total €:</Label>
                                                    <span className="text-sm font-medium min-w-[80px] text-right">€{totalCost.toFixed(2)}</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                          </Table>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-4 p-4 border rounded-lg bg-muted/30 flex items-center gap-4">
                  <div className="space-y-2">
                    <Label>Material Markup (%)</Label>
                    <Input
                      type="number"
                      value={header.material_markup}
                      onChange={(e) => setHeader({ ...header, material_markup: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Total Material (with {header.material_markup}% markup): €{totals.totalMaterialCost.toFixed(2)}
                  </Badge>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Tools
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Tools
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>Add tooling costs for this quotation. Select from the library or create new tools. Total cost = Σ(Qty × Price × (1 + Markup/100))</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Enter tooling costs and quantities</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={newToolDialogOpen} onOpenChange={setNewToolDialogOpen}>
                    <Button variant="outline" size="sm" onClick={() => setNewToolDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> New Tool
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Tool to Library</DialogTitle>
                        <DialogDescription>Create a new tool that will be saved to the library for future use.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Tool Name</Label>
                          <Input
                            value={newToolName}
                            onChange={(e) => setNewToolName(e.target.value)}
                            placeholder="e.g., End Mill 10mm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Default Price (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newToolPrice}
                            onChange={(e) => setNewToolPrice(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <Button onClick={addNewToolToLibrary} className="w-full">
                          Add to Library
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => addToolLine()} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Line
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tools added yet.</p>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button onClick={() => setNewToolDialogOpen(true)} variant="outline">
                        <Plus className="h-4 w-4 mr-1" /> Create New Tool
                      </Button>
                      <Button onClick={() => addToolLine()} variant="outline">
                        <Plus className="h-4 w-4 mr-1" /> Add From Library
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active volumes info */}
                    {activeVolumes.length > 0 && (
                      <Alert className="bg-muted/50 border-primary/20">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm text-muted-foreground">
                          Enter tool quantities for each volume tier. Different volumes may require different tool quantities.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[250px]">Tool</TableHead>
                            <TableHead className="w-[100px]">Price (€)</TableHead>
                            <TableHead className="w-[80px]">Markup (%)</TableHead>
                            {activeVolumes.map((vol, volIdx) => (
                              <TableHead key={volIdx} className="w-[80px] text-center">
                                Qty<br/><span className="text-xs font-normal text-muted-foreground">({vol.quantity.toLocaleString()})</span>
                              </TableHead>
                            ))}
                            <TableHead className="w-[100px] text-right">Total Vol1 (€)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tools.map((tool, idx) => (
                            <React.Fragment key={idx}>
                              <TableRow>
                                <TableCell>
                                  <Select
                                    value={tool.tool_name}
                                    onValueChange={(v) => {
                                      const selectedTool = toolLibrary.find(t => t.tool_name === v);
                                      const newTools = [...tools];
                                      newTools[idx].tool_name = v;
                                      if (selectedTool && newTools[idx].price === 0) {
                                        newTools[idx].price = selectedTool.default_price;
                                      }
                                      setTools(newTools);
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select tool" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {toolLibrary.map((t) => (
                                        <SelectItem key={t.id} value={t.tool_name}>
                                          {t.tool_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={tool.price}
                                    onChange={(e) => {
                                      const newTools = [...tools];
                                      newTools[idx].price = parseFloat(e.target.value) || 0;
                                      setTools(newTools);
                                    }}
                                    className="w-24 text-right"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={tool.markup}
                                    onChange={(e) => {
                                      const newTools = [...tools];
                                      newTools[idx].markup = parseFloat(e.target.value) || 0;
                                      setTools(newTools);
                                    }}
                                    className="w-16 text-right"
                                  />
                                </TableCell>
                                {activeVolumes.map((vol, volIdx) => {
                                  const originalVolIndex = volumes.indexOf(vol);
                                  const qtyKey = `qty_vol_${originalVolIndex + 1}` as keyof ToolLine;
                                  return (
                                    <TableCell key={volIdx} className="text-center">
                                      <Input
                                        type="number"
                                        value={tool[qtyKey] as number || ''}
                                        onChange={(e) => {
                                          const newTools = [...tools];
                                          const val = e.target.value;
                                          (newTools[idx] as any)[qtyKey] = val === '' ? undefined : (parseInt(val) || undefined);
                                          setTools(newTools);
                                        }}
                                        className="w-16 text-right mx-auto"
                                        placeholder="0"
                                      />
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-right font-medium">
                                  €{calculateToolTotalForVolume(tool, 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeToolLine(tool.line_number)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {/* Volume breakdown row */}
                              {activeVolumes.length > 1 && (
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={3 + activeVolumes.length + 2} className="py-2">
                                    <div className="pl-6 flex gap-4 items-center flex-wrap">
                                      <span className="text-xs font-medium text-muted-foreground">Cost per volume:</span>
                                      {activeVolumes.map((vol, volIdx) => {
                                        const originalVolIndex = volumes.indexOf(vol);
                                        const totalForVol = calculateToolTotalForVolume(tool, originalVolIndex);
                                        return (
                                          <Badge key={volIdx} variant="outline" className="text-xs">
                                            Vol {originalVolIndex + 1} ({vol.quantity.toLocaleString()}): €{totalForVol.toFixed(2)}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm text-muted-foreground">
                      Total tools cost = Σ(Qty × Price × (1 + Markup/100)) per volume
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {activeVolumes.map((vol, volIdx) => {
                        const originalVolIndex = volumes.indexOf(vol);
                        const totalForVol = getTotalToolsCostForVolume(originalVolIndex);
                        return (
                          <Badge key={volIdx} variant={volIdx === 0 ? "secondary" : "outline"} className={volIdx === 0 ? "text-lg px-4 py-2" : "px-3 py-1"}>
                            Vol {originalVolIndex + 1}: €{totalForVol.toFixed(2)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Subcon
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcon Tab */}
          <TabsContent value="subcon">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Subcontractor Operations
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>List all external processes performed by subcontractors. Each subcon type has separate pricing per quantity tier from the Header. Part numbers are auto-generated.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Enter subcon processes with volume-based pricing</CardDescription>
                </div>
                <Button onClick={addSubconLine} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Subcon Type
                </Button>
              </CardHeader>
              <CardContent>
                <Alert className="bg-muted/50 border-primary/20 mb-4">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>Part Number format:</strong> Auto-generated as [Part Number][Revision]SCL[#]. Each subcon type shows pricing for all quantity tiers ({volumes.map(v => v.quantity).join(', ')} units). Total includes {header.subcon_markup}% markup.
                  </AlertDescription>
                </Alert>

                {subcons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subcontractor operations added yet.</p>
                    <Button onClick={addSubconLine} variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-1" /> Add First Subcon Type
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {getUniqueSubconTypes().map(({ subconId, firstLine, lines }) => (
                      <div key={subconId} className="border rounded-lg p-4 bg-card">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">SCL{subconId}</Badge>
                            <span className="text-sm text-muted-foreground">
                              PN: {header.part_number}Rev{header.revision}SCL{subconId}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubconGroup(subconId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4 mb-4">
                          <div className="space-y-2">
                            <Label>Vendor No.</Label>
                            <Input
                              value={getVendorCode(firstLine?.vendor_name || '')}
                              readOnly
                              className={`bg-muted ${firstLine?.vendor_name && !isKnownSubconVendor(firstLine?.vendor_name || '') ? 'text-amber-600' : ''}`}
                              placeholder="Auto-filled"
                            />
                            <p className="text-xs text-muted-foreground">
                              {firstLine?.vendor_name && !isKnownSubconVendor(firstLine?.vendor_name || '')
                                ? 'Vendor not in list'
                                : 'Auto-populated from vendor list'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              Vendor Name
                              {firstLine?.vendor_name && !isKnownSubconVendor(firstLine?.vendor_name || '') && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  New
                                </Badge>
                              )}
                            </Label>
                            <Popover open={subconVendorPopoverOpen === subconId} onOpenChange={(open) => setSubconVendorPopoverOpen(open ? subconId : null)}>
                              <PopoverTrigger asChild>
                                <div className="relative">
                                  <Input
                                    value={firstLine?.vendor_name || ''}
                                    onChange={(e) => {
                                      const newSubs = subcons.map(s =>
                                        s.subcon_id === subconId ? { ...s, vendor_name: e.target.value } : s
                                      );
                                      setSubcons(newSubs);
                                      if (e.target.value) setSubconVendorPopoverOpen(subconId);
                                    }}
                                    onFocus={() => setSubconVendorPopoverOpen(subconId)}
                                    placeholder="Search..."
                                    className={firstLine?.vendor_name && !isKnownSubconVendor(firstLine?.vendor_name || '') ? 'border-amber-300 pr-8' : ''}
                                  />
                                  {firstLine?.vendor_name && isKnownSubconVendor(firstLine?.vendor_name || '') && (
                                    <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] p-0" align="start">
                                <Command>
                                  <CommandInput 
                                    placeholder="Search vendors..." 
                                    value={firstLine?.vendor_name || ''}
                                    onValueChange={(value) => {
                                      const newSubs = subcons.map(s =>
                                        s.subcon_id === subconId ? { ...s, vendor_name: value } : s
                                      );
                                      setSubcons(newSubs);
                                    }}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      <div className="py-2 px-4 text-sm text-muted-foreground">
                                        No vendor found.
                                      </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {getFilteredSubconVendors(firstLine?.vendor_name || '').slice(0, 8).map((vendor) => (
                                        <CommandItem
                                          key={vendor.id}
                                          value={vendor.bp_name}
                                          onSelect={() => {
                                            const newSubs = subcons.map(s =>
                                              s.subcon_id === subconId ? { ...s, vendor_name: vendor.bp_name } : s
                                            );
                                            setSubcons(newSubs);
                                            setSubconVendorPopoverOpen(null);
                                          }}
                                        >
                                          <div className="flex justify-between w-full">
                                            <span className="truncate">{vendor.bp_name}</span>
                                            <span className="text-muted-foreground text-xs ml-2">{vendor.bp_code}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label>Process Description</Label>
                            <Input
                              value={firstLine?.process_description || ''}
                              onChange={(e) => {
                                const newSubs = subcons.map(s =>
                                  s.subcon_id === subconId ? { ...s, process_description: e.target.value } : s
                                );
                                setSubcons(newSubs);
                              }}
                              placeholder="e.g., Anodize, Plate"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cert Required</Label>
                            <div className="flex items-center h-10">
                              <Switch
                                checked={firstLine?.certification_required || false}
                                onCheckedChange={(c) => {
                                  const newSubs = subcons.map(s =>
                                    s.subcon_id === subconId ? { ...s, certification_required: c } : s
                                  );
                                  setSubcons(newSubs);
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-28">Quantity</TableHead>
                                <TableHead className="text-center w-32">Cost/Unit (€)</TableHead>
                                <TableHead className="text-center w-32">Cost/Unit + {header.subcon_markup}% (€)</TableHead>
                                <TableHead className="text-right w-36">Qty × Cost (€)</TableHead>
                                <TableHead className="text-right w-36">With Markup (€)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lines.map((line) => {
                                const costPerUnitWithMarkup = line.std_cost_est * (1 + header.subcon_markup / 100);
                                const totalWithoutMarkup = line.quantity * line.std_cost_est;
                                const totalWithMarkup = totalWithoutMarkup * (1 + header.subcon_markup / 100);
                                return (
                                  <TableRow key={line.line_number}>
                                    <TableCell>
                                      <Badge variant="secondary">{line.quantity} units</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={line.std_cost_est}
                                        onChange={(e) => {
                                          const newSubs = [...subcons];
                                          const subIdx = newSubs.findIndex(s => s.line_number === line.line_number);
                                          if (subIdx >= 0) {
                                            newSubs[subIdx].std_cost_est = parseFloat(e.target.value) || 0;
                                            setSubcons(newSubs);
                                          }
                                        }}
                                        className="w-24 text-center mx-auto"
                                        placeholder="0.00"
                                      />
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-primary">
                                      €{costPerUnitWithMarkup.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      €{totalWithoutMarkup.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      €{totalWithMarkup.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 p-4 border rounded-lg bg-muted/30 flex items-center gap-4">
                  <div className="space-y-2">
                    <Label>Subcon Markup (%)</Label>
                    <Input
                      type="number"
                      value={header.subcon_markup}
                      onChange={(e) => setHeader({ ...header, subcon_markup: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Total Subcon (with {header.subcon_markup}% markup): €{totals.totalSubconCost.toFixed(2)}
                  </Badge>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Production
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Planning Tab */}
          <TabsContent value="production">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Production Planning
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Enter production parameters to calculate manufacturing time and costs. Total cost = (Quantity × Cycle time × (1 + (100 - Effectiveness) / 100)) × Hourly rate / 3600</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Configure production parameters and calculate manufacturing costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="bg-muted/50 border-primary/20 mb-6">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>Formula:</strong> Total cost = (Quantity × Time per piece × (1 + (100 - Effectiveness) / 100) × Hourly rate) / 3600
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  {/* Row 1: Main production parameters */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Cycle time per piece (sec)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={productionPlanning.cycle_time_per_piece || ''}
                        onChange={(e) => setProductionPlanning(prev => ({ ...prev, cycle_time_per_piece: parseFloat(e.target.value) || 0 }))}
                        placeholder="360"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Production hours per day</Label>
                      <Input
                        type="number"
                        value={productionPlanning.production_hours_per_day || ''}
                        onChange={(e) => setProductionPlanning(prev => ({ ...prev, production_hours_per_day: parseFloat(e.target.value) || 18 }))}
                        placeholder="18"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Production effectiveness (%)</Label>
                      <Input
                        type="number"
                        value={productionPlanning.production_effectiveness || ''}
                        onChange={(e) => setProductionPlanning(prev => ({ ...prev, production_effectiveness: parseFloat(e.target.value) || 85 }))}
                        placeholder="85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly rate (€/hour)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productionPlanning.hourly_rate || ''}
                        onChange={(e) => setProductionPlanning(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                        placeholder="65"
                      />
                    </div>
                  </div>

                  {/* Row 2: Programming and Setup costs */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="font-medium mb-3 block">Programming cost</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={productionPlanning.programming_hours ?? ''}
                          onChange={(e) => setProductionPlanning(prev => ({ ...prev, programming_hours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                          className="w-20"
                          placeholder="hrs"
                        />
                        <span className="text-muted-foreground">×</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={productionPlanning.programming_rate ?? ''}
                          onChange={(e) => setProductionPlanning(prev => ({ ...prev, programming_rate: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                          className="w-24"
                          placeholder="€/hr"
                        />
                        <span className="text-muted-foreground">=</span>
                        <Badge variant="secondary" className="text-base">
                          €{((productionPlanning.programming_hours || 0) * (productionPlanning.programming_rate || 0)).toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="font-medium mb-3 block">Setup cost</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={productionPlanning.setup_hours ?? ''}
                          onChange={(e) => setProductionPlanning(prev => ({ ...prev, setup_hours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                          className="w-20"
                          placeholder="hrs"
                        />
                        <span className="text-muted-foreground">×</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={productionPlanning.setup_rate ?? ''}
                          onChange={(e) => setProductionPlanning(prev => ({ ...prev, setup_rate: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                          className="w-24"
                          placeholder="€/hr"
                        />
                        <span className="text-muted-foreground">=</span>
                        <Badge variant="secondary" className="text-base">
                          €{((productionPlanning.setup_hours || 0) * (productionPlanning.setup_rate || 0)).toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Profit and commission */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Production profit %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={productionPlanning.production_profit_percent ?? ''}
                        onChange={(e) => setProductionPlanning(prev => ({ ...prev, production_profit_percent: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Production sales commission %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={productionPlanning.production_sales_commission_percent ?? ''}
                        onChange={(e) => setProductionPlanning(prev => ({ ...prev, production_sales_commission_percent: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Calculated Results per Volume */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h4 className="text-sm font-semibold mb-4">Calculated Results per Volume</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Volume</TableHead>
                          <TableHead className="text-right">Time to Produce</TableHead>
                          <TableHead className="text-right">Cost per Detail</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productionCalculations.map((calc, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge variant="outline">{calc.quantity.toLocaleString()} pcs</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {calc.timeNeededDays.toFixed(1)} days
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              €{calc.costPerDetail.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              €{calc.totalCost.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Routings
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routings Tab */}
          <TabsContent value="routings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Routing Operations
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>Define the sequence of manufacturing operations. Each operation uses a resource (machine/workstation) with an associated cost per minute. The system calculates costs based on setup and run times.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Define the manufacturing routing sequence</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setRoutings(defaultRoutings);
                      setSetupIncludedOps(new Set([20, 40, 60, 70, 80, 90, 100, 110]));
                      toast.success('Routing reset to standard template');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Reset to Standard
                  </Button>
                  <Button onClick={addRoutingLine} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Operation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Alert className="bg-muted/50 border-primary/20 mb-4">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>Op No:</strong> Operation sequence. <strong>Resource:</strong> Machine/workstation. <strong>Setup:</strong> One-time setup minutes per batch. <strong>Run:</strong> Minutes per part. 
                    <strong className="ml-1">Inc.:</strong> Check to include this operation in the cost calculation.
                  </AlertDescription>
                </Alert>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="w-16">Op No</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Operation Details</TableHead>
                        <TableHead className="text-right">Subcon Time</TableHead>
                        <TableHead className="text-right">Setup (min)</TableHead>
                        <TableHead className="text-center w-16">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 justify-center">
                              Inc.
                              <HelpCircle className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Check to include this operation in the cost calculation.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">Setup Cost (€)</TableHead>
                        <TableHead className="text-right">Run (min)</TableHead>
                        <TableHead className="text-right">Cost/Min (€)</TableHead>
                        <TableHead className="text-right">Run Cost (€)</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routings.map((route, idx) => {
                        const costPerMin = getResourceCost(route.resource_no);
                        const setupCostForOp = route.setup_time * costPerMin;
                        const runCostForOp = route.run_time * costPerMin;
                        const isIncluded = setupIncludedOps.has(route.op_no);
                        // Check if this is a development/engineering resource (exclude setup by default)
                        const isDevelopmentResource = route.resource_no.toLowerCase().includes('eng') || 
                                                      route.resource_no.toLowerCase().includes('dev') ||
                                                      route.resource_no.toLowerCase().includes('manueng') ||
                                                      route.resource_no.toLowerCase().includes('program');
                        
                        return (
                          <TableRow 
                            key={idx} 
                            className={`${!isIncluded ? 'bg-muted/30' : ''} ${draggedRoutingIdx === idx ? 'opacity-50 bg-primary/10' : ''}`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedRoutingIdx(idx);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => setDraggedRoutingIdx(null)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedRoutingIdx === null || draggedRoutingIdx === idx) return;
                              
                              const newRoutings = [...routings];
                              const [draggedItem] = newRoutings.splice(draggedRoutingIdx, 1);
                              newRoutings.splice(idx, 0, draggedItem);
                              
                              // Renumber op_no based on new order (10, 20, 30, ...)
                              const renumbered = newRoutings.map((r, i) => ({
                                ...r,
                                op_no: (i + 1) * 10
                              }));
                              
                              // Update setupIncludedOps with new op_nos
                              const newIncludedOps = new Set<number>();
                              renumbered.forEach((r, i) => {
                                const oldOp = newRoutings[i].op_no;
                                if (setupIncludedOps.has(routings.find(orig => orig === newRoutings[i])?.op_no || oldOp)) {
                                  newIncludedOps.add(r.op_no);
                                }
                              });
                              
                              setRoutings(renumbered);
                              setSetupIncludedOps(newIncludedOps);
                              setDraggedRoutingIdx(null);
                            }}
                          >
                            <TableCell className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={route.op_no}
                                onChange={(e) => {
                                  const nextOpNo = parseInt(e.target.value) || 0;
                                  const prevOpNo = route.op_no;

                                  const newRoutes = [...routings];
                                  newRoutes[idx].op_no = nextOpNo;
                                  setRoutings(newRoutes);

                                  // Preserve setup selection for this row when op_no changes
                                  setSetupIncludedOps((prev) => {
                                    if (!prev.has(prevOpNo)) return prev;
                                    const next = new Set(prev);
                                    next.delete(prevOpNo);
                                    next.add(nextOpNo);
                                    return next;
                                  });
                                }}
                                className="w-16"
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Select
                                      value={route.resource_no}
                                      onValueChange={(v) => {
                                        const newRoutes = [...routings];
                                        newRoutes[idx].resource_no = v;
                                        setRoutings(newRoutes);
                                        
                                        // Auto-exclude development resources from setup calculation
                                        const isDevResource = v.toLowerCase().includes('eng') || 
                                                              v.toLowerCase().includes('dev') ||
                                                              v.toLowerCase().includes('manueng') ||
                                                              v.toLowerCase().includes('program');
                                        if (isDevResource) {
                                          setSetupIncludedOps((prev) => {
                                            const next = new Set(prev);
                                            next.delete(route.op_no);
                                            return next;
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className={`w-48 ${isSubconResource(route.resource_no) ? 'border-amber-400 bg-amber-50' : ''}`}>
                                        <SelectValue placeholder="Select..." />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[300px]">
                                        {/* Regular site resources */}
                                        {siteResources.map(r => (
                                          <SelectItem key={r.id} value={r.resource_no}>
                                            {r.resource_no}
                                          </SelectItem>
                                        ))}
                                        {/* Virtual subcon resources (if any subcons exist) */}
                                        {subconResources.length > 0 && (
                                          <>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border-t">
                                              Subcon Operations
                                            </div>
                                            {subconResources.map(r => (
                                              <SelectItem key={r.id} value={r.resource_no} className="text-amber-700">
                                                🔗 {r.resource_no}
                                              </SelectItem>
                                            ))}
                                          </>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TooltipTrigger>
                                {route.resource_no && (
                                  <TooltipContent side="bottom" className="max-w-md">
                                    {route.resource_no}
                                    {isDevelopmentResource && (
                                      <span className="text-amber-500 block text-xs">Development resource - setup excluded by default</span>
                                    )}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    value={route.operation_details}
                                    onChange={(e) => {
                                      const newRoutes = [...routings];
                                      newRoutes[idx].operation_details = e.target.value;
                                      setRoutings(newRoutes);
                                    }}
                                    className="truncate"
                                  />
                                </TooltipTrigger>
                                {route.operation_details && (
                                  <TooltipContent side="bottom" className="max-w-md whitespace-pre-wrap">
                                    {route.operation_details}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={route.subcon_processing_time}
                                onChange={(e) => {
                                  const newRoutes = [...routings];
                                  newRoutes[idx].subcon_processing_time = parseFloat(e.target.value) || 0;
                                  setRoutings(newRoutes);
                                }}
                                className="w-20 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={route.setup_time}
                                onChange={(e) => {
                                  const newRoutes = [...routings];
                                  newRoutes[idx].setup_time = parseFloat(e.target.value) || 0;
                                  setRoutings(newRoutes);
                                }}
                                className="w-20 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isIncluded}
                                onCheckedChange={(checked) => {
                                  setSetupIncludedOps(prev => {
                                    const newSet = new Set(prev);
                                    if (checked) {
                                      newSet.add(route.op_no);
                                    } else {
                                      newSet.delete(route.op_no);
                                    }
                                    return newSet;
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${isIncluded ? 'text-primary' : 'text-muted-foreground line-through'}`}>
                                €{setupCostForOp.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={route.run_time}
                                onChange={(e) => {
                                  const newRoutes = [...routings];
                                  newRoutes[idx].run_time = parseFloat(e.target.value) || 0;
                                  setRoutings(newRoutes);
                                }}
                                className="w-20 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              <span className={isIncluded ? '' : 'line-through'}>
                                €{costPerMin.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${isIncluded ? '' : 'text-muted-foreground line-through'}`}>
                                €{runCostForOp.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const newRoutes = routings.filter((_, i) => i !== idx);
                                  setRoutings(newRoutes);
                                }}
                                title="Remove operation"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-4 items-center flex-wrap">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Badge variant="outline" className="px-3 py-1.5">
                      Setup (included): {totals.selectedSetupTime.toFixed(1)} min
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1.5 text-muted-foreground">
                      Setup (excluded): {(totals.totalSetupTime - totals.selectedSetupTime).toFixed(1)} min
                    </Badge>
                    <Badge variant="secondary" className="px-3 py-1.5">
                      Setup Cost: €{totals.totalSetupCost.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1.5">
                      Run Time: {totals.totalRunTime.toFixed(1)} min
                    </Badge>
                    {productionCalculations[0]?.costPerDetail > 0 && (
                      <Badge variant="secondary" className="px-3 py-1.5 border-primary">
                        Cost/Detail (Production): €{productionCalculations[0].costPerDetail.toFixed(2)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      Run Cost: €{totals.totalRoutingCost.toFixed(2)}
                    </Badge>
                  </div>
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Pricing
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Secondary Operations Tab */}
          <TabsContent value="secondary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Secondary Operations
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Define secondary operations like deburring, washing, inspection, and other post-machining processes with their associated costs.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Add secondary operations and post-processing costs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Added Secondary Operations Table */}
                {secondaryOps.length > 0 && (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operation</TableHead>
                          <TableHead>Cost Type</TableHead>
                          <TableHead className="text-right">Qty/Run</TableHead>
                          <TableHead className="text-right">Cost (€)</TableHead>
                          <TableHead>Lead Time</TableHead>
                          <TableHead className="text-right">Markup %</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {secondaryOps.map((op) => (
                          <TableRow key={op.id}>
                            <TableCell className="font-medium">{op.operation}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {op.cost_type === 'per_piece' ? 'Per Piece' : op.cost_type === 'per_run' ? 'Per Run' : 'Total'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{op.quantity_per_run || '-'}</TableCell>
                            <TableCell className="text-right">€{op.cost.toFixed(2)}</TableCell>
                            <TableCell>{op.lead_time || '-'}</TableCell>
                            <TableCell className="text-right">{op.markup}%</TableCell>
                            <TableCell className="max-w-[150px] truncate">{op.notes || '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => setSecondaryOps(prev => prev.filter(o => o.id !== op.id))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Add Secondary Operation Form */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-sm">Add Secondary Operation</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Operation</Label>
                      <Select
                        value={secondaryOpForm.operation}
                        onValueChange={(v) => setSecondaryOpForm(prev => ({ ...prev, operation: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource..." />
                        </SelectTrigger>
                        <SelectContent>
                          {resources.filter(r => r.is_active).map(r => (
                            <SelectItem key={r.id} value={r.resource_description}>
                              {r.resource_no} - {r.resource_description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Cost Type</Label>
                      <RadioGroup
                        value={secondaryOpForm.cost_type}
                        onValueChange={(v) => setSecondaryOpForm(prev => ({ ...prev, cost_type: v as 'per_piece' | 'per_run' | 'total' }))}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="per_piece" id="per_piece" />
                          <Label htmlFor="per_piece" className="font-normal cursor-pointer">Per Piece</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="per_run" id="per_run" />
                          <Label htmlFor="per_run" className="font-normal cursor-pointer">Per Run</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="total" id="total" />
                          <Label htmlFor="total" className="font-normal cursor-pointer">Total</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Quantity per Run</Label>
                      <Input
                        type="number"
                        value={secondaryOpForm.quantity_per_run || ''}
                        onChange={(e) => setSecondaryOpForm(prev => ({ ...prev, quantity_per_run: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 100"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Cost (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={secondaryOpForm.cost || ''}
                        onChange={(e) => setSecondaryOpForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 35"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Lead Time</Label>
                      <Input
                        value={secondaryOpForm.lead_time}
                        onChange={(e) => setSecondaryOpForm(prev => ({ ...prev, lead_time: e.target.value }))}
                        placeholder="e.g., 2 days"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Markup %</Label>
                      <Input
                        type="number"
                        value={secondaryOpForm.markup || ''}
                        onChange={(e) => setSecondaryOpForm(prev => ({ ...prev, markup: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 10"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={secondaryOpForm.notes}
                        onChange={(e) => setSecondaryOpForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setSecondaryOpForm({
                        operation: '',
                        cost_type: 'per_run',
                        quantity_per_run: 0,
                        cost: 0,
                        lead_time: '',
                        markup: 0,
                        notes: ''
                      })}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (secondaryOpForm.operation) {
                          setSecondaryOps(prev => [...prev, {
                            id: crypto.randomUUID(),
                            ...secondaryOpForm
                          }]);
                          setSecondaryOpForm({
                            operation: '',
                            cost_type: 'per_run',
                            quantity_per_run: 0,
                            cost: 0,
                            lead_time: '',
                            markup: 0,
                            notes: ''
                          });
                        }
                      }}
                      disabled={!secondaryOpForm.operation}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Next: Pricing
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Volume Pricing & Cost Breakdown
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>This tab shows the calculated costs and pricing for each volume tier. Unit prices are derived from total costs divided by quantity, then adjusted to achieve the target margin.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Review calculated costs and margins for each volume tier</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="bg-muted/50 border-primary/20 mb-4">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>All values shown per part.</strong> Unit Price = Cost/Part ÷ (1 - Margin%). 
                    {currency !== 'EUR' && <span className="ml-2"><strong>Currency:</strong> {currency} (1 EUR = {exchangeRate.toFixed(4)} {currency})</span>}
                  </AlertDescription>
                </Alert>
                {/* Warning for high subcon costs */}
                {volumes.some(vol => {
                  const setupPerPart = totals.totalSetupCost / vol.quantity;
                  const routingPerPart = totals.totalRoutingCost;
                  const subconPerPart = totals.totalSubconCost;
                  const setupPlusRouting = setupPerPart + routingPerPart;
                  return setupPlusRouting > 0 && subconPerPart > (setupPlusRouting * 0.4);
                }) && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        <strong>Warning:</strong> Subcon cost exceeds 40% of Setup + Routing cost. Please review your subcontracting costs.
                      </span>
                      <label className="flex items-center gap-2 ml-4 cursor-pointer">
                        <Checkbox
                          checked={excludeSubconFromMargin}
                          onCheckedChange={(checked) => setExcludeSubconFromMargin(checked === true)}
                        />
                        <span className="text-sm font-medium whitespace-nowrap">Exclude subcon from margin</span>
                      </label>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Qty</TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('setupCost')}
                        >
                          <span className="underline decoration-dotted">Setup/Part (€)</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('routingCost')}
                        >
                          <span className="underline decoration-dotted">Routing/Part (€)</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('material')}
                        >
                          <span className="underline decoration-dotted">Material/Part (€)</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('subcon')}
                        >
                          <span className="underline decoration-dotted">Subcon/Part (€)</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('costPerPart')}
                        >
                          <span className="underline decoration-dotted">Total Cost/Part (€)</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('unitPrice')}
                        >
                          <span className="underline decoration-dotted">Unit Price ({currencySymbols[currency]})</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('ratePerHour')}
                        >
                          <span className="underline decoration-dotted">Rate/hr (€)</span>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setExplainerOpen('margin')}
                        >
                          <span className="underline decoration-dotted">Margin</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {volumes.map((vol, idx) => {
                        // Calculate per-part values
                        const setupPerPart = totals.totalSetupCost / vol.quantity;
                        const routingPerPart = totals.totalRoutingCost;
                        const materialPerPart = totals.totalMaterialCost;
                        // Get quantity-specific subcon cost with markup
                        const qtySubconCostRaw = getSubconCostForQuantity(vol.quantity);
                        const qtySubconCostWithMarkup = qtySubconCostRaw * (1 + header.subcon_markup / 100);
                        // When excluding subcon from margin, use raw subcon cost (without markup)
                        const rawSubconPerPart = excludeSubconFromMargin 
                          ? qtySubconCostRaw
                          : qtySubconCostWithMarkup;
                        const subconPerPart = rawSubconPerPart;
                        const totalCostPerPart = setupPerPart + routingPerPart + materialPerPart + subconPerPart;
                        
                        // Calculate unit price based on margin calculation method
                        let unitPriceEur: number;
                        if (excludeSubconFromMargin) {
                          // Apply margin only to cost without subcon, then add raw subcon
                          const costWithoutSubcon = setupPerPart + routingPerPart + materialPerPart;
                          unitPriceEur = (costWithoutSubcon / (1 - vol.margin / 100)) + rawSubconPerPart;
                        } else {
                          unitPriceEur = totalCostPerPart / (1 - vol.margin / 100);
                        }
                        
                        const unitPriceConverted = unitPriceEur * exchangeRate;
                        // Calculate rate per hour: Price per Part × (60 / Minutes per Part)
                        const timePerPartMins = totals.totalRunTime;
                        const ratePerHour = timePerPartMins > 0 ? unitPriceEur * (60 / timePerPartMins) : 0;
                        
                        // Check if subcon cost exceeds 40% of setup+routing cost
                        const setupPlusRouting = setupPerPart + routingPerPart;
                        const subconExceedsThreshold = setupPlusRouting > 0 && subconPerPart > (setupPlusRouting * 0.4);

                        return (
                          <TableRow key={idx} className={subconExceedsThreshold ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{vol.quantity}</TableCell>
                            <TableCell className="text-right">€{setupPerPart.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{routingPerPart.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{materialPerPart.toFixed(2)}</TableCell>
                            <TableCell className={`text-right ${subconExceedsThreshold ? "text-red-600 font-bold" : ""}`}>
                              €{subconPerPart.toFixed(2)}
                              {subconExceedsThreshold && <AlertTriangle className="inline-block ml-1 h-4 w-4 text-red-600" />}
                            </TableCell>
                            <TableCell className="text-right font-medium">€{totalCostPerPart.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-primary">{currencySymbols[currency]}{unitPriceConverted.toFixed(2)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="border-green-500 text-green-600">€{ratePerHour.toFixed(2)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={vol.margin}
                                  onChange={(e) => {
                                    const newVols = [...volumes];
                                    newVols[idx].margin = parseFloat(e.target.value) || 0;
                                    setVolumes(newVols);
                                  }}
                                  className="w-16 text-right border-amber-500/50 bg-amber-500/5 focus:border-amber-500"
                                />
                                <span className="text-sm text-amber-600 font-medium">%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleFinishQuote}
                    disabled={saving || finishingQuote}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {finishingQuote ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Finish Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculation Explainer Dialog */}
          <Dialog open={explainerOpen !== null} onOpenChange={(open) => !open && setExplainerOpen(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  {explainerOpen === 'setupCost' && 'Setup Cost Calculation'}
                  {explainerOpen === 'routingCost' && 'Routing Cost Calculation'}
                  {explainerOpen === 'material' && 'Material Cost Calculation'}
                  {explainerOpen === 'subcon' && 'Subcon Cost Calculation'}
                  {explainerOpen === 'totalCost' && 'Total Cost Calculation'}
                  {explainerOpen === 'costPerPart' && 'Cost per Part Calculation'}
                  {explainerOpen === 'unitPrice' && 'Unit Price Calculation'}
                  {explainerOpen === 'ratePerHour' && 'Rate per Hour Calculation'}
                  {explainerOpen === 'margin' && 'Margin Explanation'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {explainerOpen === 'setupCost' && (
                  <>
                    <DialogDescription>
                      Total setup cost (batch cost) from included operations. Control which operations are included using the "Inc. Setup" checkbox in the Routing tab.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <p className="font-mono text-sm">Total Setup Cost = Σ(Selected Setup Time × Resource Rate)</p>
                      
                      <div className="border-t pt-3 mt-2">
                        <p className="text-sm font-medium mb-2">Operations Breakdown:</p>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {routings.filter(r => r.setup_time > 0 && setupIncludedOps.has(r.op_no)).map((r) => {
                            const costPerMin = getResourceCost(r.resource_no);
                            const setupCostForOp = r.setup_time * costPerMin;
                            return (
                              <div
                                key={r.op_no}
                                className="flex items-center justify-between p-2 rounded text-sm bg-background"
                              >
                                <div>
                                  <span className="font-medium">Op {r.op_no}</span>
                                  <span className="text-muted-foreground"> - {r.resource_no}</span>
                                </div>
                                <span className="font-medium">
                                  {r.setup_time} min × €{costPerMin.toFixed(2)} = €{setupCostForOp.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Summary:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Included Setup Time: <strong>{totals.selectedSetupTime.toFixed(1)} min</strong></li>
                          <li>• <strong>Total Setup Cost: €{totals.totalSetupCost.toFixed(2)}</strong></li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'routingCost' && (
                  <>
                    <DialogDescription>
                      Total routing cost from all operations multiplied by quantity.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Routing = Routing Cost per Part × Quantity</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Current Values:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Routing Cost per Part: <strong>€{totals.totalRoutingCost.toFixed(2)}</strong></li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'material' && (
                  <>
                    <DialogDescription>
                      Total material cost including markup, multiplied by quantity.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Material = (Sum of Material Costs × (1 + Markup%)) × Qty</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Current Values:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Base Material Cost: <strong>€{(totals.totalMaterialCost / (1 + header.material_markup / 100)).toFixed(2)}</strong>/unit</li>
                          <li>• Material Markup: <strong>{header.material_markup}%</strong></li>
                          <li>• With Markup: <strong>€{totals.totalMaterialCost.toFixed(2)}</strong>/unit</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'subcon' && (
                  <>
                    <DialogDescription>
                      Total subcontractor cost including markup, multiplied by quantity.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Subcon = (Sum of Subcon Costs × (1 + Markup%)) × Qty</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Current Values:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Base Subcon Cost: <strong>€{(totals.totalSubconCost / (1 + header.subcon_markup / 100)).toFixed(2)}</strong>/unit</li>
                          <li>• Subcon Markup: <strong>{header.subcon_markup}%</strong></li>
                          <li>• With Markup: <strong>€{totals.totalSubconCost.toFixed(2)}</strong>/unit</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'totalCost' && (
                  <>
                    <DialogDescription>
                      Sum of all cost components for the batch.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Total Cost = Labour + Material + Subcon</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Components:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Labour: Hours × Cost/Hr</li>
                          <li>• Material: Material cost per unit × Quantity</li>
                          <li>• Subcon: Subcon cost per unit × Quantity</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'costPerPart' && (
                  <>
                    <DialogDescription>
                      The cost to produce each individual part at this volume.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Cost per Part = Total Cost ÷ Quantity</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Components:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Labour cost per part</li>
                          <li>• Material cost per part: <strong>€{totals.totalMaterialCost.toFixed(2)}</strong></li>
                          <li>• Subcon cost per part: <strong>€{totals.totalSubconCost.toFixed(2)}</strong></li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'unitPrice' && (
                  <>
                    <DialogDescription>
                      Selling price per unit after applying the target margin.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Unit Price = (Total Cost ÷ Quantity) ÷ (1 - Margin%)</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Example:</strong></p>
                        <p className="text-sm">If cost per unit is €100 and margin is 35%:</p>
                        <p className="font-mono text-sm mt-1">€100 ÷ (1 - 0.35) = €100 ÷ 0.65 = <strong>€153.85</strong></p>
                      </div>
                      {currency !== 'EUR' && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-sm"><strong>Currency Conversion:</strong></p>
                          <p className="text-sm">1 EUR = {exchangeRate.toFixed(4)} {currency}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {explainerOpen === 'ratePerHour' && (
                  <>
                    <DialogDescription>
                      Effective hourly rate being charged based on the unit price (including material and subcon).
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Hourly Rate = Price per Part × (60 ÷ Minutes per Part)</p>
                      <p className="font-mono text-xs text-muted-foreground">Minutes per Part = Total Run Time</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Current Values:</strong></p>
                        <ul className="text-sm space-y-1 mt-1">
                          <li>• Total Run Time: <strong>{totals.totalRunTime.toFixed(1)} min</strong></li>
                        </ul>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>How it works:</strong></p>
                        <p className="text-sm">This shows the effective hourly rate you're charging, calculated by multiplying the unit price by 60 and dividing by the minutes per part. This includes all costs: material, subcon, and labour.</p>
                      </div>
                    </div>
                  </>
                )}
                {explainerOpen === 'margin' && (
                  <>
                    <DialogDescription>
                      Target profit margin as a percentage of the selling price.
                    </DialogDescription>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-mono text-sm">Margin% = (Unit Price - Cost per Unit) ÷ Unit Price × 100</p>
                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm"><strong>Note:</strong></p>
                        <p className="text-sm">You can edit the margin for each volume tier. The unit price will automatically recalculate based on your desired margin.</p>
                        <p className="text-sm mt-2">Default margins are set in the Settings page.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </Tabs>

        {/* Drawing Preview Dialog */}
        <DrawingPreviewDialog
          open={drawingPreviewOpen}
          onOpenChange={setDrawingPreviewOpen}
          url={drawingUrl}
          fileName={drawingFile?.name}
        />
      </div>
    </AppLayout>
  );
};

export default QuotationSystemNew;
