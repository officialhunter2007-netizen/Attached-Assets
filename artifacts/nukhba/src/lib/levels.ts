export interface LevelTier {
  name: string;
  min: number;
  max: number;
  colorClass: string;
  barClass: string;
}

export const LEVELS: LevelTier[] = [
  { name: "مبتدئ",  min: 0,    max: 100,  colorClass: "text-zinc-300",   barClass: "[&>div]:bg-zinc-400" },
  { name: "متعلم",  min: 100,  max: 300,  colorClass: "text-blue-400",   barClass: "[&>div]:bg-blue-400" },
  { name: "متقدم",  min: 300,  max: 700,  colorClass: "text-gold",       barClass: "[&>div]:bg-gold" },
  { name: "نُخبة",  min: 700,  max: 1500, colorClass: "text-emerald",    barClass: "[&>div]:bg-emerald" },
  { name: "أسطورة", min: 1500, max: Infinity, colorClass: "text-purple-400", barClass: "[&>div]:bg-purple-500" },
];

export interface LevelInfo {
  tier: LevelTier;
  isMaxLevel: boolean;
  /** Progress percentage 0..100 inside the current tier. */
  progress: number;
  /** Lower threshold of the current tier (points >= min). */
  min: number;
  /** Upper threshold of the current tier (points < max for non-max). */
  max: number;
}

/**
 * Resolve the user's tier from their points. Tier boundaries use `>=`
 * so that a user with exactly 100/300/700/1500 points lands in the
 * NEXT tier with progress starting at 0%, instead of being stuck at
 * 100% of the previous one.
 */
export function getLevelInfo(points: number): LevelInfo {
  const safe = Math.max(0, Math.floor(points || 0));
  const tier =
    LEVELS.findLast
      ? LEVELS.findLast(t => safe >= t.min) ?? LEVELS[0]
      : [...LEVELS].reverse().find(t => safe >= t.min) ?? LEVELS[0];
  const isMaxLevel = tier.max === Infinity;
  const span = tier.max - tier.min;
  const progress = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, ((safe - tier.min) / span) * 100));
  return { tier, isMaxLevel, progress, min: tier.min, max: tier.max };
}
