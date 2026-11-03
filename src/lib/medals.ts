// Đọc dòng thành tích chữ tự do ("HCV giải Kudo 2024", "1 vàng, 1 bạc, 1 đồng…", "Đai đen Kudo…")
// để tô màu huy chương. Không import gì: test chạy thẳng bằng node (tests/).

export type Tier = 'gold' | 'silver' | 'bronze';
export type Kind = 'medal' | 'title' | 'belt' | 'other';
export type Achievement = { kind: Kind; medals: Record<Tier, number> };

// "vàng/bạc/đồng" đứng một mình dễ nhầm ("đai vàng", "đồng bằng") → chỉ tính khi có số đứng trước.
const PATTERNS: Record<Tier, RegExp[]> = {
  gold: [/(\d+)?\s*\bHCV\b/giu, /(\d+)?\s*huy chương vàng/giu, /(\d+)\s*vàng(?![\p{L}])/giu, /(\d+)?\s*\bgold\b/giu],
  silver: [/(\d+)?\s*\bHCB\b/giu, /(\d+)?\s*huy chương bạc/giu, /(\d+)\s*bạc(?![\p{L}])/giu, /(\d+)?\s*\bsilver\b/giu],
  bronze: [/(\d+)?\s*HCĐ(?![\p{L}])/giu, /(\d+)?\s*huy chương đồng/giu, /(\d+)\s*đồng(?![\p{L}])/giu, /(\d+)?\s*\bbronze\b/giu],
};

export function classify(line: string): Achievement {
  const medals = { gold: 0, silver: 0, bronze: 0 };
  for (const tier of Object.keys(PATTERNS) as Tier[]) {
    for (const re of PATTERNS[tier]) for (const m of line.matchAll(re)) medals[tier] += Number(m[1] ?? 1);
  }
  const kind: Kind = medals.gold + medals.silver + medals.bronze > 0 ? 'medal'
    : /vô địch|champion|danh hiệu|giải nhất|hạng nhất|quán quân|\btop\s*\d/iu.test(line) ? 'title'
    : /(?<!\p{L})đai(?!\p{L})|\bbelt\b/iu.test(line) ? 'belt' // \b không hiểu chữ có dấu
    : 'other';
  return { kind, medals };
}

// Màu đai theo chữ trong dòng ("Đai tím BJJ" → tím). Không rõ màu → null (icon dùng màu chữ).
const BELTS: [RegExp, string][] = [
  [/đen|black/iu, '#0a0a0a'], [/tím|purple/iu, '#6b2fb3'], [/nâu|brown/iu, '#6b3e1f'], [/xanh lá|green/iu, '#1e8f3a'],
  [/xanh dương|xanh biển|blue/iu, '#1e4fd8'], [/vàng|yellow/iu, '#f2c200'], [/trắng|white/iu, '#f5f5f5'],
];
export const beltColor = (line: string) => BELTS.find(([re]) => re.test(line))?.[1] ?? null;

/** Cộng huy chương của nhiều dòng (dải "2 vàng · 3 bạc · 1 đồng" trên thẻ HLV). */
export function tally(lines: string[]) {
  const total = { gold: 0, silver: 0, bronze: 0 };
  for (const l of lines) {
    const { medals } = classify(l);
    total.gold += medals.gold; total.silver += medals.silver; total.bronze += medals.bronze;
  }
  return total;
}
