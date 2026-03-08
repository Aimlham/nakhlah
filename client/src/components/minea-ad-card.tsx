import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, Heart, Play, ExternalLink, Bookmark, MoreVertical,
  Calendar, CircleDot, BarChart3, Copy,
} from "lucide-react";
import { formatCompactNumber, getPlatformColor, daysSince, formatDateShort, truncateUrl, cn } from "@/lib/utils";

export interface EnrichedAd {
  id: string;
  productId: string;
  platform: string;
  niche: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  publishedAt: string | null;
  createdAt: string | null;
  productTitle: string;
  productCategory: string;
  productNiche: string;
}

interface MineaAdCardProps {
  ad: EnrichedAd;
  adCountForProduct?: number;
  totalViewsForProduct?: number;
}

export function MineaAdCard({ ad, adCountForProduct, totalViewsForProduct }: MineaAdCardProps) {
  const publishDate = ad.publishedAt || ad.createdAt;
  const activeDays = publishDate ? daysSince(publishDate) : 0;

  return (
    <Card
      className="group transition-all duration-200 hover:shadow-md border-border/60 bg-card"
      data-testid={`card-minea-ad-${ad.id}`}
    >
      <CardContent className="p-0">
        <div className="p-3 pb-2 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {ad.thumbnailUrl ? (
                  <img src={ad.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/products/${ad.productId}`}>
                  <p className="text-sm font-semibold truncate cursor-pointer" data-testid={`text-minea-product-${ad.id}`}>
                    {ad.productTitle}
                  </p>
                </Link>
                <p className="text-[11px] text-muted-foreground">
                  {adCountForProduct !== undefined && (
                    <span>{adCountForProduct} إعلانات نشطة</span>
                  )}
                  {totalViewsForProduct !== undefined && (
                    <span> / {formatCompactNumber(totalViewsForProduct)}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <CircleDot className="w-3.5 h-3.5 text-emerald-500" />
              <Heart className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
              <Bookmark className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" data-testid={`button-bookmark-ad-${ad.id}`} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 font-medium">
              {activeDays} يوم نشط
            </Badge>
            {publishDate && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDateShort(publishDate)} → اليوم
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <Badge className={cn("text-[10px] px-2 py-0.5 border-0", getPlatformColor(ad.platform))} data-testid={`badge-minea-platform-${ad.id}`}>
              {ad.platform}
            </Badge>
            <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-minea-views-${ad.id}`}>
              <Eye className="w-3 h-3" /> {formatCompactNumber(ad.views || 0)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-minea-likes-${ad.id}`}>
              <Heart className="w-3 h-3" /> {formatCompactNumber(ad.likes || 0)}
            </span>
            {(ad.niche || ad.productNiche) && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {ad.niche || ad.productNiche}
              </Badge>
            )}
          </div>
        </div>

        <div
          className="relative mx-3 rounded-lg overflow-hidden bg-muted cursor-pointer aspect-[4/5]"
          onClick={() => window.open(ad.videoUrl, "_blank")}
        >
          {ad.thumbnailUrl ? (
            <img
              src={ad.thumbnailUrl}
              alt={ad.productTitle}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <Play className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
              <Play className="w-5 h-5 text-white ms-0.5" fill="white" />
            </div>
          </div>
        </div>

        <div className="p-3 pt-2.5 space-y-2.5">
          <a
            href={ad.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-muted-foreground group/link"
            data-testid={`link-minea-adurl-${ad.id}`}
          >
            <span className="text-[10px] text-muted-foreground/70 shrink-0">رابط الإعلان</span>
            <span className="truncate">{truncateUrl(ad.videoUrl)}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>

          <div className="flex items-center gap-2 border-t border-border/50 pt-2.5">
            <Button variant="outline" size="sm" className="flex-1 text-xs" asChild data-testid={`button-minea-analyze-${ad.id}`}>
              <Link href={`/products/${ad.productId}`}>
                تحليل الإعلان
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(ad.videoUrl);
                }
              }}
              data-testid={`button-minea-copy-${ad.id}`}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" data-testid={`button-minea-more-${ad.id}`}>
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
