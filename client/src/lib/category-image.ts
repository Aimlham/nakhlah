export function hasImage(imageUrl?: string | null): boolean {
  return !!(imageUrl && imageUrl.trim());
}

const AVATAR_PALETTE = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
];

export function pickAvatarColor(seed: string): { bg: string; text: string } {
  const s = seed || "";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function getInitial(title?: string | null): string {
  const trimmed = (title || "").trim();
  if (!trimmed) return "ن";
  const skipWords = ["شركة", "مؤسسة", "متجر", "مصنع", "محل", "ال"];
  for (const word of trimmed.split(/\s+/)) {
    if (skipWords.includes(word)) continue;
    const cleaned = word.replace(/^ال/, "");
    if (cleaned.length > 0) return cleaned.charAt(0);
  }
  return trimmed.charAt(0);
}
