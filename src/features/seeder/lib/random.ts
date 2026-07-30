// Deterministic pseudo-random helpers so demo data is reproducible.
export function makeRng(seed = 20260101) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const int = (r: Rng, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
export const float = (r: Rng, min: number, max: number, dp = 1) =>
  Number((r() * (max - min) + min).toFixed(dp));
export const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
export const pickMany = <T,>(r: Rng, arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  return out;
};
export const chance = (r: Rng, p: number) => r() < p;

export const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
export const iso = (d: Date) => d.toISOString();
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const monthStart = (monthsBack: number) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  return d;
};