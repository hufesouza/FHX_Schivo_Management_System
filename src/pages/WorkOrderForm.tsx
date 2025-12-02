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
import { AssignNextReviewer } from '@/components/form/AssignNextReviewer';
import { ExportPDF } from '@/components/form/ExportPDF';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';

const sectionOrder: FormSection[] = ['header', 'engineering', 'operations', 'quality', 'npi-final', 'supply-chain'];

// Map form sections to workflow stages
const SECTION_TO_STAGE: Record<FormSection, string> = {
  'header': 'header',
  'engineering': 'engineering',
  'operations': 'operations',
  'quality': 'quality',
  'npi-final': 'npi',
  'supply-chain': 'supply_chain',
};

// Signature fields for each section
const SIGNATURE_FIELDS: Record<FormSection, { signature: string; date: string } | null> = {
  'header': null,
  'engineering': { signature: 'engineering_approved_by', date: 'engineering_approved_date' },
  'operations': null, // Operations doesn't have a signature, uses comments
  'quality': { signature: 'quality_signature', date: 'quality_signature_date' },
  'npi-final': { signature: 'npi_final_signature', date: 'npi_final_signature_date' },
  'supply-chain': { signature: 'supply_chain_signature', date: 'supply_chain_signature_date' },
};

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
  const [showAssignDialog, setShowAssignDialog] = useState(false);

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

  // Check if current section is signed (completed)
  const isSectionSigned = useCallback((section: FormSection) => {
    const signatureField = SIGNATURE_FIELDS[section];
    if (!signatureField) {
      // For sections without signature (header, operations), check if we should move on
      if (section === 'header') {
        return !!(formData.work_order_number && formData.customer);
      }
      if (section === 'operations') {
        return !!formData.operations_comments || (formData.operations_work_centres?.length ?? 0) > 0;
      }
      return false;
    }
    const sig = formData[signatureField.signature as keyof WorkOrder];
    const date = formData[signatureField.date as keyof WorkOrder];
    return !!(sig && date);
  }, [formData]);

  // Get missing fields message for current section
  const getMissingFieldsMessage = useCallback((section: FormSection): string | null => {
    const signatureField = SIGNATURE_FIELDS[section];
    if (!signatureField) {
      if (section === 'header') {
        const missing: string[] = [];
        if (!formData.customer) missing.push('Customer');
        if (!formData.work_order_number) missing.push('W/O #');
        return missing.length > 0 ? `Fill in: ${missing.join(', ')}` : null;
      }
      if (section === 'operations') {
        if (!formData.operations_comments && (formData.operations_work_centres?.length ?? 0) === 0) {
          return 'Add work centres or comments';
        }
        return null;
      }
      return null;
    }
    const sig = formData[signatureField.signature as keyof WorkOrder];
    const date = formData[signatureField.date as keyof WorkOrder];
    const missing: string[] = [];
    if (!sig) missing.push('Signature');
    if (!date) missing.push('Date');
    return missing.length > 0 ? `Add: ${missing.join(', ')}` : null;
  }, [formData]);

  // Check if this is the user's assigned section
  const isMySection = useCallback(() => {
    const stage = SECTION_TO_STAGE[currentSection];
    const currentStage = formData.current_stage || 'header';
    return stage === currentStage && canEditSection(currentSection);
  }, [currentSection, formData.current_stage, canEditSection]);

  const handleCompleteAndAssign = async () => {
    // Save first if there are changes
    if (hasChanges) {
      setIsSaving(true);
      const success = await updateWorkOrder(formData);
      setIsSaving(false);
      if (!success) {
        toast.error('Please save your changes first');
        return;
      }
      setHasChanges(false);
    }
    setShowAssignDialog(true);
  };

  const handleAssignmentSuccess = () => {
    navigate('/');
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
          <h2 className="text-xl font-serif mb-2">Blue Review not found</h2>
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
  const currentStage = SECTION_TO_STAGE[currentSection];
  const workOrderStage = formData.current_stage || 'header';

  // Determine if we should show the complete button (always show when it's user's turn)
  const isUsersTurn = isMySection() && workOrderStage === currentStage;
  const sectionComplete = isSectionSigned(currentSection);
  const missingMessage = getMissingFieldsMessage(currentSection);
  const showCompleteButton = isUsersTurn && !isLastSection;
  const showFinalCompleteButton = isLastSection && isUsersTurn && workOrderStage === 'supply_chain';

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
                  Blue Review Details
                </h1>
                <p className="text-sm text-muted-foreground">
                  W/O #{formData.work_order_number || 'New'} • Role: {role?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExportPDF workOrder={formData} />
              <Button onClick={handleSave} disabled={isSaving || !hasChanges} variant="outline">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              {showCompleteButton && (
                <div className="flex flex-col items-end gap-1">
                  <Button 
                    onClick={handleCompleteAndAssign} 
                    disabled={!sectionComplete || isSaving}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Complete & Assign Next
                  </Button>
                  {missingMessage && (
                    <span className="text-xs text-muted-foreground">{missingMessage}</span>
                  )}
                </div>
              )}
              {showFinalCompleteButton && (
                <div className="flex flex-col items-end gap-1">
                  <Button 
                    onClick={handleCompleteAndAssign} 
                    disabled={!sectionComplete || isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Complete Review
                  </Button>
                  {missingMessage && (
                    <span className="text-xs text-muted-foreground">{missingMessage}</span>
                  )}
                </div>
              )}
            </div>
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
              Save
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>

      {/* Assign Next Reviewer Dialog */}
      {id && (
        <AssignNextReviewer
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          workOrderId={id}
          currentStage={currentStage}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
}
