import { storage, checkHalalSafe } from "./storage";
import { calculateMargin, calculateTrendScore, calculateSaturationScore, calculateOpportunityScore } from "@shared/scoring";
import type { InsertProduct, Product } from "@shared/schema";

const USD_TO_SAR = 3.75;

const FRAGILE_KEYWORDS = ["glass", "ceramic", "porcelain", "crystal", "fragile"];
const HEAVY_KEYWORDS = ["heavy", "oversized", "large furniture", "industrial"];

interface AliExpressSearchOptions {
  keyword: string;
  halalOnly?: boolean;
  minOrders?: number;
  minRating?: number;
  maxPages?: number;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  unsafe: number;
  duplicate: number;
  errors: string[];
  source: "aliexpress";
  apiActive: boolean;
}

interface AliExpressRawProduct {
  product_id?: string | number;
  product_title?: string;
  product_main_image_url?: string;
  product_detail_url?: string;
  app_sale_price?: string;
  original_price?: string;
  sale_price?: string;
  target_sale_price?: string;
  target_original_price?: string;
  discount?: string;
  evaluate_rate?: string;
  first_level_category_name?: string;
  second_level_category_name?: string;
  shop_name?: string;
  shop_url?: string;
  orders?: string | number;
  product_video_url?: string;
  commission_rate?: string;
  relevant_market_commission_rate?: string;
}

function parseOrders(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (raw.toLowerCase().includes("k")) return Math.round(num * 1000);
  return Math.round(num) || 0;
}

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0;
  const match = raw.replace(/[^0-9.]/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseRating(raw: string | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function isFragileOrHeavy(title: string): boolean {
  const lower = title.toLowerCase();
  return [...FRAGILE_KEYWORDS, ...HEAVY_KEYWORDS].some(kw => lower.includes(kw));
}

function normalizeCategory(raw: string | undefined): string {
  if (!raw) return "General";
  const map: Record<string, string> = {
    "consumer electronics": "Electronics",
    "phones & telecommunications": "Electronics",
    "computer & office": "Electronics",
    "home & garden": "Home & Living",
    "home improvement": "Home & Living",
    "jewelry & accessories": "Accessories",
    "women's clothing": "Fashion",
    "men's clothing": "Fashion",
    "mother & kids": "Kids",
    "toys & hobbies": "Toys",
    "sports & entertainment": "Sports",
    "beauty & health": "Beauty",
    "automobiles & motorcycles": "Automotive",
    "luggage & bags": "Fashion",
    "shoes": "Fashion",
    "pet products": "Pet Supplies",
  };
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return raw;
}

function mapAliExpressToProduct(raw: AliExpressRawProduct): {
  insert: InsertProduct;
  ordersNum: number;
  ratingNum: number;
} | null {
  const title = raw.product_title?.trim();
  if (!title) return null;

  const supplierPriceUSD = parsePrice(raw.original_price || raw.sale_price || raw.app_sale_price);
  const salePriceUSD = parsePrice(raw.app_sale_price || raw.target_sale_price || raw.sale_price);
  if (supplierPriceUSD <= 0 && salePriceUSD <= 0) return null;

  const effectiveSupplierUSD = supplierPriceUSD > 0 ? supplierPriceUSD : salePriceUSD;
  const supplierSAR = parseFloat((effectiveSupplierUSD * USD_TO_SAR).toFixed(2));

  const multiplier = effectiveSupplierUSD < 5 ? 3.5 : effectiveSupplierUSD < 15 ? 3 : effectiveSupplierUSD < 30 ? 2.5 : 2;
  const suggestedSAR = parseFloat((effectiveSupplierUSD * multiplier * USD_TO_SAR).toFixed(2));
  const actualSellSAR = salePriceUSD > 0
    ? parseFloat((salePriceUSD * USD_TO_SAR).toFixed(2))
    : suggestedSAR;

  const margin = calculateMargin(supplierSAR, suggestedSAR);
  const ordersNum = parseOrders(raw.orders);
  const ratingNum = parseRating(raw.evaluate_rate);
  const category = normalizeCategory(raw.first_level_category_name);

  const isHalal = checkHalalSafe({ title, description: "", category, niche: raw.second_level_category_name || "" });

  const trendScore = calculateTrendScore({
    supplierPrice: supplierSAR,
    sellPrice: suggestedSAR,
    margin,
    category,
    niche: raw.second_level_category_name,
  });

  const saturationScore = calculateSaturationScore({
    supplierPrice: supplierSAR,
    sellPrice: suggestedSAR,
    margin,
    category,
  });

  const opportunityScore = calculateOpportunityScore(trendScore, saturationScore, margin, ratingNum > 0 ? ratingNum : null);

  const productId = raw.product_id ? String(raw.product_id) : "";
  const supplierLink = raw.product_detail_url || (productId ? `https://aliexpress.com/item/${productId}.html` : "");

  const insert: InsertProduct = {
    title,
    imageUrl: raw.product_main_image_url || null,
    shortDescription: null,
    category,
    niche: raw.second_level_category_name || null,
    sourcePlatform: "AliExpress",
    source: "aliexpress",
    supplierPrice: String(supplierSAR),
    suggestedSellPrice: String(suggestedSAR),
    actualSellPrice: String(actualSellSAR),
    estimatedMargin: String(margin),
    ordersCount: ordersNum,
    rating: ratingNum > 0 ? String(ratingNum) : null,
    supplierName: raw.shop_name || null,
    isHalalSafe: isHalal,
    discoverySource: "aliexpress",
    supplierSource: "aliexpress",
    trendScore,
    saturationScore,
    opportunityScore,
    aiSummary: null,
    supplierLink,
  };

  return { insert, ordersNum, ratingNum };
}

async function fetchAliExpressProducts(keyword: string, _page: number = 1): Promise<AliExpressRawProduct[]> {
  const apiKey = process.env.ALIEXPRESS_API_KEY;
  if (!apiKey) {
    console.log("[aliexpress] No ALIEXPRESS_API_KEY set. To enable live AliExpress imports, add a RapidAPI key for an AliExpress data endpoint.");
    return [];
  }

  try {
    const url = `https://aliexpress-datahub.p.rapidapi.com/item_search?q=${encodeURIComponent(keyword)}&page=${_page}&sort=default`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "aliexpress-datahub.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[aliexpress] API error:", response.status, text.slice(0, 200));
      return [];
    }

    const data = await response.json() as any;
    const items = data?.result?.resultList || data?.result?.products || data?.items || [];
    if (!Array.isArray(items)) {
      console.log("[aliexpress] Unexpected API response shape:", Object.keys(data || {}).join(", "));
      return [];
    }

    return items.map((item: any) => ({
      product_id: item.productId || item.product_id || item.itemId,
      product_title: item.productTitle || item.product_title || item.title,
      product_main_image_url: item.productMainImageUrl || item.product_main_image_url || item.imageUrl,
      product_detail_url: item.productDetailUrl || item.product_detail_url,
      app_sale_price: item.appSalePrice || item.app_sale_price || item.salePrice,
      original_price: item.originalPrice || item.original_price || item.price,
      sale_price: item.salePrice || item.sale_price,
      evaluate_rate: item.evaluateRate || item.evaluate_rate || item.starRating || item.averageStar,
      first_level_category_name: item.firstLevelCategoryName || item.first_level_category_name || item.categoryName,
      second_level_category_name: item.secondLevelCategoryName || item.second_level_category_name,
      shop_name: item.shopName || item.shop_name || item.storeName,
      orders: item.orders || item.totalOrders || item.tradeCount || "0",
    }));
  } catch (err: any) {
    console.error("[aliexpress] Fetch error:", err.message);
    return [];
  }
}

async function checkDuplicate(title: string, source: string): Promise<boolean> {
  try {
    const allProducts = await storage.getAllProducts();
    const normalizedTitle = title.toLowerCase().trim();
    return allProducts.some(p => {
      if (p.source !== source) return false;
      const existingTitle = (p.title || "").toLowerCase().trim();
      if (existingTitle === normalizedTitle) return true;
      if (normalizedTitle.length > 20 && existingTitle.length > 20) {
        const words1 = new Set(normalizedTitle.split(/\s+/));
        const words2 = new Set(existingTitle.split(/\s+/));
        const intersection = [...words1].filter(w => words2.has(w));
        const similarity = intersection.length / Math.max(words1.size, words2.size);
        return similarity > 0.8;
      }
      return false;
    });
  } catch {
    return false;
  }
}

export async function importAliExpressProducts(options: AliExpressSearchOptions): Promise<ImportSummary> {
  const {
    keyword,
    halalOnly = false,
    minOrders = 50,
    minRating = 4.0,
    maxPages = 1,
  } = options;

  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    unsafe: 0,
    duplicate: 0,
    errors: [],
    source: "aliexpress",
    apiActive: false,
  };

  const apiKey = process.env.ALIEXPRESS_API_KEY;
  if (!apiKey) {
    summary.errors.push("ALIEXPRESS_API_KEY not configured. Add a RapidAPI key to enable live imports.");
    return summary;
  }

  summary.apiActive = true;
  let allRaw: AliExpressRawProduct[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const pageResults = await fetchAliExpressProducts(keyword, page);
    if (pageResults.length === 0) break;
    allRaw = allRaw.concat(pageResults);
  }

  if (allRaw.length === 0) {
    summary.errors.push("No products returned from AliExpress API");
    return summary;
  }

  console.log(`[aliexpress] Fetched ${allRaw.length} raw products for "${keyword}"`);

  for (const raw of allRaw) {
    try {
      const mapped = mapAliExpressToProduct(raw);
      if (!mapped) {
        summary.skipped++;
        continue;
      }

      const { insert, ordersNum, ratingNum } = mapped;

      if (!insert.isHalalSafe) {
        summary.unsafe++;
        if (halalOnly) {
          summary.skipped++;
          continue;
        }
      }

      if (ordersNum < minOrders) {
        summary.skipped++;
        continue;
      }

      if (ratingNum > 0 && ratingNum < minRating) {
        summary.skipped++;
        continue;
      }

      if (isFragileOrHeavy(insert.title)) {
        summary.skipped++;
        continue;
      }

      const isDuplicate = await checkDuplicate(insert.title, "aliexpress");
      if (isDuplicate) {
        summary.duplicate++;
        continue;
      }

      await storage.createProduct(insert);
      summary.imported++;
    } catch (err: any) {
      summary.errors.push(err.message || "Unknown import error");
    }
  }

  console.log(`[aliexpress] Import complete: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.unsafe} unsafe, ${summary.duplicate} duplicates`);
  return summary;
}

export function getAliExpressStatus(): {
  active: boolean;
  configured: boolean;
  message: string;
} {
  const hasKey = !!process.env.ALIEXPRESS_API_KEY;
  return {
    active: hasKey,
    configured: hasKey,
    message: hasKey
      ? "AliExpress importer is active and ready"
      : "AliExpress importer requires ALIEXPRESS_API_KEY (RapidAPI). Add the key to enable live imports.",
  };
}
