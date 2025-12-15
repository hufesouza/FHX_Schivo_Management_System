import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calculator, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText
} from 'lucide-react';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

interface PertInputs {
  optimistic: string;
  mostLikely: string;
  pessimistic: string;
}

interface PertResult {
  expected: number;
  standardDeviation: number;
  variance: number;
  confidenceRange: {
    low68: number;
    high68: number;
    low95: number;
    high95: number;
    low99: number;
    high99: number;
  };
}

const PertEstimator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [materialInputs, setMaterialInputs] = useState<PertInputs>({
    optimistic: '',
    mostLikely: '',
    pessimistic: '',
  });
  
  const [postProcessInputs, setPostProcessInputs] = useState<PertInputs>({
    optimistic: '',
    mostLikely: '',
    pessimistic: '',
  });
  
  const [materialResult, setMaterialResult] = useState<PertResult | null>(null);
  const [postProcessResult, setPostProcessResult] = useState<PertResult | null>(null);
  const [activeTab, setActiveTab] = useState('material');

  const calculatePert = (inputs: PertInputs): PertResult | null => {
    const O = parseFloat(inputs.optimistic);
    const M = parseFloat(inputs.mostLikely);
    const P = parseFloat(inputs.pessimistic);

    if (isNaN(O) || isNaN(M) || isNaN(P)) {
      return null;
    }

    if (O > M || M > P) {
      return null;
    }

    // PERT formula: Expected = (O + 4M + P) / 6
    const expected = (O + 4 * M + P) / 6;
    
    // Standard deviation = (P - O) / 6
    const standardDeviation = (P - O) / 6;
    
    // Variance = SD^2
    const variance = Math.pow(standardDeviation, 2);

    // Confidence intervals
    const confidenceRange = {
      low68: expected - standardDeviation,
      high68: expected + standardDeviation,
      low95: expected - 2 * standardDeviation,
      high95: expected + 2 * standardDeviation,
      low99: expected - 3 * standardDeviation,
      high99: expected + 3 * standardDeviation,
    };

    return { expected, standardDeviation, variance, confidenceRange };
  };

  const handleMaterialCalculate = () => {
    const result = calculatePert(materialInputs);
    setMaterialResult(result);
  };

  const handlePostProcessCalculate = () => {
    const result = calculatePert(postProcessInputs);
    setPostProcessResult(result);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const renderInputSection = (
    inputs: PertInputs, 
    setInputs: React.Dispatch<React.SetStateAction<PertInputs>>,
    onCalculate: () => void,
    type: 'material' | 'postprocess'
  ) => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${type}-optimistic`} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Optimistic (O)
          </Label>
          <Input
            id={`${type}-optimistic`}
            type="number"
            step="0.01"
            min="0"
            placeholder="Best case cost"
            value={inputs.optimistic}
            onChange={(e) => setInputs(prev => ({ ...prev, optimistic: e.target.value }))}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">Minimum expected cost</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`${type}-mostlikely`} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Most Likely (M)
          </Label>
          <Input
            id={`${type}-mostlikely`}
            type="number"
            step="0.01"
            min="0"
            placeholder="Expected cost"
            value={inputs.mostLikely}
            onChange={(e) => setInputs(prev => ({ ...prev, mostLikely: e.target.value }))}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">Most probable cost</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`${type}-pessimistic`} className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pessimistic (P)
          </Label>
          <Input
            id={`${type}-pessimistic`}
            type="number"
            step="0.01"
            min="0"
            placeholder="Worst case cost"
            value={inputs.pessimistic}
            onChange={(e) => setInputs(prev => ({ ...prev, pessimistic: e.target.value }))}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">Maximum expected cost</p>
        </div>
      </div>
      
      <Button onClick={onCalculate} className="w-full md:w-auto" size="lg">
        <Calculator className="h-4 w-4 mr-2" />
        Calculate PERT Estimate
      </Button>
    </div>
  );

  const renderResultSection = (result: PertResult | null, type: 'material' | 'postprocess') => {
    if (!result) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Enter values above and click calculate to see the PERT estimation report</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Expected {type === 'material' ? 'Material' : 'Post-Processing'} Cost</p>
            <p className="text-4xl font-bold text-primary">{formatCurrency(result.expected)}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PERT Calculation Report
            </CardTitle>
            <CardDescription>Statistical breakdown of the estimation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Formula Used</p>
                <div className="bg-muted/50 p-3 rounded-md font-mono text-sm">
                  E = (O + 4M + P) / 6
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Standard Deviation Formula</p>
                <div className="bg-muted/50 p-3 rounded-md font-mono text-sm">
                  σ = (P - O) / 6
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Expected Value (E)</p>
                <p className="text-xl font-semibold">{formatCurrency(result.expected)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Standard Deviation (σ)</p>
                <p className="text-xl font-semibold">{formatCurrency(result.standardDeviation)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Variance (σ²)</p>
                <p className="text-xl font-semibold">{result.variance.toFixed(4)}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Confidence Intervals
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">68%</Badge>
                    <span className="text-sm">1 Standard Deviation</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, result.confidenceRange.low68))} - {formatCurrency(result.confidenceRange.high68)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">95%</Badge>
                    <span className="text-sm">2 Standard Deviations</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, result.confidenceRange.low95))} - {formatCurrency(result.confidenceRange.high95)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-violet-500/20 text-violet-700 border-violet-500/30">99.7%</Badge>
                    <span className="text-sm">3 Standard Deviations</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, result.confidenceRange.low99))} - {formatCurrency(result.confidenceRange.high99)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Interpretation</p>
              <p className="text-sm text-muted-foreground">
                Based on your inputs, the expected {type === 'material' ? 'material' : 'post-processing'} cost is{' '}
                <strong className="text-foreground">{formatCurrency(result.expected)}</strong>. 
                There is a 68% probability the actual cost will fall between{' '}
                {formatCurrency(Math.max(0, result.confidenceRange.low68))} and {formatCurrency(result.confidenceRange.high68)}, 
                and a 95% probability it will be between{' '}
                {formatCurrency(Math.max(0, result.confidenceRange.low95))} and {formatCurrency(result.confidenceRange.high95)}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AppLayout title="PERT Estimator" subtitle="Statistical Cost Estimation" showBackButton backTo="/npi/quotation">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-2">PERT Cost Estimator</h2>
            <p className="text-muted-foreground">
              Use the Program Evaluation and Review Technique (PERT) to estimate costs based on 
              optimistic, most likely, and pessimistic scenarios. This method provides statistical 
              confidence intervals for more accurate budgeting.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="material">Material Costs</TabsTrigger>
              <TabsTrigger value="postprocess">Post-Processing Costs</TabsTrigger>
            </TabsList>

            <TabsContent value="material" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Material Cost Estimation</CardTitle>
                  <CardDescription>
                    Enter three estimates for material costs: best case, most likely, and worst case scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderInputSection(materialInputs, setMaterialInputs, handleMaterialCalculate, 'material')}
                </CardContent>
              </Card>

              {renderResultSection(materialResult, 'material')}
            </TabsContent>

            <TabsContent value="postprocess" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Post-Processing Cost Estimation</CardTitle>
                  <CardDescription>
                    Enter three estimates for post-processing costs: best case, most likely, and worst case scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderInputSection(postProcessInputs, setPostProcessInputs, handlePostProcessCalculate, 'postprocess')}
                </CardContent>
              </Card>

              {renderResultSection(postProcessResult, 'postprocess')}
            </TabsContent>
          </Tabs>

          {/* Combined Summary */}
          {(materialResult || postProcessResult) && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Combined Estimate Summary</CardTitle>
                <CardDescription>Total expected costs across all categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Material Cost</p>
                    <p className="text-xl font-semibold">
                      {materialResult ? formatCurrency(materialResult.expected) : '—'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Post-Processing Cost</p>
                    <p className="text-xl font-semibold">
                      {postProcessResult ? formatCurrency(postProcessResult.expected) : '—'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Expected Cost</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(
                        (materialResult?.expected || 0) + (postProcessResult?.expected || 0)
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AppLayout>
  );
};

export default PertEstimator;
