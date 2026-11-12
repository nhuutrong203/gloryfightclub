// Parse medals and belts from free-form achievement text.
// Keep the parser dependency-free for Node tests.

export type Tier = 'gold' | 'silver' | 'bronze';
export type Kind = 'medal' | 'title' | 'belt' | 'other';
export type Achievement = { kind: Kind; medals: Record<Tier, number> };

// Require a number before a standalone medal color to avoid matching unrelated words.
const PATTERNS: Record<Tier, RegExp[]> = {
  gold: [/(\d+)?\s*\bHCV\b/giu, /(\d+)\s*vàng(?![\p{L}])/giu, /(\d+)?\s*\bgold\b/giu],
  silver: [/(\d+)?\s*\bHCB\b/giu, /(\d+)\s*bạc(?![\p{L}])/giu, /(\d+)?\s*\bsilver\b/giu],
  bronze: [/(\d+)?\s*HCĐ(?![\p{L}])/giu, /(\d+)\s*đồng(?![\p{L}])/giu, /(\d+)?\s*\bbronze\b/giu],
};
const TIER_WORD: Record<string, Tier> = { 'vàng': 'gold', 'bạc': 'silver', 'đồng': 'bronze' };
// Medal lists can include several ranks. A count applies only to a single rank.
const MEDAL_LIST = /(\d+)?\s*huy chương\s+((?:vàng|bạc|đồng)(?:\s*(?:,|và|&|\/)\s*(?:vàng|bạc|đồng))*)(?![\p{L}])/giu;

export function classify(line: string): Achievement {
  const medals = { gold: 0, silver: 0, bronze: 0 };
  for (const tier of Object.keys(PATTERNS) as Tier[]) {
    for (const re of PATTERNS[tier]) for (const m of line.matchAll(re)) medals[tier] += Number(m[1] ?? 1);
  }
  for (const m of line.matchAll(MEDAL_LIST)) {
    const tiers = m[2].toLowerCase().match(/vàng|bạc|đồng/gu)!.map((w) => TIER_WORD[w]);
    for (const t of tiers) medals[t] += tiers.length === 1 ? Number(m[1] ?? 1) : 1;
  }
  const kind: Kind = medals.gold + medals.silver + medals.bronze > 0 ? 'medal'
    : /vô địch|champion|danh hiệu|giải nhất|hạng nhất|quán quân|\btop\s*\d/iu.test(line) ? 'title'
    : /(?<!\p{L})đai(?!\p{L})|\bbelt\b/iu.test(line) ? 'belt' // Use Unicode letter boundaries for accented text.
    : 'other';
  return { kind, medals };
}

// Fall back to the current text color when a belt color is unknown.
const BELTS: [RegExp, string][] = [
  [/đen|black/iu, '#0a0a0a'], [/tím|purple/iu, '#6b2fb3'], [/nâu|brown/iu, '#6b3e1f'], [/xanh lá|green/iu, '#1e8f3a'],
  [/xanh dương|xanh biển|blue/iu, '#1e4fd8'], [/vàng|yellow/iu, '#f2c200'], [/trắng|white/iu, '#f5f5f5'],
];
export const beltColor = (line: string) => BELTS.find(([re]) => re.test(line))?.[1] ?? null;

/** Sum medals across achievement lines for the coach card. */
export function tally(lines: string[]) {
  const total = { gold: 0, silver: 0, bronze: 0 };
  for (const l of lines) {
    const { medals } = classify(l);
    total.gold += medals.gold; total.silver += medals.silver; total.bronze += medals.bronze;
  }
  return total;
}

const words = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const yearIn = (s: string) => s.match(/\b(19|20)\d{2}\b/)?.[0];

/** Append linked awards that the coach's written achievements do not already cover.
 *  A duplicate has matching normalized title words and the same stated year.
 *  An award with the same title in a different year is a separate achievement.
 *  Ignore the date field because manually entered dates can differ from the event year. */
export function extraAwards<T>(textLines: string[], rows: T[], info: (r: T) => { title: string; event?: string | null }): T[] {
  const lines = textLines.map((l) => new Set(words(l)));
  return rows.filter((r) => {
    const { title, event } = info(r);
    const w = words(title);
    const y = yearIn(`${title} ${event ?? ''}`);
    const dup = lines.some((l) => w.length > 0 && w.every((x) => l.has(x)) && (!y || l.has(y)));
    if (!dup) lines.push(new Set(words(`${title} ${y ?? ""}`))); // Deduplicate identical linked awards as well.
    return !dup;
  });
}
