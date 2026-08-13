export type NpiSite = {
  id: string;
  title: string;
  description: string;
  color: string;
  custom?: boolean;
};

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

export const getAllSites = (): NpiSite[] => [...BUILTIN_SITES, ...getCustomSites()];

export const addCustomSite = (name: string): NpiSite | null => {
  const id = slugifySite(name);
  if (!id) return null;
  const existing = getAllSites();
  if (existing.some((s) => s.id === id)) return null;
  const custom = getCustomSites();
  const site: NpiSite = {
    id,
    title: name.trim(),
    description: `Upload and analyse NPI orders for ${name.trim()}.`,
    color: PALETTE[custom.length % PALETTE.length],
    custom: true,
  };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify([...custom, site]));
  return site;
};

export const removeCustomSite = (id: string) => {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(getCustomSites().filter((s) => s.id !== id)));
};

export const getSiteLabel = (id: string): string =>
  getAllSites().find((s) => s.id === id)?.title || 'Schivo Waterford';
