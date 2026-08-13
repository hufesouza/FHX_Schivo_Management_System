import { supabase } from '@/integrations/supabase/client';

export type NpiSite = {
  id: string;
  title: string;
  description: string;
  color: string;
  custom?: boolean;
};

// Custom sites live in the database so every user sees the same list.
// localStorage is only a cache so labels resolve instantly on first paint.
const CUSTOM_KEY = 'npi-oi-custom-sites';

export const BUILTIN_SITES: NpiSite[] = [
  {
    id: 'waterford',
    title: 'Schivo Waterford',
    description: 'Upload and analyse NPI orders for the Waterford site.',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  {
    id: 'plainview',
    title: 'Schivo PlainView',
    description: 'Upload and analyse NPI orders for the PlainView site.',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  {
    id: 'quebec',
    title: 'Schivo Quebec',
    description: 'Upload and analyse NPI orders for the Quebec site.',
    color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
];

const PALETTE = [
  'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'bg-lime-500/10 text-lime-600 border-lime-500/20',
];

export const slugifySite = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const getCustomSites = (): NpiSite[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setCache = (sites: NpiSite[]) => {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(sites)); } catch {}
};

export const getAllSites = (): NpiSite[] => [...BUILTIN_SITES, ...getCustomSites()];

/** Loads the shared site list from the database (falls back to the cache offline). */
export const fetchAllSites = async (): Promise<NpiSite[]> => {
  const { data, error } = await supabase
    .from('npi_dashboard_sites')
    .select('site_id, title, description, color')
    .order('created_at', { ascending: true });

  if (error || !data) return getAllSites();

  const custom: NpiSite[] = data
    .filter(r => !BUILTIN_SITES.some(b => b.id === r.site_id))
    .map(r => ({
      id: r.site_id,
      title: r.title,
      description: r.description || `Upload and analyse NPI orders for ${r.title}.`,
      color: r.color,
      custom: true,
    }));

  setCache(custom);
  return [...BUILTIN_SITES, ...custom];
};

export const addCustomSite = async (name: string): Promise<NpiSite | null> => {
  const id = slugifySite(name);
  if (!id) return null;
  const existing = await fetchAllSites();
  if (existing.some((s) => s.id === id)) return null;

  const customCount = existing.filter(s => s.custom).length;
  const site: NpiSite = {
    id,
    title: name.trim(),
    description: `Upload and analyse NPI orders for ${name.trim()}.`,
    color: PALETTE[customCount % PALETTE.length],
    custom: true,
  };

  const { error } = await supabase.from('npi_dashboard_sites').insert({
    site_id: site.id,
    title: site.title,
    description: site.description,
    color: site.color,
  });
  if (error) return null;

  setCache([...existing.filter(s => s.custom), site]);
  return site;
};

export const removeCustomSite = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('npi_dashboard_sites').delete().eq('site_id', id);
  if (error) return false;
  setCache(getCustomSites().filter((s) => s.id !== id));
  return true;
};

export const getSiteLabel = (id: string): string =>
  getAllSites().find((s) => s.id === id)?.title || 'Schivo Waterford';
