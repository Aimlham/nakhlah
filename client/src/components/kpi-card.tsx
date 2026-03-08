import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
  iconColor?: string;
  iconBg?: string;
}

export function KpiCard({ title, value, icon: Icon, description, trend, className, iconColor, iconBg }: KpiCardProps) {
  return (
    <Card className={cn("border-border/50 bg-card/80 backdrop-blur-sm", className)} data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            iconBg || "bg-primary/10"
          )}>
            <Icon className={cn("w-5 h-5", iconColor || "text-primary")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">{trend}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
