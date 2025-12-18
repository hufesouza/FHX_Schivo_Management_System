import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';
import { cn } from '@/lib/utils';
import { AlertTriangle, RotateCcw, PauseCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface NPIFinalReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
  onStartNewRound?: (newWoNumber: string) => void;
}

export function NPIFinalReview({ data, onChange, disabled = false, onStartNewRound }: NPIFinalReviewProps) {
  const showRedoQuestion = data.departments_agreed_to_change === false;
  const showNewWoField = showRedoQuestion && data.br_needs_redo === true;
  const showOnHold = showRedoQuestion && data.br_needs_redo === false;
  const isOnHold = data.br_on_hold === true;

  const handleStartNewRound = () => {
    if (data.br_redo_new_wo_number && onStartNewRound) {
      onStartNewRound(data.br_redo_new_wo_number);
    }
  };

  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Final Review – NPI</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Final approval for production'}
        </p>
        {data.revision_round && data.revision_round > 1 && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm">
            <RotateCcw className="h-4 w-4" />
            Revision Round {data.revision_round}
          </div>
        )}
      </div>

      {isOnHold && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
          <PauseCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">Blue Review On Hold</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            This Blue Review has been placed on hold as departments did not agree to change to White and it was decided not to redo the process.
          </AlertDescription>
        </Alert>
      )}

      <YesNoField
        label="1. Have all sections been filled in by Programmers/Production and Quality?"
        value={data.all_sections_filled ?? null}
        onChange={(v) => onChange({ all_sections_filled: v })}
        details={data.all_sections_details}
        onDetailsChange={(v) => onChange({ all_sections_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="2. Do costings need to be re-evaluated based on unplanned cycle times / additional costs?"
        value={data.costings_need_reevaluation ?? null}
        onChange={(v) => onChange({ costings_need_reevaluation: v })}
        details={data.costings_reevaluation_details}
        onDetailsChange={(v) => onChange({ costings_reevaluation_details: v })}
        detailsLabel="Details (If Yes)"
        showDetailsWhen="yes"
        disabled={disabled}
      />

      <YesNoField
        label="3. Have all departments agreed to change to White?"
        value={data.departments_agreed_to_change ?? null}
        onChange={(v) => {
          onChange({ 
            departments_agreed_to_change: v,
            // Reset conditional fields when changing this answer
            br_needs_redo: null,
            br_redo_new_wo_number: null,
            br_on_hold: false,
          });
        }}
        details={data.departments_agreed_details}
        onDetailsChange={(v) => onChange({ departments_agreed_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      {/* Conditional: If Q3 is No, show "Need to be redone?" question */}
      {showRedoQuestion && (
        <div className="ml-6 border-l-4 border-amber-400 pl-4 space-y-4 animate-fade-in">
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Process Review Required</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Since departments did not agree to change to White, the process designed may need to be redone.
            </AlertDescription>
          </Alert>

          <YesNoField
            label={`Should the BR for P/N ${data.part_and_rev || '[Part Number]'} be redone?`}
            value={data.br_needs_redo ?? null}
            onChange={(v) => {
              onChange({ 
                br_needs_redo: v,
                br_on_hold: v === false ? true : false,
                br_redo_new_wo_number: v === false ? null : data.br_redo_new_wo_number,
              });
            }}
            disabled={disabled}
          />

          {/* If redo = Yes, ask for new W/O number */}
          {showNewWoField && (
            <div className="space-y-4 animate-fade-in bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="new_wo_number" className="text-base font-medium">
                  New Work Order Number (W/O #)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enter the new W/O number for the revised Blue Review. A new round will start from Engineering Review.
                </p>
                <Input
                  id="new_wo_number"
                  value={data.br_redo_new_wo_number || ''}
                  onChange={(e) => onChange({ br_redo_new_wo_number: e.target.value })}
                  placeholder="Enter new W/O number"
                  disabled={disabled}
                />
              </div>
              
              {data.br_redo_new_wo_number && onStartNewRound && (
                <Button
                  onClick={handleStartNewRound}
                  disabled={disabled || !data.br_redo_new_wo_number}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start New Round (Round {(data.revision_round || 1) + 1})
                </Button>
              )}
            </div>
          )}

          {/* If redo = No, show On Hold confirmation */}
          {showOnHold && (
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30 animate-fade-in">
              <PauseCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800 dark:text-orange-200">Blue Review will be placed On Hold</AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                This Blue Review will be marked as "On Hold" since it won't be redone. The current process will not proceed to White status.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Additional Comments</Label>
        <Textarea
          value={data.npi_final_comments || ''}
          onChange={(e) => onChange({ npi_final_comments: e.target.value })}
          placeholder="Enter any additional comments..."
          rows={4}
          disabled={disabled}
        />
      </div>

      {/* Signature */}
      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="font-medium text-primary">Signature</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.npi_final_signature || ''}
              onChange={(e) => onChange({ npi_final_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.npi_final_signature_date || ''}
              onChange={(e) => onChange({ npi_final_signature_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
