import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Eye, Heart, Play, Calendar, Search, Megaphone } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";

interface EnrichedAd {
  id: string;
  productId: string;
  platform: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
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

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (platform !== "all") queryParams.set("platform", platform);
  if (niche !== "all") queryParams.set("niche", niche);
  if (minViews !== "all") queryParams.set("minViews", minViews);
  const queryString = queryParams.toString();
  const adsUrl = queryString ? `/api/ads?${queryString}` : "/api/ads";

  const { data: ads, isLoading } = useQuery<EnrichedAd[]>({
    queryKey: ["/api/ads", search, platform, niche, minViews],
    queryFn: () => fetch(adsUrl).then(r => r.json()),
  });

  const { data: allAdsUnfiltered } = useQuery<EnrichedAd[]>({
    queryKey: ["/api/ads"],
  });

  const allAds = ads || [];

  const niches = useMemo(() => {
    return [...new Set((allAdsUnfiltered || []).map(a => a.productNiche).filter(Boolean))];
  }, [allAdsUnfiltered]);

  const platforms = useMemo(() => {
    return [...new Set((allAdsUnfiltered || []).map(a => a.platform).filter(Boolean))];
  }, [allAdsUnfiltered]);

  const filtered = useMemo(() => {
    return [...allAds].sort((a, b) => (b.views || 0) - (a.views || 0));
  }, [allAds]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-72 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-ads-title">الإعلانات</h1>
        <p className="text-muted-foreground">اكتشف أفضل إعلانات المنتجات على المنصات المختلفة.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ابحث عن إعلانات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-ads"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="sm:w-[150px]" data-testid="select-ads-platform">
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
            <SelectTrigger className="sm:w-[150px]" data-testid="select-ads-niche">
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
            <SelectTrigger className="sm:w-[160px]" data-testid="select-ads-views">
              <SelectValue placeholder="المشاهدات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المشاهدات</SelectItem>
              <SelectItem value="100000">100K+</SelectItem>
              <SelectItem value="500000">500K+</SelectItem>
              <SelectItem value="1000000">1M+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-ads-count">
        {filtered.length} إعلان
      </p>

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
  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1" data-testid={`ad-library-card-${ad.id}`}>
      <CardContent className="p-0">
        <a href={ad.videoUrl} target="_blank" rel="noopener noreferrer" className="block">
          <div className="relative h-48 rounded-t-md overflow-hidden bg-muted">
            {ad.thumbnailUrl ? (
              <img
                src={ad.thumbnailUrl}
                alt={ad.productTitle}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-black ms-0.5" />
              </div>
            </div>
          </div>
        </a>

        <div className="p-3 space-y-2">
          <Link href={`/products/${ad.productId}`}>
            <p className="text-sm font-medium truncate hover:text-primary transition-colors cursor-pointer" data-testid={`text-ad-product-${ad.id}`}>
              {ad.productTitle}
            </p>
          </Link>
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
  );
}
