import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ParsedQuotationData, ParsedQuotationPart } from '@/utils/quotationTemplateParser';

export interface EnquiryQuotation {
  id: string;
  enquiry_no: string;
  customer: string;
  status: string;
  total_quoted_price: number | null;
  total_cost: number | null;
  average_margin: number | null;
  notes: string | null;
  source_file_name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EnquiryQuotationPart {
  id: string;
  quotation_id: string;
  line_number: number;
  part_number: string | null;
  description: string | null;
  quantity: number | null;
  material_name: string | null;
  material_qty_per_unit: number | null;
  material_std_cost_est: number | null;
  material_markup: number | null;
  total_material: number | null;
  subcon_cost: number | null;
  subcon_markup: number | null;
  subcon_cost_per_part: number | null;
  resource: string | null;
  volume: number | null;
  development_time: number | null;
  days_dev_time: number | null;
  shift: number | null;
  dev_time_cost: number | null;
  tooling: number | null;
  nre: number | null;
  machine_manning: string | null;
  machine_setup: number | null;
  machine_run_time: number | null;
  part_deburr: number | null;
  wash: number | null;
  labour_per_hr: number | null;
  overheads_per_hr: number | null;
  machine_cost_per_min: number | null;
  secondary_ops_cost_per_min: number | null;
  labour_processing_cost: number | null;
  total_cost_per_part: number | null;
  margin: number | null;
  unit_price: number | null;
  created_at: string;
}

export function useEnquiryQuotations() {
  const [quotations, setQuotations] = useState<EnquiryQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enquiry_quotations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch quotations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createQuotation = useCallback(async (
    enquiryNo: string,
    customer: string,
    parsedData: ParsedQuotationData,
    sourceFileName: string,
    notes?: string
  ): Promise<EnquiryQuotation | null> => {
    try {
      setCreating(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('enquiry_quotations')
        .insert({
          enquiry_no: enquiryNo,
          customer,
          status: 'DRAFT',
          total_quoted_price: parsedData.totals.total_quoted_price,
          total_cost: parsedData.totals.total_cost,
          average_margin: parsedData.totals.average_margin,
          notes,
          source_file_name: sourceFileName,
          created_by: user.id,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Insert the parts
      const partsToInsert = parsedData.parts.map(part => ({
        quotation_id: quotation.id,
        ...part,
      }));

      const { error: partsError } = await supabase
        .from('enquiry_quotation_parts')
        .insert(partsToInsert);

      if (partsError) throw partsError;

      toast({
        title: 'Success',
        description: `Quotation created with ${parsedData.parts.length} parts`,
      });

      // Refresh the list
      await fetchQuotations();

      return quotation;
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create quotation: ' + (error as Error).message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setCreating(false);
    }
  }, [toast, fetchQuotations]);

  const getQuotationParts = useCallback(async (quotationId: string): Promise<EnquiryQuotationPart[]> => {
    try {
      const { data, error } = await supabase
        .from('enquiry_quotation_parts')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('line_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quotation parts:', error);
      return [];
    }
  }, []);

  const deleteQuotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('enquiry_quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quotation deleted',
      });

      await fetchQuotations();
      return true;
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete quotation',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchQuotations]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return {
    quotations,
    loading,
    creating,
    createQuotation,
    getQuotationParts,
    deleteQuotation,
    fetchQuotations,
  };
}
