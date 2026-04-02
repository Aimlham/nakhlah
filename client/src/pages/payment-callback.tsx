import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { getAccessToken } from "@/lib/supabase";

type Status = "loading" | "paid" | "failed" | "unknown";

const PENDING_INVOICE_KEY = "nakhlah_pending_invoice";

async function authFetch(url: string): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export default function PaymentCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [plan, setPlan] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function onSuccess(planName?: string) {
    if (planName) setPlan(planName);
    sessionStorage.removeItem(PENDING_INVOICE_KEY);
    queryClient.invalidateQueries({ queryKey: ["/api/payments/subscription"] });
    setStatus("paid");
    setTimeout(() => navigate("/products"), 2000);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Moyasar appends ?id=<invoiceId>&status=paid|failed when auto-redirecting after payment.
    // When the user clicks "Back to my page" manually, these params may be absent.
    const urlInvoiceId = params.get("id");
    const moyasarStatus = params.get("status");
    const planParam = params.get("plan") ?? "";
    setPlan(planParam);

    // Explicit failure from Moyasar — no need to verify
    if (moyasarStatus === "failed" || moyasarStatus === "expired") {
      setStatus("failed");
      setErrorMsg("لم يتم إتمام عملية الدفع");
      return;
    }

    // Use invoiceId from URL if present, otherwise fall back to sessionStorage
    const invoiceId = urlInvoiceId || sessionStorage.getItem(PENDING_INVOICE_KEY);
    // If Moyasar provided the id in the URL, the user was auto-redirected after payment.
    // If we only have it from sessionStorage, the user likely pressed back without paying.
    const cameFromMoyasar = !!urlInvoiceId;

    if (invoiceId) {
      authFetch(`/api/payments/verify/${invoiceId}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data: { status: string; plan?: string }) => {
          if (data.status === "paid") {
            onSuccess(data.plan);
          } else if (data.status === "pending" && cameFromMoyasar) {
            // Moyasar redirected with id= but webhook hasn't fired yet — check subscription
            return authFetch("/api/payments/subscription")
              .then((r) => r.json())
              .then((sub: { status: string; plan?: string }) => {
                if (sub.status === "active") {
                  onSuccess(sub.plan);
                } else {
                  setStatus("failed");
                  setErrorMsg("لم يكتمل الدفع بعد. إذا تم الخصم من حسابك، يرجى الانتظار دقيقة ثم المحاولة مرة أخرى.");
                }
              });
          } else {
            // Invoice is pending/failed and user navigated back without paying
            sessionStorage.removeItem(PENDING_INVOICE_KEY);
            setStatus("failed");
            setErrorMsg("لم يتم إتمام عملية الدفع");
          }
        })
        .catch((err) => {
          console.error("[payment-callback] verify error:", err);
          authFetch("/api/payments/subscription")
            .then((r) => r.json())
            .then((sub: { status: string; plan?: string }) => {
              if (sub.status === "active") {
                onSuccess(sub.plan);
              } else {
                setStatus("failed");
                setErrorMsg("لم يتم إتمام عملية الدفع");
              }
            })
            .catch(() => {
              setStatus("failed");
              setErrorMsg("تعذّر التحقق من حالة الدفع، يرجى التواصل مع الدعم");
            });
        });
    } else {
      // No invoiceId at all — check subscription status directly
      authFetch("/api/payments/subscription")
        .then((r) => r.json())
        .then((sub: { status: string; plan?: string }) => {
          if (sub.status === "active") {
            onSuccess(sub.plan);
          } else {
            setStatus("failed");
            setErrorMsg("لم يتم إتمام عملية الدفع");
          }
        })
        .catch(() => {
          setStatus("failed");
          setErrorMsg("تعذّر التحقق من حالة الدفع");
        });
    }
  }, []);

  const planLabel = plan === "pro" ? "نخلة برو" : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="max-w-md w-full mx-auto p-8 text-center space-y-6">

        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">
              {errorMsg || "جاري التحقق من الدفع..."}
            </h2>
            <p className="text-sm text-muted-foreground">
              قد يستغرق هذا بضع ثوانٍ، يرجى عدم إغلاق الصفحة
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <CheckCircle2
              className="w-16 h-16 text-emerald-500 mx-auto"
              data-testid="icon-payment-success"
            />
            <h2 className="text-2xl font-bold">تم الدفع بنجاح!</h2>
            {planLabel && (
              <p className="text-muted-foreground">
                تم تفعيل باقة {planLabel}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              سيتم تحويلك للمنتجات تلقائياً...
            </p>
            <Button
              className="w-full"
              onClick={() => navigate("/products")}
              data-testid="button-go-products"
            >
              انتقل للمنتجات الآن
            </Button>
          </>
        )}

        {(status === "failed" || status === "unknown") && (
          <>
            <XCircle
              className="w-16 h-16 text-destructive mx-auto"
              data-testid="icon-payment-failed"
            />
            <h2 className="text-2xl font-bold">لم يتم إتمام الدفع</h2>
            {errorMsg && (
              <p className="text-muted-foreground">{errorMsg}</p>
            )}
            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => navigate("/pricing")}
                data-testid="button-retry-payment"
              >
                المحاولة مرة أخرى
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard")}
                data-testid="button-back-dashboard"
              >
                العودة للوحة التحكم
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
