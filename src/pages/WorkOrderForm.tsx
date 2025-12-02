import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkOrder } from '@/hooks/useWorkOrders';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { WorkOrder, FormSection } from '@/types/workOrder';
import { FormNavigation } from '@/components/form/FormNavigation';
import { FormHeader } from '@/components/form/FormHeader';
import { EngineeringReview } from '@/components/form/EngineeringReview';
import { OperationsReview } from '@/components/form/OperationsReview';
import { QualityReview } from '@/components/form/QualityReview';
import { NPIFinalReview } from '@/components/form/NPIFinalReview';
import { SupplyChainReview } from '@/components/form/SupplyChainReview';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const sectionOrder: FormSection[] = ['header', 'engineering', 'operations', 'quality', 'npi-final', 'supply-chain'];

export default function WorkOrderForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { workOrder, loading, updateWorkOrder } = useWorkOrder(id);
  const { role, loading: roleLoading, canEditSection, hasRole } = useUserRole();
  
  const [currentSection, setCurrentSection] = useState<FormSection>('header');
  const [formData, setFormData] = useState<Partial<WorkOrder>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (workOrder) {
      setFormData(workOrder);
    }
  }, [workOrder]);

  const handleChange = useCallback((updates: Partial<WorkOrder>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateWorkOrder(formData);
    if (success) {
      toast.success('Changes saved');
      setHasChanges(false);
    }
    setIsSaving(false);
  };

  const handleNext = () => {
    const currentIndex = sectionOrder.indexOf(currentSection);
    if (currentIndex < sectionOrder.length - 1) {
      setCurrentSection(sectionOrder[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const currentIndex = sectionOrder.indexOf(currentSection);
    if (currentIndex > 0) {
      setCurrentSection(sectionOrder[currentIndex - 1]);
    }
  };

  if (authLoading || loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-serif mb-2">No Role Assigned</h2>
          <p className="text-muted-foreground mb-4">Contact an administrator to assign your department role.</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-serif mb-2">Work order not found</h2>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentIndex = sectionOrder.indexOf(currentSection);
  const isFirstSection = currentIndex === 0;
  const isLastSection = currentIndex === sectionOrder.length - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
              </Button>
              <div>
                <h1 className="text-lg font-serif font-medium">
                  Blue Work Order Review
                </h1>
                <p className="text-sm text-muted-foreground">
                  W/O #{formData.work_order_number || 'New'} • Role: {role?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
          
          <FormNavigation
            currentSection={currentSection}
            onSectionChange={setCurrentSection}
          />
        </div>
      </header>

      {/* Form Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentSection === 'header' && (
          <FormHeader data={formData} onChange={handleChange} disabled={!canEditSection('header')} />
        )}
        {currentSection === 'engineering' && (
          <EngineeringReview data={formData} onChange={handleChange} disabled={!canEditSection('engineering')} />
        )}
        {currentSection === 'operations' && (
          <OperationsReview data={formData} onChange={handleChange} disabled={!canEditSection('operations')} />
        )}
        {currentSection === 'quality' && (
          <QualityReview data={formData} onChange={handleChange} disabled={!canEditSection('quality')} />
        )}
        {currentSection === 'npi-final' && (
          <NPIFinalReview data={formData} onChange={handleChange} disabled={!canEditSection('npi-final')} />
        )}
        {currentSection === 'supply-chain' && (
          <SupplyChainReview data={formData} onChange={handleChange} disabled={!canEditSection('supply-chain')} />
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstSection}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          
          {isLastSection ? (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save & Complete
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
