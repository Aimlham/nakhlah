import OpenAI from "openai";
import fs from "fs";
import path from "path";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const TOKEN_FILE = path.join(process.cwd(), ".cj-token.json");

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function saveTokenToFile(token: CachedToken) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(token), "utf-8");
  } catch {}
}

function loadTokenFromFile(): CachedToken | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      if (data.accessToken && data.expiresAt) return data;
    }
  } catch {}
  return null;
}

async function getAccessToken(): Promise<string> {
  if (!cachedToken) {
    cachedToken = loadTokenFromFile();
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  if (cachedToken?.refreshToken) {
    try {
      const res = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: cachedToken.refreshToken }),
      });
      const json = await res.json() as any;
      if (json.code === 200 && json.data) {
        cachedToken = {
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
          expiresAt: new Date(json.data.accessTokenExpiryDate).getTime() - 60000,
        };
        saveTokenToFile(cachedToken);
        return cachedToken.accessToken;
      }
    } catch {}
  }

  const rawKey = process.env.CJ_API_TOKEN;
  if (!rawKey) throw new Error("CJ_API_TOKEN not configured");
  const apiKey = rawKey.replace(/<[^>]*>/g, "").trim();

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = await res.json() as any;
  if (json.code !== 200 || !json.data) {
    throw new Error(`CJ Auth failed: ${json.message}`);
  }

  cachedToken = {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    expiresAt: new Date(json.data.accessTokenExpiryDate).getTime() - 60000,
  };
  saveTokenToFile(cachedToken);
  return cachedToken.accessToken;
}

async function cjGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const token = await getAccessToken();
  const url = new URL(`${CJ_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "CJ-Access-Token": token },
  });
  if (!res.ok) {
    throw new Error(`CJ API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json;
}

export interface CJProduct {
  id: string;
  nameEn: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  listedNum: number;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  description?: string;
  addMarkStatus: number;
  createAt: number;
}

export interface CJProductEnriched extends CJProduct {
  nameAr?: string;
  winningScore: number;
  demandLevel: string;
  competitionLevel: string;
  profitMarginPercent: number;
  supplierPriceSAR: number;
  suggestedPriceSAR: number;
  estimatedProfitSAR: number;
}

export interface CJSearchResult {
  products: CJProduct[];
  totalRecords: number;
  totalPages: number;
  page: number;
}

export interface CJWinningResult {
  products: CJProductEnriched[];
  totalRecords: number;
  totalPages: number;
  page: number;
}

const USD_TO_SAR = 3.75;

function extractNumericPrice(price: string): number {
  const cleaned = (price || "0").replace(/\s+/g, "");
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function enrichProduct(product: CJProduct): CJProductEnriched {
  const supplierUSD = extractNumericPrice(product.nowPrice || product.sellPrice);
  const supplierPriceSAR = parseFloat((supplierUSD * USD_TO_SAR).toFixed(2));
  const multiplier = supplierUSD < 5 ? 3.5 : supplierUSD < 15 ? 3 : supplierUSD < 30 ? 2.5 : 2;
  const suggestedPriceSAR = parseFloat((supplierUSD * multiplier * USD_TO_SAR).toFixed(2));
  const estimatedProfitSAR = parseFloat((suggestedPriceSAR - supplierPriceSAR).toFixed(2));
  const profitMarginPercent = suggestedPriceSAR > 0
    ? parseFloat((((suggestedPriceSAR - supplierPriceSAR) / suggestedPriceSAR) * 100).toFixed(1))
    : 0;

  const listedNum = product.listedNum || 0;

  let demandScore = 0;
  if (listedNum > 5000) demandScore = 95;
  else if (listedNum > 2000) demandScore = 80;
  else if (listedNum > 1000) demandScore = 70;
  else if (listedNum > 500) demandScore = 60;
  else if (listedNum > 100) demandScore = 45;
  else demandScore = 25;

  let competitionScore = 0;
  if (listedNum > 10000) competitionScore = 90;
  else if (listedNum > 5000) competitionScore = 70;
  else if (listedNum > 2000) competitionScore = 55;
  else if (listedNum > 500) competitionScore = 35;
  else competitionScore = 15;

  const marginScore = Math.min(100, profitMarginPercent * 1.2);
  const winningScore = Math.round(
    demandScore * 0.45 +
    (100 - competitionScore) * 0.25 +
    marginScore * 0.30
  );

  const demandLevel = demandScore >= 70 ? "عالي" : demandScore >= 45 ? "متوسط" : "منخفض";
  const competitionLevel = competitionScore >= 60 ? "عالية" : competitionScore >= 35 ? "متوسطة" : "منخفضة";

  return {
    ...product,
    winningScore: Math.min(99, Math.max(10, winningScore)),
    demandLevel,
    competitionLevel,
    profitMarginPercent,
    supplierPriceSAR,
    suggestedPriceSAR,
    estimatedProfitSAR,
  };
}

interface CachedTrending {
  data: CJWinningResult;
  timestamp: number;
}

const trendingCache: Record<string, CachedTrending> = {};
const CACHE_TTL = 30 * 60 * 1000;

export async function getWinningProducts(options: {
  keyword?: string;
  page?: number;
  size?: number;
  sort?: "winning" | "demand" | "profit" | "competition";
}): Promise<CJWinningResult> {
  const cacheKey = `${options.keyword || ""}_${options.page || 1}_${options.size || 20}_${options.sort || "winning"}`;
  const cached = trendingCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const raw = await searchCJProducts({
    keyword: options.keyword,
    page: options.page,
    size: options.size || 20,
    productFlag: 0,
  });

  let enriched = raw.products.map(enrichProduct);

  const sort = options.sort || "winning";
  if (sort === "winning") enriched.sort((a, b) => b.winningScore - a.winningScore);
  else if (sort === "demand") enriched.sort((a, b) => b.listedNum - a.listedNum);
  else if (sort === "profit") enriched.sort((a, b) => b.estimatedProfitSAR - a.estimatedProfitSAR);
  else if (sort === "competition") enriched.sort((a, b) => a.listedNum - b.listedNum);

  const result: CJWinningResult = {
    products: enriched,
    totalRecords: raw.totalRecords,
    totalPages: raw.totalPages,
    page: raw.page,
  };

  trendingCache[cacheKey] = { data: result, timestamp: Date.now() };
  return result;
}

export async function searchCJProducts(options: {
  keyword?: string;
  page?: number;
  size?: number;
  productFlag?: number;
  categoryId?: string;
}): Promise<CJSearchResult> {
  const params: Record<string, string> = {
    page: String(options.page || 1),
    size: String(options.size || 20),
  };
  if (options.keyword) params.keyWord = options.keyword;
  if (options.productFlag !== undefined) params.productFlag = String(options.productFlag);
  if (options.categoryId) params.categoryId = options.categoryId;
  params["features"] = "enable_category,enable_description";

  const json = await cjGet("/product/listV2", params);

  if (json.code !== 200 || !json.data) {
    throw new Error(`CJ search failed: ${json.message}`);
  }

  const content = json.data.content?.[0];
  const products: CJProduct[] = (content?.productList || []).map((p: any) => ({
    id: p.id,
    nameEn: p.nameEn,
    bigImage: p.bigImage,
    sellPrice: p.sellPrice,
    nowPrice: p.nowPrice || p.discountPrice || p.sellPrice,
    listedNum: p.listedNum || 0,
    threeCategoryName: p.threeCategoryName,
    twoCategoryName: p.twoCategoryName,
    oneCategoryName: p.oneCategoryName,
    description: p.description,
    addMarkStatus: p.addMarkStatus,
    createAt: p.createAt,
  }));

  return {
    products,
    totalRecords: json.data.totalRecords || 0,
    totalPages: json.data.totalPages || 0,
    page: json.data.pageNumber || 1,
  };
}

export async function getCJCategories(): Promise<any[]> {
  const json = await cjGet("/product/getCategory");
  if (json.code !== 200) throw new Error(`CJ categories failed: ${json.message}`);
  return json.data || [];
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function translateProductNamesToArabic(products: CJProduct[]): Promise<Record<string, string>> {
  if (!openai || products.length === 0) return {};

  const names = products.map((p, i) => `${i + 1}. ${p.nameEn}`).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `ترجم أسماء المنتجات التالية للعربية. أعد كائن JSON حيث المفتاح هو الرقم والقيمة هي الترجمة العربية المختصرة والجذابة:

${names}

مثال الناتج:
{"1": "اسم المنتج بالعربية", "2": "اسم آخر بالعربية"}`
      }],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return {};
    const parsed = JSON.parse(content);
    const result: Record<string, string> = {};
    products.forEach((p, i) => {
      if (parsed[String(i + 1)]) {
        result[p.id] = parsed[String(i + 1)];
      }
    });
    return result;
  } catch (err) {
    console.error("[cj] Batch translation failed:", err);
    return {};
  }
}

export async function translateProductToArabic(product: CJProduct): Promise<{
  title: string;
  shortDescription: string;
  category: string;
  niche: string;
}> {
  if (!openai) {
    return {
      title: product.nameEn,
      shortDescription: product.description?.slice(0, 200) || "",
      category: product.oneCategoryName || "أخرى",
      niche: product.threeCategoryName || "",
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: `ترجم بيانات المنتج التالي للعربية. أعطني JSON فقط:

اسم المنتج: ${product.nameEn}
الوصف: ${(product.description || "").slice(0, 500)}
الفئة الرئيسية: ${product.oneCategoryName || ""}
الفئة الفرعية: ${product.twoCategoryName || ""}
التخصص: ${product.threeCategoryName || ""}

أريد:
{
  "title": "اسم المنتج بالعربية (مختصر وجذاب، بدون تكرار)",
  "shortDescription": "وصف مختصر بالعربية 1-2 جملة يوضح فائدة المنتج",
  "category": "الفئة بالعربية (مثل: إلكترونيات، المنزل والمعيشة، الجمال، الصحة، المطبخ، الأزياء، مستلزمات الحيوانات، السفر، الرياضة، ألعاب)",
  "niche": "التخصص الدقيق بالعربية"
}`
    }],
    temperature: 0.3,
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Translation failed");
  try {
    return JSON.parse(content);
  } catch {
    return {
      title: product.nameEn,
      shortDescription: product.description?.slice(0, 200) || "",
      category: product.oneCategoryName || "أخرى",
      niche: product.threeCategoryName || "",
    };
  }
}

export function calculateProductScores(product: CJProduct): {
  trendScore: number;
  saturationScore: number;
  estimatedMargin: string;
  suggestedSellPrice: string;
} {
  const priceStr = (product.nowPrice || product.sellPrice || "0").replace(/\s+/g, "");
  const priceMatch = priceStr.match(/[\d.]+/);
  const supplierPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
  const suggestedMultiplier = supplierPrice < 5 ? 4 : supplierPrice < 15 ? 3 : supplierPrice < 30 ? 2.5 : 2;
  const suggestedSellPrice = (supplierPrice * suggestedMultiplier).toFixed(2);
  const margin = (((parseFloat(suggestedSellPrice) - supplierPrice) / parseFloat(suggestedSellPrice)) * 100).toFixed(1);

  const listedNum = product.listedNum || 0;
  let trendScore = 50;
  if (listedNum > 5000) trendScore = 95;
  else if (listedNum > 2000) trendScore = 85;
  else if (listedNum > 500) trendScore = 75;
  else if (listedNum > 100) trendScore = 65;
  else if (listedNum > 20) trendScore = 55;
  trendScore += Math.floor(Math.random() * 6) - 3;
  trendScore = Math.min(99, Math.max(30, trendScore));

  let saturationScore = 30;
  if (listedNum > 10000) saturationScore = 80;
  else if (listedNum > 5000) saturationScore = 65;
  else if (listedNum > 1000) saturationScore = 50;
  else if (listedNum > 200) saturationScore = 40;
  saturationScore += Math.floor(Math.random() * 8) - 4;
  saturationScore = Math.min(95, Math.max(15, saturationScore));

  return {
    trendScore,
    saturationScore,
    estimatedMargin: margin,
    suggestedSellPrice,
  };
}
