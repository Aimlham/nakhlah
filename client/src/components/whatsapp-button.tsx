import { SiWhatsapp } from "react-icons/si";

const WHATSAPP_NUMBER = "966532531583";
const DEFAULT_MESSAGE = "السلام عليكم، أحتاج مساعدة من خدمة عملاء نخلة";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      data-testid="link-whatsapp-support"
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full shadow-lg shadow-black/20 px-4 py-3 transition-all hover:scale-105 active:scale-95"
    >
      <SiWhatsapp className="w-6 h-6" />
      <span className="hidden sm:inline text-sm font-medium" data-testid="text-whatsapp-label">
        خدمة العملاء
      </span>
    </a>
  );
}
