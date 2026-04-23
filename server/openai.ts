import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProductInput {
  title: string;
  category: string;
  niche: string | null;
  shortDescription: string | null;
  supplierPrice: string | null;
  suggestedSellPrice: string | null;
  estimatedMargin: string | null;
  trendScore: number | null;
  saturationScore: number | null;
  sourcePlatform: string | null;
}

export async function generateProductAnalysis(product: ProductInput): Promise<string> {
  const prompt = `أنت محلل منتجات خبير في مجال الدروبشيبينق والتجارة الإلكترونية. حلل المنتج التالي وأعطني تحليلاً شاملاً بالعربية.

بيانات المنتج:
- الاسم: ${product.title}
- الفئة: ${product.category}
- التخصص: ${product.niche || "غير محدد"}
- الوصف: ${product.shortDescription || "غير متوفر"}
- سعر المورّد: $${product.supplierPrice || "غير محدد"}
- سعر البيع المقترح: $${product.suggestedSellPrice || "غير محدد"}
- هامش الربح: ${product.estimatedMargin || "غير محدد"}%
- درجة الرواج: ${product.trendScore || "غير محدد"}/100
- درجة التشبّع: ${product.saturationScore || "غير محدد"}/100
- منصة التوريد: ${product.sourcePlatform || "غير محدد"}

أريد الإجابة بتنسيق JSON فقط بدون أي نص إضافي. الحقول المطلوبة:
{
  "whyPromising": "فقرة مفصلة عن سبب كون هذا المنتج واعداً للبيع، تتضمن تحليل السوق والطلب والمنافسة (3-4 جمل)",
  "targetAudience": "وصف تفصيلي للجمهور المستهدف يشمل الفئة العمرية والاهتمامات والسلوك الشرائي (2-3 جمل)",
  "adAngles": ["زاوية إعلانية 1", "زاوية إعلانية 2", "زاوية إعلانية 3"],
  "hooks": ["عبارة تسويقية جذابة 1", "عبارة تسويقية جذابة 2", "عبارة تسويقية جذابة 3"]
}

ملاحظات مهمة:
- جميع النصوص يجب أن تكون بالعربية الفصحى المبسطة
- الزوايا الإعلانية يجب أن تكون مختصرة وقوية (جملة واحدة لكل زاوية)
- العبارات التسويقية يجب أن تكون بأسلوب شخصي مثل تجارب حقيقية
- لا تضف أي نص قبل أو بعد الـ JSON`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("لم يتم الحصول على رد من الذكاء الاصطناعي");
  }

  JSON.parse(content);
  return content;
}

export interface ExtractedSupplier {
  supplierName: string | null;
  supplierPhone: string | null;
  supplierWhatsapp: string | null;
  supplierCity: string | null;
  supplierType: string | null;
  category: string | null;
  supplierLocation: string | null;
  description: string | null;
  title: string | null;
}

export async function extractSupplierFromImage(imageBase64: string, mimeType: string): Promise<ExtractedSupplier> {
  const prompt = `أنت مساعد متخصص في استخراج بيانات الموردين من الصور (كروت تجارية، بروشورات، إعلانات، لقطات شاشة، أوراق).
حلل الصورة المرفقة واستخرج بيانات المورد بدقة. أعد JSON فقط بهذه الحقول بالضبط، واترك أي حقل غير واضح أو غير موجود = null. لا تخمّن أبداً ولا تضع قيماً افتراضية.

{
  "title": "اسم العمل/المتجر/المصنع كعنوان للبطاقة (نفس supplierName عادة)",
  "supplierName": "اسم المورد أو الشركة أو المصنع",
  "supplierPhone": "رقم الهاتف (يبدأ بـ +966 أو 05 - بصيغة دولية إن أمكن)",
  "supplierWhatsapp": "رقم واتساب إن وُجد بشكل منفصل، وإلا null",
  "supplierCity": "المدينة فقط (الرياض، جدة، الدمام، ...)",
  "supplierType": "نوع النشاط: مصنع | تاجر جملة | موزع | مستودع | متجر | مصنع وتصنيع",
  "category": "التصنيف: ملابس، أحذية، إلكترونيات، أغذية، مستحضرات تجميل، عطور، أثاث، مجوهرات، ألعاب أطفال، أدوات منزلية، قرطاسية، رياضة، سيارات وقطع غيار، هدايا، أخرى",
  "supplierLocation": "العنوان الكامل أو رابط الموقع الجغرافي إن وُجد",
  "description": "وصف مختصر للنشاط بالعربية (سطر أو سطرين فقط)"
}

قواعد:
- إذا لم تجد رقم واتساب صريح، انسخ نفس رقم الهاتف فيه.
- نظّف الأرقام: احذف المسافات والشُرَط، احتفظ بالأرقام و+ فقط.
- لا تخترع بيانات. الحقول غير الواضحة = null.
- أعد JSON فقط بدون أي نص آخر.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("لم يتم الحصول على رد من الذكاء الاصطناعي");

  const parsed = JSON.parse(content) as Record<string, unknown>;
  const clean = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "null" || s === "غير محدد" || s === "غير متوفر") return null;
    return s;
  };
  const phone = normalizeSaudiPhone(clean(parsed.supplierPhone));
  const wa = normalizeSaudiPhone(clean(parsed.supplierWhatsapp)) ?? phone;
  return {
    title: clean(parsed.title) ?? clean(parsed.supplierName),
    supplierName: clean(parsed.supplierName),
    supplierPhone: phone,
    supplierWhatsapp: wa,
    supplierCity: clean(parsed.supplierCity),
    supplierType: normalizeSupplierType(clean(parsed.supplierType)),
    category: normalizeCategory(clean(parsed.category)),
    supplierLocation: clean(parsed.supplierLocation),
    description: clean(parsed.description),
  };
}

export const ALLOWED_CATEGORIES = [
  "نظارات",
  "عطور",
  "ملابس",
  "أحذية",
  "قهوة",
  "مواد غذائية",
  "إلكترونيات",
  "أدوات منزلية",
  "مستحضرات تجميل",
  "مجوهرات",
  "ألعاب أطفال",
  "أثاث",
  "قرطاسية",
  "رياضة",
  "سيارات وقطع غيار",
  "هدايا",
  "أخرى",
] as const;

export const ALLOWED_SUPPLIER_TYPES = ["مصنع", "جملة", "تاجر"] as const;

const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ["نظارات", ["نظار", "شمسي", "بصر", "عدسة", "عدسات"]],
  ["عطور", ["عطر", "عطور", "perfume", "fragrance", "بخور", "عود"]],
  ["قهوة", ["قهوة", "كوفي", "coffee", "بن", "اسبريس", "كافيه"]],
  ["مواد غذائية", ["غذائ", "أغذية", "اغذية", "تموين", "بقال", "food"]],
  ["مستحضرات تجميل", ["تجميل", "مكياج", "ميكاب", "كريم", "cosmetic", "makeup"]],
  ["إلكترونيات", ["إلكترون", "الكترون", "موبايل", "جوال", "كمبيوتر", "تك", "tech", "electronic", "شاشة", "اكسسوار جوال"]],
  ["أحذية", ["حذاء", "أحذية", "اساو", "shoe", "بوت"]],
  ["ملابس", ["ملاب", "ثياب", "قميص", "فستان", "عبا", "بنطلون", "تيشيرت", "cloth", "fashion", "أزياء"]],
  ["أدوات منزلية", ["منزل", "منزلية", "مطبخ", "kitchen", "home"]],
  ["مجوهرات", ["مجوهر", "ذهب", "فضة", "اكسسوار"]],
  ["ألعاب أطفال", ["لعب", "ألعاب", "أطفال", "toy"]],
  ["أثاث", ["أثاث", "اثاث", "كنب", "طاولة", "furniture"]],
  ["قرطاسية", ["قرطاس", "مكتب", "stationery"]],
  ["رياضة", ["رياض", "جيم", "sport", "fitness"]],
  ["سيارات وقطع غيار", ["سيار", "قطع غيار", "car", "auto"]],
  ["هدايا", ["هدي", "gift"]],
];

const SUPPLIER_TYPE_KEYWORDS: Array<[string, string[]]> = [
  ["مصنع", ["مصنع", "تصنيع", "factory", "manufactur", "ورشة"]],
  ["جملة", ["جملة", "جمله", "wholesale", "موزع", "توزيع", "distributor", "مستودع", "warehouse"]],
  ["تاجر", ["تاجر", "متجر", "محل", "shop", "store", "retail"]],
];

export function normalizeCategory(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  for (const [canonical, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => s.includes(k.toLowerCase()))) return canonical;
  }
  if ((ALLOWED_CATEGORIES as readonly string[]).includes(raw.trim())) return raw.trim();
  return "أخرى";
}

export function normalizeSupplierType(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  for (const [canonical, keywords] of SUPPLIER_TYPE_KEYWORDS) {
    if (keywords.some((k) => s.includes(k.toLowerCase()))) return canonical;
  }
  if ((ALLOWED_SUPPLIER_TYPES as readonly string[]).includes(raw.trim())) return raw.trim();
  return null;
}

export function normalizeSaudiPhone(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (digits.startsWith("+966")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("966")) digits = "0" + digits.slice(3);
  digits = digits.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("5")) digits = "0" + digits;
  if (!/^05\d{8}$/.test(digits)) return null;
  return digits;
}
