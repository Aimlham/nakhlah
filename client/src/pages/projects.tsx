import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import {
  FolderOpen,
  Search,
  Lock,
  MapPin,
  Tag,
  Phone,
  ExternalLink,
  MessageCircle,
  User,
  ImageIcon,
} from "lucide-react";
import type { Listing } from "@shared/schema";

interface ProjectsPageProps {
  isSubscribed: boolean;
}

export default function ProjectsPage({ isSubscribed }: ProjectsPageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("all");

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const categories = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.category).filter(Boolean))] as string[];
  }, [listings]);

  const cities = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.supplierCity).filter(Boolean))] as string[];
  }, [listings]);

  const filtered = useMemo(() => {
    let result = listings || [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q) ||
          (l.category || "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") result = result.filter((l) => l.category === category);
    if (city !== "all") result = result.filter((l) => l.supplierCity === city);

    return result;
  }, [listings, search, category, city]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-projects-title">
            المشاريع
          </h1>
        </div>
        <p className="text-muted-foreground mt-1">
          اكتشف موردين ومشاريع محلية جاهزة للتعاون
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مشروع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]" data-testid="select-category">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع التصنيفات</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[160px]" data-testid="select-city">
            <SelectValue placeholder="المدينة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المدن</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-projects-count">
        {filtered.length} مشروع متاح
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="لا توجد مشاريع حالياً"
          description="سيتم إضافة مشاريع جديدة قريباً"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isSubscribed={isSubscribed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  isSubscribed,
}: {
  listing: Listing;
  isSubscribed: boolean;
}) {
  return (
    <Card
      className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 overflow-hidden"
      data-testid={`card-listing-${listing.id}`}
    >
      <CardContent className="p-0">
        <div className="relative h-44 rounded-t-lg bg-muted flex items-center justify-center overflow-hidden">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {listing.category && (
            <div className="absolute bottom-2 start-2">
              <Badge
                variant="secondary"
                className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm"
              >
                <Tag className="w-3 h-3 me-1" />
                {listing.category}
              </Badge>
            </div>
          )}

          {listing.supplierCity && (
            <div className="absolute bottom-2 end-2">
              <Badge
                variant="secondary"
                className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm"
              >
                <MapPin className="w-3 h-3 me-1" />
                {listing.supplierCity}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3
            className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]"
            data-testid={`text-listing-title-${listing.id}`}
          >
            {listing.title}
          </h3>

          {listing.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
          )}

          {listing.supplierType && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>{listing.supplierType}</span>
            </div>
          )}

          {isSubscribed ? (
            <div className="space-y-2 border-t border-border/50 pt-3">
              {listing.supplierName && (
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium" data-testid={`text-supplier-name-${listing.id}`}>{listing.supplierName}</span>
                </div>
              )}
              {listing.supplierPhone && (
                <a
                  href={`tel:${listing.supplierPhone}`}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  data-testid={`link-supplier-phone-${listing.id}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  {listing.supplierPhone}
                </a>
              )}
              {listing.supplierWhatsapp && (
                <a
                  href={`https://wa.me/${listing.supplierWhatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline"
                  data-testid={`link-supplier-whatsapp-${listing.id}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  واتساب
                </a>
              )}
              {listing.supplierLink && (
                <a
                  href={listing.supplierLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  data-testid={`link-supplier-link-${listing.id}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  رابط المورد
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  بيانات المورد مخفية
                </div>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/pricing" data-testid={`button-subscribe-${listing.id}`}>
                    اشترك لعرض بيانات المورد
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
