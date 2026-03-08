import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkCheck, Package } from "lucide-react";
import { type Product } from "@shared/schema";
import { cn, formatMoney, formatMargin, getCategoryGradient } from "@/lib/utils";
import { ScoreBadge } from "./score-badge";

interface ProductCardProps {
  product: Product;
  isSaved?: boolean;
  onToggleSave?: (productId: string) => void;
  savePending?: boolean;
}

export function ProductCard({ product, isSaved, onToggleSave, savePending }: ProductCardProps) {
  return (
    <Card className="hover-elevate group" data-testid={`card-product-${product.id}`}>
      <CardContent className="p-0">
        <div className={cn(
          "relative h-40 rounded-t-md bg-gradient-to-br flex items-center justify-center",
          getCategoryGradient(product.category)
        )}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover rounded-t-md"
            />
          ) : (
            <Package className="w-10 h-10 text-white/60" />
          )}
          <div className="absolute top-2 right-2">
            <ScoreBadge label="التقييم" score={product.opportunityScore} />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`text-product-title-${product.id}`}>
              {product.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-xs no-default-active-elevate">
                {product.category}
              </Badge>
              {product.sourcePlatform && (
                <span className="text-xs text-muted-foreground">{product.sourcePlatform}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">المورّد</p>
              <p className="text-sm font-semibold">{formatMoney(product.supplierPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">سعر البيع</p>
              <p className="text-sm font-semibold">{formatMoney(product.suggestedSellPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الهامش</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMargin(product.estimatedMargin)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="default" className="flex-1">
              <Link href={`/products/${product.id}`} data-testid={`link-product-details-${product.id}`}>
                التفاصيل
              </Link>
            </Button>
            <Button
              size="icon"
              variant={isSaved ? "secondary" : "outline"}
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
