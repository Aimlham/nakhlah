import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  MapPin,
  Tag,
  User,
  Phone,
  MessageCircle,
  MapPinned,
  Lock,
  ImageIcon,
  Store,
  Crown,
  ExternalLink,
  Package,
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import type { Listing, SupplierProduct } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SupplierDetailPageProps {
  isSubscribed: boolean;
}

interface ListingWithProducts extends Listing {
  products?: SupplierProduct[];
}

export default function SupplierDetailPage({ isSubscribed }: SupplierDetailPageProps) {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: listing, isLoading, error } = useQuery<ListingWithProducts>({
    queryKey: ["/api/listings", params.id],
  });

  const { data: savedData } = useQuery<{ savedListingIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });
  const isSaved = !!(params.id && savedData?.savedListingIds?.includes(params.id));

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!params.id) return;
      if (isSaved) {
        await apiRequest("DELETE", `/api/saved/listings/${params.id}`);
      } else {
        await apiRequest("POST", `/api/saved/listings/${params.id}`);
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
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
          <Store className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">لم يتم العثور على هذا المورد</p>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/suppliers" data-testid="link-back-to-suppliers">
            <ArrowRight className="w-4 h-4 me-2" />
            العودة للموردين
          </Link>
        </Button>
      </div>
    );
  }

  const products = listing.products || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ms-2" asChild>
        <Link href="/suppliers" data-testid="link-back-to-suppliers">
          <ArrowRight className="w-4 h-4 me-1" />
          العودة للموردين
        </Link>
      </Button>

      <div className="relative w-full max-w-md mx-auto aspect-[4/5] rounded-2xl overflow-hidden bg-muted/50">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/80">
            <Store className="w-20 h-20 text-muted-foreground/20" />
          </div>
        )}
        <button
          type="button"
          onClick={() => toggleSave.mutate()}
          disabled={toggleSave.isPending}
          aria-label={isSaved ? "إلغاء الحفظ" : "حفظ المورد"}
          className="absolute top-3 end-3 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-md hover:bg-background hover:scale-110 transition-all disabled:opacity-50"
          data-testid="button-save-supplier-detail"
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-primary" />
          ) : (
            <Bookmark className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight flex-1" data-testid="text-supplier-detail-title">
            {listing.title}
          </h1>
          <Button
            variant={isSaved ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleSave.mutate()}
            disabled={toggleSave.isPending}
            className="rounded-xl shrink-0"
            data-testid="button-save-supplier-inline"
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 me-1.5" />
                محفوظ
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 me-1.5" />
                حفظ
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {listing.supplierType && (
            <Badge variant="secondary" className="text-sm font-normal px-3 py-1.5 rounded-lg">
              <Store className="w-3.5 h-3.5 me-1.5 text-primary" />
              {listing.supplierType}
            </Badge>
          )}
          {listing.supplierCity && (
            <Badge variant="outline" className="text-sm font-normal px-3 py-1.5 rounded-lg border-border/60">
              <MapPin className="w-3.5 h-3.5 me-1.5 text-primary/70" />
              {listing.supplierCity}
            </Badge>
          )}
          {listing.category && (
            <Badge variant="outline" className="text-sm font-normal px-3 py-1.5 rounded-lg border-border/60">
              <Tag className="w-3.5 h-3.5 me-1.5 text-primary/70" />
              {listing.category}
            </Badge>
          )}
        </div>
      </div>

      {listing.description && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">عن المورد</h2>
            <p className="text-base leading-loose text-foreground whitespace-pre-wrap" data-testid="text-supplier-description">
              {listing.description}
            </p>
          </CardContent>
        </Card>
      )}

      {isSubscribed ? (
        <Card className="rounded-2xl border-primary/20 bg-gradient-to-b from-primary/[0.03] to-transparent">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold">بيانات التواصل</h2>
            </div>

            <div className="grid gap-4">
              {listing.supplierName && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">اسم المورد</p>
                    <p className="font-semibold text-base" data-testid="text-contact-name">{listing.supplierName}</p>
                  </div>
                </div>
              )}

              {listing.supplierPhone && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">رقم الهاتف</p>
                    <a href={`tel:${listing.supplierPhone}`} className="font-semibold text-base text-primary hover:underline" dir="ltr" data-testid="link-contact-phone">
                      {listing.supplierPhone}
                    </a>
                  </div>
                </div>
              )}

              {listing.supplierWhatsapp && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-chart-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">واتساب</p>
                    <a href={`https://wa.me/${listing.supplierWhatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-base text-chart-5 hover:underline" dir="ltr" data-testid="link-contact-whatsapp">
                      {listing.supplierWhatsapp}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {listing.supplierLocation && (
              <Button variant="outline" className="w-full h-12 rounded-xl border-primary/30 text-primary font-medium text-base gap-2.5" asChild>
                <a href={listing.supplierLocation} target="_blank" rel="noopener noreferrer" data-testid="link-contact-location">
                  <MapPinned className="w-5 h-5" />
                  عرض الموقع على الخريطة
                  <ExternalLink className="w-4 h-4 opacity-60" />
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-bold">بيانات التواصل</h2>
              </div>
              <div className="grid gap-3">
                {["اسم المورد", "رقم الهاتف", "واتساب", "موقع المورد"].map((label) => (
                  <div key={label} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Lock className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <div className="h-5 w-28 rounded-md bg-muted-foreground/10 blur-[6px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-t from-primary/[0.06] to-primary/[0.02] border-t border-border/40 p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-lg">اشترك في نخلة برو</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  احصل على وصول كامل لبيانات التواصل مع جميع الموردين
                </p>
              </div>
              <Button size="lg" className="w-full max-w-xs h-12 rounded-xl font-bold text-base" asChild>
                <Link href="/pricing" data-testid="button-subscribe-supplier">
                  <Crown className="w-5 h-5 me-2" />
                  اشترك الآن - 99 ر.س/شهرياً
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">منتجات هذا المورد</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {products.map((p) => (
              <Card key={p.id} className="rounded-xl border-border/50 overflow-hidden" data-testid={`card-supplier-product-${p.id}`}>
                <CardContent className="p-0">
                  <div className="flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      )}
                      {p.category && (
                        <Badge variant="secondary" className="text-xs">
                          {p.category}
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="self-center flex-shrink-0" asChild>
                      <Link href={`/products/${p.id}`}>
                        <ChevronLeft className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
