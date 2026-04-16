import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp,
  BarChart3,
  ArrowLeft,
  Sparkles,
  FolderOpen,
  Target,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Product } from "@shared/schema";

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-500";
  if (score >= 55) return "text-amber-500";
  return "text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 75) return "bg-emerald-500/10";
  if (score >= 55) return "bg-amber-500/10";
  return "bg-red-500/10";
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/projects"],
  });

  const topProjects = (projects || []).slice(0, 6);
  const totalProjects = projects?.length || 0;
  const avgMargin = totalProjects > 0
    ? (projects!.reduce((sum, p) => sum + parseFloat(p.estimatedMargin || "0"), 0) / totalProjects).toFixed(0)
    : "0";
  const topScore = topProjects.length > 0 ? Math.max(...topProjects.map(p => p.opportunityScore || 0)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-greeting">
          {user?.fullName ? `${user.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">إليك أفضل الفرص المتاحة اليوم</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">أعلى تقييم فرصة</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-top-score">{topScore}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط الهامش</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-avg-margin">{avgMargin}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">مشاريع متاحة</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-total-projects">{totalProjects}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">أفضل المشاريع</h2>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/projects" data-testid="link-view-all-projects">
            عرض الكل
            <ArrowLeft className="w-4 h-4 ms-1" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : topProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">لا توجد مشاريع حالياً</p>
            <p className="text-sm text-muted-foreground mt-1">سيتم إضافة مشاريع جديدة قريباً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="grid-top-projects">
          {topProjects.map((product, index) => (
            <Card
              key={product.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60 h-full"
              data-testid={`card-dashboard-project-${product.id}`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                <div className="absolute top-2 start-2">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg",
                    index < 3 ? "bg-amber-500 text-white" : "bg-black/60 text-white backdrop-blur-sm"
                  )}>
                    {index + 1}
                  </div>
                </div>

                <div className="absolute top-2 end-2">
                  <div className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold shadow-lg",
                    getScoreBg(product.opportunityScore || 0),
                    getScoreColor(product.opportunityScore || 0)
                  )}>
                    <Star className="w-3 h-3" />
                    {product.opportunityScore || 0}
                  </div>
                </div>

                <div className="absolute bottom-2 start-2">
                  {product.category && (
                    <Badge className="text-[10px] border-0 shadow-sm bg-white/20 text-white backdrop-blur-sm">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-semibold line-clamp-2 leading-relaxed min-h-[2.5rem]">
                  {product.title}
                </p>

                <div className="grid grid-cols-2 gap-1 text-center bg-muted/30 rounded-lg p-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">سعر البيع</p>
                    <p className="font-bold tabular-nums">{parseFloat(product.suggestedSellPrice || "0").toFixed(0)} ر.س</p>
                  </div>
                  <div className="border-s border-border/50">
                    <p className="text-[10px] text-muted-foreground">الهامش</p>
                    <p className="font-bold text-emerald-500 tabular-nums">{parseFloat(product.estimatedMargin || "0").toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">اكتشف المزيد من المشاريع</p>
              <p className="text-xs text-muted-foreground mt-0.5">تصفح جميع الفرص المتاحة</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/projects" data-testid="link-discover-cta">
              تصفح المشاريع
              <ArrowLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
