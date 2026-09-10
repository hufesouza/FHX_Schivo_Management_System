/**
 * Currency handling for the Order Tracker.
 * Everything is stored in EUR; the original currency and rate are kept alongside.
 */

const SYMBOLS: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', 'CHF': 'CHF', 'zł': 'PLN', 'kr': 'SEK',
};

const NAMES: Record<string, string> = {
  EURO: 'EUR', EUROS: 'EUR', 'US DOLLAR': 'USD', 'US DOLLARS': 'USD', USD$: 'USD',
  DOLLAR: 'USD', DOLLARS: 'USD', 'POUND STERLING': 'GBP', STERLING: 'GBP', POUND: 'GBP',
  POUNDS: 'GBP', YEN: 'JPY', 'SWISS FRANC': 'CHF', ZLOTY: 'PLN', 'DANISH KRONE': 'DKK',
  'SWEDISH KRONA': 'SEK', 'NORWEGIAN KRONE': 'NOK', 'CANADIAN DOLLAR': 'CAD',
  'MEXICAN PESO': 'MXN', RUPEE: 'INR', RENMINBI: 'CNY', YUAN: 'CNY',
};

/** Best-effort mapping of anything an extraction may return to an ISO 4217 code. */
export function normaliseCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (SYMBOLS[s]) return SYMBOLS[s];
  const upper = s.toUpperCase().replace(/\./g, '').trim();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  if (NAMES[upper]) return NAMES[upper];
  for (const [sym, code] of Object.entries(SYMBOLS)) {
    if (s.includes(sym)) return code;
  }
  const m = upper.match(/\b([A-Z]{3})\b/);
  return m ? m[1] : null;
}

/** Fallback rates (units of currency per 1 EUR) used if the live rate lookup fails. */
const FALLBACK_PER_EUR: Record<string, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, JPY: 165, SEK: 11.3, NOK: 11.6, DKK: 7.46,
  PLN: 4.3, CZK: 25.2, CAD: 1.47, AUD: 1.63, MXN: 19.5, CNY: 7.8, INR: 90, TRY: 38,
};

const cache = new Map<string, number>();

/** Multiplier that converts an amount in `currency` into EUR. */
export async function getEurRate(currency: string | null | undefined): Promise<number> {
  const code = normaliseCurrency(currency);
  if (!code || code === 'EUR') return 1;
  if (cache.has(code)) return cache.get(code)!;

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${code}&to=EUR`);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.EUR);
      if (rate > 0) {
        cache.set(code, rate);
        return rate;
      }
    }
  } catch {
    // offline or blocked — fall through to the static table
  }

  const perEur = FALLBACK_PER_EUR[code];
  const rate = perEur ? 1 / perEur : 1;
  cache.set(code, rate);
  return rate;
}

export const toEur = (value: number | null, rate: number): number | null =>
  value === null || value === undefined || isNaN(value) ? null : Number((value * rate).toFixed(2));

export const fmtOriginal = (value: number | null | undefined, currency: string | null | undefined) => {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  const code = normaliseCurrency(currency);
  try {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: code || 'EUR' }).format(Number(value));
  } catch {
    return `${code || ''} ${Number(value).toFixed(2)}`.trim();
  }
};
