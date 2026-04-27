import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  ShoppingCart,
  TrendingUp,
  Wallet,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import type { SupplierProductWithSupplier } from "@shared/schema";
import { hasImage, pickAvatarColor, getInitial } from "@/lib/category-image";
import type { Listing } from "@shared/schema";

interface ProductDetailPageProps {
  isSubscribed: boolean;
}

interface ProductWithSupplier extends SupplierProductWithSupplier {
  supplier?: Listing | null;
}

export default function ProductDetailPage({ isSubscribed }: ProductDetailPageProps) {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery<ProductWithSupplier>({
    queryKey: ["/api/supplier-products", params.id],
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[]; savedListingIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });
  const isSaved = !!(params.id && savedData?.savedProductIds?.includes(params.id));

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!params.id) return;
      if (isSaved) {
        await apiRequest("DELETE", `/api/saved/${params.id}`);
      } else {
        await apiRequest("POST", `/api/saved/${params.id}`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved"] }),
    onError: (err: any) => {
      toast({
        title: "تعذّر حفظ المنتج",
        description: err?.message?.includes("401") ? "سجّل الدخول أولاً" : "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">لم يتم العثور على هذا المنتج</p>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/products" data-testid="link-back-to-products">
            <ArrowRight className="w-4 h-4 me-2" />
            العودة للمنتجات
          </Link>
        </Button>
      </div>
    );
  }

  const supplier = product.supplier;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ms-2" asChild>
        <Link href="/products" data-testid="link-back-to-products">
          <ArrowRight className="w-4 h-4 me-1" />
          العودة للمنتجات
        </Link>
      </Button>

      <div className="relative w-full max-w-md mx-auto aspect-[4/5] rounded-2xl overflow-hidden bg-muted/50">
        {hasImage(product.imageUrl) ? (
          <img
            src={product.imageUrl as string}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-20 h-20 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold leading-tight flex-1" data-testid="text-product-detail-title">
            {product.title}
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            onClick={() => toggleSave.mutate()}
            disabled={toggleSave.isPending}
            data-testid="button-save-product-detail"
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 me-1.5 text-primary" />
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
          {product.category && (
            <Badge variant="secondary" className="text-sm font-normal px-3 py-1.5 rounded-lg">
              <Tag className="w-3.5 h-3.5 me-1.5 text-primary" />
              {product.category}
            </Badge>
          )}
          {supplier?.supplierCity && (
            <Badge variant="outline" className="text-sm font-normal px-3 py-1.5 rounded-lg border-border/60">
              <MapPin className="w-3.5 h-3.5 me-1.5 text-primary/70" />
              {supplier.supplierCity}
            </Badge>
          )}
          {supplier?.supplierType && (
            <Badge variant="outline" className="text-sm font-normal px-3 py-1.5 rounded-lg border-border/60">
              <Store className="w-3.5 h-3.5 me-1.5 text-primary/70" />
              {supplier.supplierType}
            </Badge>
          )}
        </div>
      </div>

      <PricingSection product={product} />

      {product.description && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">الوصف</h2>
            <p className="text-base leading-loose text-foreground whitespace-pre-wrap" data-testid="text-product-description">
              {product.description}
            </p>
          </CardContent>
        </Card>
      )}

      {supplier && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold">المورد</h2>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg" asChild>
                <Link href={`/suppliers/${supplier.id}`} data-testid="link-to-supplier">
                  عرض صفحة المورد
                  <ChevronLeftIcon />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {hasImage(supplier.imageUrl) ? (
                <img
                  src={supplier.imageUrl as string}
                  alt={supplier.title}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${pickAvatarColor(supplier.id || supplier.title).bg} ${pickAvatarColor(supplier.id || supplier.title).text}`}
                >
                  <span className="text-lg font-bold">{getInitial(supplier.title)}</span>
                </div>
              )}
              <div>
                <p className="font-semibold" data-testid="text-supplier-title">{supplier.title}</p>
                <p className="text-sm text-muted-foreground">
                  {[supplier.supplierType, supplier.supplierCity].filter(Boolean).join(" - ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isSubscribed && supplier ? (
        <Card className="rounded-2xl border-primary/20 bg-gradient-to-b from-primary/[0.03] to-transparent">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold">بيانات التواصل</h2>
            </div>

            <div className="grid gap-4">
              {supplier.supplierName && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">اسم المورد</p>
                    <p className="font-semibold text-base" data-testid="text-supplier-name">{supplier.supplierName}</p>
                  </div>
                </div>
              )}

              {supplier.supplierPhone && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">رقم الهاتف</p>
                    <a
                      href={`tel:${supplier.supplierPhone}`}
                      className="font-semibold text-base text-primary hover:underline"
                      dir="ltr"
                      data-testid="link-supplier-phone"
                    >
                      {supplier.supplierPhone}
                    </a>
                  </div>
                </div>
              )}

              {supplier.supplierWhatsapp && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-chart-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">واتساب</p>
                    <a
                      href={`https://wa.me/${supplier.supplierWhatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-base text-chart-5 hover:underline"
                      dir="ltr"
                      data-testid="link-supplier-whatsapp"
                    >
                      {supplier.supplierWhatsapp}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {supplier.supplierLocation && (
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-primary/30 text-primary font-medium text-base gap-2.5"
                asChild
              >
                <a
                  href={supplier.supplierLocation}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-supplier-location"
                >
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
                <h3 className="font-bold text-lg">فعّل وصولك إلى نخلة برو</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  احصل على وصول كامل لبيانات التواصل مع جميع الموردين
                </p>
              </div>
              <Button size="lg" className="w-full max-w-xs h-12 rounded-xl font-bold text-base" asChild>
                <Link href="/pricing" data-testid="button-subscribe-detail">
                  <Crown className="w-5 h-5 me-2" />
                  احصل عليه الآن - 99 ر.س (دفعة واحدة)
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function fmtPrice(v?: string | null): string | null {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function PricingSection({ product }: { product: ProductWithSupplier }) {
  const unit = fmtPrice(product.supplierPrice);
  const unitNum = product.supplierPrice ? parseFloat(product.supplierPrice) : NaN;
  const manualDozen = fmtPrice(product.dozenPrice);
  const dozen = manualDozen ?? (Number.isFinite(unitNum) ? fmtPrice(String(unitNum * 12)) : null);
  const minQty = product.minimumOrderQuantity;
  if (!unit && !minQty) return null;

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-b from-primary/[0.04] to-transparent" data-testid="card-pricing">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">التسعير</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {unit && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4 space-y-1.5" data-testid="block-price-unit">
              <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium">
                <ShoppingCart className="w-3.5 h-3.5" />
                سعر الحبة
              </div>
              <p className="text-2xl font-bold text-primary">
                {unit} <span className="text-sm font-medium text-primary/70">ر.س / حبة</span>
              </p>
            </div>
          )}
          {dozen && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-1.5" data-testid="block-price-dozen">
              <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium">
                <Package className="w-3.5 h-3.5" />
                سعر الدزينة
              </div>
              <p className="text-2xl font-bold text-primary">
                {dozen} <span className="text-sm font-medium text-primary/70">ر.س / دزينة</span>
              </p>
            </div>
          )}
          {minQty != null && minQty > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-1.5" data-testid="block-price-min-qty">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5" />
                الحد الأدنى للطلب
              </div>
              <p className="text-2xl font-bold text-foreground">
                {minQty} <span className="text-sm font-medium text-muted-foreground">قطعة</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-1">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}
