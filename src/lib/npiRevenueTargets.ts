import { supabase } from '@/integrations/supabase/client';

// Company revenue targets are shared across all users: the database row for the
// site is authoritative, localStorage is only a fast-load cache.
export type RevenueTargets = Record<string, number>;

const cacheKey = (site: string, key: string) =>
  key === 'all'
    ? `npi-oi-total-company-revenue:${site}`
    : `npi-oi-total-company-revenue:${site}:${key}`;

const writeCache = (site: string, targets: RevenueTargets) => {
  Object.entries(targets).forEach(([k, v]) => {
    try { localStorage.setItem(cacheKey(site, k), String(v || 0)); } catch {}
  });
};

export const readCachedTarget = (site: string, key: string): number =>
  parseFloat(localStorage.getItem(cacheKey(site, key)) || '0') || 0;

export const fetchRevenueTargets = async (site: string): Promise<RevenueTargets> => {
  const { data, error } = await supabase
    .from('npi_order_dashboard_data')
    .select('revenue_targets')
    .eq('site', site)
    .maybeSingle();

  if (error || !data?.revenue_targets || typeof data.revenue_targets !== 'object') return {};
  const targets = data.revenue_targets as RevenueTargets;
  writeCache(site, targets);
  return targets;
};

export const saveRevenueTarget = async (
  site: string,
  key: string,
  value: number,
  userId?: string | null,
): Promise<string | null> => {
  try { localStorage.setItem(cacheKey(site, key), String(value || 0)); } catch {}
  if (!userId) return 'not-signed-in';

  const { data: existing } = await supabase
    .from('npi_order_dashboard_data')
    .select('id, revenue_targets')
    .eq('site', site)
    .maybeSingle();

  const merged: RevenueTargets = {
    ...(existing?.revenue_targets && typeof existing.revenue_targets === 'object'
      ? (existing.revenue_targets as RevenueTargets)
      : {}),
    [key]: value || 0,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('npi_order_dashboard_data')
      .update({ revenue_targets: merged })
      .eq('id', existing.id);
    return error ? error.message : null;
  }

  const { error } = await supabase
    .from('npi_order_dashboard_data')
    .insert({ site, file_name: '', data: [], revenue_targets: merged, uploaded_by: userId });
  return error ? error.message : null;
};
