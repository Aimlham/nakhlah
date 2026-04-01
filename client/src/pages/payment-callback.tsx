import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "paid" | "failed" | "unknown";

export default function PaymentCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("status");
    const paymentId = params.get("id");

    if (paymentStatus === "paid" && paymentId) {
      fetch(`/api/payments/verify/${paymentId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "paid") {
            setStatus("paid");
            setMessage(data.description || "تم الدفع بنجاح");
          } else {
            setStatus("failed");
            setMessage("لم يتم تأكيد الدفع من البوابة");
          }
        })
        .catch(() => {
          setStatus("paid");
          setMessage("تم الدفع بنجاح");
        });
    } else if (paymentStatus === "failed" || paymentStatus === "rejected") {
      setStatus("failed");
      setMessage("لم يتم إتمام عملية الدفع");
    } else {
      setStatus("unknown");
      setMessage("حالة الدفع غير معروفة");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="max-w-md w-full mx-auto p-8 text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">جاري التحقق من الدفع...</h2>
          </>
        )}

        {status === "paid" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" data-testid="icon-payment-success" />
            <h2 className="text-2xl font-bold">تم الدفع بنجاح!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">
              تم تفعيل باقتك. ستنعكس التغييرات على حسابك خلال دقائق.
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
            <XCircle className="w-16 h-16 text-destructive mx-auto" data-testid="icon-payment-failed" />
            <h2 className="text-2xl font-bold">لم يتم إتمام الدفع</h2>
            <p className="text-muted-foreground">{message}</p>
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
