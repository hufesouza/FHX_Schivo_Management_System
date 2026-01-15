import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EnquiryStatus = 
  | 'open'
  | 'in_progress'
  | 'submitted_for_review'
  | 'approved'
  | 'declined'
  | 'submitted'
  | 'won'
  | 'lost';

export interface QuotationEnquiry {
  id: string;
  enquiry_no: string;
  customer_id: string | null;
  customer_name: string;
  sales_representative: string | null;
  status: EnquiryStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Review workflow fields
  approver_id: string | null;
  approver_name: string | null;
  submitted_for_review_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  total_quoted_value: number | null;
  average_margin: number | null;
}

export interface EnquiryPart {
  id: string;
  enquiry_id: string;
  line_number: number;
  part_number: string;
  description: string | null;
  revision: string | null;
  drawing_url: string | null;
  drawing_file_name: string | null;
  quote_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryWithParts extends QuotationEnquiry {
  parts: EnquiryPart[];
}

export function useQuotationEnquiries() {
  const [enquiries, setEnquiries] = useState<QuotationEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotation_enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnquiries((data || []) as QuotationEnquiry[]);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  const createEnquiry = async (
    enquiry: Pick<QuotationEnquiry, 'enquiry_no' | 'customer_name' | 'customer_id' | 'sales_representative' | 'notes' | 'created_by'>
  ): Promise<QuotationEnquiry | null> => {
    try {
      const { data, error } = await supabase
        .from('quotation_enquiries')
        .insert({
          ...enquiry,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Enquiry created successfully');
      fetchEnquiries();
      return data as QuotationEnquiry;
    } catch (error: any) {
      console.error('Error creating enquiry:', error);
      if (error.code === '23505') {
        toast.error('An enquiry with this number already exists');
      } else {
        toast.error('Failed to create enquiry');
      }
      return null;
    }
  };

  const updateEnquiry = async (
    id: string,
    updates: Partial<QuotationEnquiry>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotation_enquiries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Enquiry updated');
      fetchEnquiries();
      return true;
    } catch (error) {
      console.error('Error updating enquiry:', error);
      toast.error('Failed to update enquiry');
      return false;
    }
  };

  const updateEnquiryStatus = async (
    id: string,
    status: EnquiryStatus
  ): Promise<boolean> => {
    return updateEnquiry(id, { status });
  };

  const deleteEnquiry = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotation_enquiries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Enquiry deleted');
      fetchEnquiries();
      return true;
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      toast.error('Failed to delete enquiry');
      return false;
    }
  };

  const getEnquiryWithParts = async (id: string): Promise<EnquiryWithParts | null> => {
    try {
      const { data: enquiry, error: enquiryError } = await supabase
        .from('quotation_enquiries')
        .select('*')
        .eq('id', id)
        .single();

      if (enquiryError) throw enquiryError;

      const { data: parts, error: partsError } = await supabase
        .from('enquiry_parts')
        .select('*')
        .eq('enquiry_id', id)
        .order('line_number');

      if (partsError) throw partsError;

      return {
        ...(enquiry as QuotationEnquiry),
        parts: (parts || []) as EnquiryPart[]
      };
    } catch (error) {
      console.error('Error fetching enquiry with parts:', error);
      toast.error('Failed to load enquiry details');
      return null;
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  return {
    enquiries,
    loading,
    fetchEnquiries,
    createEnquiry,
    updateEnquiry,
    updateEnquiryStatus,
    deleteEnquiry,
    getEnquiryWithParts
  };
}

export function useEnquiryParts(enquiryId: string | undefined) {
  const [parts, setParts] = useState<EnquiryPart[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParts = useCallback(async () => {
    if (!enquiryId) {
      setParts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enquiry_parts')
        .select('*')
        .eq('enquiry_id', enquiryId)
        .order('line_number');

      if (error) throw error;
      setParts((data || []) as EnquiryPart[]);
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Failed to load parts');
    } finally {
      setLoading(false);
    }
  }, [enquiryId]);

  const addPart = async (
    part: Omit<EnquiryPart, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EnquiryPart | null> => {
    try {
      const { data, error } = await supabase
        .from('enquiry_parts')
        .insert(part)
        .select()
        .single();

      if (error) throw error;
      toast.success('Part added');
      fetchParts();
      return data as EnquiryPart;
    } catch (error) {
      console.error('Error adding part:', error);
      toast.error('Failed to add part');
      return null;
    }
  };

  const updatePart = async (
    id: string,
    updates: Partial<EnquiryPart>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('enquiry_parts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Part updated');
      fetchParts();
      return true;
    } catch (error) {
      console.error('Error updating part:', error);
      toast.error('Failed to update part');
      return false;
    }
  };

  const deletePart = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('enquiry_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Part deleted');
      fetchParts();
      return true;
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to delete part');
      return false;
    }
  };

  const uploadDrawing = async (
    partId: string,
    file: File
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${partId}-${Date.now()}.${fileExt}`;
      const filePath = `drawings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('enquiry-drawings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('enquiry-drawings')
        .getPublicUrl(filePath);

      // Update part with drawing URL
      await updatePart(partId, {
        drawing_url: urlData.publicUrl,
        drawing_file_name: file.name
      });

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading drawing:', error);
      toast.error('Failed to upload drawing');
      return null;
    }
  };

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  return {
    parts,
    loading,
    fetchParts,
    addPart,
    updatePart,
    deletePart,
    uploadDrawing
  };
}
