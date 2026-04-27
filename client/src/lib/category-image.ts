const BASE = "/category-images";

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  "نظارات": `${BASE}/eyewear.jpg`,
  "عطور": `${BASE}/perfume.jpg`,
  "ملابس": `${BASE}/clothing.jpg`,
  "أحذية": `${BASE}/shoes.jpg`,
  "قهوة": `${BASE}/coffee.jpg`,
  "مواد غذائية": `${BASE}/food.jpg`,
  "إلكترونيات": `${BASE}/electronics.jpg`,
  "أدوات منزلية": `${BASE}/home-goods.jpg`,
  "مستحضرات تجميل": `${BASE}/cosmetics.jpg`,
  "مجوهرات": `${BASE}/jewelry.jpg`,
  "ألعاب أطفال": `${BASE}/toys.jpg`,
  "أثاث": `${BASE}/furniture.jpg`,
  "قرطاسية": `${BASE}/stationery.jpg`,
  "رياضة": `${BASE}/sports.jpg`,
  "سيارات وقطع غيار": `${BASE}/auto-parts.jpg`,
  "هدايا": `${BASE}/gifts.jpg`,
  "تغليف": `${BASE}/packaging.jpg`,
  "كراتين": `${BASE}/packaging.jpg`,
  "أخرى": `${BASE}/general.jpg`,
};

const SUPPLIER_TYPE_IMAGE_MAP: Record<string, string> = {
  "مصنع": `${BASE}/factory.jpg`,
  "جملة": `${BASE}/wholesale.jpg`,
  "تاجر": `${BASE}/general.jpg`,
};

export const GENERAL_FALLBACK_IMAGE = `${BASE}/general.jpg`;

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

const KEYWORD_HINTS: Array<{ keys: string[]; image: string }> = [
  { keys: ["نظار", "شمسي", "eyewear", "sunglass"], image: CATEGORY_IMAGE_MAP["نظارات"] },
  { keys: ["عطر", "عطور", "perfume", "fragrance"], image: CATEGORY_IMAGE_MAP["عطور"] },
  { keys: ["ملابس", "ملبوس", "قميص", "فستان", "أزياء", "clothing", "fashion", "apparel"], image: CATEGORY_IMAGE_MAP["ملابس"] },
  { keys: ["حذاء", "أحذية", "حذيه", "shoe", "sneaker", "boot"], image: CATEGORY_IMAGE_MAP["أحذية"] },
  { keys: ["قهوة", "بن", "كوفي", "coffee"], image: CATEGORY_IMAGE_MAP["قهوة"] },
  { keys: ["غذاء", "غذائي", "أطعمة", "تموينات", "food", "grocery"], image: CATEGORY_IMAGE_MAP["مواد غذائية"] },
  { keys: ["إلكترون", "الكترون", "هواتف", "جوال", "electronic", "phone", "gadget"], image: CATEGORY_IMAGE_MAP["إلكترونيات"] },
  { keys: ["منزلي", "أدوات منزل", "مطبخ", "home", "kitchen", "household"], image: CATEGORY_IMAGE_MAP["أدوات منزلية"] },
  { keys: ["تجميل", "ميكب", "مكياج", "cosmetic", "makeup", "beauty"], image: CATEGORY_IMAGE_MAP["مستحضرات تجميل"] },
  { keys: ["مجوهر", "ذهب", "فضة", "إكسسوار", "jewel", "gold", "accessor"], image: CATEGORY_IMAGE_MAP["مجوهرات"] },
  { keys: ["لعب", "ألعاب", "أطفال", "toy", "kid"], image: CATEGORY_IMAGE_MAP["ألعاب أطفال"] },
  { keys: ["أثاث", "كرسي", "طاولة", "كنبة", "furniture", "sofa"], image: CATEGORY_IMAGE_MAP["أثاث"] },
  { keys: ["قرطاس", "مكتبية", "stationer", "office supply"], image: CATEGORY_IMAGE_MAP["قرطاسية"] },
  { keys: ["رياض", "جيم", "sport", "gym", "fitness"], image: CATEGORY_IMAGE_MAP["رياضة"] },
  { keys: ["سيار", "قطع غيار", "auto", "car", "vehicle"], image: CATEGORY_IMAGE_MAP["سيارات وقطع غيار"] },
  { keys: ["هدايا", "هدية", "gift"], image: CATEGORY_IMAGE_MAP["هدايا"] },
  { keys: ["تغليف", "كرتون", "كراتين", "packag", "box", "carton"], image: CATEGORY_IMAGE_MAP["تغليف"] },
  { keys: ["مصنع", "factory", "manufactur"], image: SUPPLIER_TYPE_IMAGE_MAP["مصنع"] },
  { keys: ["جملة", "موزع", "مستودع", "wholesale", "warehouse"], image: SUPPLIER_TYPE_IMAGE_MAP["جملة"] },
  { keys: ["سبح", "tasbih", "rosary"], image: CATEGORY_IMAGE_MAP["هدايا"] },
];

export function getCategoryImage(
  category?: string | null,
  supplierType?: string | null,
  extraText?: string | null,
): string {
  if (category && CATEGORY_IMAGE_MAP[category.trim()]) {
    return CATEGORY_IMAGE_MAP[category.trim()];
  }
  const haystack = `${normalize(category)} ${normalize(extraText)} ${normalize(supplierType)}`.trim();
  if (haystack) {
    for (const hint of KEYWORD_HINTS) {
      if (hint.keys.some((k) => haystack.includes(k.toLowerCase()))) {
        return hint.image;
      }
    }
  }
  if (supplierType && SUPPLIER_TYPE_IMAGE_MAP[supplierType.trim()]) {
    return SUPPLIER_TYPE_IMAGE_MAP[supplierType.trim()];
  }
  return GENERAL_FALLBACK_IMAGE;
}

export function resolveImage(
  imageUrl?: string | null,
  category?: string | null,
  supplierType?: string | null,
  extraText?: string | null,
): string {
  if (imageUrl && imageUrl.trim()) return imageUrl;
  return getCategoryImage(category, supplierType, extraText);
}
