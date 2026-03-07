import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number | string | null): string {
  if (amount === null || amount === undefined) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toFixed(2)}`;
}

export function formatMargin(margin: number | string | null): string {
  if (margin === null || margin === undefined) return "0%";
  const num = typeof margin === "string" ? parseFloat(margin) : margin;
  return `${num.toFixed(1)}%`;
}

export function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export function getScoreBg(score: number | null): string {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300";
  if (score >= 60) return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
  return "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300";
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
  };
  return gradients[category] || "from-slate-400 to-slate-500";
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
