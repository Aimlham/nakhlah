import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "paid" | "failed" | "unknown";

export default function PaymentCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [plan, setPlan] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Moyasar appends ?id=<invoiceId>&status=paid|failed to back_url
    const invoiceId  = params.get("id");
    const moyasarStatus = params.get("status"); // "paid" | "failed" | "expired"
    const planParam  = params.get("plan") ?? "";
    setPlan(planParam);

    // If Moyasar itself says failed/expired, no need to verify
    if (moyasarStatus === "failed" || moyasarStatus === "expired") {
      setStatus("failed");
      setErrorMsg("لم يتم إتمام عملية الدفع");
      return;
    }

    if (!invoiceId) {
      setStatus("unknown");
      setErrorMsg("لم يتم العثور على معرّف الدفع");
      return;
    }

    // Always do server-side verification — never trust status query param alone
    fetch(`/api/payments/verify/${invoiceId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { status: string; plan?: string }) => {
        if (data.status === "paid") {
          setStatus("paid");
          if (data.plan) setPlan(data.plan);
        } else if (data.status === "pending") {
          // Webhook may still be in flight — show pending state
          setStatus("loading");
          setErrorMsg("جاري تأكيد الدفع من البوابة...");
        } else {
          setStatus("failed");
          setErrorMsg("لم يتم تأكيد الدفع من البوابة");
        }
      })
      .catch((err) => {
        // Verification call failed (network, auth) — show failure, do NOT fake success
        console.error("[payment-callback] verify error:", err);
        setStatus("failed");
        setErrorMsg("تعذّر التحقق من حالة الدفع، يرجى التواصل مع الدعم");
      });
  }, []);

  const planLabel =
    plan === "pro"        ? "الاحترافية" :
    plan === "enterprise" ? "مؤسسات"     : "";

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
                تم تفعيل الباقة {planLabel}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              ستنعكس التغييرات على حسابك خلال دقائق
            </p>
            <Button
              className="w-full"
              onClick={() => navigate("/dashboard")}
              data-testid="button-go-dashboard"
            >
              الذهاب للوحة التحكم
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
