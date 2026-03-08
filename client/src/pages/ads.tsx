import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Eye, Heart, Play, Calendar, Search, Megaphone, ExternalLink,
  SlidersHorizontal, ArrowUpDown, BarChart3, TrendingUp,
} from "lucide-react";
import { formatCompactNumber, getPlatformColor, timeSince, cn } from "@/lib/utils";

interface EnrichedAd {
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

export default function AdsPage() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [niche, setNiche] = useState("all");
  const [minViews, setMinViews] = useState("all");
  const [sortBy, setSortBy] = useState("views");

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (platform !== "all") queryParams.set("platform", platform);
  if (niche !== "all") queryParams.set("niche", niche);
  if (minViews !== "all") queryParams.set("minViews", minViews);
  const queryString = queryParams.toString();
  const adsUrl = queryString ? `/api/ads?${queryString}` : "/api/ads";

  const { data: ads, isLoading } = useQuery<EnrichedAd[]>({
    queryKey: [adsUrl],
  });

  const { data: allAdsUnfiltered } = useQuery<EnrichedAd[]>({
    queryKey: ["/api/ads"],
  });

  const allAds = ads || [];

  const niches = useMemo(() => {
    const all = allAdsUnfiltered || [];
    const adNiches = all.map(a => a.niche).filter(Boolean) as string[];
    const productNiches = all.map(a => a.productNiche).filter(Boolean);
    return [...new Set([...adNiches, ...productNiches])];
  }, [allAdsUnfiltered]);

  const platforms = useMemo(() => {
    return [...new Set((allAdsUnfiltered || []).map(a => a.platform).filter(Boolean))];
  }, [allAdsUnfiltered]);

  const filtered = useMemo(() => {
    const sorted = [...allAds];
    if (sortBy === "views") sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sortBy === "likes") sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sortBy === "date") sorted.sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime());
    return sorted;
  }, [allAds, sortBy]);

  const totalViews = allAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const totalLikes = allAds.reduce((sum, ad) => sum + (ad.likes || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-l from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/10 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-ads-title">
              <Megaphone className="w-6 h-6 text-pink-500" />
              مكتبة الإعلانات
            </h1>
            <p className="text-muted-foreground mt-1">اكتشف أفضل إعلانات المنتجات على المنصات المختلفة</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                <BarChart3 className="w-4 h-4" />
                <span className="font-semibold text-foreground">{filtered.length}</span>
                <span>إعلان</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                <Eye className="w-4 h-4" />
                <span className="font-semibold text-foreground">{formatCompactNumber(totalViews)}</span>
                <span>مشاهدة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن إعلانات حسب المنتج أو التخصص..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
                data-testid="input-search-ads"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-[130px]" data-testid="select-ads-platform">
                  <SelectValue placeholder="المنصة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المنصات</SelectItem>
                  {platforms.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="w-[140px]" data-testid="select-ads-niche">
                  <SelectValue placeholder="التخصص" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التخصصات</SelectItem>
                  {niches.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={minViews} onValueChange={setMinViews}>
                <SelectTrigger className="w-[140px]" data-testid="select-ads-views">
                  <SelectValue placeholder="المشاهدات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المشاهدات</SelectItem>
                  <SelectItem value="100000">100K+</SelectItem>
                  <SelectItem value="500000">500K+</SelectItem>
                  <SelectItem value="1000000">1M+</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]" data-testid="select-ads-sort">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                  <SelectItem value="likes">الأكثر إعجاباً</SelectItem>
                  <SelectItem value="date">الأحدث</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="لم يتم العثور على إعلانات"
          description="حاول تعديل الفلاتر أو البحث للعثور على إعلانات."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(ad => (
            <AdLibraryCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdLibraryCard({ ad }: { ad: EnrichedAd }) {
  const displayDate = ad.publishedAt || ad.createdAt;

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50" data-testid={`ad-library-card-${ad.id}`}>
      <CardContent className="p-0">
        <div className="relative h-52 rounded-t-lg overflow-hidden bg-muted cursor-pointer" onClick={() => window.open(ad.videoUrl, "_blank")}>
          {ad.thumbnailUrl ? (
            <img
              src={ad.thumbnailUrl}
              alt={ad.productTitle}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Play className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <Play className="w-6 h-6 text-black ms-0.5" />
            </div>
          </div>
          <div className="absolute top-2 start-2">
            <Badge className={cn("text-[10px] shadow-sm", getPlatformColor(ad.platform))} data-testid={`badge-ad-platform-${ad.id}`}>
              {ad.platform}
            </Badge>
          </div>
          <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" data-testid={`text-ad-views-${ad.id}`}>
                <Eye className="w-3.5 h-3.5" /> {formatCompactNumber(ad.views || 0)}
              </span>
              <span className="flex items-center gap-1" data-testid={`text-ad-likes-${ad.id}`}>
                <Heart className="w-3.5 h-3.5" /> {formatCompactNumber(ad.likes || 0)}
              </span>
            </div>
            {displayDate && (
              <span className="flex items-center gap-1 text-white/80" data-testid={`text-ad-date-${ad.id}`}>
                <Calendar className="w-3 h-3" />
                {timeSince(displayDate)}
              </span>
            )}
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          <Link href={`/products/${ad.productId}`}>
            <p className="text-sm font-semibold truncate hover:text-primary transition-colors cursor-pointer" data-testid={`text-ad-product-${ad.id}`}>
              {ad.productTitle}
            </p>
          </Link>
          {(ad.niche || ad.productNiche) && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              {ad.niche || ad.productNiche}
            </Badge>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="default" size="sm" className="flex-1 h-8 text-xs" asChild data-testid={`button-open-ad-${ad.id}`}>
              <a href={ad.videoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                فتح الإعلان
              </a>
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/products/${ad.productId}`} data-testid={`button-analyze-ad-${ad.id}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                تحليل
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
