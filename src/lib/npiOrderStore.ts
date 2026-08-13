import { supabase } from '@/integrations/supabase/client';

// Shared database store for NPI order spreadsheet rows.
// The database (public.npi_order_rows) is the ONLY source of truth: every
// signed-in user sees the same records, can append a new spreadsheet, delete
// individual lines or clear a whole site.

export type StoredRow = Record<string, any> & { __rowId: string };

const CHUNK = 500;

export const fetchSiteRows = async (
  site: string,
): Promise<{ rows: StoredRow[]; fileName: string; error: string | null }> => {
  const all: StoredRow[] = [];
  let fileName = '';
  let from = 0;

  // Supabase caps a single select at 1000 rows — page through everything.
  for (;;) {
    const { data, error } = await supabase
      .from('npi_order_rows')
      .select('id, file_name, row_data')
      .eq('site', site)
      .order('created_at', { ascending: true })
      .order('row_index', { ascending: true })
      .range(from, from + 999);

    if (error) return { rows: [], fileName: '', error: error.message };
    const batch = data || [];
    batch.forEach((r) => {
      if (r.file_name) fileName = r.file_name;
      const payload = (r.row_data && typeof r.row_data === 'object' ? r.row_data : {}) as Record<string, any>;
      all.push({ ...payload, __rowId: r.id });
    });
    if (batch.length < 1000) break;
    from += 1000;
  }

  return { rows: all, fileName, error: null };
};

export const countSiteRows = async (site: string): Promise<number> => {
  const { count } = await supabase
    .from('npi_order_rows')
    .select('id', { count: 'exact', head: true })
    .eq('site', site);
  return count || 0;
};

export const insertSiteRows = async (
  site: string,
  fileName: string,
  rows: Record<string, any>[],
  userId: string,
  startIndex = 0,
): Promise<string | null> => {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const payload = rows.slice(i, i + CHUNK).map((row, idx) => ({
      site,
      file_name: fileName,
      row_index: startIndex + i + idx,
      row_data: row as any,
      uploaded_by: userId,
    }));
    const { error } = await supabase.from('npi_order_rows').insert(payload);
    if (error) return error.message;
  }
  return null;
};

export const clearSiteRows = async (site: string): Promise<string | null> => {
  const { error } = await supabase.from('npi_order_rows').delete().eq('site', site);
  return error ? error.message : null;
};

export const replaceSiteRows = async (
  site: string,
  fileName: string,
  rows: Record<string, any>[],
  userId: string,
): Promise<string | null> => {
  const cleared = await clearSiteRows(site);
  if (cleared) return cleared;
  return insertSiteRows(site, fileName, rows, userId, 0);
};

export const appendSiteRows = async (
  site: string,
  fileName: string,
  rows: Record<string, any>[],
  userId: string,
): Promise<string | null> => {
  const existing = await countSiteRows(site);
  return insertSiteRows(site, fileName, rows, userId, existing);
};

export const deleteSiteRowIds = async (ids: string[]): Promise<string | null> => {
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from('npi_order_rows')
      .delete()
      .in('id', ids.slice(i, i + CHUNK));
    if (error) return error.message;
  }
  return null;
};
