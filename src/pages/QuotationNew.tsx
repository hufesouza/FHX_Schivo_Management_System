import { useState, useCallback } from 'react';
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
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Upload,
  Loader2,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  Cog,
  FileImage,
  Sparkles,
  Calculator,
  Shield,
  Lock
} from 'lucide-react';
import fhxLogoFull from '@/assets/fhx-logo-full.png';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

// Helper function to convert PDF first page to PNG image
async function convertPdfToImage(file: File): Promise<{ base64: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  // Render at 2x scale for better quality
  const scale = 2;
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  // Convert to PNG base64
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  
  return { base64, mimeType: 'image/png' };
}

interface Machine {
  id: string;
  resource: string;
  description: string;
  group_name: string;
  machine_type: string;
  max_spindle_rpm: number;
  max_cutting_feedrate: number;
  tool_change_time: number;
  probing_time: number;
  load_unload_time: number;
  performance_factor: number;
  suitable_for_prismatic: boolean;
  suitable_for_turned: boolean;
  suitable_for_small_detailed: boolean;
  suitable_for_5axis: boolean;
  is_active: boolean;
}

interface AIInterpretation {
  part_name: string;
  material_detected: string;
  overall_dimensions_mm: { x: number; y: number; z: number };
  features_summary: {
    holes: { diameter: number; qty: number; tolerance_note: string }[];
    pockets: number;
    slots: number;
    threads: { size: string; qty: number }[];
    radii: string[];
    datums: string[];
    special_requirements: string[];
  };
  suggested_machine_group: string;
  suitability_notes: string;
  operations: { op_number: number; description: string; side: string }[];
  baseline_cycle_time_min_reference_machine: number;
  reference_machine_type: string;
  warnings: string[];
}

interface ComplianceMetadata {
  apiMode: string;
  promptVersion: string;
  drawingStored: boolean;
  auditLogged: boolean;
}

const BLANK_TYPES = ['Plate', 'Saw block', 'Round bar', 'Bar stock', 'Custom'];
const PRODUCTION_TYPES = ['Prototype', 'Small batch', 'Series'];
const TOLERANCE_LEVELS = ['Rough', 'Medium', 'Tight', 'Very tight'];
const SURFACE_FINISHES = ['Standard', 'Fine', 'Critical'];

const QuotationNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [drawing, setDrawing] = useState<File | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<string | null>(null);
  const [partName, setPartName] = useState('');
  const [material, setMaterial] = useState('');
  const [blankType, setBlankType] = useState('Plate');
  const [blankLength, setBlankLength] = useState<number>(0);
  const [blankWidth, setBlankWidth] = useState<number>(0);
  const [blankThickness, setBlankThickness] = useState<number>(0);
  const [blankDiameter, setBlankDiameter] = useState<number>(0);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [productionType, setProductionType] = useState('Prototype');
  const [toleranceLevel, setToleranceLevel] = useState('Medium');
  const [surfaceFinish, setSurfaceFinish] = useState('Standard');
  const [notesToAi, setNotesToAi] = useState('');

  // AI interpretation state
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [complianceMetadata, setComplianceMetadata] = useState<ComplianceMetadata | null>(null);

  // Fetch machines
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('group_name', { ascending: true });
      if (error) throw error;
      return data as Machine[];
    },
  });

  // Fetch compliance settings
  const { data: complianceSettings } = useQuery({
    queryKey: ['compliance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_settings')
        .select('*');
      if (error) throw error;
      return data?.reduce((acc: Record<string, string>, s: any) => {
        acc[s.setting_key] = s.setting_value;
        return acc;
      }, {}) || {};
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDrawing(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDrawingPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInterpret = async () => {
    if (!drawing && !material) {
      toast.error('Please upload a drawing or provide material information');
      return;
    }

    setIsInterpreting(true);
    setInterpretation(null);
    setComplianceMetadata(null);

    try {
      let drawingBase64 = '';
      let drawingMimeType = '';

      if (drawing) {
        const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (drawing.type === 'application/pdf') {
          // Convert PDF to image
          toast.info('Converting PDF to image...');
          try {
            const result = await convertPdfToImage(drawing);
            drawingBase64 = result.base64;
            drawingMimeType = result.mimeType;
            toast.success('PDF converted successfully');
          } catch (pdfError) {
            console.error('PDF conversion error:', pdfError);
            toast.error('Failed to convert PDF. Please try uploading an image file instead.');
            setIsInterpreting(false);
            return;
          }
        } else if (supportedImageTypes.includes(drawing.type)) {
          // Handle regular image files
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
          });
          reader.readAsDataURL(drawing);
          drawingBase64 = await base64Promise;
          drawingMimeType = drawing.type;
        } else {
          toast.error(`Unsupported file type: ${drawing.type}. Please upload an image (JPEG, PNG, GIF, WEBP) or PDF.`);
          setIsInterpreting(false);
          return;
        }
      }

      // Call backend edge function - ALL AI processing is server-side only
      const { data, error } = await supabase.functions.invoke('interpret-drawing', {
        body: {
          drawingBase64,
          drawingMimeType,
          jobInputs: {
            partName,
            material,
            blankType,
            blankLength,
            blankWidth,
            blankThickness,
            blankDiameter,
            orderQuantity,
            productionType,
            toleranceLevel,
            surfaceFinish,
            notesToAi,
          },
          machines: machines.map(m => ({
            group_name: m.group_name,
            description: m.description,
            machine_type: m.machine_type,
          })),
          userId: user?.id,
          userEmail: user?.email,
        },
      });

      // Check for error in response data first (from non-2xx status codes)
      if (data?.error) {
        throw new Error(data.error);
      }
      if (error) throw error;

      if (data.success && data.interpretation) {
        const interp = data.interpretation as AIInterpretation;
        setInterpretation(interp);
        setComplianceMetadata(data.metadata);
        
        // Auto-populate form fields from AI interpretation
        if (interp.part_name && !partName) {
          setPartName(interp.part_name);
        }
        if (interp.material_detected && !material) {
          setMaterial(interp.material_detected);
        }
        
        // Auto-populate blank dimensions from overall_dimensions_mm
        if (interp.overall_dimensions_mm) {
          const dims = interp.overall_dimensions_mm;
          // Check if dimensions look like round bar (x and y are similar, z is longest)
          const isRoundStock = Math.abs(dims.x - dims.y) < 5 && dims.z > dims.x * 1.5;
          
          if (isRoundStock && blankDiameter === 0) {
            setBlankType('Round bar');
            setBlankDiameter(Math.max(dims.x, dims.y) + 5); // Add stock allowance
            setBlankLength(dims.z + 5);
          } else {
            if (blankLength === 0) setBlankLength(dims.z + 5);
            if (blankWidth === 0) setBlankWidth(dims.y + 5);
            if (blankThickness === 0) setBlankThickness(dims.x + 5);
          }
        }
        
        // Auto-set tolerance level based on interpretation
        if (interp.features_summary?.special_requirements?.length > 0) {
          const hasGdtOrTight = interp.features_summary.special_requirements.some(r => 
            r.toLowerCase().includes('tight') || r.toLowerCase().includes('gd&t')
          );
          if (hasGdtOrTight) {
            setToleranceLevel('Tight');
          }
        }
        
        // Find suggested machine
        const suggestedGroup = interp.suggested_machine_group;
        const suggestedMachine = machines.find(m => 
          m.group_name.toLowerCase().includes(suggestedGroup.toLowerCase()) ||
          suggestedGroup.toLowerCase().includes(m.group_name.toLowerCase())
        );
        if (suggestedMachine) {
          setSelectedMachineId(suggestedMachine.id);
        }
        
        toast.success('Drawing interpreted - parameters auto-populated');
      } else {
        throw new Error(data.error || 'Interpretation failed');
      }
    } catch (error) {
      console.error('Interpretation error:', error);
      toast.error('Failed to interpret drawing: ' + (error as Error).message);
    } finally {
      setIsInterpreting(false);
    }
  };

  // Calculate cycle time based on selected machine
  const calculateCycleTime = useCallback(() => {
    if (!interpretation || !selectedMachineId) return null;

    const machine = machines.find(m => m.id === selectedMachineId);
    if (!machine) return null;

    const baselineTime = interpretation.baseline_cycle_time_min_reference_machine;
    const performanceFactor = machine.performance_factor || 1;
    const toolChanges = interpretation.operations.length * 6; // Default 6 tools per op
    const toolChangeTime = machine.tool_change_time || 5;
    const loadUnloadTime = machine.load_unload_time || 60;
    const probingTime = machine.probing_time || 30;

    const cycleTime = (baselineTime * performanceFactor) +
      (toolChanges * toolChangeTime / 60) +
      (loadUnloadTime / 60) +
      (probingTime / 60);

    return {
      cycleTime: Math.round(cycleTime * 100) / 100,
      totalTime: Math.round(cycleTime * orderQuantity * 100) / 100,
      machine,
    };
  }, [interpretation, selectedMachineId, machines, orderQuantity]);

  const cycleTimeResult = calculateCycleTime();

  // Check machine suitability
  const getSuitabilityWarnings = useCallback(() => {
    if (!interpretation || !selectedMachineId) return [];

    const machine = machines.find(m => m.id === selectedMachineId);
    if (!machine) return [];

    const warnings: { type: 'error' | 'warning'; message: string }[] = [];

    // Check if lathe selected for prismatic part
    if (machine.machine_type === 'lathe' && interpretation.features_summary.pockets > 0) {
      warnings.push({ type: 'error', message: 'Lathe cannot produce prismatic features (pockets detected)' });
    }

    // Check 5-axis requirement
    if (interpretation.warnings.some(w => w.toLowerCase().includes('5-axis')) && 
        !machine.suitable_for_5axis) {
      warnings.push({ type: 'warning', message: '5-axis geometry detected but selected machine is not 5-axis capable' });
    }

    // Check turned parts
    const hasThreads = interpretation.features_summary.threads.length > 0;
    if (hasThreads && machine.machine_type === '3-axis mill' && !machine.suitable_for_turned) {
      warnings.push({ type: 'warning', message: 'Threads detected - consider mill-turn or lathe for better efficiency' });
    }

    return warnings;
  }, [interpretation, selectedMachineId, machines]);

  const suitabilityWarnings = getSuitabilityWarnings();

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
              <h1 className="font-heading font-semibold text-lg">New Quote</h1>
              <p className="text-sm text-primary-foreground/80">IlluminAI Quoter</p>
            </div>
          </div>
          
          {/* Compliance Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/20 text-green-100 border-green-400">
              <Lock className="h-3 w-3 mr-1" />
              OpenAI API Mode
            </Badge>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-100 border-blue-400">
              <Shield className="h-3 w-3 mr-1" />
              FDA-Ready
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Compliance & Security Banner */}
        <Alert className="mb-6 bg-muted/50">
          <Shield className="h-4 w-4" />
          <AlertTitle>Secure Processing Mode</AlertTitle>
          <AlertDescription className="text-sm">
            <span className="font-medium">API Mode:</span> OpenAI API (No Training) • 
            <span className="font-medium ml-2">Prompt Version:</span> {complianceSettings?.ai_prompt_version || 'v1.0'} • 
            <span className="font-medium ml-2">Drawings Stored:</span> {complianceSettings?.store_uploaded_drawings === 'true' ? 'Yes' : 'No (Transient)'} • 
            <span className="font-medium ml-2">Audit Logs:</span> {complianceSettings?.enable_audit_logs !== 'false' ? 'Enabled' : 'Disabled'}
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            {/* Drawing Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Upload Drawing
                </CardTitle>
                <CardDescription>
                  Upload a PDF or image of the machining drawing. 
                  {complianceSettings?.store_uploaded_drawings !== 'true' && (
                    <span className="text-green-600 ml-1">(Processed transiently - not stored)</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {drawingPreview ? (
                    <div className="space-y-4">
                      {drawing?.type.startsWith('image/') ? (
                        <img src={drawingPreview} alt="Drawing preview" className="max-h-64 mx-auto rounded" />
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <FileImage className="h-12 w-12" />
                          <span>{drawing?.name}</span>
                        </div>
                      )}
                      <Button variant="outline" onClick={() => { setDrawing(null); setDrawingPreview(null); }}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Job Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Part Name (optional)</Label>
                    <Input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Enter part name" />
                  </div>
                  <div>
                    <Label>Material</Label>
                    <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g., Aluminum 6061-T6" />
                  </div>
                </div>

                <div>
                  <Label>Blank Type</Label>
                  <Select value={blankType} onValueChange={setBlankType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLANK_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {blankType === 'Round bar' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Diameter (mm)</Label>
                      <Input type="number" value={blankDiameter} onChange={(e) => setBlankDiameter(parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <Label>Length (mm)</Label>
                      <Input type="number" value={blankLength} onChange={(e) => setBlankLength(parseFloat(e.target.value))} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Length (mm)</Label>
                      <Input type="number" value={blankLength} onChange={(e) => setBlankLength(parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <Label>Width (mm)</Label>
                      <Input type="number" value={blankWidth} onChange={(e) => setBlankWidth(parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <Label>Thickness (mm)</Label>
                      <Input type="number" value={blankThickness} onChange={(e) => setBlankThickness(parseFloat(e.target.value))} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Quantity</Label>
                    <Input type="number" min={1} value={orderQuantity} onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label>Production Type</Label>
                    <Select value={productionType} onValueChange={setProductionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tolerance Level</Label>
                    <Select value={toleranceLevel} onValueChange={setToleranceLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOLERANCE_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Surface Finish</Label>
                    <Select value={surfaceFinish} onValueChange={setSurfaceFinish}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SURFACE_FINISHES.map(finish => (
                          <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Notes to IlluminAI (optional)</Label>
                  <Textarea 
                    value={notesToAi} 
                    onChange={(e) => setNotesToAi(e.target.value)}
                    placeholder="Any additional instructions or context for IlluminAI..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleInterpret} 
                  disabled={isInterpreting}
                  className="w-full"
                  size="lg"
                >
                  {isInterpreting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Interpreting Drawing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      IlluminAI Quotation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            {/* AI Interpretation Results */}
            {interpretation && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5" />
                      IlluminAI Interpretation
                    </CardTitle>
                    {complianceMetadata && (
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          v{complianceMetadata.promptVersion}
                        </Badge>
                        <span className="text-green-600">
                          <Lock className="h-3 w-3 inline mr-1" />
                          {complianceMetadata.apiMode === 'openai_api_no_training' ? 'OpenAI API (No Training)' : complianceMetadata.apiMode}
                        </span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Part Name</Label>
                        <p className="font-medium">{interpretation.part_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Material Detected</Label>
                        <p className="font-medium">{interpretation.material_detected}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Overall Dimensions (mm)</Label>
                      <p className="font-medium">
                        {interpretation.overall_dimensions_mm.x} × {interpretation.overall_dimensions_mm.y} × {interpretation.overall_dimensions_mm.z}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-muted-foreground text-xs">Features Summary</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Badge variant="outline">
                          {interpretation.features_summary.holes.reduce((sum, h) => sum + h.qty, 0)} Holes
                        </Badge>
                        <Badge variant="outline">{interpretation.features_summary.pockets} Pockets</Badge>
                        <Badge variant="outline">{interpretation.features_summary.slots} Slots</Badge>
                        <Badge variant="outline">
                          {interpretation.features_summary.threads.reduce((sum, t) => sum + t.qty, 0)} Threads
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-muted-foreground text-xs">Operations ({interpretation.operations.length})</Label>
                      <div className="space-y-1 mt-2">
                        {interpretation.operations.map((op, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">Op {op.op_number}:</span> {op.description} ({op.side})
                          </div>
                        ))}
                      </div>
                    </div>

                    {interpretation.warnings.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-muted-foreground text-xs">AI Warnings</Label>
                          <div className="space-y-2 mt-2">
                            {interpretation.warnings.map((warning, i) => (
                              <Alert key={i} variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{warning}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Machine Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cog className="h-5 w-5" />
                      Machine Selection
                    </CardTitle>
                    <CardDescription>
                      Suggested: <Badge>{interpretation.suggested_machine_group}</Badge>
                      <span className="ml-2 text-sm">{interpretation.suitability_notes}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Select Machine (Override)</Label>
                      <Select value={selectedMachineId || ''} onValueChange={setSelectedMachineId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a machine..." />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map(machine => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.resource} - {machine.description} ({machine.machine_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Suitability Warnings */}
                    {suitabilityWarnings.length > 0 && (
                      <div className="space-y-2">
                        {suitabilityWarnings.map((warning, i) => (
                          <Alert key={i} variant={warning.type === 'error' ? 'destructive' : 'default'}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{warning.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cycle Time Summary */}
                {cycleTimeResult && (
                  <Card className="border-primary">
                    <CardHeader className="bg-primary/5">
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Cycle Time Estimate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
                          <p className="text-3xl font-bold text-primary">{cycleTimeResult.cycleTime}</p>
                          <p className="text-sm text-muted-foreground">minutes/part</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
                          <p className="text-3xl font-bold text-primary">{cycleTimeResult.totalTime}</p>
                          <p className="text-sm text-muted-foreground">total minutes ({orderQuantity} parts)</p>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Machine:</span>
                          <span className="font-medium">{cycleTimeResult.machine.resource}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Performance Factor:</span>
                          <span className="font-medium">{cycleTimeResult.machine.performance_factor}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Baseline (Ref Machine):</span>
                          <span className="font-medium">{interpretation.baseline_cycle_time_min_reference_machine} min</span>
                        </div>
                      </div>

                      <Alert className="mt-4">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Estimate Generated</AlertTitle>
                        <AlertDescription>
                          This estimate includes cutting time, tool changes, loading/unloading, and probing.
                          Actual times may vary based on specific tooling and process parameters.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!interpretation && !isInterpreting && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Upload a drawing and click "IlluminAI Quotation" to get cycle time estimates
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default QuotationNew;