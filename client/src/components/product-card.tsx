import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkCheck, Package, Flame, Star, ShoppingCart, Store, ImageIcon } from "lucide-react";
import { type Product } from "@shared/schema";
import { cn, formatMoney, formatMargin, getCategoryGradient } from "@/lib/utils";
import { hasImage } from "@/lib/category-image";
import { ScoreBadge } from "./score-badge";

interface ProductCardProps {
  product: Product;
  isSaved?: boolean;
  onToggleSave?: (productId: string) => void;
  savePending?: boolean;
}

function getSourceLabel(source: string | null): string {
  if (!source) return "";
  const map: Record<string, string> = {
    aliexpress: "AliExpress",
    amazon: "Amazon",
  };
  return map[source.toLowerCase()] || source;
}

export function ProductCard({ product, isSaved, onToggleSave, savePending }: ProductCardProps) {
  const isHighOpportunity = (product.opportunityScore || 0) >= 80;

  return (
    <Card
      className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50"
      data-testid={`card-product-${product.id}`}
    >
      <CardContent className="p-0">
        <div className={cn(
          "relative h-44 rounded-t-lg bg-gradient-to-br flex items-center justify-center overflow-hidden",
          getCategoryGradient(product.category)
        )}>
          {hasImage(product.imageUrl) ? (
            <img
              src={product.imageUrl as string}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute top-2 end-2">
            <ScoreBadge label="التقييم" score={product.opportunityScore} />
          </div>
          {isHighOpportunity && (
            <div className="absolute top-2 start-2" data-testid={`badge-trending-${product.id}`}>
              <div className="inline-flex items-center gap-1 rounded-md bg-orange-500 text-white px-2 py-1 text-xs font-medium shadow-sm">
                <Flame className="w-3 h-3" />
                ترند الآن
              </div>
            </div>
          )}
          <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {product.source && (
                <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm" data-testid={`badge-source-${product.id}`}>
                  {getSourceLabel(product.source)}
                </Badge>
              )}
              {!product.source && product.sourcePlatform && (
                <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm">
                  {product.sourcePlatform}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`text-product-title-${product.id}`}>
              {product.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                {product.category}
              </Badge>
              {product.niche && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  {product.niche}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 rounded-lg p-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">المورّد</p>
              <p className="text-sm font-bold tabular-nums">{formatMoney(product.supplierPrice)}</p>
            </div>
            <div className="border-x border-border/50">
              <p className="text-[10px] text-muted-foreground mb-0.5">البيع</p>
              <p className="text-sm font-bold tabular-nums">{formatMoney(product.actualSellPrice || product.suggestedSellPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">الهامش</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatMargin(product.estimatedMargin)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {product.ordersCount != null && product.ordersCount > 0 && (
                <span className="flex items-center gap-0.5" data-testid={`text-orders-${product.id}`}>
                  <ShoppingCart className="w-3 h-3" />
                  {product.ordersCount.toLocaleString()}
                </span>
              )}
              {product.rating != null && (
                <span className="flex items-center gap-0.5" data-testid={`text-rating-${product.id}`}>
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {Number(product.rating).toFixed(1)}
                </span>
              )}
            </div>
            {product.supplierName && (
              <span className="flex items-center gap-0.5 truncate max-w-[100px]" data-testid={`text-supplier-${product.id}`}>
                <Store className="w-3 h-3 shrink-0" />
                {product.supplierName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="default" className="flex-1 h-9 text-xs">
              <Link href={`/products/${product.id}`} data-testid={`link-product-details-${product.id}`}>
                التفاصيل
              </Link>
            </Button>
            <Button
              size="icon"
              variant={isSaved ? "secondary" : "outline"}
              className="h-9 w-9 shrink-0"
              aria-label={isSaved ? "إلغاء الحفظ" : "حفظ المنتج"}
              disabled={savePending}
              onClick={() => onToggleSave?.(product.id)}
              data-testid={`button-save-product-${product.id}`}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
