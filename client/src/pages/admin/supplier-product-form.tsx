import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAccessToken } from "@/lib/supabase";
import { ArrowRight, Upload, Loader2, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import type { SupplierProduct, Category, Listing } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "اسم المنتج مطلوب"),
  description: z.string().optional(),
  category: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(["draft", "published"]),
  supplierPrice: z.string().optional(),
  suggestedSellPrice: z.string().optional(),
  estimatedMargin: z.string().optional(),
  minimumOrderQuantity: z.string().optional(),
  dozenPrice: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function calcMargin(buy?: string, sell?: string): string {
  const b = parseFloat(buy ?? "");
  const s = parseFloat(sell ?? "");
  if (!Number.isFinite(b) || !Number.isFinite(s)) return "";
  const m = s - b;
  return m > 0 ? String(Math.round(m * 100) / 100) : "";
}

export default function SupplierProductFormPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!params.id;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existing, isLoading: loadingExisting } = useQuery<SupplierProduct>({
    queryKey: ["/api/admin/supplier-products", params.id],
    enabled: isEdit,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: suppliers } = useQuery<Listing[]>({
    queryKey: ["/api/admin/listings"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      supplierId: "",
      status: "draft",
      supplierPrice: "",
      suggestedSellPrice: "",
      estimatedMargin: "",
      minimumOrderQuantity: "",
      dozenPrice: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        title: existing.title,
        description: existing.description || "",
        category: existing.category || "",
        supplierId: existing.supplierId || "",
        status: (existing.status as "draft" | "published") || "draft",
        supplierPrice: existing.supplierPrice ?? "",
        suggestedSellPrice: existing.suggestedSellPrice ?? "",
        estimatedMargin: existing.estimatedMargin ?? "",
        minimumOrderQuantity: existing.minimumOrderQuantity != null ? String(existing.minimumOrderQuantity) : "",
        dozenPrice: existing.dozenPrice ?? "",
      });
      setImageUrl(existing.imageUrl || null);
    }
  }, [existing, form]);

  const watchedBuy = form.watch("supplierPrice");
  const watchedSell = form.watch("suggestedSellPrice");
  useEffect(() => {
    const auto = calcMargin(watchedBuy, watchedSell);
    if (auto && form.getValues("estimatedMargin") !== auto) {
      form.setValue("estimatedMargin", auto, { shouldValidate: false });
    }
  }, [watchedBuy, watchedSell, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body: any = { ...values, imageUrl };
      if (values.minimumOrderQuantity && values.minimumOrderQuantity.trim() !== "") {
        const n = parseInt(values.minimumOrderQuantity, 10);
        body.minimumOrderQuantity = Number.isFinite(n) && n > 0 ? n : null;
      } else {
        body.minimumOrderQuantity = null;
      }
      if (isEdit) {
        await apiRequest("PATCH", `/api/admin/supplier-products/${params.id}`, body);
      } else {
        await apiRequest("POST", `/api/admin/supplier-products`, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-products"] });
      toast({ title: isEdit ? "تم تحديث المنتج" : "تم إضافة المنتج" });
      setLocation("/admin/products");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/admin/products" data-testid="link-back-admin-products">
            <ArrowRight className="w-4 h-4 me-1" />
            العودة
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold" data-testid="text-product-form-title">
        {isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}
      </h1>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">صورة المنتج</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-muted/50 overflow-hidden border border-border/50 flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="input-product-image" />
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={uploading} asChild>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Upload className="w-4 h-4 me-2" />}
                          {uploading ? "جاري الرفع..." : "رفع صورة"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المنتج</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-lg" data-testid="input-product-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} className="rounded-lg resize-none" data-testid="input-product-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التصنيف</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg" data-testid="select-product-category">
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories || []).map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المورد</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg" data-testid="select-product-supplier">
                          <SelectValue placeholder="اختر المورد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(suppliers || []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg" data-testid="select-product-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="published">منشور</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-2 border-t border-border/40">
                <div>
                  <h3 className="text-sm font-semibold mb-1">التسعير</h3>
                  <p className="text-xs text-muted-foreground">اعرض الأسعار للمشتركين. الربح يُحسب تلقائياً.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="supplierPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سعر الجملة (ر.س)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" inputMode="decimal" step="0.01" min="0" placeholder="35" className="rounded-lg" data-testid="input-product-supplier-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="suggestedSellPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سعر البيع المقترح (ر.س)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" inputMode="decimal" step="0.01" min="0" placeholder="79" className="rounded-lg" data-testid="input-product-sell-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedMargin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الربح المتوقع (ر.س)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" inputMode="decimal" step="0.01" min="0" placeholder="44" className="rounded-lg" data-testid="input-product-margin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dozenPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سعر الدزينة (ر.س) — اختياري</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" inputMode="decimal" step="0.01" min="0" placeholder="اتركه فارغاً للحساب التلقائي (سعر الحبة × 12)" className="rounded-lg" data-testid="input-product-dozen-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minimumOrderQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحد الأدنى للطلب (قطعة)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" inputMode="numeric" step="1" min="0" placeholder="150" className="rounded-lg" data-testid="input-product-min-qty" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl" disabled={mutation.isPending} data-testid="button-save-product">
                {mutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                {isEdit ? "حفظ التغييرات" : "إضافة المنتج"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
