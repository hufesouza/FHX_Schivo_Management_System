import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuotationResource {
  id: string;
  resource_no: string;
  resource_description: string;
  cost_per_minute: number;
  is_active: boolean;
}

export interface QuotationSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string | null;
}

export interface SystemQuotation {
  id: string;
  enquiry_no: string;
  customer: string;
  customer_code: string | null;
  quoted_by: string | null;
  part_number: string;
  revision: string | null;
  description: string | null;
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
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationMaterial {
  id: string;
  quotation_id: string;
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

export interface QuotationSubcon {
  id: string;
  quotation_id: string;
  line_number: number;
  vendor_no: string | null;
  vendor_name: string | null;
  part_number: string | null;
  process_description: string | null;
  std_cost_est: number | null;
  certification_required: boolean;
  total_subcon: number | null;
}

export interface QuotationRouting {
  id: string;
  quotation_id: string;
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

export interface QuotationVolumePricing {
  id: string;
  quotation_id: string;
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

export function useQuotationResources() {
  const [resources, setResources] = useState<QuotationResource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotation_resources')
        .select('*')
        .order('resource_no');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateResource = async (id: string, updates: Partial<QuotationResource>) => {
    try {
      const { error } = await supabase
        .from('quotation_resources')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Resource updated');
      fetchResources();
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    }
  };

  const addResource = async (resource: Omit<QuotationResource, 'id' | 'is_active'>) => {
    try {
      const { error } = await supabase
        .from('quotation_resources')
        .insert(resource);

      if (error) throw error;
      toast.success('Resource added');
      fetchResources();
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    }
  };

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return { resources, loading, updateResource, addResource, fetchResources };
}

export function useQuotationSettings() {
  const [settings, setSettings] = useState<QuotationSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotation_system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = async (id: string, value: number) => {
    try {
      const { error } = await supabase
        .from('quotation_system_settings')
        .update({ setting_value: value })
        .eq('id', id);

      if (error) throw error;
      toast.success('Setting updated');
      fetchSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const getSettingValue = (key: string): number => {
    const setting = settings.find(s => s.setting_key === key);
    return setting?.setting_value || 0;
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, updateSetting, getSettingValue, fetchSettings };
}

export function useSystemQuotations() {
  const [quotations, setQuotations] = useState<SystemQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuotation = async (quotation: Omit<SystemQuotation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('system_quotations')
        .insert(quotation)
        .select()
        .single();

      if (error) throw error;
      toast.success('Quotation created');
      fetchQuotations();
      return data;
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error('Failed to create quotation');
      return null;
    }
  };

  const updateQuotation = async (id: string, updates: Partial<SystemQuotation>) => {
    try {
      const { error } = await supabase
        .from('system_quotations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Quotation updated');
      fetchQuotations();
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast.error('Failed to update quotation');
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return { quotations, loading, createQuotation, updateQuotation, fetchQuotations };
}
