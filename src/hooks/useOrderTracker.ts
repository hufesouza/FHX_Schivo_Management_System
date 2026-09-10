import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OtCustomer, OtMachine, OtOrder, OtPurchaseOrder } from '@/types/orderTracker';

/* ---------------------------------- machines --------------------------------- */

export function useMachines() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ot_machines'],
    queryFn: async (): Promise<OtMachine[]> => {
      const { data, error } = await supabase.from('ot_machines').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ot_machines'] });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('ot_machines').insert({ name: name.trim() }).select('id, name').single();
      if (error) throw error;
      return data as OtMachine;
    },
    onSuccess: () => { invalidate(); toast.success('Machine added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('ot_machines').update({ name: name.trim() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Machine renamed'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ot_machines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['ot_orders'] });
      toast.success('Machine deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { machines: query.data || [], loading: query.isLoading, create, rename, remove };
}

/* --------------------------------- customers --------------------------------- */

export function useCustomers() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ot_customers'],
    queryFn: async (): Promise<OtCustomer[]> => {
      const { data, error } = await supabase.from('ot_customers').select('*').order('name');
      if (error) throw error;
      return (data || []) as OtCustomer[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ot_customers'] });

  const save = useMutation({
    mutationFn: async (c: Partial<OtCustomer> & { name: string }) => {
      if (c.id) {
        const { id, created_at, updated_at, ...rest } = c as OtCustomer;
        const { error } = await supabase.from('ot_customers').update(rest).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from('ot_customers').insert(c).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { invalidate(); toast.success('Customer saved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ot_customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['ot_orders'] });
      toast.success('Customer deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { customers: query.data || [], loading: query.isLoading, save, remove };
}

/** Finds a customer by name (case-insensitive) or creates one. Returns the id. */
export async function ensureCustomer(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: existing } = await supabase
    .from('ot_customers')
    .select('id, name')
    .ilike('name', clean)
    .limit(1);
  if (existing && existing.length) return existing[0].id;
  const { data, error } = await supabase.from('ot_customers').insert({ name: clean }).select('id').single();
  if (error) return null;
  return data.id;
}

/* ----------------------------------- orders ---------------------------------- */

export function useOrders() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ot_orders'],
    queryFn: async (): Promise<OtOrder[]> => {
      const all: OtOrder[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from('ot_orders')
          .select('*')
          .order('due_date', { ascending: true, nullsFirst: false })
          .range(from, from + 999);
        if (error) throw error;
        const batch = (data || []) as OtOrder[];
        all.push(...batch);
        if (batch.length < 1000) break;
        from += 1000;
      }
      return all;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ot_orders'] });

  const save = useMutation({
    mutationFn: async (order: Partial<OtOrder>) => {
      if (order.id) {
        const { id, created_at, updated_at, ...rest } = order as OtOrder;
        const { error } = await supabase.from('ot_orders').update(rest).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from('ot_orders')
        .insert({ ...order, customer_name: order.customer_name || '' } as never)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { invalidate(); toast.success('Order saved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ot_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Order deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (order: OtOrder) => {
      const { id, created_at, updated_at, ...rest } = order;
      const { data, error } = await supabase.from('ot_orders').insert(rest as never).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { invalidate(); toast.success('Order duplicated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { orders: query.data || [], loading: query.isLoading, refetch: query.refetch, save, remove, duplicate };
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['ot_order', id],
    enabled: !!id,
    queryFn: async (): Promise<OtOrder | null> => {
      const { data, error } = await supabase.from('ot_orders').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return (data as OtOrder) || null;
    },
  });
}

export function usePurchaseOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: ['ot_purchase_order', id],
    enabled: !!id,
    queryFn: async (): Promise<OtPurchaseOrder | null> => {
      const { data, error } = await supabase.from('ot_purchase_orders').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return (data as OtPurchaseOrder) || null;
    },
  });
}

export async function getPoFileUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('purchase-orders').createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}
