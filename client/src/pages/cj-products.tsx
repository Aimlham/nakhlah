import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
  BarChart3,
  Target,
  DollarSign,
  Users,
  Loader2,
  Sparkles,
  ArrowUpDown,
  ShieldCheck,
  Eye,
  Lightbulb,
  Megaphone,
  X,
  Star,
  ShoppingCart,
} from "lucide-react";
import { cn, parseAiSummary } from "@/lib/utils";

import { HALAL_BLOCKED_KEYWORDS, checkHalalSafeText } from "@shared/halal";

function isProductHalal(product: WinningProduct): boolean {
  return checkHalalSafeText([product.nameEn, product.nameAr || "", product.description || ""].join(" "));
}

interface WinningProduct {
  id: string;
  nameEn: string;
  nameAr?: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  listedNum: number;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  description?: string;
  addMarkStatus: number;
  createAt: number;
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
  totalPages: number;
  page: number;
}

type SortOption = "winning" | "demand" | "profit" | "competition";

const sortOptions: { label: string; value: SortOption; icon: typeof Trophy }[] = [
  { label: "الأكثر ربحاً", value: "winning", icon: Trophy },
  { label: "الأعلى طلباً", value: "demand", icon: TrendingUp },
  { label: "أعلى ربح", value: "profit", icon: DollarSign },
  { label: "أقل منافسة", value: "competition", icon: ShieldCheck },
];

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

function WinningProductCard({
  product,
  onAnalyze,
  rank,
}: {
  product: WinningProduct;
  onAnalyze: (p: WinningProduct) => void;
  rank: number;
}) {
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60" data-testid={`card-winning-${product.id}`}>
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
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg",
            rank <= 3 ? "bg-amber-500 text-white" : "bg-black/60 text-white backdrop-blur-sm"
          )}>
            {rank}
          </div>
        </div>

        <div className="absolute top-2 end-2">
          <div className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg",
            getScoreBg(product.winningScore),
            getScoreColor(product.winningScore)
          )}>
            <Trophy className="w-3 h-3" />
            {product.winningScore}
          </div>
        </div>

        <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
          <Badge className={cn("text-[10px] border-0 shadow-sm", getDemandColor(product.demandLevel))} data-testid={`badge-demand-${product.id}`}>
            <TrendingUp className="w-3 h-3 me-0.5" />
            طلب {product.demandLevel}
          </Badge>
          <Badge className={cn("text-[10px] border-0 shadow-sm", getCompetitionColor(product.competitionLevel))}>
            <Users className="w-3 h-3 me-0.5" />
            منافسة {product.competitionLevel}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3 space-y-2.5">
        <p className="text-sm font-semibold line-clamp-2 leading-relaxed min-h-[2.5rem]" data-testid={`text-winning-title-${product.id}`}>
          {product.nameAr || product.nameEn}
        </p>

        <div className="grid grid-cols-3 gap-1 text-center bg-muted/30 rounded-lg p-2 text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground">التكلفة</p>
            <p className="font-bold tabular-nums">{product.supplierPriceSAR.toFixed(0)} ر.س</p>
          </div>
          <div className="border-x border-border/50">
            <p className="text-[10px] text-muted-foreground">سعر البيع</p>
            <p className="font-bold tabular-nums">{product.suggestedPriceSAR.toFixed(0)} ر.س</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">الربح</p>
            <p className="font-bold text-emerald-500 tabular-nums">{product.estimatedProfitSAR.toFixed(0)} ر.س</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            {product.listedNum.toLocaleString()} طلب
          </span>
          <span className="font-medium text-emerald-500">
            %{product.profitMarginPercent.toFixed(0)} هامش
          </span>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={() => onAnalyze(product)}
          data-testid={`button-analyze-${product.id}`}
        >
          <Eye className="w-4 h-4 me-1" />
          تحليل المنتج
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductAnalysisModal({
  product,
  onClose,
}: {
  product: WinningProduct;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (p: WinningProduct) => {
      const res = await apiRequest("POST", "/api/cj/analyze", { product: p });
      return res.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (p: WinningProduct) => {
      const res = await apiRequest("POST", "/api/cj/import", { product: p });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم الحفظ", description: "تم حفظ المنتج في مكتبتك" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const data = analyzeMutation.data;
  const analysis = data?.aiAnalysis ? parseAiSummary(data.aiAnalysis) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-8" onClick={onClose}>
      <div className="bg-background rounded-xl border shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4 p-5 border-b">
          <img
            src={product.bigImage}
            alt={product.nameAr || product.nameEn}
            className="w-24 h-24 rounded-lg object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight" data-testid="text-analysis-title">
              {product.nameAr || product.nameEn}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={cn("text-xs", getDemandColor(product.demandLevel))}>
                طلب {product.demandLevel}
              </Badge>
              <Badge className={cn("text-xs", getCompetitionColor(product.competitionLevel))}>
                منافسة {product.competitionLevel}
              </Badge>
              <Badge className={cn("text-xs", getScoreBg(product.winningScore), getScoreColor(product.winningScore))}>
                <Trophy className="w-3 h-3 me-1" />
                نقاط الفوز: {product.winningScore}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-analysis">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">التكلفة</p>
              <p className="text-lg font-bold tabular-nums">{product.supplierPriceSAR.toFixed(2)} <span className="text-xs">ر.س</span></p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">سعر البيع المقترح</p>
              <p className="text-lg font-bold tabular-nums">{product.suggestedPriceSAR.toFixed(2)} <span className="text-xs">ر.س</span></p>
            </div>
            <div className="text-center bg-emerald-500/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">الربح المتوقع</p>
              <p className="text-lg font-bold text-emerald-500 tabular-nums">{product.estimatedProfitSAR.toFixed(2)} <span className="text-xs">ر.س</span></p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">هامش الربح</p>
              <p className="text-lg font-bold text-emerald-500 tabular-nums">%{product.profitMarginPercent.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span>{product.listedNum.toLocaleString()} متجر يبيعه حالياً</span>
            </div>
          </div>

          {!analyzeMutation.data && !analyzeMutation.isPending && (
            <Button className="w-full" onClick={() => analyzeMutation.mutate(product)} data-testid="button-run-analysis">
              <Sparkles className="w-4 h-4 me-2" />
              تحليل بالذكاء الاصطناعي — لماذا هذا المنتج رابح؟
            </Button>
          )}

          {analyzeMutation.isPending && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري تحليل المنتج بالذكاء الاصطناعي...</span>
            </div>
          )}

          {analyzeMutation.isError && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-destructive font-medium">فشل تحليل المنتج</p>
                <p className="text-xs text-muted-foreground mt-1">{(analyzeMutation.error as Error)?.message || "حدث خطأ غير متوقع"}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => analyzeMutation.mutate(product)}>
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          )}

          {analysis && (
            <div className="space-y-3">
              <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-primary" />
                    </div>
                    لماذا هذا المنتج رابح؟
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.whyPromising}</p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-gradient-to-l from-blue-500/5 to-transparent">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    الجمهور المستهدف
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.targetAudience}</p>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-3">
                <Card className="border-amber-500/20 bg-gradient-to-l from-amber-500/5 to-transparent">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                      <Megaphone className="w-4 h-4 text-amber-500" />
                      زوايا إعلانية
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.adAngles.map((angle, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                          {angle}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="border-violet-500/20 bg-gradient-to-l from-violet-500/5 to-transparent">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-violet-500" />
                      عبارات تسويقية
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.hooks.map((hook, i) => (
                        <li key={i} className="text-sm text-muted-foreground italic leading-relaxed">
                          &ldquo;{hook}&rdquo;
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => importMutation.mutate(product)}
              disabled={importMutation.isPending || importMutation.isSuccess}
              data-testid="button-import-to-library"
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-1" />
              ) : importMutation.isSuccess ? (
                <ShieldCheck className="w-4 h-4 me-1" />
              ) : (
                <Flame className="w-4 h-4 me-1" />
              )}
              {importMutation.isSuccess ? "تم الحفظ في مكتبتي" : "حفظ في مكتبتي"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CJProductsPage() {
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("winning");
  const [analyzingProduct, setAnalyzingProduct] = useState<WinningProduct | null>(null);
  const [halalOnly, setHalalOnly] = useState(false);

  const queryParams = new URLSearchParams({
    page: String(page),
    size: "20",
    sort,
  });
  if (searchTerm) queryParams.set("keyword", searchTerm);
  const queryUrl = `/api/cj/winning?${queryParams.toString()}`;

  const { data, isLoading, isError, error } = useQuery<WinningResult>({
    queryKey: [queryUrl],
    retry: 1,
  });

  const displayProducts = halalOnly && data?.products
    ? data.products.filter(isProductHalal)
    : data?.products || [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(keyword);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {analyzingProduct && (
        <ProductAnalysisModal
          product={analyzingProduct}
          onClose={() => setAnalyzingProduct(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Trophy className="w-6 h-6 text-amber-500" />
          المنتجات الرابحة
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          أفضل المنتجات مبيعاً مرتبة حسب الطلب والربح والمنافسة
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="ابحث عن منتج رابح..."
            className="flex-1"
            data-testid="input-winning-search"
          />
          <Button type="submit" data-testid="button-winning-search">
            <Search className="w-4 h-4 me-1" />
            بحث
          </Button>
        </form>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
        {sortOptions.map((s) => (
          <Button
            key={s.value}
            variant={sort === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setSort(s.value); setPage(1); }}
            data-testid={`button-sort-${s.value}`}
          >
            <s.icon className="w-4 h-4 me-1" />
            {s.label}
          </Button>
        ))}
        <div className="border-s border-border/50 ps-2 ms-auto">
          <Button
            variant={halalOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setHalalOnly(!halalOnly)}
            className={cn(halalOnly && "bg-emerald-600 hover:bg-emerald-700")}
            data-testid="button-halal-filter"
          >
            <ShieldCheck className="w-4 h-4 me-1" />
            حلال فقط
          </Button>
        </div>
      </div>

      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive" data-testid="text-error">
              {(error as Error)?.message || "حدث خطأ أثناء جلب المنتجات"}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
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
      )}

      {data && !isLoading && (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid="text-total-results">
              {data.totalRecords.toLocaleString()} منتج رابح
            </span>
            <span>
              صفحة {data.page} من {data.totalPages}
            </span>
          </div>

          {displayProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">لا توجد نتائج</p>
                <p className="text-muted-foreground mt-1">جرب كلمات بحث مختلفة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayProducts.map((product, index) => (
                <WinningProductCard
                  key={product.id}
                  product={product}
                  onAnalyze={setAnalyzingProduct}
                  rank={(page - 1) * 20 + index + 1}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronRight className="w-4 h-4 me-1" />
              السابق
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-current-page">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (data.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              التالي
              <ChevronLeft className="w-4 h-4 ms-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
