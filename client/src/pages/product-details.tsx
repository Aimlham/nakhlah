import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, Bookmark, BookmarkCheck, ExternalLink, Package,
  TrendingUp, BarChart3, Target, Users, Megaphone, Lightbulb,
  Eye, Heart, Play, Calendar, Flame, Activity, DollarSign,
  Sparkles, RefreshCw, Loader2, ImageIcon,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { formatMoney, formatMargin, formatCompactNumber, getCategoryGradient, getPlatformColor, parseAiSummary, timeSince, cn, getScoreBg, getScoreColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductAd } from "@shared/schema";
import { hasImage } from "@/lib/category-image";

export default function ProductDetailsPage() {
  const [, params] = useRoute("/products/:id");
  const productId = params?.id;
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
  });

  const { data: ads } = useQuery<ProductAd[]>({
    queryKey: ["/api/products", productId, "ads"],
    enabled: !!productId,
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });

  const savedIds = new Set(savedData?.savedProductIds || []);
  const isSaved = productId ? savedIds.has(productId) : false;

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!productId) return;
      if (isSaved) {
        await apiRequest("DELETE", `/api/saved/${productId}`);
      } else {
        await apiRequest("POST", `/api/saved/${productId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const generateAnalysis = useMutation({
    mutationFn: async () => {
      if (!productId) return;
      const res = await apiRequest("POST", `/api/products/${productId}/analyze`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId] });
      toast({ title: "تم التحليل", description: "تم توليد تحليل الذكاء الاصطناعي بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في التحليل", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">المنتج غير موجود.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/products">العودة للمنتجات</Link>
        </Button>
      </div>
    );
  }

  const analysis = parseAiSummary(product.aiSummary);
  const isHighOpportunity = (product.opportunityScore || 0) >= 80;
  const productAds = ads || [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/products" data-testid="link-back-products">
          <ArrowRight className="w-4 h-4" />
          العودة للمنتجات
        </Link>
      </Button>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className={cn(
            "relative h-56 md:h-72 rounded-xl bg-gradient-to-br flex items-center justify-center overflow-hidden",
            getCategoryGradient(product.category)
          )}>
            {hasImage(product.imageUrl) ? (
              <img
                src={product.imageUrl as string}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-white/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {isHighOpportunity && (
              <div className="absolute top-3 start-3">
                <div className="inline-flex items-center gap-1 rounded-lg bg-orange-500 text-white px-3 py-1.5 text-sm font-medium shadow-lg">
                  <Flame className="w-4 h-4" />
                  ترند الآن
                </div>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-product-detail-title">
              {product.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{product.category}</Badge>
              {product.niche && <Badge variant="outline">{product.niche}</Badge>}
              {product.sourcePlatform && (
                <Badge variant="outline" className="text-muted-foreground">{product.sourcePlatform}</Badge>
              )}
            </div>
            {product.shortDescription && (
              <p className="text-muted-foreground mt-3 leading-relaxed">{product.shortDescription}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ScoreMetric
              icon={TrendingUp}
              label="الرواج"
              value={product.trendScore || 0}
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <ScoreMetric
              icon={BarChart3}
              label="التشبّع"
              value={product.saturationScore || 0}
              iconColor="text-amber-500"
              bgColor="bg-amber-500/10"
            />
            <ScoreMetric
              icon={Target}
              label="الفرصة"
              value={product.opportunityScore || 0}
              iconColor="text-emerald-500"
              bgColor="bg-emerald-500/10"
              highlight
            />
            <ScoreMetric
              icon={Activity}
              label="الطلب المتوقع"
              value={
                (product.trendScore || 0) >= 80 ? "عالي" :
                (product.trendScore || 0) >= 60 ? "متوسط" : "منخفض"
              }
              iconColor="text-violet-500"
              bgColor="bg-violet-500/10"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                تحليل الذكاء الاصطناعي
              </h2>
              <Button
                variant={analysis ? "outline" : "default"}
                size="sm"
                onClick={() => generateAnalysis.mutate()}
                disabled={generateAnalysis.isPending}
                data-testid="button-generate-analysis"
              >
                {generateAnalysis.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحليل...
                  </>
                ) : analysis ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    إعادة التحليل
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    توليد التحليل بالذكاء الاصطناعي
                  </>
                )}
              </Button>
            </div>

            {!analysis && !generateAnalysis.isPending && (
              <Card className="border-dashed border-2 border-muted-foreground/20">
                <CardContent className="p-8 text-center space-y-3">
                  <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    اضغط على زر "توليد التحليل" للحصول على تحليل شامل من الذكاء الاصطناعي يتضمن أسباب نجاح المنتج والجمهور المستهدف وأفكار إعلانية.
                  </p>
                </CardContent>
              </Card>
            )}

            {analysis && (
              <>
                <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      لماذا هذا المنتج واعد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.whyPromising}</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-gradient-to-l from-blue-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      الجمهور المستهدف
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.targetAudience}</p>
                  </CardContent>
                </Card>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border-amber-500/20 bg-gradient-to-l from-amber-500/5 to-transparent">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-amber-500" />
                        </div>
                        زوايا إعلانية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.adAngles.map((angle, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-xs flex items-center justify-center font-bold mt-0.5">
                              {i + 1}
                            </span>
                            {angle}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-violet-500/20 bg-gradient-to-l from-violet-500/5 to-transparent">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-violet-500" />
                        </div>
                        عبارات تسويقية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.hooks.map((hook, i) => (
                          <li key={i} className="text-sm text-muted-foreground italic leading-relaxed">
                            &ldquo;{hook}&rdquo;
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>

          {productAds.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <SiTiktok className="w-4 h-4 text-pink-500" />
                </div>
                إعلانات المنتج
                <Badge variant="secondary" className="text-xs">{productAds.length}</Badge>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productAds.map(ad => (
                  <DetailAdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 sticky top-4">
            <CardContent className="p-5 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold">تفاصيل التسعير</h3>
                </div>
                <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">سعر المورّد</span>
                    <span className="font-bold tabular-nums">{formatMoney(product.supplierPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">سعر البيع المقترح</span>
                    <span className="font-bold tabular-nums">{formatMoney(product.suggestedSellPrice)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">هامش الربح المتوقع</span>
                    <span className="font-bold text-emerald-500 text-xl tabular-nums">
                      {formatMargin(product.estimatedMargin)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {product.supplierLink && (
                  <Button variant="default" size="default" className="w-full bg-red-500 hover:bg-red-600" asChild>
                    <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" data-testid="link-supplier">
                      <ExternalLink className="w-4 h-4" />
                      عرض على AliExpress
                    </a>
                  </Button>
                )}
                <Button
                  className="w-full"
                  size="default"
                  variant={isSaved ? "secondary" : "default"}
                  onClick={() => toggleSave.mutate()}
                  disabled={toggleSave.isPending}
                  data-testid="button-save-product"
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      تم الحفظ
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      حفظ المنتج
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScoreMetric({ icon: Icon, label, value, iconColor, bgColor, highlight }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  iconColor: string;
  bgColor: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("border-border/50", highlight && "ring-1 ring-emerald-500/30")}>
      <CardContent className="p-4 text-center space-y-1.5">
        <div className={cn("w-10 h-10 rounded-lg mx-auto flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn(
          "text-xl font-bold",
          highlight && typeof value === 'number' && value >= 80 && "text-emerald-500"
        )}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailAdCard({ ad }: { ad: ProductAd }) {
  const displayDate = ad.publishedAt || ad.createdAt;

  return (
    <a href={ad.videoUrl} target="_blank" rel="noopener noreferrer" className="block" data-testid={`ad-card-${ad.id}`}>
      <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50">
        <CardContent className="p-0">
          <div className="relative h-48 rounded-t-lg overflow-hidden bg-muted">
            {ad.thumbnailUrl ? (
              <img src={ad.thumbnailUrl} alt="Ad" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                <Play className="w-5 h-5 text-black ms-0.5" />
              </div>
            </div>
            <div className="absolute top-2 start-2">
              <Badge className={cn("text-[10px] shadow-sm", getPlatformColor(ad.platform))} data-testid={`badge-ad-platform-${ad.id}`}>
                {ad.platform}
              </Badge>
            </div>
            <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1" data-testid={`text-ad-views-${ad.id}`}><Eye className="w-3.5 h-3.5" /> {formatCompactNumber(ad.views || 0)}</span>
                <span className="flex items-center gap-1" data-testid={`text-ad-likes-${ad.id}`}><Heart className="w-3.5 h-3.5" /> {formatCompactNumber(ad.likes || 0)}</span>
              </div>
              {displayDate && (
                <span className="text-white/80 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {timeSince(displayDate as string)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
