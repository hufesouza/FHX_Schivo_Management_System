/**
 * Activity colours for machine occupancy visualisation.
 * Development = blue, Production / Run = green. Programming never occupies a machine.
 * Keep these consistent everywhere an activity is drawn.
 */
export const ACTIVITY_COLORS = {
  development: { hex: '#2563eb', bg: 'rgba(37, 99, 235, 0.14)', label: 'DEVELOPMENT' },
  production: { hex: '#16a34a', bg: 'rgba(22, 163, 74, 0.14)', label: 'PRODUCTION / RUN' },
  programming: { hex: '#a855f7', bg: 'rgba(168, 85, 247, 0.14)', label: 'PROGRAMMING' },
} as const;

export type ActivityKey = keyof typeof ACTIVITY_COLORS;

export function activityColor(key: string | null | undefined) {
  return ACTIVITY_COLORS[(key as ActivityKey) ?? 'development'] ?? ACTIVITY_COLORS.development;
}
