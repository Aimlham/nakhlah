import { storage, checkHalalSafe } from "./storage";
import { calculateMargin, calculateTrendScore, calculateSaturationScore, calculateOpportunityScore } from "@shared/scoring";
import type { InsertProduct, Product } from "@shared/schema";

const USD_TO_SAR = 3.75;

const FRAGILE_KEYWORDS = ["glass", "ceramic", "porcelain", "crystal", "fragile"];
const HEAVY_KEYWORDS = ["heavy", "oversized", "large furniture", "industrial"];

const APIFY_ACTOR_ID = "piotrv1001~aliexpress-listings-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

interface AliExpressSearchOptions {
  keyword: string;
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
  imageUrl?: string;
  image?: string;
  additionalImages?: string[];
  images?: string[];
  price?: number | string;
  originalPrice?: number | string;
  salePrice?: number | string;
  discountPrice?: number | string;
  discountPercentage?: number;
  currency?: string;
  inStock?: boolean;
  rating?: number | string;
  averageStar?: number | string;
  starRating?: number | string;
  reviews?: number | string;
  totalSold?: string | number;
  orders?: number | string;
  totalOrders?: number | string;
  soldCount?: number | string;
  store?: string | null;
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
  productType?: string;
  sellingPoints?: string[];
  [key: string]: unknown;
}

function parseOrders(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const cleaned = raw.replace(/[^0-9.kK+]/g, "");
  if (!cleaned) {
    const numMatch = raw.match(/[\d,.]+/);
    if (numMatch) {
      const num = parseFloat(numMatch[0].replace(/,/g, ""));
      return Math.round(num) || 0;
    }
    return 0;
  }
  const num = parseFloat(cleaned.replace(/[kK+]/g, ""));
  if (raw.toLowerCase().includes("k") || cleaned.toLowerCase().includes("k")) return Math.round(num * 1000);
  return Math.round(num) || 0;
}

function parsePrice(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const match = raw.replace(/[^0-9.]/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseRating(raw: string | number | undefined | null): number {
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

  const priceVal = parsePrice(item.price);
  const originalVal = parsePrice(item.originalPrice);
  const saleVal = parsePrice(item.salePrice);
  const discountVal = parsePrice(item.discountPrice);
  const allPrices = [priceVal, originalVal, saleVal, discountVal].filter(p => p > 0);
  if (allPrices.length === 0) return null;
  const supplierPriceUSD = Math.max(...allPrices);
  const salePriceUSD = Math.min(...allPrices);

  const imageUrl = item.imageUrl || item.image || (item.additionalImages && item.additionalImages[0]) || (item.images && item.images[0]) || null;
  const ordersNum = parseOrders(item.totalSold ?? item.orders ?? item.totalOrders ?? item.soldCount);
  const ratingNum = parseRating(item.rating ?? item.averageStar ?? item.starRating);
  const shopName = (typeof item.store === "string" ? item.store : null) || item.storeName || item.shopName || item.sellerName || null;
  const productUrl = item.url || item.productUrl || item.link || (item.id ? `https://aliexpress.com/item/${item.id}.html` : null);
  const category = normalizeCategory(item.categoryName || item.category || item.productType);
  const productId = item.id ? String(item.id) : "";

  return { title, imageUrl, supplierPriceUSD, salePriceUSD, ordersNum, ratingNum, shopName, productUrl, category, productId };
}

function mapToInsertProduct(norm: NonNullable<ReturnType<typeof normalizeApifyItem>>): InsertProduct {
  const costUSD = norm.salePriceUSD > 0 && norm.salePriceUSD <= norm.supplierPriceUSD
    ? norm.salePriceUSD
    : (norm.supplierPriceUSD > 0 ? norm.supplierPriceUSD : norm.salePriceUSD);
  const supplierSAR = parseFloat((costUSD * USD_TO_SAR).toFixed(2));

  const multiplier = costUSD < 5 ? 3.5 : costUSD < 15 ? 3 : costUSD < 30 ? 2.5 : 2;
  const suggestedSAR = parseFloat((costUSD * multiplier * USD_TO_SAR).toFixed(2));
  const actualSellSAR = suggestedSAR;

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

  const supplierLink = norm.productUrl || "";

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

async function pollRunStatus(runId: string, token: string, maxWaitMs: number = 180_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`);
    const data = await res.json() as any;
    const status = data?.data?.status;
    if (status === "SUCCEEDED" || status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      return status;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  return "TIMED-OUT";
}

async function fetchViaApify(keyword: string, maxResults: number): Promise<ApifyRawItem[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.log("[aliexpress] No APIFY_API_TOKEN set.");
    return [];
  }

  const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`;

  const actorInput = {
    searchUrls: [searchUrl],
    maxItems: maxResults,
  };

  console.log(`[aliexpress] Starting Apify actor run for "${keyword}" (max ${maxResults} results)...`);

  try {
    const startUrl = `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${token}`;

    const startRes = await fetch(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    });

    if (!startRes.ok) {
      const errorText = await startRes.text().catch(() => "");
      console.error(`[aliexpress] Apify API error ${startRes.status}: ${errorText.slice(0, 300)}`);

      if (startRes.status === 401 || startRes.status === 403) {
        throw new Error("Invalid APIFY_API_TOKEN. Check your Apify API token.");
      }
      if (startRes.status === 404) {
        throw new Error(`Apify actor "${APIFY_ACTOR_ID}" not found. You may need to subscribe to it on apify.com.`);
      }
      throw new Error(`Apify API returned status ${startRes.status}`);
    }

    const runData = await startRes.json() as any;
    const runId = runData?.data?.id;
    if (!runId) {
      throw new Error("Failed to start Apify actor run");
    }

    console.log(`[aliexpress] Actor run started: ${runId}. Polling for completion...`);

    const finalStatus = await pollRunStatus(runId, token);
    if (finalStatus !== "SUCCEEDED") {
      throw new Error(`Apify actor run ${finalStatus}. Run ID: ${runId}`);
    }

    const datasetUrl = `${APIFY_BASE_URL}/actor-runs/${runId}/dataset/items?token=${token}`;
    const dataRes = await fetch(datasetUrl);
    const items = await dataRes.json() as unknown[];

    if (!Array.isArray(items)) {
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
      console.error("[aliexpress] Apify request timed out.");
      throw new Error("Apify request timed out. Try reducing max_results.");
    }
    throw err;
  }
}

function extractCoreWords(title: string): Set<string> {
  const stopWords = new Set(["for", "with", "and", "the", "a", "an", "in", "on", "of", "to", "is", "by", "at", "or"]);
  return new Set(
    title.toLowerCase().trim().split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  );
}

async function checkDuplicate(title: string, source: string): Promise<boolean> {
  try {
    const allProducts = await storage.getAllProducts();
    const normalizedTitle = title.toLowerCase().trim();
    const coreWords = extractCoreWords(title);
    return allProducts.some(p => {
      const existingTitle = (p.title || "").toLowerCase().trim();
      if (existingTitle === normalizedTitle) return true;
      if (p.source !== source) return false;
      if (coreWords.size > 3) {
        const existingWords = extractCoreWords(p.title || "");
        if (existingWords.size > 3) {
          const intersection = [...coreWords].filter(w => existingWords.has(w));
          const similarity = intersection.length / Math.min(coreWords.size, existingWords.size);
          return similarity > 0.7;
        }
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
        summary.skipped++;
        continue;
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

      const existingProduct = await storage.findProductByTitle(insert.title, "aliexpress");
      if (existingProduct) {
        const currentSupplier = parseFloat(existingProduct.supplierPrice);
        const newSupplier = parseFloat(insert.supplierPrice);
        if (newSupplier < currentSupplier && newSupplier > 0) {
          await storage.updateProductPrices(
            existingProduct.id,
            insert.supplierPrice,
            insert.suggestedSellPrice,
            insert.actualSellPrice || insert.suggestedSellPrice,
            insert.estimatedMargin
          );
          console.log(`[aliexpress] Updated price: ${insert.title.substring(0, 40)} ${currentSupplier} -> ${newSupplier}`);
        }
        summary.duplicate++;
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
