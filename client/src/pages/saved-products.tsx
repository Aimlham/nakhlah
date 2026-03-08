import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bookmark } from "lucide-react";
import type { Product } from "@shared/schema";

export default function SavedProductsPage() {
  const { toast } = useToast();

  const { data: savedProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/saved", "products"],
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });

  const savedIds = new Set(savedData?.savedProductIds || []);

  const toggleSave = useMutation({
    mutationFn: async (productId: string) => {
      if (savedIds.has(productId)) {
        await apiRequest("DELETE", `/api/saved/${productId}`);
      } else {
        await apiRequest("POST", `/api/saved/${productId}`);
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-80 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const products = savedProducts || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-saved-title">المنتجات المحفوظة</h1>
        <p className="text-muted-foreground">المنتجات التي حفظتها للمراجعة لاحقاً.</p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="لا توجد منتجات محفوظة"
          description="تصفّح المنتجات واحفظ ما يهمّك. ستظهر هنا."
          actionLabel="تصفّح المنتجات"
          actionHref="/products"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isSaved={savedIds.has(product.id)}
              onToggleSave={(id) => toggleSave.mutate(id)}
              savePending={toggleSave.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
