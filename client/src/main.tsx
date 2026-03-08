import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (
  window.location.hash.includes("access_token") &&
  window.location.pathname !== "/auth/callback"
) {
  window.location.replace("/auth/callback" + window.location.hash);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
