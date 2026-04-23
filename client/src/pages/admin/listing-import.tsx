import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAccessToken } from "@/lib/supabase";
import { ArrowRight, Sparkles, Upload, Loader2, Save, CheckCircle2, ImageIcon, X, AlertTriangle } from "lucide-react";

const ALLOWED_CATEGORIES = [
  "نظارات", "عطور", "ملابس", "أحذية", "قهوة", "مواد غذائية",
  "إلكترونيات", "أدوات منزلية", "مستحضرات تجميل", "مجوهرات",
  "ألعاب أطفال", "أثاث", "قرطاسية", "رياضة", "سيارات وقطع غيار",
  "هدايا", "أخرى",
];

const ALLOWED_SUPPLIER_TYPES = ["مصنع", "جملة", "تاجر"];

function normalizeSaudiPhoneClient(raw: string): string {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("+966")) d = "0" + d.slice(4);
  else if (d.startsWith("966")) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("5")) d = "0" + d;
  return /^05\d{8}$/.test(d) ? d : "";
}

interface DuplicateMatch {
  id: string;
  title: string;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierCity: string | null;
  status: string;
}

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
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [confirmedAnyway, setConfirmedAnyway] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);

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

  async function checkDuplicates(): Promise<DuplicateMatch[]> {
    setCheckingDup(true);
    try {
      const phone = normalizeSaudiPhoneClient(form.supplierPhone || "");
      const name = (form.supplierName || "").trim();
      const city = (form.supplierCity || "").trim();
      if (!phone && !(name && city)) return [];
      const params = new URLSearchParams();
      if (phone) params.set("phone", phone);
      if (name) params.set("name", name);
      if (city) params.set("city", city);
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/listings/find-duplicate?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.matches as DuplicateMatch[]) || [];
    } finally {
      setCheckingDup(false);
    }
  }

  async function attemptSave(status: "draft" | "published") {
    if (!confirmedAnyway) {
      const matches = await checkDuplicates();
      if (matches.length > 0) {
        setDuplicates(matches);
        toast({ title: "يوجد مورد مشابه مسبقاً", description: "راجع المقارنة أدناه قبل المتابعة", variant: "destructive" });
        return;
      }
    }
    saveMutation.mutate(status);
  }

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const cleanPhone = normalizeSaudiPhoneClient(form.supplierPhone || "") || (form.supplierPhone?.trim() || null);
      const cleanWa = normalizeSaudiPhoneClient(form.supplierWhatsapp || "") || (form.supplierWhatsapp?.trim() || null);
      const body = {
        title: (form.title || form.supplierName || "").trim(),
        imageUrl: imageUrl ?? null,
        description: form.description?.trim() || null,
        category: form.category?.trim() || null,
        supplierName: form.supplierName?.trim() || null,
        supplierPhone: cleanPhone || null,
        supplierWhatsapp: cleanWa || null,
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
                <Select value={form.supplierType ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, supplierType: v }))}>
                  <SelectTrigger data-testid="input-supplierType"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    {ALLOWED_SUPPLIER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="التصنيف">
                <Select value={form.category ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger data-testid="input-category"><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                  <SelectContent>
                    {ALLOWED_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="الموقع / العنوان">
                <Input value={form.supplierLocation ?? ""} onChange={update("supplierLocation")} data-testid="input-supplierLocation" />
              </Field>
            </div>
            <Field label="الوصف">
              <Textarea value={form.description ?? ""} onChange={update("description")} rows={3} data-testid="input-description" />
            </Field>

            {duplicates.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3" data-testid="alert-duplicates">
                <div className="flex items-center gap-2 text-destructive font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  يوجد مورد مشابه مسبقاً ({duplicates.length})
                </div>
                <p className="text-xs text-muted-foreground">قارن البيانات قبل أن تحفظ نسخة جديدة. يمكنك إلغاء العملية أو المتابعة بقصد.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-sm" data-testid="block-new-data">
                    <div className="text-xs font-semibold text-primary mb-1">الجديد (سيُحفظ)</div>
                    <Row k="الاسم" v={form.supplierName} />
                    <Row k="الهاتف" v={normalizeSaudiPhoneClient(form.supplierPhone || "") || form.supplierPhone} />
                    <Row k="المدينة" v={form.supplierCity} />
                    <Row k="التصنيف" v={form.category} />
                  </div>
                  <div className="space-y-2">
                    {duplicates.map((m) => (
                      <div key={m.id} className="rounded-lg border border-destructive/30 bg-card p-3 space-y-1.5 text-sm" data-testid={`block-existing-${m.id}`}>
                        <div className="text-xs font-semibold text-destructive mb-1">موجود مسبقاً — {m.status === "published" ? "منشور" : "مسودة"}</div>
                        <Row k="الاسم" v={m.supplierName ?? m.title} />
                        <Row k="الهاتف" v={m.supplierPhone} />
                        <Row k="المدينة" v={m.supplierCity} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDuplicates([]); navigate("/admin/listings"); }}
                    data-testid="button-cancel-dup"
                  >
                    إلغاء العملية
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setConfirmedAnyway(true); setDuplicates([]); toast({ title: "تم تأكيد المتابعة", description: "اضغط الحفظ أو النشر مرة أخرى" }); }}
                    data-testid="button-confirm-dup"
                  >
                    أعرف وأريد المتابعة
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => attemptSave("draft")}
                disabled={saveMutation.isPending || checkingDup}
                className="flex-1 h-11 rounded-xl"
                data-testid="button-save-draft"
              >
                {(saveMutation.isPending || checkingDup) ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                حفظ كمسودة
              </Button>
              <Button
                onClick={() => attemptSave("published")}
                disabled={saveMutation.isPending || checkingDup}
                className="flex-1 h-11 rounded-xl"
                data-testid="button-publish"
              >
                {(saveMutation.isPending || checkingDup) ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
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

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground text-xs">{k}:</span>
      <span className="font-medium text-xs truncate" dir="auto">{v || "—"}</span>
    </div>
  );
}
