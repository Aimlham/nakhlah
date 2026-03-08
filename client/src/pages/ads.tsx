import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, Search, Megaphone, Play, SlidersHorizontal,
  Flame, Sparkles, Star, TrendingUp,
  ChevronDown, ChevronUp, LayoutGrid, LayoutList,
  Calendar as CalendarIcon, Clock, BarChart3, Tag,
} from "lucide-react";
import { formatCompactNumber, cn } from "@/lib/utils";
import { MineaAdCard, type EnrichedAd } from "@/components/minea-ad-card";

export default function AdsPage() {
  const [search, setSearch] = useState("");
  const [platformTab, setPlatformTab] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [minViews, setMinViews] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [durationFilter, setDurationFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const { data: adsData, isLoading } = useQuery<EnrichedAd[]>({
    queryKey: ["/api/ads"],
  });

  const allAds = adsData || [];

  const niches = useMemo(() => {
    const nicheSet = new Set<string>();
    allAds.forEach(ad => {
      if (ad.niche) nicheSet.add(ad.niche);
      if (ad.productNiche) nicheSet.add(ad.productNiche);
    });
    return [...nicheSet];
  }, [allAds]);

  const platforms = useMemo(() => {
    return [...new Set(allAds.map(a => a.platform).filter(Boolean))];
  }, [allAds]);

  const adCountByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    allAds.forEach(ad => {
      map[ad.productId] = (map[ad.productId] || 0) + 1;
    });
    return map;
  }, [allAds]);

  const viewsByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    allAds.forEach(ad => {
      map[ad.productId] = (map[ad.productId] || 0) + (ad.views || 0);
    });
    return map;
  }, [allAds]);

  const filtered = useMemo(() => {
    let result = [...allAds];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(ad =>
        ad.productTitle.toLowerCase().includes(s) ||
        ad.platform.toLowerCase().includes(s) ||
        (ad.niche || "").toLowerCase().includes(s) ||
        (ad.productNiche || "").toLowerCase().includes(s)
      );
    }

    if (platformTab !== "all") {
      result = result.filter(ad => ad.platform === platformTab);
    }

    if (selectedNiche) {
      result = result.filter(ad => ad.niche === selectedNiche || ad.productNiche === selectedNiche);
    }

    if (minViews) {
      const min = parseInt(minViews);
      result = result.filter(ad => (ad.views || 0) >= min);
    }

    if (durationFilter) {
      const now = new Date();
      result = result.filter(ad => {
        const pubDate = ad.publishedAt || ad.createdAt;
        if (!pubDate) return false;
        const days = Math.floor((now.getTime() - new Date(pubDate).getTime()) / (1000 * 60 * 60 * 24));
        if (durationFilter === "lt7") return days < 7;
        if (durationFilter === "7to30") return days >= 7 && days <= 30;
        if (durationFilter === "gt30") return days > 30;
        return true;
      });
    }

    if (dateFilter) {
      const now = new Date();
      result = result.filter(ad => {
        const pubDate = ad.publishedAt || ad.createdAt;
        if (!pubDate) return false;
        const days = Math.floor((now.getTime() - new Date(pubDate).getTime()) / (1000 * 60 * 60 * 24));
        if (dateFilter === "today") return days === 0;
        if (dateFilter === "7days") return days <= 7;
        if (dateFilter === "30days") return days <= 30;
        return true;
      });
    }

    if (sortBy === "views") result.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sortBy === "likes") result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sortBy === "date") result.sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime());

    return result;
  }, [allAds, search, platformTab, selectedNiche, minViews, durationFilter, dateFilter, sortBy]);

  const totalViews = filtered.reduce((sum, ad) => sum + (ad.views || 0), 0);

  const quickFilters = [
    { label: "الأكثر رواجاً", icon: Flame, color: "text-orange-500 bg-orange-500/10" },
    { label: "فائزة الأسبوع", icon: Star, color: "text-amber-500 bg-amber-500/10" },
    { label: "جاهز للتوسع", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "رواد السوق", icon: Sparkles, color: "text-violet-500 bg-violet-500/10" },
  ];

  const viewsFilters = [
    { label: "الكل", value: null },
    { label: "100K+", value: "100000" },
    { label: "500K+", value: "500000" },
    { label: "1M+", value: "1000000" },
    { label: "5M+", value: "5000000" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-10 rounded-lg" />
        <div className="flex gap-6">
          <Skeleton className="w-56 h-[600px] rounded-lg hidden lg:block" />
          <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[420px] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Play className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-ads-title">
              تصفح الإعلانات
            </h1>
            <p className="text-xs text-muted-foreground">
              اكتشف المنتجات الرابحة من خلال تصفح إعلانات Meta و TikTok على المنصات
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Tabs value={platformTab} onValueChange={setPlatformTab}>
          <TabsList className="bg-muted/50" data-testid="tabs-ads-platform">
            <TabsTrigger value="all" className="gap-1.5 text-sm" data-testid="tab-all">
              <Megaphone className="w-3.5 h-3.5" />
              الكل
            </TabsTrigger>
            {platforms.map(p => (
              <TabsTrigger key={p} value={p} className="gap-1.5 text-sm" data-testid={`tab-${p.toLowerCase()}`}>
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-muted/50 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">{filtered.length}</span>
            إعلان
          </span>
          <span className="bg-muted/50 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">{formatCompactNumber(totalViews)}</span>
            مشاهدة
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ابحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-ads"
          />
        </div>
        <div className="flex items-center gap-1.5 border rounded-lg p-0.5">
          <Button
            variant={sortBy === "date" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs gap-1"
            onClick={() => setSortBy("date")}
            data-testid="sort-date"
          >
            تاريخ النشر
          </Button>
          <Button
            variant={sortBy === "views" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs gap-1"
            onClick={() => setSortBy("views")}
            data-testid="sort-views"
          >
            المشاهدات
          </Button>
          <Button
            variant={sortBy === "likes" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs gap-1"
            onClick={() => setSortBy("likes")}
            data-testid="sort-likes"
          >
            الإعجابات
          </Button>
        </div>
        <div className="flex items-center gap-0.5 border rounded-lg p-0.5">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="view-grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="view-list"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {quickFilters.map(tag => (
          <Badge
            key={tag.label}
            variant="outline"
            className="text-xs px-3 py-1.5 shrink-0 gap-1.5"
            data-testid={`filter-quick-${tag.label}`}
          >
            <tag.icon className={cn("w-3.5 h-3.5", tag.color.split(" ")[0])} />
            {tag.label}
          </Badge>
        ))}
        <div className="ms-auto text-xs text-muted-foreground shrink-0">
          عرض إعلان واحد لكل صفحة
        </div>
      </div>

      <div className="flex gap-6">
        <aside className={cn(
          "w-56 shrink-0 hidden lg:block space-y-1 transition-all",
          !showFilters && "lg:hidden"
        )}>
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              الفلاتر
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>

          <FilterSection title="المشاهدات" icon={Eye}>
            <div className="space-y-1">
              {viewsFilters.map(f => (
                <button
                  key={f.label}
                  onClick={() => setMinViews(f.value)}
                  className={cn(
                    "w-full text-start text-xs px-2.5 py-1.5 rounded-md transition-colors",
                    minViews === f.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  data-testid={`filter-views-${f.label}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="التخصص" icon={Tag}>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedNiche(null)}
                className={cn(
                  "w-full text-start text-xs px-2.5 py-1.5 rounded-md transition-colors",
                  selectedNiche === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                data-testid="filter-niche-all"
              >
                جميع التخصصات
              </button>
              {niches.map(n => (
                <button
                  key={n}
                  onClick={() => setSelectedNiche(n === selectedNiche ? null : n)}
                  className={cn(
                    "w-full text-start text-xs px-2.5 py-1.5 rounded-md transition-colors",
                    selectedNiche === n
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  data-testid={`filter-niche-${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="مدة التشغيل" icon={Clock}>
            <div className="space-y-1">
              {[
                { label: "الكل", value: null },
                { label: "أقل من 7 أيام", value: "lt7" },
                { label: "7-30 يوم", value: "7to30" },
                { label: "أكثر من 30 يوم", value: "gt30" },
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => setDurationFilter(f.value)}
                  className={cn(
                    "w-full text-start text-xs px-2.5 py-1.5 rounded-md transition-colors",
                    durationFilter === f.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                  data-testid={`filter-duration-${f.label}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="تاريخ النشر" icon={CalendarIcon}>
            <div className="space-y-1">
              {[
                { label: "اليوم", value: "today" },
                { label: "آخر 7 أيام", value: "7days" },
                { label: "آخر 30 يوم", value: "30days" },
                { label: "الكل", value: null },
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => setDateFilter(f.value)}
                  className={cn(
                    "w-full text-start text-xs px-2.5 py-1.5 rounded-md transition-colors",
                    dateFilter === f.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                  data-testid={`filter-pubdate-${f.label}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </FilterSection>
        </aside>

        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">لم يتم العثور على إعلانات</p>
              <p className="text-xs text-muted-foreground mt-1">حاول تعديل الفلاتر أو البحث</p>
            </div>
          ) : (
            <div className={cn(
              "gap-4",
              viewMode === "grid"
                ? "grid sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col"
            )} data-testid="grid-ads">
              {filtered.map(ad => (
                <MineaAdCard
                  key={ad.id}
                  ad={ad}
                  adCountForProduct={adCountByProduct[ad.productId]}
                  totalViewsForProduct={viewsByProduct[ad.productId]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, icon: Icon, children }: { title: string; icon: typeof Eye; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-border/30 pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-xs font-semibold text-foreground hover:text-primary transition-colors"
        data-testid={`filter-section-${title}`}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          {title}
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
