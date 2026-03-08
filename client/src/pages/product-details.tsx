import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, Bookmark, BookmarkCheck, ExternalLink, Package,
  TrendingUp, BarChart3, Target, Users, Megaphone, Lightbulb,
  Eye, Heart, Play, Calendar, Flame, Activity,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { formatMoney, formatMargin, formatCompactNumber, getCategoryGradient, parseAiSummary, cn, getScoreBg } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductAd } from "@shared/schema";

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-md" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
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
            "relative h-56 md:h-72 rounded-md bg-gradient-to-br flex items-center justify-center overflow-hidden",
            getCategoryGradient(product.category)
          )}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover rounded-md" />
            ) : (
              <Package className="w-16 h-16 text-white/40" />
            )}
            {isHighOpportunity && (
              <div className="absolute top-3 start-3">
                <div className="inline-flex items-center gap-1 rounded-md bg-orange-500 text-white px-2.5 py-1.5 text-sm font-medium">
                  <Flame className="w-4 h-4" />
                  ترند الآن
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-product-detail-title">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">{product.category}</Badge>
                  {product.niche && (
                    <Badge variant="outline">{product.niche}</Badge>
                  )}
                  {product.sourcePlatform && (
                    <span className="text-sm text-muted-foreground">{product.sourcePlatform}</span>
                  )}
                </div>
              </div>
            </div>
            {product.shortDescription && (
              <p className="text-muted-foreground mt-3">{product.shortDescription}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">الرواج</p>
                <p className={cn("text-xl font-bold", getScoreBg(product.trendScore).includes("emerald") ? "text-emerald-600" : getScoreBg(product.trendScore).includes("amber") ? "text-amber-600" : "")}>
                  {product.trendScore || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-xs text-muted-foreground">التشبّع</p>
                <p className="text-xl font-bold">{product.saturationScore || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-xs text-muted-foreground">الفرصة</p>
                <p className="text-xl font-bold text-emerald-600">{product.opportunityScore || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-xs text-muted-foreground">الطلب المتوقع</p>
                <p className="text-xl font-bold text-blue-600">
                  {(product.trendScore || 0) >= 80 ? "عالي" : (product.trendScore || 0) >= 60 ? "متوسط" : "منخفض"}
                </p>
              </CardContent>
            </Card>
          </div>

          {analysis && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                تحليل الذكاء الاصطناعي
              </h2>

              <Card className="border-primary/20 bg-primary/5">
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

              <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    الجمهور المستهدف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.targetAudience}</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    زوايا إعلانية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.adAngles.map((angle, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-center font-medium mt-0.5">
                          {i + 1}
                        </span>
                        {angle}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
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
          )}

          {productAds.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <SiTiktok className="w-5 h-5" />
                إعلانات المنتج على TikTok
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productAds.map(ad => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </div>
          )}

          {productAds.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                فيديوهات المنتج
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {productAds.slice(0, 4).map(ad => (
                  <a key={ad.id} href={ad.videoUrl} target="_blank" rel="noopener noreferrer" className="block" data-testid={`link-video-${ad.id}`}>
                    <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                      <CardContent className="p-0">
                        <div className="relative h-40 rounded-t-md overflow-hidden bg-muted">
                          {ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt="Video" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-black ms-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatCompactNumber(ad.views || 0)}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatCompactNumber(ad.likes || 0)}</span>
                          <Badge variant="outline" className="text-xs">{ad.platform}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">تفاصيل التسعير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">سعر المورّد</span>
                <span className="font-semibold">{formatMoney(product.supplierPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">سعر البيع المقترح</span>
                <span className="font-semibold">{formatMoney(product.suggestedSellPrice)}</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">هامش الربح المتوقع</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                  {formatMargin(product.estimatedMargin)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {product.supplierLink && (
              <Button variant="outline" className="w-full" asChild>
                <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" data-testid="link-supplier">
                  <ExternalLink className="w-4 h-4" />
                  زيارة المورّد
                </a>
              </Button>
            )}
            <Button
              className="w-full"
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
        </div>
      </div>
    </div>
  );
}

function AdCard({ ad }: { ad: ProductAd }) {
  return (
    <a href={ad.videoUrl} target="_blank" rel="noopener noreferrer" className="block" data-testid={`ad-card-${ad.id}`}>
      <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-0">
          <div className="relative h-48 rounded-t-md overflow-hidden bg-muted">
            {ad.thumbnailUrl ? (
              <img src={ad.thumbnailUrl} alt="Ad" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-black ms-0.5" />
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1" data-testid={`text-ad-views-${ad.id}`}><Eye className="w-3.5 h-3.5" /> {formatCompactNumber(ad.views || 0)}</span>
              <span className="flex items-center gap-1" data-testid={`text-ad-likes-${ad.id}`}><Heart className="w-3.5 h-3.5" /> {formatCompactNumber(ad.likes || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs" data-testid={`badge-ad-platform-${ad.id}`}>{ad.platform}</Badge>
              {ad.createdAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(ad.createdAt).toLocaleDateString("ar-SA")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
