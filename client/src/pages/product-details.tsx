import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Package,
  TrendingUp, BarChart3, Target, Users, Megaphone, Lightbulb,
} from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";
import { formatMoney, formatMargin, getCategoryGradient, parseAiSummary, cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

export default function ProductDetailsPage() {
  const [, params] = useRoute("/products/:id");
  const productId = params?.id;
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const analysis = parseAiSummary(product.aiSummary);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/products" data-testid="link-back-products">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Products
        </Link>
      </Button>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className={cn(
            "h-56 md:h-72 rounded-md bg-gradient-to-br flex items-center justify-center",
            getCategoryGradient(product.category)
          )}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover rounded-md" />
            ) : (
              <Package className="w-16 h-16 text-white/40" />
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-product-detail-title">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="no-default-active-elevate">{product.category}</Badge>
                  {product.niche && (
                    <Badge variant="outline" className="no-default-active-elevate">{product.niche}</Badge>
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

          {analysis && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                AI Analysis
              </h2>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Why This Product is Promising
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{analysis.whyPromising}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{analysis.targetAudience}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    Ad Angles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.adAngles.map((angle, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                          {i + 1}
                        </span>
                        {angle}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Hook Ideas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.hooks.map((hook, i) => (
                      <li key={i} className="text-sm text-muted-foreground italic">
                        "{hook}"
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">Trend</p>
                <p className="text-xl font-bold">{product.trendScore || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-xs text-muted-foreground">Saturation</p>
                <p className="text-xl font-bold">{product.saturationScore || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Opportunity</p>
                <p className="text-xl font-bold">{product.opportunityScore || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pricing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Supplier Price</span>
                <span className="font-semibold">{formatMoney(product.supplierPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Suggested Sell Price</span>
                <span className="font-semibold">{formatMoney(product.suggestedSellPrice)}</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Estimated Margin</span>
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
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Supplier
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
                  <BookmarkCheck className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save Product
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
