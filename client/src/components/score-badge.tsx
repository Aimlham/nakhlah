import { cn, getScoreBg } from "@/lib/utils";

interface ScoreBadgeProps {
  label: string;
  score: number | null;
  size?: "sm" | "md";
}

export function ScoreBadge({ label, score, size = "sm" }: ScoreBadgeProps) {
  const displayScore = score ?? 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        getScoreBg(score),
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      )}
      data-testid={`score-badge-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{displayScore}</span>
    </div>
  );
}
