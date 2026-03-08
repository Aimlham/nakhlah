import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const hash = window.location.hash;
const params = new URLSearchParams(window.location.search);

if (hash.includes("access_token") && window.location.pathname !== "/auth/callback") {
  window.location.replace("/auth/callback" + hash);
} else if (params.has("error") && params.has("error_code")) {
  const desc = params.get("error_description") || "حدث خطأ في تسجيل الدخول";
  window.location.replace("/login?auth_error=" + encodeURIComponent(desc.replace(/\+/g, " ")));
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
