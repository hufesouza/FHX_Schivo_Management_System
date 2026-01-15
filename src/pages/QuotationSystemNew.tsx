import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Loader2, Save, Plus, Trash2, Calculator, FileText, Package, Truck, ListOrdered, HelpCircle, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useQuotationResources, useQuotationSettings } from '@/hooks/useQuotationSystem';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

interface VolumePricing {
  quantity: number;
  margin: number;
}

const QuotationSystemNew = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { resources, loading: resourcesLoading } = useQuotationResources();
  const { settings, getSettingValue, loading: settingsLoading } = useQuotationSettings();
  const [saving, setSaving] = useState(false);
  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [activeTab, setActiveTab] = useState('header');
  const [quotationId, setQuotationId] = useState<string | null>(editId || null);

  const tabOrder = ['header', 'materials', 'subcon', 'routings', 'pricing'];

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
  });

  // Volume state
  const [volumes, setVolumes] = useState<VolumePricing[]>([
    { quantity: 500, margin: 45 },
    { quantity: 750, margin: 40 },
    { quantity: 1000, margin: 35 },
  ]);

  // Materials state
  const [materials, setMaterials] = useState<MaterialLine[]>([
    { line_number: 1, vendor_no: '', vendor_name: '', part_number: '', material_description: '', mat_category: '', uom: 'Each', qty_per_unit: 1, qa_inspection_required: false, std_cost_est: 0, certification_required: '', purchaser: '' }
  ]);

  // Subcon state - generate initial lines based on volumes
  const generateSubconLines = (subconId: number, vendorNo: string, vendorName: string, processDesc: string, costs: number[], certReq: boolean): SubconLine[] => {
    return volumes.map((vol, idx) => ({
      line_number: (subconId - 1) * volumes.length + idx + 1,
      subcon_id: subconId,
      vendor_no: vendorNo,
      vendor_name: vendorName,
      part_number: `${header.part_number}${header.revision}SCL${subconId}`,
      process_description: processDesc,
      quantity: vol.quantity,
      std_cost_est: costs[idx] || 0,
      certification_required: certReq
    }));
  };

  const [subcons, setSubcons] = useState<SubconLine[]>([]);

  // Routing state
  const [routings, setRoutings] = useState<RoutingLine[]>([
    { op_no: 10, sublevel_bom: false, part_number: '', resource_no: 'ManuEng', operation_details: 'REVIEW PROCESS, METHOD & FILL IN BLUE REVIEW', subcon_processing_time: 0, setup_time: 0.1, run_time: 0 },
    { op_no: 20, sublevel_bom: false, part_number: '', resource_no: 'Saw', operation_details: 'BOOK OUT ALLOCATED MATERIAL', subcon_processing_time: 0, setup_time: 10, run_time: 0 },
  ]);

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

  // Load existing quotation for editing
  useEffect(() => {
    const loadQuotation = async () => {
      if (!editId) return;
      
      setLoadingQuotation(true);
      try {
        // Load main quotation
        const { data: quotation, error: quotationError } = await supabase
          .from('system_quotations')
          .select('*')
          .eq('id', editId)
          .single();
        
        if (quotationError) throw quotationError;
        
        if (quotation) {
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
          });
        }

        // Load volume pricing (for volumes and margins)
        const { data: volumeData } = await supabase
          .from('quotation_volume_pricing')
          .select('*')
          .eq('quotation_id', editId)
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
          .eq('quotation_id', editId)
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
            purchaser: m.purchaser || ''
          })));
        }

        // Load subcons
        const { data: subconsData } = await supabase
          .from('quotation_subcons')
          .select('*')
          .eq('quotation_id', editId)
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
          .eq('quotation_id', editId)
          .order('op_no', { ascending: true });
        
        if (routingsData && routingsData.length > 0) {
          setRoutings(routingsData.map(r => ({
            op_no: r.op_no,
            sublevel_bom: r.sublevel_bom || false,
            part_number: r.part_number || '',
            resource_no: r.resource_no || '',
            operation_details: r.operation_details || '',
            subcon_processing_time: r.subcon_processing_time || 0,
            setup_time: r.setup_time || 0,
            run_time: r.run_time || 0
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
  }, [editId]);

  const addMaterialLine = () => {
    setMaterials([...materials, {
      line_number: materials.length + 1,
      vendor_no: '', vendor_name: '', part_number: '', material_description: '',
      mat_category: '', uom: 'Each', qty_per_unit: 1, qa_inspection_required: false,
      std_cost_est: 0, certification_required: '', purchaser: ''
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
      part_number: `${header.part_number}${header.revision}SCL${newSubconId}`,
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
    setRoutings([...routings, {
      op_no: lastOpNo + 10,
      sublevel_bom: false,
      part_number: header.part_number + '-' + header.revision,
      resource_no: '',
      operation_details: '',
      subcon_processing_time: 0,
      setup_time: 0,
      run_time: 0
    }]);
  };

  const getResourceCost = (resourceNo: string): number => {
    const resource = resources.find(r => r.resource_no === resourceNo);
    return resource?.cost_per_minute || 0;
  };

  const calculateRoutingCost = (line: RoutingLine): number => {
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
    const totalSetupTime = routings.reduce((sum, r) => sum + r.setup_time, 0);
    const totalRunTime = routings.reduce((sum, r) => sum + r.run_time, 0);
    const totalRoutingCost = routings.reduce((sum, r) => sum + calculateRoutingCost(r), 0);
    const costPerHour = getSettingValue('cost_per_hour') || 55;

    return {
      totalMaterialCost: totalMaterialCost * (1 + header.material_markup / 100),
      totalSubconCost: totalSubconCost * (1 + header.subcon_markup / 100),
      totalSetupTime,
      totalRunTime,
      totalRoutingCost,
      costPerHour
    };
  };

  const totals = calculateTotals();

  const handleSave = async (showSuccessToast = true, navigateAfter = true): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    if (!header.enquiry_no || !header.customer || !header.part_number) {
      toast.error('Please fill in required fields (Enquiry No, Customer, Part Number)');
      return false;
    }

    setSaving(true);
    try {
      let currentQuotationId = quotationId;

      if (currentQuotationId) {
        // Update existing quotation
        const { error: updateError } = await supabase
          .from('system_quotations')
          .update({
            ...header,
            vol_1: volumes[0]?.quantity || null,
            vol_2: volumes[1]?.quantity || null,
            vol_3: volumes[2]?.quantity || null,
          })
          .eq('id', currentQuotationId);

        if (updateError) throw updateError;

        // Delete existing related data to re-insert
        await supabase.from('quotation_materials').delete().eq('quotation_id', currentQuotationId);
        await supabase.from('quotation_subcons').delete().eq('quotation_id', currentQuotationId);
        await supabase.from('quotation_routings').delete().eq('quotation_id', currentQuotationId);
        await supabase.from('quotation_volume_pricing').delete().eq('quotation_id', currentQuotationId);
      } else {
        // Create quotation header
        const { data: quotation, error: quotationError } = await supabase
          .from('system_quotations')
          .insert({
            ...header,
            vol_1: volumes[0]?.quantity || null,
            vol_2: volumes[1]?.quantity || null,
            vol_3: volumes[2]?.quantity || null,
            created_by: user.id
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
        part_number: `${header.part_number}${header.revision}SCL${s.subcon_id}`,
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
        ...r,
        cost: calculateRoutingCost(r)
      }));

      if (routingInserts.length > 0) {
        const { error: routingError } = await supabase
          .from('quotation_routings')
          .insert(routingInserts);
        if (routingError) throw routingError;
      }

      // Insert volume pricing
      const costPerHour = getSettingValue('cost_per_hour') || 55;
      const volumeInserts = volumes.map(v => {
        const hours = (totals.totalSetupTime + totals.totalRunTime * v.quantity) / 60;
        const labourCost = hours * costPerHour;
        const materialCost = totals.totalMaterialCost * v.quantity;
        // Get subcon cost specific to this quantity tier
        const subconCostPerUnit = getSubconCostForQuantity(v.quantity) * (1 + header.subcon_markup / 100);
        const subconCost = subconCostPerUnit * v.quantity;
        const totalCost = labourCost + materialCost + subconCost;
        const unitPrice = totalCost / v.quantity / (1 - v.margin / 100);

        return {
          quotation_id: currentQuotationId,
          quantity: v.quantity,
          hours,
          cost_per_hour: costPerHour,
          labour_cost: labourCost,
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

      if (showSuccessToast) {
        toast.success('Quotation saved successfully');
      }
      if (navigateAfter) {
        navigate('/npi/quotation-system/list');
      }
      return true;
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
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

  const pageTitle = editId ? 'Edit Quotation' : 'New Quotation';

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
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="header" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Header
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-1 text-xs">
              <Package className="h-3 w-3" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="subcon" className="flex items-center gap-1 text-xs">
              <Truck className="h-3 w-3" />
              Subcon
            </TabsTrigger>
            <TabsTrigger value="routings" className="flex items-center gap-1 text-xs">
              <ListOrdered className="h-3 w-3" />
              Routings
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
                <Alert className="bg-muted/50 border-primary/20">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>Required fields:</strong> Enquiry No, Customer, and Part Number are mandatory. Material and Subcon markups are applied automatically to calculate total costs.
                  </AlertDescription>
                </Alert>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Enquiry No. *</Label>
                    <Input
                      value={header.enquiry_no}
                      onChange={(e) => setHeader({ ...header, enquiry_no: e.target.value })}
                      placeholder="e.g., 7650"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Input
                      value={header.customer}
                      onChange={(e) => setHeader({ ...header, customer: e.target.value })}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Code</Label>
                    <Input
                      value={header.customer_code}
                      onChange={(e) => setHeader({ ...header, customer_code: e.target.value })}
                      placeholder="e.g., CI0008"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quoted By</Label>
                    <Input
                      value={header.quoted_by}
                      onChange={(e) => setHeader({ ...header, quoted_by: e.target.value })}
                      placeholder="Your name"
                    />
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

                <div className="grid gap-4 md:grid-cols-2">
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
                <Alert className="bg-muted/50 border-primary/20 mb-4">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    Enter vendor details, part numbers, and standard costs. <strong>Qty/Unit</strong> = how many of this material are needed per finished part. <strong>Std Cost</strong> = cost per unit of material. Total is calculated with the {header.material_markup}% markup applied.
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
                        <TableHead className="text-right">Qty/Unit</TableHead>
                        <TableHead className="text-right">Std Cost (€)</TableHead>
                        <TableHead className="text-right">Total (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((mat, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{mat.line_number}</TableCell>
                          <TableCell>
                            <Input
                              value={mat.vendor_no}
                              onChange={(e) => {
                                const newMats = [...materials];
                                newMats[idx].vendor_no = e.target.value;
                                setMaterials(newMats);
                              }}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={mat.vendor_name}
                              onChange={(e) => {
                                const newMats = [...materials];
                                newMats[idx].vendor_name = e.target.value;
                                setMaterials(newMats);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={mat.part_number}
                              onChange={(e) => {
                                const newMats = [...materials];
                                newMats[idx].part_number = e.target.value;
                                setMaterials(newMats);
                              }}
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
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Each">Each</SelectItem>
                                <SelectItem value="Kg">Kg</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="M2">M²</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
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
                          <TableCell className="text-right font-medium">
                            €{((mat.std_cost_est * mat.qty_per_unit) * (1 + header.material_markup / 100)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                              PN: {header.part_number}{header.revision}SCL{subconId}
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
                              value={firstLine?.vendor_no || ''}
                              onChange={(e) => {
                                const newSubs = subcons.map(s =>
                                  s.subcon_id === subconId ? { ...s, vendor_no: e.target.value } : s
                                );
                                setSubcons(newSubs);
                              }}
                              placeholder="e.g., V001"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Vendor Name</Label>
                            <Input
                              value={firstLine?.vendor_name || ''}
                              onChange={(e) => {
                                const newSubs = subcons.map(s =>
                                  s.subcon_id === subconId ? { ...s, vendor_name: e.target.value } : s
                                );
                                setSubcons(newSubs);
                              }}
                              placeholder="Vendor name"
                            />
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
                                <TableHead className="text-right w-36">Qty × Cost (€)</TableHead>
                                <TableHead className="text-right w-36">With Markup (€)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lines.map((line) => {
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
                <Button onClick={addRoutingLine} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Operation
                </Button>
              </CardHeader>
              <CardContent>
                <Alert className="bg-muted/50 border-primary/20 mb-4">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    <strong>Op No:</strong> Operation sequence (10, 20, 30...). <strong>Resource:</strong> Machine/workstation from settings. <strong>Setup:</strong> One-time setup minutes per batch. <strong>Run:</strong> Minutes per part. Cost is calculated as (Setup + Run) × Resource Rate.
                  </AlertDescription>
                </Alert>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Op No</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Operation Details</TableHead>
                        <TableHead className="text-right">Subcon Time</TableHead>
                        <TableHead className="text-right">Setup (min)</TableHead>
                        <TableHead className="text-right">Run (min)</TableHead>
                        <TableHead className="text-right">Cost/Min (€)</TableHead>
                        <TableHead className="text-right">Total (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routings.map((route, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              type="number"
                              value={route.op_no}
                              onChange={(e) => {
                                const newRoutes = [...routings];
                                newRoutes[idx].op_no = parseInt(e.target.value) || 0;
                                setRoutings(newRoutes);
                              }}
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={route.resource_no}
                              onValueChange={(v) => {
                                const newRoutes = [...routings];
                                newRoutes[idx].resource_no = v;
                                setRoutings(newRoutes);
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {resources.filter(r => r.is_active).map(r => (
                                  <SelectItem key={r.id} value={r.resource_no}>
                                    {r.resource_no}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={route.operation_details}
                              onChange={(e) => {
                                const newRoutes = [...routings];
                                newRoutes[idx].operation_details = e.target.value;
                                setRoutings(newRoutes);
                              }}
                            />
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
                            €{getResourceCost(route.resource_no).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            €{calculateRoutingCost(route).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Badge variant="outline" className="px-4 py-2">
                      Total Setup: {totals.totalSetupTime.toFixed(1)} min
                    </Badge>
                    <Badge variant="outline" className="px-4 py-2">
                      Total Run: {totals.totalRunTime.toFixed(1)} min
                    </Badge>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      Total Routing Cost: €{totals.totalRoutingCost.toFixed(2)}
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
                    <strong>Formula:</strong> Total Cost = Labour + Materials + Subcon. <strong>Unit Price</strong> = Cost per Unit ÷ (1 - Margin%). Higher volumes reduce per-unit costs due to setup amortization.
                  </AlertDescription>
                </Alert>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Cost/Hr</TableHead>
                        <TableHead className="text-right">Labour Cost</TableHead>
                        <TableHead className="text-right">Material Cost</TableHead>
                        <TableHead className="text-right">Subcon Cost</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {volumes.map((vol, idx) => {
                        const hours = (totals.totalSetupTime + totals.totalRunTime * vol.quantity) / 60;
                        const labourCost = hours * totals.costPerHour;
                        const materialCost = totals.totalMaterialCost * vol.quantity;
                        const subconCost = totals.totalSubconCost * vol.quantity;
                        const totalCost = labourCost + materialCost + subconCost;
                        const unitPrice = totalCost / vol.quantity / (1 - vol.margin / 100);

                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{vol.quantity}</TableCell>
                            <TableCell className="text-right">{hours.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{totals.costPerHour.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{labourCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{materialCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{subconCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">€{totalCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-primary">${unitPrice.toFixed(2)}</Badge>
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
                <div className="mt-4">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default QuotationSystemNew;
