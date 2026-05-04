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
  X, AlertTriangle, Trash2, FileWarning, FileSpreadsheet, Filter
} from "lucide-react";

const ALLOWED_CATEGORIES = [
  "نظارات", "عطور", "ملابس", "أحذية", "قهوة", "مواد غذائية",
  "إلكترونيات", "أدوات منزلية", "مستحضرات تجميل", "مجوهرات",
  "ألعاب أطفال", "أثاث", "قرطاسية", "رياضة", "سيارات وقطع غيار",
  "هدايا", "أخرى",
];

const ALLOWED_SUPPLIER_TYPES = ["مصنع", "جملة", "تاجر"];

type FilterTab = "all" | "complete" | "incomplete" | "duplicate";

const ACCEPTED_EXTENSIONS = ".pdf,.csv,.xlsx,.xls";
const ACCEPTED_MIMES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
];

function getFileType(f: File): "pdf" | "spreadsheet" | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["csv", "xlsx", "xls"].includes(ext)) return "spreadsheet";
  return null;
}

function getFileExtLabel(f: File): string {
  return (f.name.split(".").pop() ?? "").toUpperCase();
}

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
  isIncomplete: boolean;
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
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [sourceType, setSourceType] = useState<"pdf" | "spreadsheet" | null>(null);

  function pickFile(f: File) {
    const type = getFileType(f);
    if (!type) {
      toast({ title: "الصيغ المدعومة: PDF, CSV, XLSX, XLS", variant: "destructive" });
      return;
    }
    const maxSize = type === "pdf" ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (f.size > maxSize) {
      toast({ title: `حجم الملف يتجاوز ${maxSize / 1024 / 1024}MB`, variant: "destructive" });
      return;
    }
    setFile(f);
    setSourceType(type);
    setAnalyzed(false);
    setRows([]);
    setPageErrors([]);
    setActiveFilter("all");
  }

  function reset() {
    setFile(null);
    setSourceType(null);
    setRows([]);
    setPageErrors([]);
    setAnalyzed(false);
    setProgress({ current: 0, total: 0 });
    setActiveFilter("all");
    if (fileRef.current) fileRef.current.value = "";
  }

  function markRows(rawRows: Omit<ExtractedRow, "id" | "selected" | "isIncomplete">[]): ExtractedRow[] {
    let counter = 0;
    return rawRows.map((r) => {
      counter++;
      const isIncomplete = !r.supplierName.trim() || !r.supplierPhone.trim();
      return {
        ...r,
        id: `row-${counter}`,
        selected: !r.isDuplicate && !isIncomplete,
        isIncomplete,
      };
    });
  }

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!file || !sourceType) throw new Error("لم يتم اختيار ملف");
      const token = await getAccessToken();
      const fd = new FormData();

      if (sourceType === "pdf") {
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
        return { type: "pdf" as const, data: await res.json() };
      } else {
        fd.append("file", file);
        const res = await fetch("/api/admin/parse-supplier-spreadsheet", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "فشل تحليل الملف");
        }
        return { type: "spreadsheet" as const, data: await res.json() };
      }
    },
    onSuccess: (result) => {
      if (result.type === "pdf") {
        const data = result.data as {
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
        };

        const rawRows: Omit<ExtractedRow, "id" | "selected" | "isIncomplete">[] = [];
        const errors: PageError[] = [];

        for (const pageResult of data.results) {
          if (pageResult.error) {
            errors.push({ page: pageResult.page, error: pageResult.error });
          }
          for (const s of pageResult.suppliers) {
            rawRows.push({
              page: pageResult.page,
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

        setRows(markRows(rawRows));
        setPageErrors(errors);
        setProgress({ current: data.totalPages, total: data.totalPages });
        setAnalyzed(true);
        toast({
          title: "تم التحليل",
          description: `تم استخراج ${rawRows.length} مورد من ${data.totalPages} صفحة${errors.length > 0 ? ` (${errors.length} صفحات فشلت)` : ""}`,
        });
      } else {
        const data = result.data as {
          totalRows: number;
          mappedFields: string[];
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
        };

        const rawRows: Omit<ExtractedRow, "id" | "selected" | "isIncomplete">[] = data.suppliers.map((s, i) => ({
          page: i + 1,
          supplierName: s.supplierName ?? "",
          supplierPhone: s.supplierPhone ?? "",
          supplierWhatsapp: s.supplierWhatsapp ?? s.supplierPhone ?? "",
          supplierCity: s.supplierCity ?? "",
          supplierType: s.supplierType ?? "",
          category: s.category ?? "",
          description: s.description ?? "",
          isDuplicate: s.isDuplicate,
          duplicateReason: s.duplicateReason,
        }));

        setRows(markRows(rawRows));
        setPageErrors([]);
        setAnalyzed(true);
        toast({
          title: "تم تحليل الملف",
          description: `تم استخراج ${rawRows.length} مورد من ${data.totalRows} صف — تم ربط ${data.mappedFields.length} حقول`,
        });
      }
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message ?? "تعذّر تحليل الملف", variant: "destructive" });
    },
  });

  const selectedRows = rows.filter((r) => r.selected);

  const filteredRows = rows.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "complete") return !r.isIncomplete && !r.isDuplicate;
    if (activeFilter === "incomplete") return r.isIncomplete;
    if (activeFilter === "duplicate") return r.isDuplicate;
    return true;
  });

  const countComplete = rows.filter((r) => !r.isIncomplete && !r.isDuplicate).length;
  const countIncomplete = rows.filter((r) => r.isIncomplete).length;
  const countDuplicate = rows.filter((r) => r.isDuplicate).length;

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
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "supplierName" || field === "supplierPhone") {
        updated.isIncomplete = !updated.supplierName.trim() || !updated.supplierPhone.trim();
      }
      return updated;
    }));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleAllVisible(checked: boolean) {
    const visibleIds = new Set(filteredRows.map((r) => r.id));
    setRows((prev) => prev.map((r) => visibleIds.has(r.id) ? { ...r, selected: checked } : r));
  }

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((r) => r.selected);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: rows.length },
    { key: "complete", label: "مكتمل", count: countComplete },
    { key: "incomplete", label: "ناقص بيانات", count: countIncomplete },
    { key: "duplicate", label: "مكرر محتمل", count: countDuplicate },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/listings")} data-testid="button-back-pdf">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pdf-import-title">استيراد جماعي للموردين</h1>
          <p className="text-sm text-muted-foreground">ارفع ملف PDF أو Excel أو CSV — يتم استخراج البيانات تلقائياً ومراجعتها قبل الحفظ</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" /> الخطوة 1: ارفع الملف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
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
              <FileSpreadsheet className="w-10 h-10 opacity-40" />
              <span className="text-sm">اضغط لاختيار ملف</span>
              <span className="text-xs text-muted-foreground/70">PDF (حتى 20MB) · Excel XLSX/XLS (حتى 10MB) · CSV (حتى 10MB)</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
                {sourceType === "pdf" ? (
                  <FileText className="w-8 h-8 text-primary shrink-0" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" data-testid="text-pdf-filename">{file.name}</p>
                    <Badge variant="secondary" className="text-[10px] shrink-0" data-testid="badge-file-type">
                      {getFileExtLabel(file)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button variant="secondary" size="icon" className="rounded-full h-8 w-8 shrink-0" onClick={reset} data-testid="button-remove-pdf">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {sourceType === "pdf" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-xs">ملفات PDF تُحلل بالذكاء الاصطناعي — قد تحتاج مراجعة أدق. للحصول على نتائج أفضل استخدم Excel أو CSV.</span>
                </div>
              )}

              {analyzeMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {sourceType === "pdf"
                        ? "جاري تحليل الملف بالذكاء الاصطناعي... قد يستغرق عدة دقائق"
                        : "جاري قراءة الملف وربط الأعمدة..."
                      }
                    </span>
                  </div>
                  {sourceType === "pdf" && (
                    <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : undefined} className="h-2" />
                  )}
                </div>
              )}

              {!analyzed && !analyzeMutation.isPending && (
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  className="w-full h-11 rounded-xl"
                  data-testid="button-analyze-pdf"
                >
                  {sourceType === "pdf" ? (
                    <FileText className="w-4 h-4 me-2" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 me-2" />
                  )}
                  {sourceType === "pdf" ? "تحليل الملف واستخراج الموردين" : "قراءة الملف واستخراج الموردين"}
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
            <p className="text-sm text-muted-foreground mt-1">تأكد أن الملف يحتوي على بيانات موردين واضحة</p>
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
                    checked={allVisibleSelected}
                    onCheckedChange={(v) => toggleAllVisible(!!v)}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-muted-foreground">تحديد المعروض</span>
                </label>
                <Badge variant="secondary" data-testid="text-selected-count">
                  {selectedRows.length} محدد
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2" data-testid="filter-tabs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  data-testid={`filter-tab-${tab.key}`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {countIncomplete > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 mt-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs">
                  {countIncomplete} صف ناقص البيانات (اسم المورد أو رقم التواصل) — لن يتم تحديدها تلقائياً. يمكنك تعديلها وتحديدها يدوياً.
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {filteredRows.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm">
                لا توجد صفوف تطابق هذا الفلتر
              </div>
            )}

            {filteredRows.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  row.isIncomplete
                    ? "border-amber-500/50 bg-amber-500/5"
                    : row.isDuplicate
                    ? "border-orange-500/40 bg-orange-500/5"
                    : "border-border"
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
                    {sourceType === "pdf" && (
                      <Badge variant="outline" className="text-[10px]">صفحة {row.page}</Badge>
                    )}
                    {sourceType === "spreadsheet" && (
                      <Badge variant="outline" className="text-[10px]">صف {row.page}</Badge>
                    )}
                    {row.isIncomplete && (
                      <Badge variant="destructive" className="text-[10px] flex items-center gap-1" data-testid={`badge-incomplete-${row.id}`}>
                        <AlertTriangle className="w-3 h-3" />
                        ناقص بيانات
                      </Badge>
                    )}
                    {row.isDuplicate && (
                      <Badge className="text-[10px] flex items-center gap-1 bg-orange-500 hover:bg-orange-500/80" data-testid={`badge-duplicate-${row.id}`}>
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
                  <Field label="اسم المورد" warning={!row.supplierName.trim()}>
                    <Input
                      value={row.supplierName}
                      onChange={(e) => updateRow(row.id, "supplierName", e.target.value)}
                      className={!row.supplierName.trim() ? "border-amber-500/60" : ""}
                      data-testid={`input-name-${row.id}`}
                    />
                  </Field>
                  <Field label="رقم الجوال" warning={!row.supplierPhone.trim()}>
                    <Input
                      value={row.supplierPhone}
                      onChange={(e) => updateRow(row.id, "supplierPhone", e.target.value)}
                      dir="ltr"
                      className={!row.supplierPhone.trim() ? "border-amber-500/60" : ""}
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

function Field({ label, children, warning }: { label: string; children: React.ReactNode; warning?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className={`text-[11px] ${warning ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
        {label}{warning ? " ⚠" : ""}
      </Label>
      {children}
    </div>
  );
}
