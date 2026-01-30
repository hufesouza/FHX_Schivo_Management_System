import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileUpload } from '@/components/capacity/FileUpload';
import { EnquiryDashboard } from '@/components/quotation-control/EnquiryDashboard';
import { EnquiryList } from '@/components/quotation-control/EnquiryList';
import { parseEnquiryLogExcel } from '@/utils/enquiryLogParser';
import { ParsedEnquiryLog, EnquiryLog } from '@/types/enquiryLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Upload, 
  LayoutDashboard, 
  List,
  RefreshCw,
  FileSpreadsheet,
  X,
  BarChart3
} from 'lucide-react';

const QuotationDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('upload');
  const [enquiries, setEnquiries] = useState<EnquiryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    
    try {
      const parsedData = await parseEnquiryLogExcel(file, '2026');
      
      // Convert ParsedEnquiryLog to EnquiryLog format (add mock IDs and timestamps)
      const enquiryData: EnquiryLog[] = parsedData.map((item, index) => ({
        ...item,
        id: `temp-${index}-${Date.now()}`,
        uploaded_by: 'local',
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      setEnquiries(enquiryData);
      setActiveTab('dashboard');
      
      toast({
        title: 'File Loaded',
        description: `Successfully loaded ${enquiryData.length} enquiries from ${file.name}`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to parse Excel file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleClearData = () => {
    setEnquiries([]);
    setFileName(null);
    setActiveTab('upload');
  };

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    navigate('/auth');
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout 
      title="Quotation Dashboard" 
      subtitle="Upload enquiry log and view analytics" 
      showBackButton 
      backTo="/npi"
    >
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2" disabled={enquiries.length === 0}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2" disabled={enquiries.length === 0}>
                <List className="h-4 w-4" />
                Enquiry List
              </TabsTrigger>
            </TabsList>

            {enquiries.length > 0 && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-3 w-3" />
                  {fileName}
                </Badge>
                <Badge variant="secondary">
                  {enquiries.length} enquiries
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearData}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="upload" className="mt-0">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Upload Enquiry Log</CardTitle>
                <CardDescription className="max-w-lg mx-auto">
                  Upload your Enquiry Log Excel file to generate a dashboard with KPIs, 
                  charts, and detailed enquiry tracking. The data is processed locally and not stored.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-xl mx-auto">
                <FileUpload 
                  onFileSelected={handleFileSelected}
                  isLoading={loading}
                />
                
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Expected columns:</p>
                  <p>Enquiry No, Customer, Details, Date Received, NPI Owner, Status, Quoted Price, PO Received, etc.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            {enquiries.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Data Loaded</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload an Enquiry Log Excel file to view the dashboard
                  </p>
                  <Button onClick={() => setActiveTab('upload')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <EnquiryDashboard 
                enquiries={enquiries}
                onFilterByStatus={(status) => {
                  setActiveTab('list');
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            {enquiries.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">
                    No enquiries loaded. Upload an Excel file first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <EnquiryList 
                enquiries={enquiries}
                onSelectEnquiry={(enquiry) => {
                  toast({
                    title: enquiry.enquiry_no,
                    description: `${enquiry.customer} - ${enquiry.details || 'No details'}`,
                  });
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
};

export default QuotationDashboard;
