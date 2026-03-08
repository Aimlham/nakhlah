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

export interface CJSearchResult {
  products: CJProduct[];
  totalRecords: number;
  totalPages: number;
  page: number;
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
  const supplierPrice = parseFloat(product.nowPrice || product.sellPrice);
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
