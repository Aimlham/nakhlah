import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Download,
  TrendingUp,
  Star,
  Truck,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Film,
  PackageMinus,
  Loader2,
  Check,
} from "lucide-react";

type ProductFlag = 0 | 1 | 2 | 3;

interface CJProduct {
  id: string;
  nameEn: string;
  nameAr?: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  listedNum: number;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  description?: string;
  addMarkStatus: number;
  createAt: number;
}

interface CJSearchResult {
  products: CJProduct[];
  totalRecords: number;
  totalPages: number;
  page: number;
}

const flagFilters: { label: string; value: ProductFlag; icon: typeof Flame }[] = [
  { label: "رائجة", value: 0, icon: Flame },
  { label: "جديدة", value: 1, icon: Sparkles },
  { label: "فيديو", value: 2, icon: Film },
  { label: "بطيئة الحركة", value: 3, icon: PackageMinus },
];

const USD_TO_SAR = 3.75;

function formatPrice(price: string) {
  const cleaned = price.replace(/\s+/g, "");
  const match = cleaned.match(/[\d.]+/);
  const usd = match ? parseFloat(match[0]) : 0;
  const sar = usd * USD_TO_SAR;
  return `${sar.toFixed(2)} ر.س`;
}

function CJProductCard({
  product,
  onImport,
  isImporting,
  isImported,
}: {
  product: CJProduct;
  onImport: (p: CJProduct) => void;
  isImporting: boolean;
  isImported: boolean;
}) {
  const extractNum = (p: string) => { const m = p.replace(/\s+/g, "").match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
  const sell = extractNum(product.sellPrice);
  const now = extractNum(product.nowPrice || product.sellPrice);
  const margin = sell > 0 && now < sell
    ? (((sell - now) / sell) * 100).toFixed(0)
    : "0";

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-cj-product-${product.id}`}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.bigImage}
          alt={product.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.addMarkStatus === 1 && (
          <Badge className="absolute top-2 start-2 bg-green-500 text-white text-[10px]">
            <Truck className="w-3 h-3 me-1" />
            شحن مجاني
          </Badge>
        )}
        {product.listedNum > 500 && (
          <Badge className="absolute top-2 end-2 bg-orange-500 text-white text-[10px]">
            <TrendingUp className="w-3 h-3 me-1" />
            شائع
          </Badge>
        )}
      </div>
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium line-clamp-2 leading-relaxed min-h-[2.5rem]" data-testid={`text-cj-title-${product.id}`}>
          {product.nameAr || product.nameEn}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground" dir="ltr">
          {product.oneCategoryName && (
            <span>{product.oneCategoryName}</span>
          )}
          {product.threeCategoryName && (
            <>
              <span>›</span>
              <span>{product.threeCategoryName}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-primary">
              {formatPrice(product.nowPrice || product.sellPrice)}
            </span>
            {product.nowPrice && now < sell && (
              <span className="text-xs line-through text-muted-foreground">
                {formatPrice(product.sellPrice)}
              </span>
            )}
          </div>
          {parseInt(margin) > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              -{margin}%
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{product.listedNum.toLocaleString()} متجر</span>
          </div>
        </div>

        <Button
          variant={isImported ? "secondary" : "default"}
          size="sm"
          className="w-full"
          onClick={() => onImport(product)}
          disabled={isImporting || isImported}
          data-testid={`button-import-${product.id}`}
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 animate-spin me-2" />
          ) : isImported ? (
            <Check className="w-4 h-4 me-2" />
          ) : (
            <Download className="w-4 h-4 me-2" />
          )}
          {isImporting ? "جاري الاستيراد..." : isImported ? "تم الاستيراد" : "استيراد المنتج"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CJProductsPage() {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [activeFlag, setActiveFlag] = useState<ProductFlag>(0);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const queryParams = new URLSearchParams({
    page: String(page),
    size: "20",
    productFlag: String(activeFlag),
  });
  if (searchTerm) queryParams.set("keyword", searchTerm);
  const queryUrl = `/api/cj/search?${queryParams.toString()}`;

  const { data, isLoading, isError, error } = useQuery<CJSearchResult>({
    queryKey: [queryUrl],
    retry: 1,
  });

  const importMutation = useMutation({
    mutationFn: async (product: CJProduct) => {
      const res = await apiRequest("POST", "/api/cj/import", { product });
      return res.json();
    },
    onSuccess: (_data, product) => {
      setImportedIds((prev) => new Set(prev).add(product.id));
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "تم استيراد المنتج",
        description: "تمت ترجمة المنتج وإضافته إلى مكتبتك بنجاح",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "فشل الاستيراد",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const [importingId, setImportingId] = useState<string | null>(null);

  function handleImport(product: CJProduct) {
    setImportingId(product.id);
    importMutation.mutate(product, {
      onSettled: () => setImportingId(null),
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(keyword);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          اكتشاف المنتجات
        </h1>
        <p className="text-muted-foreground mt-1">
          ابحث واستورد المنتجات الرائجة من CJ Dropshipping مباشرة
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="ابحث عن منتج... (بالإنجليزية أو العربية)"
            className="flex-1"
            dir="ltr"
            data-testid="input-cj-search"
          />
          <Button type="submit" data-testid="button-cj-search">
            <Search className="w-4 h-4 me-2" />
            بحث
          </Button>
        </form>
      </div>

      <div className="flex gap-2 flex-wrap">
        {flagFilters.map((f) => (
          <Button
            key={f.value}
            variant={activeFlag === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveFlag(f.value);
              setPage(1);
            }}
            data-testid={`button-flag-${f.value}`}
          >
            <f.icon className="w-4 h-4 me-1" />
            {f.label}
          </Button>
        ))}
      </div>

      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive" data-testid="text-error">
              {(error as Error)?.message || "حدث خطأ أثناء جلب المنتجات"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              تأكد من صلاحية مفتاح CJ API
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid="text-total-results">
              {data.totalRecords.toLocaleString()} منتج
            </span>
            <span>
              صفحة {data.page} من {data.totalPages}
            </span>
          </div>

          {data.products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">لا توجد نتائج</p>
                <p className="text-muted-foreground mt-1">جرب كلمات بحث مختلفة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.products.map((product) => (
                <CJProductCard
                  key={product.id}
                  product={product}
                  onImport={handleImport}
                  isImporting={importingId === product.id}
                  isImported={importedIds.has(product.id)}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronRight className="w-4 h-4 me-1" />
              السابق
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-current-page">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (data.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              التالي
              <ChevronLeft className="w-4 h-4 ms-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
