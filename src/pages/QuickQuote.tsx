import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Upload,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Package,
  DollarSign,
  Scale
} from 'lucide-react';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

// Load PDF.js from CDN
function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Extract text from PDF
async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

// Parse extracted text using regex patterns
function parseDrawingText(text: string, partNumberRegex: string, materialRegex: string): {
  partNumber: string | null;
  description: string | null;
  materialRaw: string | null;
} {
  let partNumber = null;
  let description = null;
  let materialRaw = null;
  
  try {
    const pnMatch = text.match(new RegExp(partNumberRegex, 'i'));
    partNumber = pnMatch ? (pnMatch[1] || pnMatch[2] || null)?.trim() : null;
  } catch (e) {
    console.error('Part number regex error:', e);
  }
  
  try {
    const matMatch = text.match(new RegExp(materialRegex, 'i'));
    materialRaw = matMatch ? (matMatch[1] || matMatch[2] || null)?.trim() : null;
  } catch (e) {
    console.error('Material regex error:', e);
  }
  
  // Try to extract description from common patterns
  const descPatterns = [
    /DESC(?:RIPTION)?.*?:\s*([^\n]+)/i,
    /TITLE.*?:\s*([^\n]+)/i,
    /NAME.*?:\s*([^\n]+)/i,
  ];
  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match) {
      description = match[1]?.trim();
      break;
    }
  }
  
  return { partNumber, description, materialRaw };
}

// PERT calculation
function calculatePERT(prices: number[]): {
  low: number;
  mostLikely: number;
  high: number;
  expected: number;
  stdDev: number;
  p80: number;
} | null {
  if (prices.length === 0) return null;
  
  const sorted = [...prices].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const medianIdx = Math.floor(sorted.length / 2);
  const mostLikely = sorted.length % 2 === 0 
    ? (sorted[medianIdx - 1] + sorted[medianIdx]) / 2 
    : sorted[medianIdx];
  
  const expected = (low + 4 * mostLikely + high) / 6;
  const stdDev = (high - low) / 6;
  const p80 = expected + 0.84 * stdDev; // ~80th percentile
  
  return { low, mostLikely, high, expected, stdDev, p80 };
}

interface Material {
  id: string;
  name: string;
  grade: string | null;
  form: string | null;
  density_kg_m3: number | null;
  default_yield: number | null;
  volatility_level: string | null;
  inflation_rate_per_year: number | null;
}

interface PostProcessType {
  id: string;
  name: string;
  pricing_model: string;
  setup_fee: number | null;
  unit_cost: number | null;
  minimum_lot_charge: number | null;
  default_lead_time_days: number | null;
}

interface RFQPart {
  id: string;
  part_number: string;
  description: string;
  material_id: string | null;
  material_text_raw: string | null;
  estimated_net_weight_kg: number | null;
  estimated_surface_area_m2: number | null;
  quantity_requested: number;
  post_processes: { typeId: string; complexity: string; overrideUnitCost: number | null; overrideSetupFee: number | null }[];
  materialCostPerPart: number | null;
  postProcessCostPerPart: number | null;
  pertData: ReturnType<typeof calculatePERT>;
}

const COMPLEXITY_LEVELS = [
  { value: 'A', label: 'A - Standard' },
  { value: 'B', label: 'B - Medium' },
  { value: 'C', label: 'C - Complex' },
];

const QuickQuote = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // RFQ header state
  const [customerName, setCustomerName] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [rfqReference, setRfqReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Parts state
  const [parts, setParts] = useState<RFQPart[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Quote state
  const [globalMarginPercent, setGlobalMarginPercent] = useState(20);
  const [manufacturingCostPerPart, setManufacturingCostPerPart] = useState<Record<string, number>>({});

  // Fetch materials
  const { data: materials = [] } = useQuery({
    queryKey: ['quote-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_materials')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Material[];
    },
  });

  // Fetch post process types
  const { data: postProcessTypes = [] } = useQuery({
    queryKey: ['post-process-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_process_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as PostProcessType[];
    },
  });

  // Fetch settings
  const { data: settings = {} } = useQuery({
    queryKey: ['quick-quote-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_quote_settings')
        .select('*');
      if (error) throw error;
      return data?.reduce((acc: Record<string, string>, s: any) => {
        acc[s.setting_key] = s.setting_value;
        return acc;
      }, {}) || {};
    },
  });

  // Handle PDF upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsExtracting(true);
    
    try {
      const partNumberRegex = settings.part_number_regex || 'PART.*?:\\s*([\\w-]+)|P\\/N.*?:\\s*([\\w-]+)';
      const materialRegex = settings.material_regex || 'MATERIAL.*?:\\s*([\\w\\s-]+)|MAT.*?:\\s*([\\w\\s-]+)';
      
      const newParts: RFQPart[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.type !== 'application/pdf') {
          toast.warning(`Skipping ${file.name} - not a PDF`);
          continue;
        }
        
        try {
          const text = await extractTextFromPdf(file);
          
          if (!text.trim()) {
            toast.warning(`No text found in ${file.name} - please enter manually (scanned PDF)`);
            newParts.push({
              id: `temp-${Date.now()}-${i}`,
              part_number: '',
              description: file.name.replace('.pdf', ''),
              material_id: null,
              material_text_raw: null,
              estimated_net_weight_kg: null,
              estimated_surface_area_m2: null,
              quantity_requested: 1,
              post_processes: [],
              materialCostPerPart: null,
              postProcessCostPerPart: null,
              pertData: null,
            });
            continue;
          }
          
          const parsed = parseDrawingText(text, partNumberRegex, materialRegex);
          
          // Try to auto-match material
          let matchedMaterialId: string | null = null;
          if (parsed.materialRaw) {
            const lowerRaw = parsed.materialRaw.toLowerCase();
            const match = materials.find(m => 
              m.name.toLowerCase().includes(lowerRaw) ||
              lowerRaw.includes(m.name.toLowerCase()) ||
              (m.grade && lowerRaw.includes(m.grade.toLowerCase()))
            );
            matchedMaterialId = match?.id || null;
          }
          
          newParts.push({
            id: `temp-${Date.now()}-${i}`,
            part_number: parsed.partNumber || '',
            description: parsed.description || file.name.replace('.pdf', ''),
            material_id: matchedMaterialId,
            material_text_raw: parsed.materialRaw,
            estimated_net_weight_kg: null,
            estimated_surface_area_m2: null,
            quantity_requested: 1,
            post_processes: [],
            materialCostPerPart: null,
            postProcessCostPerPart: null,
            pertData: null,
          });
          
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          toast.error(`Failed to process ${file.name}`);
        }
      }
      
      setParts(prev => [...prev, ...newParts]);
      toast.success(`Extracted ${newParts.length} part(s) from PDF(s)`);
      
    } catch (err) {
      console.error('PDF extraction error:', err);
      toast.error('Failed to extract PDF content');
    } finally {
      setIsExtracting(false);
    }
  };

  // Add manual part
  const addManualPart = () => {
    setParts(prev => [...prev, {
      id: `temp-${Date.now()}`,
      part_number: '',
      description: '',
      material_id: null,
      material_text_raw: null,
      estimated_net_weight_kg: null,
      estimated_surface_area_m2: null,
      quantity_requested: 1,
      post_processes: [],
      materialCostPerPart: null,
      postProcessCostPerPart: null,
      pertData: null,
    }]);
  };

  // Remove part
  const removePart = (partId: string) => {
    setParts(prev => prev.filter(p => p.id !== partId));
  };

  // Update part field
  const updatePart = (partId: string, updates: Partial<RFQPart>) => {
    setParts(prev => prev.map(p => p.id === partId ? { ...p, ...updates } : p));
  };

  // Add post process to part
  const addPostProcess = (partId: string, typeId: string) => {
    setParts(prev => prev.map(p => {
      if (p.id !== partId) return p;
      if (p.post_processes.some(pp => pp.typeId === typeId)) return p;
      return {
        ...p,
        post_processes: [...p.post_processes, { typeId, complexity: 'A', overrideUnitCost: null, overrideSetupFee: null }]
      };
    }));
  };

  // Remove post process from part
  const removePostProcess = (partId: string, typeId: string) => {
    setParts(prev => prev.map(p => {
      if (p.id !== partId) return p;
      return {
        ...p,
        post_processes: p.post_processes.filter(pp => pp.typeId !== typeId)
      };
    }));
  };

  // Update post process
  const updatePostProcess = (partId: string, typeId: string, updates: Partial<RFQPart['post_processes'][0]>) => {
    setParts(prev => prev.map(p => {
      if (p.id !== partId) return p;
      return {
        ...p,
        post_processes: p.post_processes.map(pp => 
          pp.typeId === typeId ? { ...pp, ...updates } : pp
        )
      };
    }));
  };

  // Calculate estimates for a part
  const calculatePartEstimates = useCallback(async (part: RFQPart) => {
    if (!part.material_id || !part.estimated_net_weight_kg) {
      return { materialCostPerPart: null, postProcessCostPerPart: null, pertData: null };
    }

    const material = materials.find(m => m.id === part.material_id);
    if (!material) {
      return { materialCostPerPart: null, postProcessCostPerPart: null, pertData: null };
    }

    // Fetch price records for this material
    const { data: priceRecords } = await supabase
      .from('material_price_records')
      .select('*')
      .eq('material_id', part.material_id);

    if (!priceRecords || priceRecords.length === 0) {
      return { materialCostPerPart: null, postProcessCostPerPart: null, pertData: null };
    }

    const yieldRate = material.default_yield || 0.6;
    const buyWeightPerPart = part.estimated_net_weight_kg / yieldRate;
    const totalBuyWeight = buyWeightPerPart * part.quantity_requested;

    // Time-adjust prices for inflation
    const inflationRate = material.inflation_rate_per_year || 0.03;
    const now = new Date();
    const adjustedPrices = priceRecords.map(record => {
      const recordDate = new Date(record.record_date);
      const yearsAgo = (now.getTime() - recordDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const adjustedPrice = record.price_per_kg * Math.pow(1 + inflationRate, yearsAgo);
      return adjustedPrice;
    });

    // Calculate PERT
    const pertData = calculatePERT(adjustedPrices);
    if (!pertData) {
      return { materialCostPerPart: null, postProcessCostPerPart: null, pertData: null };
    }

    // Use P50 or P80 based on settings
    const useP80 = settings.use_p80_estimate === 'true';
    const pricePerKg = useP80 ? pertData.p80 : pertData.expected;

    // Material cost
    const totalMaterialCost = totalBuyWeight * pricePerKg;
    
    // Add contingency based on volatility
    const volatility = material.volatility_level || 'MEDIUM';
    const contingencyKey = `contingency_${volatility.toLowerCase()}`;
    const contingencyRate = parseFloat(settings[contingencyKey] || '0.05');
    const contingency = totalMaterialCost * contingencyRate;
    
    const materialCostWithContingency = totalMaterialCost + contingency;
    const materialCostPerPart = materialCostWithContingency / part.quantity_requested;

    // Calculate post-process costs
    let postProcessCostPerPart = 0;
    for (const pp of part.post_processes) {
      const processType = postProcessTypes.find(pt => pt.id === pp.typeId);
      if (!processType) continue;

      const complexityMultiplierKey = `complexity_multiplier_${pp.complexity.toLowerCase()}`;
      const complexityMultiplier = parseFloat(settings[complexityMultiplierKey] || '1.0');

      const setupFee = pp.overrideSetupFee ?? (processType.setup_fee || 0);
      const unitCost = pp.overrideUnitCost ?? (processType.unit_cost || 0);
      const minLotCharge = processType.minimum_lot_charge || 0;

      let basis = 0;
      if (processType.pricing_model === 'PER_KG') {
        basis = (part.estimated_net_weight_kg || 0) * part.quantity_requested;
      } else if (processType.pricing_model === 'PER_M2') {
        basis = (part.estimated_surface_area_m2 || 0) * part.quantity_requested;
      } else if (processType.pricing_model === 'PER_PART') {
        basis = part.quantity_requested;
      }

      const variableCost = unitCost * basis * complexityMultiplier;
      const lotCostRaw = setupFee + variableCost;
      const lotCost = Math.max(lotCostRaw, minLotCharge);
      
      postProcessCostPerPart += lotCost / part.quantity_requested;
    }

    return { materialCostPerPart, postProcessCostPerPart, pertData };
  }, [materials, postProcessTypes, settings]);

  // Run estimator
  const runEstimator = async () => {
    const updatedParts = await Promise.all(parts.map(async (part) => {
      const estimates = await calculatePartEstimates(part);
      return { ...part, ...estimates };
    }));
    setParts(updatedParts);
    toast.success('Estimates calculated');
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let totalCost = 0;
    let totalSales = 0;

    parts.forEach(part => {
      const matCost = part.materialCostPerPart || 0;
      const ppCost = part.postProcessCostPerPart || 0;
      const mfgCost = manufacturingCostPerPart[part.id] || 0;
      const costPerPart = matCost + ppCost + mfgCost;
      const salesPricePerPart = costPerPart / (1 - globalMarginPercent / 100);
      
      totalCost += costPerPart * part.quantity_requested;
      totalSales += salesPricePerPart * part.quantity_requested;
    });

    return { totalCost, totalSales, margin: totalSales - totalCost };
  }, [parts, manufacturingCostPerPart, globalMarginPercent]);

  const totals = calculateTotals();

  return (
    <AppLayout>
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/npi/quotation')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={fhxLogoFull} alt="FHX Engineering" className="h-10" />
            <div>
              <h1 className="font-heading font-semibold text-lg">FHX Quick Quote</h1>
              <p className="text-sm text-primary-foreground/80">PERT-Based Material & Post-Process Estimator</p>
            </div>
          </div>
          
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-100 border-emerald-400">
            <Calculator className="h-3 w-3 mr-1" />
            No AI – Deterministic Only
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* RFQ Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              RFQ Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label>Customer Code</Label>
                <Input 
                  value={customerCode} 
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="ACME-001"
                />
              </div>
              <div>
                <Label>RFQ Reference</Label>
                <Input 
                  value={rfqReference} 
                  onChange={(e) => setRfqReference(e.target.value)}
                  placeholder="RFQ-2024-001"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Drawings
            </CardTitle>
            <CardDescription>
              Upload PDF drawings to auto-extract part info. Text-based extraction only (no AI/OCR).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isExtracting ? 'Extracting...' : 'Click to upload PDF drawings'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Multiple files supported
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isExtracting}
                />
              </label>
              <Button onClick={addManualPart} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Parts Table */}
        {parts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Parts ({parts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {parts.map((part, idx) => (
                  <div key={part.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">Part {idx + 1}</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removePart(part.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Basic Info */}
                    <div className="grid md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Part Number</Label>
                        <Input 
                          value={part.part_number}
                          onChange={(e) => updatePart(part.id, { part_number: e.target.value })}
                          placeholder="PN-001"
                          className="h-8"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Input 
                          value={part.description}
                          onChange={(e) => updatePart(part.id, { description: e.target.value })}
                          placeholder="Part description"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input 
                          type="number"
                          min={1}
                          value={part.quantity_requested}
                          onChange={(e) => updatePart(part.id, { quantity_requested: parseInt(e.target.value) || 1 })}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Material */}
                    <div className="grid md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Material</Label>
                        <Select 
                          value={part.material_id || ''} 
                          onValueChange={(v) => updatePart(part.id, { material_id: v || null })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select material..." />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} {m.grade && `(${m.grade})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {part.material_text_raw && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Extracted: "{part.material_text_raw}"
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Net Weight (kg)</Label>
                        <Input 
                          type="number"
                          step="0.001"
                          min={0}
                          value={part.estimated_net_weight_kg || ''}
                          onChange={(e) => updatePart(part.id, { estimated_net_weight_kg: parseFloat(e.target.value) || null })}
                          placeholder="0.5"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Surface Area (m²)</Label>
                        <Input 
                          type="number"
                          step="0.001"
                          min={0}
                          value={part.estimated_surface_area_m2 || ''}
                          onChange={(e) => updatePart(part.id, { estimated_surface_area_m2: parseFloat(e.target.value) || null })}
                          placeholder="0.05"
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Post Processes */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-xs">Post Processes</Label>
                        <Select onValueChange={(v) => addPostProcess(part.id, v)}>
                          <SelectTrigger className="h-7 w-48">
                            <SelectValue placeholder="Add process..." />
                          </SelectTrigger>
                          <SelectContent>
                            {postProcessTypes
                              .filter(pp => !part.post_processes.some(p => p.typeId === pp.id))
                              .map(pp => (
                                <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      {part.post_processes.length > 0 && (
                        <div className="space-y-2">
                          {part.post_processes.map(pp => {
                            const processType = postProcessTypes.find(pt => pt.id === pp.typeId);
                            return (
                              <div key={pp.typeId} className="flex items-center gap-2 bg-muted/50 rounded p-2">
                                <span className="text-sm font-medium flex-1">{processType?.name}</span>
                                <Select 
                                  value={pp.complexity}
                                  onValueChange={(v) => updatePostProcess(part.id, pp.typeId, { complexity: v })}
                                >
                                  <SelectTrigger className="h-7 w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COMPLEXITY_LEVELS.map(c => (
                                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePostProcess(part.id, pp.typeId)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Cost Display */}
                    {(part.materialCostPerPart !== null || part.postProcessCostPerPart !== null) && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Material/part:</span>
                            <span className="ml-2 font-medium">€{(part.materialCostPerPart || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Post-process/part:</span>
                            <span className="ml-2 font-medium">€{(part.postProcessCostPerPart || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Manufacturing/part:</span>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={manufacturingCostPerPart[part.id] || ''}
                              onChange={(e) => setManufacturingCostPerPart(prev => ({
                                ...prev,
                                [part.id]: parseFloat(e.target.value) || 0
                              }))}
                              className="h-6 w-20 inline-block ml-2"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total/part:</span>
                            <span className="ml-2 font-bold text-primary">
                              €{((part.materialCostPerPart || 0) + (part.postProcessCostPerPart || 0) + (manufacturingCostPerPart[part.id] || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {part.pertData && (
                          <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                            <span>PERT: L=€{part.pertData.low.toFixed(2)} | M=€{part.pertData.mostLikely.toFixed(2)} | H=€{part.pertData.high.toFixed(2)} | P50=€{part.pertData.expected.toFixed(2)} | σ=€{part.pertData.stdDev.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estimator & Summary */}
        {parts.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Run Estimator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Run Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Global Margin %</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      min={0}
                      max={100}
                      value={globalMarginPercent}
                      onChange={(e) => setGlobalMarginPercent(parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                <Button onClick={runEstimator} className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Calculate Estimates
                </Button>
                <p className="text-xs text-muted-foreground">
                  Using {settings.use_p80_estimate === 'true' ? 'P80 (conservative)' : 'P50 (expected)'} for material pricing.
                </p>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-medium">€{totals.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sales Price:</span>
                    <span className="font-bold text-lg">€{totals.totalSales.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Margin:</span>
                    <span className="font-medium text-emerald-600">€{totals.margin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margin %:</span>
                    <span className="font-medium">
                      {totals.totalSales > 0 ? ((totals.margin / totals.totalSales) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {parts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-2">No parts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload PDF drawings to auto-extract parts, or add them manually.
              </p>
              <Button onClick={addManualPart} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Part Manually
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </AppLayout>
  );
};

export default QuickQuote;