import { storage, checkHalalSafe } from "./storage";
import { calculateMargin, calculateTrendScore, calculateSaturationScore, calculateOpportunityScore } from "@shared/scoring";
import type { InsertProduct, Product } from "@shared/schema";

const USD_TO_SAR = 3.75;

const FRAGILE_KEYWORDS = ["glass", "ceramic", "porcelain", "crystal", "fragile"];
const HEAVY_KEYWORDS = ["heavy", "oversized", "large furniture", "industrial"];

const APIFY_ACTOR_ID = "epctex~aliexpress-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

interface AliExpressSearchOptions {
  keyword: string;
  halalOnly?: boolean;
  minOrders?: number;
  minRating?: number;
  maxResults?: number;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  unsafe: number;
  duplicate: number;
  totalFetched: number;
  errors: string[];
  source: "aliexpress";
  apiActive: boolean;
}

interface ApifyRawItem {
  id?: string | number;
  title?: string;
  name?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  price?: number | string;
  originalPrice?: number | string;
  salePrice?: number | string;
  discountPrice?: number | string;
  currency?: string;
  rating?: number | string;
  averageStar?: number | string;
  starRating?: number | string;
  reviews?: number | string;
  orders?: number | string;
  totalOrders?: number | string;
  soldCount?: number | string;
  storeName?: string;
  shopName?: string;
  sellerName?: string;
  storeUrl?: string;
  url?: string;
  productUrl?: string;
  link?: string;
  categoryName?: string;
  category?: string;
  categoryId?: string | number;
  [key: string]: unknown;
}

function parseOrders(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (raw.toLowerCase().includes("k")) return Math.round(num * 1000);
  return Math.round(num) || 0;
}

function parsePrice(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const match = raw.replace(/[^0-9.]/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseRating(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
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
    "phones": "Electronics",
    "computer & office": "Electronics",
    "home & garden": "Home & Living",
    "home improvement": "Home & Living",
    "jewelry & accessories": "Accessories",
    "jewelry": "Accessories",
    "women's clothing": "Fashion",
    "men's clothing": "Fashion",
    "mother & kids": "Kids",
    "toys & hobbies": "Toys",
    "sports & entertainment": "Sports",
    "beauty & health": "Beauty",
    "beauty": "Beauty",
    "automobiles & motorcycles": "Automotive",
    "luggage & bags": "Fashion",
    "shoes": "Fashion",
    "pet products": "Pet Supplies",
    "tools": "Tools",
    "lights & lighting": "Home & Living",
    "education & office supplies": "Office",
  };
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return raw;
}

function normalizeApifyItem(item: ApifyRawItem): {
  title: string;
  imageUrl: string | null;
  supplierPriceUSD: number;
  salePriceUSD: number;
  ordersNum: number;
  ratingNum: number;
  shopName: string | null;
  productUrl: string | null;
  category: string;
  productId: string;
} | null {
  const title = (item.title || item.name || "").trim();
  if (!title) return null;

  const supplierPriceUSD = parsePrice(item.originalPrice ?? item.price);
  const salePriceUSD = parsePrice(item.salePrice ?? item.discountPrice ?? item.price);
  if (supplierPriceUSD <= 0 && salePriceUSD <= 0) return null;

  const imageUrl = item.image || item.imageUrl || (item.images && item.images[0]) || null;
  const ordersNum = parseOrders(item.orders ?? item.totalOrders ?? item.soldCount);
  const ratingNum = parseRating(item.rating ?? item.averageStar ?? item.starRating);
  const shopName = item.storeName || item.shopName || item.sellerName || null;
  const productUrl = item.url || item.productUrl || item.link || null;
  const category = normalizeCategory(item.categoryName || item.category);
  const productId = item.id ? String(item.id) : "";

  return { title, imageUrl, supplierPriceUSD, salePriceUSD, ordersNum, ratingNum, shopName, productUrl, category, productId };
}

function mapToInsertProduct(norm: NonNullable<ReturnType<typeof normalizeApifyItem>>): InsertProduct {
  const effectiveSupplierUSD = norm.supplierPriceUSD > 0 ? norm.supplierPriceUSD : norm.salePriceUSD;
  const supplierSAR = parseFloat((effectiveSupplierUSD * USD_TO_SAR).toFixed(2));

  const multiplier = effectiveSupplierUSD < 5 ? 3.5 : effectiveSupplierUSD < 15 ? 3 : effectiveSupplierUSD < 30 ? 2.5 : 2;
  const suggestedSAR = parseFloat((effectiveSupplierUSD * multiplier * USD_TO_SAR).toFixed(2));
  const actualSellSAR = norm.salePriceUSD > 0
    ? parseFloat((norm.salePriceUSD * USD_TO_SAR).toFixed(2))
    : suggestedSAR;

  const margin = calculateMargin(supplierSAR, suggestedSAR);
  const isHalal = checkHalalSafe({ title: norm.title, description: "", category: norm.category, niche: "" });

  const trendScore = calculateTrendScore({
    supplierPrice: supplierSAR,
    sellPrice: suggestedSAR,
    margin,
    category: norm.category,
  });

  const saturationScore = calculateSaturationScore({
    supplierPrice: supplierSAR,
    sellPrice: suggestedSAR,
    margin,
    category: norm.category,
  });

  const opportunityScore = calculateOpportunityScore(trendScore, saturationScore, margin, norm.ratingNum > 0 ? norm.ratingNum : null);

  const supplierLink = norm.productUrl || (norm.productId ? `https://aliexpress.com/item/${norm.productId}.html` : "");

  return {
    title: norm.title,
    imageUrl: norm.imageUrl,
    shortDescription: null,
    category: norm.category,
    niche: null,
    sourcePlatform: "AliExpress",
    source: "aliexpress",
    supplierPrice: String(supplierSAR),
    suggestedSellPrice: String(suggestedSAR),
    actualSellPrice: String(actualSellSAR),
    estimatedMargin: String(margin),
    ordersCount: norm.ordersNum,
    rating: norm.ratingNum > 0 ? String(norm.ratingNum) : null,
    supplierName: norm.shopName,
    isHalalSafe: isHalal,
    discoverySource: "aliexpress",
    supplierSource: "aliexpress",
    trendScore,
    saturationScore,
    opportunityScore,
    aiSummary: null,
    supplierLink,
  };
}

async function fetchViaApify(keyword: string, maxResults: number): Promise<ApifyRawItem[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.log("[aliexpress] No APIFY_API_TOKEN set. Add your Apify API token to enable live AliExpress imports.");
    return [];
  }

  const actorInput = {
    queries: [keyword],
    maxItems: maxResults,
    sort: "BEST_MATCH",
    minPrice: 0,
    maxPrice: 1000,
    shipTo: "SA",
    shipFrom: "CN",
  };

  console.log(`[aliexpress] Starting Apify actor run for "${keyword}" (max ${maxResults} results)...`);

  try {
    const runUrl = `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/run-sync-dataset?token=${token}`;

    const response = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[aliexpress] Apify API error ${response.status}: ${errorText.slice(0, 300)}`);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid APIFY_API_TOKEN. Check your Apify API token.");
      }
      if (response.status === 404) {
        throw new Error(`Apify actor "${APIFY_ACTOR_ID}" not found. You may need to subscribe to it on apify.com.`);
      }
      throw new Error(`Apify API returned status ${response.status}`);
    }

    const items = await response.json() as unknown[];
    if (!Array.isArray(items)) {
      console.log("[aliexpress] Apify response is not an array, trying to extract items...");
      const obj = items as any;
      if (obj?.items && Array.isArray(obj.items)) return obj.items as ApifyRawItem[];
      if (obj?.data && Array.isArray(obj.data)) return obj.data as ApifyRawItem[];
      console.error("[aliexpress] Could not parse Apify response");
      return [];
    }

    console.log(`[aliexpress] Apify returned ${items.length} items`);
    return items as ApifyRawItem[];
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.error("[aliexpress] Apify request timed out (120s limit). The actor may need more time for large requests.");
      throw new Error("Apify request timed out. Try reducing max_results.");
    }
    throw err;
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
    maxResults = 20,
  } = options;

  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    unsafe: 0,
    duplicate: 0,
    totalFetched: 0,
    errors: [],
    source: "aliexpress",
    apiActive: false,
  };

  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    summary.errors.push("APIFY_API_TOKEN not configured. Add your Apify API token to enable live AliExpress imports.");
    return summary;
  }

  summary.apiActive = true;

  let rawItems: ApifyRawItem[];
  try {
    rawItems = await fetchViaApify(keyword, maxResults);
  } catch (err: any) {
    summary.errors.push(err.message || "Failed to fetch from Apify");
    return summary;
  }

  summary.totalFetched = rawItems.length;

  if (rawItems.length === 0) {
    summary.errors.push("No products returned from Apify AliExpress scraper");
    return summary;
  }

  console.log(`[aliexpress] Processing ${rawItems.length} raw items for "${keyword}"`);

  for (const raw of rawItems) {
    try {
      const normalized = normalizeApifyItem(raw);
      if (!normalized) {
        summary.skipped++;
        continue;
      }

      const insert = mapToInsertProduct(normalized);

      if (!insert.isHalalSafe) {
        summary.unsafe++;
        if (halalOnly) {
          summary.skipped++;
          continue;
        }
      }

      if (normalized.ordersNum < minOrders) {
        summary.skipped++;
        continue;
      }

      if (normalized.ratingNum > 0 && normalized.ratingNum < minRating) {
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
  const hasToken = !!process.env.APIFY_API_TOKEN;
  return {
    active: hasToken,
    configured: hasToken,
    message: hasToken
      ? "AliExpress importer is active (Apify)"
      : "AliExpress importer requires APIFY_API_TOKEN. Get your token from apify.com/account#/integrations and add it as a secret.",
  };
}
