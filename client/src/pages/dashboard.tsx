import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  ArrowLeft,
  Loader2,
  Flame,
  ShieldCheck,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface WinningProduct {
  id: string;
  nameEn: string;
  nameAr?: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  listedNum: number;
  winningScore: number;
  demandLevel: string;
  competitionLevel: string;
  profitMarginPercent: number;
  supplierPriceSAR: number;
  suggestedPriceSAR: number;
  estimatedProfitSAR: number;
}

interface WinningResult {
  products: WinningProduct[];
  totalRecords: number;
}

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

function getDemandColor(level: string) {
  if (level === "عالي") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (level === "متوسط") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
}

function getCompetitionColor(level: string) {
  if (level === "منخفضة") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (level === "متوسطة") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: winningData, isLoading } = useQuery<WinningResult>({
    queryKey: ["/api/cj/winning?page=1&size=6&sort=winning"],
  });

  const products = winningData?.products || [];

  const avgProfit = products.length > 0
    ? (products.reduce((sum, p) => sum + p.estimatedProfitSAR, 0) / products.length).toFixed(0)
    : "0";

  const avgMargin = products.length > 0
    ? (products.reduce((sum, p) => sum + p.profitMarginPercent, 0) / products.length).toFixed(0)
    : "0";

  const highDemandCount = products.filter(p => p.demandLevel === "عالي").length;
  const topScore = products.length > 0 ? Math.max(...products.map(p => p.winningScore)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-greeting">
          مرحباً{user?.fullName ? ` ${user.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">إليك أفضل المنتجات الرابحة اليوم</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">أعلى نقاط فوز</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-top-score">{topScore}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط الربح</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-avg-profit">{avgProfit} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط الهامش</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-avg-margin">%{avgMargin}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">طلب عالي</p>
              <p className="text-xl font-bold tabular-nums" data-testid="text-high-demand">{highDemandCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">أفضل المنتجات الرابحة اليوم</h2>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/discover" data-testid="link-view-all-winning">
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
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">لا توجد منتجات رابحة حالياً</p>
            <p className="text-sm text-muted-foreground mt-1">جرب البحث في صفحة المنتجات الرابحة</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/discover">ابحث عن منتجات</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="grid-winning-products">
          {products.map((product, index) => (
            <Link key={product.id} href="/discover" data-testid={`card-dashboard-winning-${product.id}`}>
              <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60 cursor-pointer h-full">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.bigImage}
                    alt={product.nameAr || product.nameEn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
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
                      getScoreBg(product.winningScore),
                      getScoreColor(product.winningScore)
                    )}>
                      <Trophy className="w-3 h-3" />
                      {product.winningScore}
                    </div>
                  </div>

                  <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
                    <Badge className={cn("text-[10px] border-0 shadow-sm", getDemandColor(product.demandLevel))}>
                      <TrendingUp className="w-3 h-3 me-0.5" />
                      {product.demandLevel}
                    </Badge>
                    <Badge className={cn("text-[10px] border-0 shadow-sm", getCompetitionColor(product.competitionLevel))}>
                      <ShieldCheck className="w-3 h-3 me-0.5" />
                      {product.competitionLevel}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-semibold line-clamp-2 leading-relaxed min-h-[2.5rem]" data-testid={`text-dashboard-product-${product.id}`}>
                    {product.nameAr || product.nameEn}
                  </p>

                  <div className="grid grid-cols-3 gap-1 text-center bg-muted/30 rounded-lg p-2 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground">التكلفة</p>
                      <p className="font-bold tabular-nums">{product.supplierPriceSAR.toFixed(0)} ر.س</p>
                    </div>
                    <div className="border-x border-border/50">
                      <p className="text-[10px] text-muted-foreground">البيع</p>
                      <p className="font-bold tabular-nums">{product.suggestedPriceSAR.toFixed(0)} ر.س</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">الربح</p>
                      <p className="font-bold text-emerald-500 tabular-nums">{product.estimatedProfitSAR.toFixed(0)} ر.س</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
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
              <p className="font-semibold text-sm">اكتشف المزيد من المنتجات الرابحة</p>
              <p className="text-xs text-muted-foreground mt-0.5">ابحث وحلل المنتجات بالذكاء الاصطناعي</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/discover" data-testid="link-discover-cta">
              ابدأ البحث
              <ArrowLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
