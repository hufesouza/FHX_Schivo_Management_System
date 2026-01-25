import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnquiryQuotedPart {
  id: string;
  enquiry_id: string;
  source_quotation_id: string;
  part_number: string;
  revision: string | null;
  description: string | null;
  customer: string;
  customer_code: string | null;
  qty_per: number;
  manufacture_type: string;
  blue_review_required: boolean;
  batch_traceable: boolean;
  rohs_compliant: boolean;
  serial_traceable: boolean;
  material_markup: number;
  subcon_markup: number;
  vol_1: number | null;
  vol_2: number | null;
  vol_3: number | null;
  vol_4: number | null;
  vol_5: number | null;
  won_volume: number | null;
  notes: string | null;
  total_quoted_value: number | null;
  average_margin: number | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryQuotedPartRouting {
  id: string;
  enquiry_quoted_part_id: string;
  op_no: number;
  sublevel_bom: boolean;
  part_number: string | null;
  resource_id: string | null;
  resource_no: string | null;
  operation_details: string | null;
  subcon_processing_time: number;
  setup_time: number;
  run_time: number;
  cost: number | null;
}

export interface EnquiryQuotedPartMaterial {
  id: string;
  enquiry_quoted_part_id: string;
  line_number: number;
  vendor_no: string | null;
  vendor_name: string | null;
  part_number: string | null;
  material_description: string | null;
  mat_category: string | null;
  uom: string;
  qty_per_unit: number;
  qa_inspection_required: boolean;
  std_cost_est: number | null;
  certification_required: string | null;
  purchaser: string | null;
  description_for_qa: string | null;
  total_material: number | null;
}

export interface EnquiryQuotedPartSubcon {
  id: string;
  enquiry_quoted_part_id: string;
  line_number: number;
  vendor_no: string | null;
  vendor_name: string | null;
  part_number: string | null;
  process_description: string | null;
  std_cost_est: number | null;
  certification_required: boolean;
  total_subcon: number | null;
}

export interface EnquiryQuotedPartVolumePricing {
  id: string;
  enquiry_quoted_part_id: string;
  quantity: number;
  hours: number | null;
  cost_per_hour: number;
  labour_cost: number | null;
  material_cost: number | null;
  subcon_cost: number | null;
  tooling_cost: number;
  carriage: number;
  misc: number;
  total_price: number | null;
  unit_price_quoted: number | null;
  cost_per_unit: number | null;
  margin: number | null;
}

export function useEnquiryQuotedParts(enquiryId: string | undefined) {
  const [parts, setParts] = useState<EnquiryQuotedPart[]>([]);
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
        .from('enquiry_quoted_parts')
        .select('*')
        .eq('enquiry_id', enquiryId)
        .order('created_at');

      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('Error fetching enquiry quoted parts:', error);
      toast.error('Failed to load quoted parts');
    } finally {
      setLoading(false);
    }
  }, [enquiryId]);

  // Copy a quotation to an enquiry
  const addQuotationToEnquiry = async (
    enquiryId: string,
    quotationId: string
  ): Promise<EnquiryQuotedPart | null> => {
    try {
      // 1. Fetch the source quotation
      const { data: quotation, error: qError } = await supabase
        .from('system_quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (qError || !quotation) throw qError || new Error('Quotation not found');

      // 2. Insert the enquiry quoted part
      const { data: newPart, error: insertError } = await supabase
        .from('enquiry_quoted_parts')
        .insert({
          enquiry_id: enquiryId,
          source_quotation_id: quotationId,
          part_number: quotation.part_number,
          revision: quotation.revision,
          description: quotation.description,
          customer: quotation.customer,
          customer_code: quotation.customer_code,
          qty_per: quotation.qty_per,
          manufacture_type: quotation.manufacture_type,
          blue_review_required: quotation.blue_review_required,
          batch_traceable: quotation.batch_traceable,
          rohs_compliant: quotation.rohs_compliant,
          serial_traceable: quotation.serial_traceable,
          material_markup: quotation.material_markup,
          subcon_markup: quotation.subcon_markup,
          vol_1: quotation.vol_1,
          vol_2: quotation.vol_2,
          vol_3: quotation.vol_3,
          vol_4: quotation.vol_4,
          vol_5: quotation.vol_5,
          won_volume: quotation.won_volume,
          notes: quotation.notes,
        })
        .select()
        .single();

      if (insertError || !newPart) throw insertError || new Error('Failed to create enquiry part');

      // 3. Copy routings
      const { data: routings } = await supabase
        .from('quotation_routings')
        .select('*')
        .eq('quotation_id', quotationId);

      if (routings && routings.length > 0) {
        await supabase.from('enquiry_quoted_part_routings').insert(
          routings.map(r => ({
            enquiry_quoted_part_id: newPart.id,
            op_no: r.op_no,
            sublevel_bom: r.sublevel_bom,
            part_number: r.part_number,
            resource_id: r.resource_id,
            resource_no: r.resource_no,
            operation_details: r.operation_details,
            subcon_processing_time: r.subcon_processing_time,
            setup_time: r.setup_time,
            run_time: r.run_time,
            cost: r.cost,
          }))
        );
      }

      // 4. Copy materials
      const { data: materials } = await supabase
        .from('quotation_materials')
        .select('*')
        .eq('quotation_id', quotationId);

      if (materials && materials.length > 0) {
        await supabase.from('enquiry_quoted_part_materials').insert(
          materials.map(m => ({
            enquiry_quoted_part_id: newPart.id,
            line_number: m.line_number,
            vendor_no: m.vendor_no,
            vendor_name: m.vendor_name,
            part_number: m.part_number,
            material_description: m.material_description,
            mat_category: m.mat_category,
            uom: m.uom,
            qty_per_unit: m.qty_per_unit,
            qa_inspection_required: m.qa_inspection_required,
            std_cost_est: m.std_cost_est,
            certification_required: m.certification_required,
            purchaser: m.purchaser,
            description_for_qa: m.description_for_qa,
            total_material: m.total_material,
          }))
        );
      }

      // 5. Copy subcons
      const { data: subcons } = await supabase
        .from('quotation_subcons')
        .select('*')
        .eq('quotation_id', quotationId);

      if (subcons && subcons.length > 0) {
        await supabase.from('enquiry_quoted_part_subcons').insert(
          subcons.map(s => ({
            enquiry_quoted_part_id: newPart.id,
            line_number: s.line_number,
            vendor_no: s.vendor_no,
            vendor_name: s.vendor_name,
            part_number: s.part_number,
            process_description: s.process_description,
            std_cost_est: s.std_cost_est,
            certification_required: s.certification_required,
            total_subcon: s.total_subcon,
          }))
        );
      }

      // 6. Copy volume pricing
      const { data: volumes } = await supabase
        .from('quotation_volume_pricing')
        .select('*')
        .eq('quotation_id', quotationId);

      if (volumes && volumes.length > 0) {
        await supabase.from('enquiry_quoted_part_volume_pricing').insert(
          volumes.map(v => ({
            enquiry_quoted_part_id: newPart.id,
            quantity: v.quantity,
            hours: v.hours,
            cost_per_hour: v.cost_per_hour,
            labour_cost: v.labour_cost,
            material_cost: v.material_cost,
            subcon_cost: v.subcon_cost,
            tooling_cost: v.tooling_cost,
            carriage: v.carriage,
            misc: v.misc,
            total_price: v.total_price,
            unit_price_quoted: v.unit_price_quoted,
            cost_per_unit: v.cost_per_unit,
            margin: v.margin,
          }))
        );
      }

      toast.success('Part added to enquiry');
      fetchParts();
      return newPart as EnquiryQuotedPart;
    } catch (error) {
      console.error('Error adding quotation to enquiry:', error);
      toast.error('Failed to add part to enquiry');
      return null;
    }
  };

  // Remove a part from an enquiry
  const removePart = async (partId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('enquiry_quoted_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;
      toast.success('Part removed from enquiry');
      fetchParts();
      return true;
    } catch (error) {
      console.error('Error removing part:', error);
      toast.error('Failed to remove part');
      return false;
    }
  };

  return {
    parts,
    loading,
    fetchParts,
    addQuotationToEnquiry,
    removePart,
  };
}

// Hook to get quotations available for a customer (unassigned or all)
export function useCustomerQuotations(customer: string | null) {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuotations = useCallback(async () => {
    if (!customer) {
      setQuotations([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_quotations')
        .select('*')
        .eq('customer', customer)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching customer quotations:', error);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  return {
    quotations,
    loading,
    fetchQuotations,
  };
}
