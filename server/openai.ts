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
