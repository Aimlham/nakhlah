import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const USD_TO_SAR = 3.75;

export function formatMoney(amount: number | string | null): string {
  if (amount === null || amount === undefined) return "٠ ر.س";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const sar = num * USD_TO_SAR;
  return `${sar.toFixed(2)} ر.س`;
}

export function formatMargin(margin: number | string | null): string {
  if (margin === null || margin === undefined) return "0%";
  const num = typeof margin === "string" ? parseFloat(margin) : margin;
  return `${num.toFixed(1)}%`;
}

export function formatCompactNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export function getScoreBg(score: number | null): string {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300";
  if (score >= 60) return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
  return "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300";
}

export function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export function getCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    "Home & Living": "from-orange-400 to-rose-400",
    "Kitchen": "from-emerald-400 to-teal-400",
    "Home Decor": "from-violet-400 to-purple-400",
    "Electronics": "from-blue-400 to-cyan-400",
    "Health & Wellness": "from-green-400 to-emerald-400",
    "Beauty": "from-pink-400 to-rose-400",
    "Pet Supplies": "from-amber-400 to-orange-400",
    "Travel": "from-sky-400 to-indigo-400",
    "المنزل والمعيشة": "from-orange-400 to-rose-400",
    "المطبخ": "from-emerald-400 to-teal-400",
    "ديكور المنزل": "from-violet-400 to-purple-400",
    "إلكترونيات": "from-blue-400 to-cyan-400",
    "الصحة والعافية": "from-green-400 to-emerald-400",
    "الجمال": "from-pink-400 to-rose-400",
    "مستلزمات الحيوانات": "from-amber-400 to-orange-400",
    "السفر": "from-sky-400 to-indigo-400",
  };
  return gradients[category] || "from-slate-400 to-slate-500";
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    "TikTok": "bg-black text-white dark:bg-white dark:text-black",
    "Facebook": "bg-blue-600 text-white",
    "Instagram": "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    "YouTube": "bg-red-600 text-white",
  };
  return colors[platform] || "bg-muted text-muted-foreground";
}

export function timeSince(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  return `منذ ${Math.floor(diffDays / 30)} أشهر`;
}

export function daysSince(date: string | Date): number {
  const d = new Date(date);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function truncateUrl(url: string, maxLen: number = 40): string {
  try {
    const u = new URL(url);
    const path = u.hostname + u.pathname;
    return path.length > maxLen ? path.slice(0, maxLen) + "..." : path;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "..." : url;
  }
}

export interface AIAnalysis {
  whyPromising: string;
  targetAudience: string;
  adAngles: string[];
  hooks: string[];
}

export function parseAiSummary(summary: string | null): AIAnalysis | null {
  if (!summary) return null;
  try {
    return JSON.parse(summary) as AIAnalysis;
  } catch {
    return null;
  }
}
