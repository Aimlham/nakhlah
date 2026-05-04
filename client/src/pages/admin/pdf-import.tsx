import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAccessToken } from "@/lib/supabase";
import {
  ArrowRight, FileText, Upload, Loader2, Save, CheckCircle2,
  X, AlertTriangle, Trash2, FileWarning
} from "lucide-react";

const ALLOWED_CATEGORIES = [
  "نظارات", "عطور", "ملابس", "أحذية", "قهوة", "مواد غذائية",
  "إلكترونيات", "أدوات منزلية", "مستحضرات تجميل", "مجوهرات",
  "ألعاب أطفال", "أثاث", "قرطاسية", "رياضة", "سيارات وقطع غيار",
  "هدايا", "أخرى",
];

const ALLOWED_SUPPLIER_TYPES = ["مصنع", "جملة", "تاجر"];

interface ExtractedRow {
  id: string;
  page: number;
  selected: boolean;
  supplierName: string;
  supplierPhone: string;
  supplierWhatsapp: string;
  supplierCity: string;
  supplierType: string;
  category: string;
  description: string;
  isDuplicate: boolean;
  duplicateReason: string | null;
}

interface PageError {
  page: number;
  error: string;
}

export default function AdminPdfImportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [pageErrors, setPageErrors] = useState<PageError[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  function pickFile(f: File) {
    if (f.type !== "application/pdf") {
      toast({ title: "يُقبل ملف PDF فقط", variant: "destructive" });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: "حجم الملف يتجاوز 20MB", variant: "destructive" });
      return;
    }
    setFile(f);
    setAnalyzed(false);
    setRows([]);
    setPageErrors([]);
  }

  function reset() {
    setFile(null);
    setRows([]);
    setPageErrors([]);
    setAnalyzed(false);
    setProgress({ current: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  }

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("لم يتم اختيار ملف");
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append("pdf", file);
      setProgress({ current: 0, total: 1 });
      const res = await fetch("/api/admin/analyze-supplier-pdf", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل تحليل الملف");
      }
      return await res.json();
    },
    onSuccess: (data: {
      totalPages: number;
      results: Array<{
        page: number;
        suppliers: Array<{
          supplierName: string | null;
          supplierPhone: string | null;
          supplierWhatsapp: string | null;
          supplierCity: string | null;
          supplierType: string | null;
          category: string | null;
          description: string | null;
          isDuplicate: boolean;
          duplicateReason: string | null;
        }>;
        error: string | null;
      }>;
    }) => {
      const extracted: ExtractedRow[] = [];
      const errors: PageError[] = [];
      let counter = 0;

      for (const pageResult of data.results) {
        if (pageResult.error) {
          errors.push({ page: pageResult.page, error: pageResult.error });
        }
        for (const s of pageResult.suppliers) {
          counter++;
          extracted.push({
            id: `row-${counter}`,
            page: pageResult.page,
            selected: !s.isDuplicate,
            supplierName: s.supplierName ?? "",
            supplierPhone: s.supplierPhone ?? "",
            supplierWhatsapp: s.supplierWhatsapp ?? s.supplierPhone ?? "",
            supplierCity: s.supplierCity ?? "",
            supplierType: s.supplierType ?? "",
            category: s.category ?? "",
            description: s.description ?? "",
            isDuplicate: s.isDuplicate,
            duplicateReason: s.duplicateReason,
          });
        }
      }

      setRows(extracted);
      setPageErrors(errors);
      setProgress({ current: data.totalPages, total: data.totalPages });
      setAnalyzed(true);
      toast({
        title: "تم التحليل",
        description: `تم استخراج ${extracted.length} مورد من ${data.totalPages} صفحة${errors.length > 0 ? ` (${errors.length} صفحات فشلت)` : ""}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message ?? "تعذّر تحليل الملف", variant: "destructive" });
    },
  });

  const selectedRows = rows.filter((r) => r.selected);

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const toSave = selectedRows;
      if (toSave.length === 0) throw new Error("لم يتم تحديد أي مورد");

      let saved = 0;
      let failed = 0;
      for (const row of toSave) {
        try {
          const body = {
            title: row.supplierName.trim() || "مورد بدون اسم",
            imageUrl: null,
            description: row.description.trim() || null,
            category: row.category.trim() || null,
            supplierName: row.supplierName.trim() || null,
            supplierPhone: row.supplierPhone.trim() || null,
            supplierWhatsapp: row.supplierWhatsapp.trim() || row.supplierPhone.trim() || null,
            supplierCity: row.supplierCity.trim() || null,
            supplierType: row.supplierType.trim() || null,
            supplierLocation: null,
            status,
          };
          await apiRequest("POST", "/api/admin/listings", body);
          saved++;
        } catch {
          failed++;
        }
      }
      return { saved, failed, status };
    },
    onSuccess: ({ saved, failed, status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      const label = status === "published" ? "نشر" : "حفظ كمسودة";
      toast({
        title: `تم ${label} ${saved} مورد`,
        description: failed > 0 ? `فشل حفظ ${failed} مورد` : undefined,
      });
      navigate("/admin/listings");
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    },
  });

  function updateRow(id: string, field: keyof ExtractedRow, value: string | boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  }

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/listings")} data-testid="button-back-pdf">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pdf-import-title">استيراد موردين من PDF</h1>
          <p className="text-sm text-muted-foreground">ارفع ملف PDF يحتوي على جداول موردين — يتم استخراج البيانات تلقائياً</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" /> الخطوة 1: ارفع ملف PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
            data-testid="input-pdf-file"
          />

          {!file ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.02] transition"
              data-testid="button-pick-pdf"
            >
              <FileText className="w-10 h-10 opacity-40" />
              <span className="text-sm">اضغط لاختيار ملف PDF (حد أقصى 20MB — 25 صفحة)</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <FileText className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="text-pdf-filename">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button variant="secondary" size="icon" className="rounded-full h-8 w-8 shrink-0" onClick={reset} data-testid="button-remove-pdf">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {analyzeMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تحليل الملف... قد يستغرق عدة دقائق حسب عدد الصفحات</span>
                  </div>
                  <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : undefined} className="h-2" />
                </div>
              )}

              {!analyzed && !analyzeMutation.isPending && (
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  className="w-full h-11 rounded-xl"
                  data-testid="button-analyze-pdf"
                >
                  <FileText className="w-4 h-4 me-2" />
                  تحليل الملف واستخراج الموردين
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {pageErrors.length > 0 && (
        <Card className="rounded-2xl border-amber-500/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <FileWarning className="w-4 h-4" />
              بعض الصفحات لم يتم تحليلها بنجاح
            </div>
            {pageErrors.map((pe) => (
              <p key={pe.page} className="text-xs text-muted-foreground" data-testid={`text-page-error-${pe.page}`}>
                {pe.error}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {analyzed && rows.length === 0 && pageErrors.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center">
            <FileWarning className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="font-medium">لم يتم استخراج أي مورد</p>
            <p className="text-sm text-muted-foreground mt-1">تأكد أن الملف يحتوي على جداول بيانات موردين واضحة</p>
          </CardContent>
        </Card>
      )}

      {analyzed && rows.length > 0 && (
        <Card className="rounded-2xl border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                الخطوة 2: راجع الموردين المستخرجين ({rows.length})
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => toggleAll(!!v)}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-muted-foreground">تحديد الكل</span>
                </label>
                <Badge variant="secondary" data-testid="text-selected-count">
                  {selectedRows.length} محدد
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  row.isDuplicate ? "border-amber-500/40 bg-amber-500/5" : "border-border"
                } ${!row.selected ? "opacity-60" : ""}`}
                data-testid={`card-supplier-row-${row.id}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={row.selected}
                    onCheckedChange={(v) => updateRow(row.id, "selected", !!v)}
                    data-testid={`checkbox-row-${row.id}`}
                  />
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">صفحة {row.page}</Badge>
                    {row.isDuplicate && (
                      <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {row.duplicateReason || "مكرر"}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeRow(row.id)}
                    data-testid={`button-delete-row-${row.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="اسم المورد">
                    <Input
                      value={row.supplierName}
                      onChange={(e) => updateRow(row.id, "supplierName", e.target.value)}
                      data-testid={`input-name-${row.id}`}
                    />
                  </Field>
                  <Field label="رقم الجوال">
                    <Input
                      value={row.supplierPhone}
                      onChange={(e) => updateRow(row.id, "supplierPhone", e.target.value)}
                      dir="ltr"
                      data-testid={`input-phone-${row.id}`}
                    />
                  </Field>
                  <Field label="المدينة">
                    <Input
                      value={row.supplierCity}
                      onChange={(e) => updateRow(row.id, "supplierCity", e.target.value)}
                      data-testid={`input-city-${row.id}`}
                    />
                  </Field>
                  <Field label="التصنيف">
                    <Select value={row.category} onValueChange={(v) => updateRow(row.id, "category", v)}>
                      <SelectTrigger data-testid={`select-category-${row.id}`}><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        {ALLOWED_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="نوع النشاط">
                    <Select value={row.supplierType} onValueChange={(v) => updateRow(row.id, "supplierType", v)}>
                      <SelectTrigger data-testid={`select-type-${row.id}`}><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        {ALLOWED_SUPPLIER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="الوصف">
                    <Textarea
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      rows={1}
                      className="min-h-[36px]"
                      data-testid={`input-desc-${row.id}`}
                    />
                  </Field>
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate("draft")}
                disabled={saveMutation.isPending || selectedRows.length === 0}
                className="flex-1 h-11 rounded-xl"
                data-testid="button-save-draft-pdf"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                حفظ المحدد كمسودة ({selectedRows.length})
              </Button>
              <Button
                onClick={() => saveMutation.mutate("published")}
                disabled={saveMutation.isPending || selectedRows.length === 0}
                className="flex-1 h-11 rounded-xl"
                data-testid="button-publish-pdf"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                نشر المحدد ({selectedRows.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
