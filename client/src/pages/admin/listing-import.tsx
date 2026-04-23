import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAccessToken } from "@/lib/supabase";
import { ArrowRight, Sparkles, Upload, Loader2, Save, CheckCircle2, ImageIcon, X } from "lucide-react";

interface ExtractedSupplier {
  title: string | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierWhatsapp: string | null;
  supplierCity: string | null;
  supplierType: string | null;
  category: string | null;
  supplierLocation: string | null;
  description: string | null;
}

const EMPTY: ExtractedSupplier = {
  title: "",
  supplierName: "",
  supplierPhone: "",
  supplierWhatsapp: "",
  supplierCity: "",
  supplierType: "",
  category: "",
  supplierLocation: "",
  description: "",
};

export default function AdminListingImportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [form, setForm] = useState<ExtractedSupplier>(EMPTY);
  const [analyzed, setAnalyzed] = useState(false);

  function pickFile(f: File) {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setAnalyzed(false);
    setImageUrl(null);
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setImageUrl(null);
    setForm(EMPTY);
    setAnalyzed(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("لم يتم اختيار صورة");
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/analyze-supplier-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل تحليل الصورة");
      }
      return (await res.json()) as { imageUrl: string | null; extracted: ExtractedSupplier };
    },
    onSuccess: (data) => {
      setImageUrl(data.imageUrl);
      const e = data.extracted;
      setForm({
        title: e.title ?? e.supplierName ?? "",
        supplierName: e.supplierName ?? "",
        supplierPhone: e.supplierPhone ?? "",
        supplierWhatsapp: e.supplierWhatsapp ?? e.supplierPhone ?? "",
        supplierCity: e.supplierCity ?? "",
        supplierType: e.supplierType ?? "",
        category: e.category ?? "",
        supplierLocation: e.supplierLocation ?? "",
        description: e.description ?? "",
      });
      setAnalyzed(true);
      toast({ title: "تم التحليل", description: "راجع البيانات وعدّلها قبل الحفظ" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message ?? "تعذّر تحليل الصورة", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const body = {
        title: (form.title || form.supplierName || "").trim(),
        imageUrl: imageUrl ?? null,
        description: form.description?.trim() || null,
        category: form.category?.trim() || null,
        supplierName: form.supplierName?.trim() || null,
        supplierPhone: form.supplierPhone?.trim() || null,
        supplierWhatsapp: form.supplierWhatsapp?.trim() || null,
        supplierCity: form.supplierCity?.trim() || null,
        supplierType: form.supplierType?.trim() || null,
        supplierLocation: form.supplierLocation?.trim() || null,
        status,
      };
      if (!body.title) throw new Error("العنوان مطلوب — أكمل الاسم قبل الحفظ");
      await apiRequest("POST", "/api/admin/listings", body);
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: status === "published" ? "تم نشر المورد" : "تم حفظ المسودة" });
      navigate("/admin/listings");
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    },
  });

  const update = (k: keyof ExtractedSupplier) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/listings")} data-testid="button-back">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-import-title">إضافة مورد من صورة</h1>
          <p className="text-sm text-muted-foreground">ارفع كرت أو بروشور أو سكرين شوت — يُستخرج البيانات تلقائياً</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" /> الخطوة 1: ارفع صورة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
            data-testid="input-file"
          />

          {!previewUrl ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.02] transition"
              data-testid="button-pick-file"
            >
              <ImageIcon className="w-10 h-10 opacity-40" />
              <span className="text-sm">اضغط لاختيار صورة (JPG / PNG / WEBP — حد 5MB)</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
                <img src={previewUrl} alt="معاينة" className="w-full max-h-80 object-contain" data-testid="img-preview" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 end-2 rounded-full h-8 w-8"
                  onClick={reset}
                  data-testid="button-remove-image"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="w-full h-11 rounded-xl"
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جاري التحليل...</>
                ) : (
                  <><Sparkles className="w-4 h-4 me-2" /> تحليل الصورة</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {analyzed && (
        <Card className="rounded-2xl border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> الخطوة 2: راجع البيانات وعدّلها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="العنوان (اسم البطاقة)" testid="input-title">
                <Input value={form.title ?? ""} onChange={update("title")} data-testid="input-title" />
              </Field>
              <Field label="اسم المورد">
                <Input value={form.supplierName ?? ""} onChange={update("supplierName")} data-testid="input-supplierName" />
              </Field>
              <Field label="رقم الهاتف">
                <Input value={form.supplierPhone ?? ""} onChange={update("supplierPhone")} dir="ltr" data-testid="input-supplierPhone" />
              </Field>
              <Field label="رقم واتساب">
                <Input value={form.supplierWhatsapp ?? ""} onChange={update("supplierWhatsapp")} dir="ltr" data-testid="input-supplierWhatsapp" />
              </Field>
              <Field label="المدينة">
                <Input value={form.supplierCity ?? ""} onChange={update("supplierCity")} data-testid="input-supplierCity" />
              </Field>
              <Field label="نوع النشاط">
                <Input value={form.supplierType ?? ""} onChange={update("supplierType")} placeholder="مصنع / تاجر جملة / موزع..." data-testid="input-supplierType" />
              </Field>
              <Field label="التصنيف">
                <Input value={form.category ?? ""} onChange={update("category")} data-testid="input-category" />
              </Field>
              <Field label="الموقع / العنوان">
                <Input value={form.supplierLocation ?? ""} onChange={update("supplierLocation")} data-testid="input-supplierLocation" />
              </Field>
            </div>
            <Field label="الوصف">
              <Textarea value={form.description ?? ""} onChange={update("description")} rows={3} data-testid="input-description" />
            </Field>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate("draft")}
                disabled={saveMutation.isPending}
                className="flex-1 h-11 rounded-xl"
                data-testid="button-save-draft"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                حفظ كمسودة
              </Button>
              <Button
                onClick={() => saveMutation.mutate("published")}
                disabled={saveMutation.isPending}
                className="flex-1 h-11 rounded-xl"
                data-testid="button-publish"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                اعتماد ونشر
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children, testid }: { label: string; children: React.ReactNode; testid?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
