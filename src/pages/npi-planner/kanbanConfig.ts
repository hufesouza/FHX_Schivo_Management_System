import type { Part } from '@/hooks/useNPIPlanning';

export type Setter = {
  id: string;
  setter_name: string;
  color: string;
  active: boolean;
  notes: string | null;
};

// Production stages for the Job Kanban board (order matters).
export const KANBAN_STAGES = [
  { key: 'Material and Tooling', label: 'Material & Tooling', dot: 'bg-amber-500' },
  { key: 'Programming', label: 'Programming', dot: 'bg-blue-500' },
  { key: 'Development', label: 'Development', dot: 'bg-purple-500' },
  { key: 'Machining Run', label: 'Machining Run', dot: 'bg-cyan-500' },
  { key: 'Deburr', label: 'Deburr', dot: 'bg-orange-500' },
  { key: 'Wash', label: 'Wash', dot: 'bg-sky-500' },
  { key: 'QA Inspection', label: 'QA Inspection', dot: 'bg-indigo-500' },
  { key: 'Subcon Dispatch', label: 'Subcon Dispatch (complete)', dot: 'bg-emerald-600' },
] as const;

export const MACHINE_CATEGORIES = ['Milling', 'Turning', 'Sliding Heads', 'Misc'] as const;

const MILLING_PREFIXES = ['MIL', 'DMG', 'DoosanVC', 'Hermle', 'Roders', 'Grob', 'Mikron', 'Fanuc', 'Haas'];
const TURNING_PREFIXES = ['TRN', 'DoosanMX', 'Integrex', 'Mori', 'Nakamura', 'Mazak', 'Lathe'];
const SLIDING_HEAD_PREFIXES = ['SLH', 'Citizen', 'Tornos', 'Star'];

/** Categorise a machine by name prefix (Milling / Turning / Sliding Heads / Misc). */
export const machineCategory = (name?: string | null): string => {
  const n = (name || '').trim().toUpperCase();
  if (!n) return 'Misc';
  const hit = (list: string[]) => list.some(p => n.startsWith(p.toUpperCase()));
  if (hit(SLIDING_HEAD_PREFIXES)) return 'Sliding Heads';
  if (hit(MILLING_PREFIXES)) return 'Milling';
  if (hit(TURNING_PREFIXES)) return 'Turning';
  return 'Misc';
};

export const LOOKAHEAD_OPTIONS = [
  { value: '7', label: '1 week lookahead' },
  { value: '14', label: '2 weeks lookahead' },
  { value: '30', label: '1 month lookahead' },
  { value: '60', label: '2 months lookahead' },
  { value: '90', label: '3 months lookahead' },
  { value: 'all', label: 'All jobs' },
];

/**
 * Date (ms) used to place a job in the lookahead window:
 * scheduled start -> best commence -> committed date. Null when unknown
 * (unknown jobs always stay visible so nothing gets silently hidden).
 */
export const partStageAnchor = (p: Part, scheduledStart?: number): number | null => {
  if (scheduledStart !== undefined) return scheduledStart;
  if (p.best_commence_date) return new Date(p.best_commence_date).getTime();
  if (p.committed_date) return new Date(p.committed_date).getTime();
  return null;
};
