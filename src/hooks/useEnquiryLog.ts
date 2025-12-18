import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EnquiryLog, ParsedEnquiryLog } from '@/types/enquiryLog';
import { toast } from '@/hooks/use-toast';

export interface EnquiryStats {
  total: number;
  open: number;
  quoted: number;
  won: number;
  lost: number;
  onHold: number;
  totalQuotedValue: number;
  totalPOValue: number;
  avgTurnaround: number;
  byCustomer: { customer: string; count: number }[];
  byOwner: { owner: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export function useEnquiryLog() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<EnquiryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enquiry_log')
        .select('*')
        .order('date_received', { ascending: false });

      if (error) throw error;
      setEnquiries(data || []);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enquiry data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const uploadData = useCallback(async (parsedData: ParsedEnquiryLog[]): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload data',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setUploading(true);

      // Delete existing data
      const { error: deleteError } = await supabase
        .from('enquiry_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Insert new data in batches
      const batchSize = 500;
      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize).map(item => ({
          ...item,
          uploaded_by: user.id,
        }));

        const { error: insertError } = await supabase
          .from('enquiry_log')
          .insert(batch);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: `Uploaded ${parsedData.length} enquiries`,
      });

      await fetchEnquiries();
      return true;
    } catch (error) {
      console.error('Error uploading enquiry data:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload enquiry data',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUploading(false);
    }
  }, [user, fetchEnquiries]);

  const clearAllData = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('enquiry_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setEnquiries([]);
      toast({
        title: 'Success',
        description: 'All enquiry data cleared',
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear data',
        variant: 'destructive',
      });
    }
  }, []);

  const updateEnquiry = useCallback(async (id: string, updates: Partial<EnquiryLog>) => {
    try {
      const { error } = await supabase
        .from('enquiry_log')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setEnquiries(prev =>
        prev.map(e => (e.id === id ? { ...e, ...updates } : e))
      );

      toast({
        title: 'Saved',
        description: 'Enquiry updated',
      });
    } catch (error) {
      console.error('Error updating enquiry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update enquiry',
        variant: 'destructive',
      });
    }
  }, []);

  // Calculate stats
  const stats: EnquiryStats = {
    total: enquiries.length,
    open: enquiries.filter(e => e.status?.toUpperCase() === 'OPEN' || !e.status).length,
    quoted: enquiries.filter(e => e.is_quoted).length,
    won: enquiries.filter(e => e.po_received || e.status?.toUpperCase() === 'WON').length,
    lost: enquiries.filter(e => e.status?.toUpperCase() === 'LOST').length,
    onHold: enquiries.filter(e => e.status?.toUpperCase() === 'ON HOLD' || e.priority?.toLowerCase() === 'hold').length,
    totalQuotedValue: enquiries.reduce((sum, e) => sum + (e.quoted_price_euro || 0), 0),
    totalPOValue: enquiries.reduce((sum, e) => sum + (e.po_value_euro || 0), 0),
    avgTurnaround: enquiries.filter(e => e.turnaround_days).length > 0
      ? enquiries.filter(e => e.turnaround_days).reduce((sum, e) => sum + (e.turnaround_days || 0), 0) / 
        enquiries.filter(e => e.turnaround_days).length
      : 0,
    byCustomer: Object.entries(
      enquiries.reduce((acc, e) => {
        const customer = e.customer || 'Unknown';
        acc[customer] = (acc[customer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([customer, count]) => ({ customer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    byOwner: Object.entries(
      enquiries.reduce((acc, e) => {
        const owner = e.npi_owner || 'Unassigned';
        acc[owner] = (acc[owner] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: Object.entries(
      enquiries.reduce((acc, e) => {
        const status = e.status || 'OPEN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };

  return {
    enquiries,
    loading,
    uploading,
    stats,
    uploadData,
    clearAllData,
    updateEnquiry,
    fetchEnquiries,
  };
}
