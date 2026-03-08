import { storage, checkHalalSafe } from "./storage";
import { calculateMargin, calculateTrendScore, calculateSaturationScore, calculateOpportunityScore } from "@shared/scoring";
import type { InsertProduct } from "@shared/schema";

const USD_TO_SAR = 3.75;

const FRAGILE_KEYWORDS = ["glass", "ceramic", "porcelain", "crystal", "fragile"];
const HEAVY_KEYWORDS = ["heavy", "oversized", "large furniture", "industrial"];

const APIFY_ACTOR_ID = "igview-owner~amazon-search-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

interface AmazonSearchOptions {
  keyword: string;
  halalOnly?: boolean;
  minOrders?: number;
  minRating?: number;
  maxResults?: number;
  country?: string;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  unsafe: number;
  duplicate: number;
  totalFetched: number;
  errors: string[];
  source: "amazon";
  apiActive: boolean;
}

interface AmazonRawItem {
  asin?: string;
  product_title?: string;
  product_url?: string;
  product_photo?: string;
  product_price?: string;
  product_original_price?: string | null;
  currency?: string;
  product_star_rating?: string | number;
  product_num_ratings?: number;
  is_best_seller?: boolean;
  is_amazon_choice?: boolean;
  is_prime?: boolean;
  sales_volume?: string | null;
  product_badge?: string | null;
  delivery?: string | null;
  [key: string]: unknown;
}

function parseSalesVolume(raw: string | null | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/([\d,.]+)\s*[kK]?\+?\s*(bought|sold)/i);
  if (!match) return 0;
  let num = parseFloat(match[1].replace(/,/g, ""));
  if (raw.toLowerCase().includes("k")) num *= 1000;
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

function guessCategory(title: string): string {
  const lower = title.toLowerCase();
  const map: [string[], string][] = [
    [["phone", "tablet", "laptop", "computer", "usb", "charger", "cable", "bluetooth", "wireless", "speaker", "headphone", "earphone", "earbuds", "camera", "drone"], "Electronics"],
    [["kitchen", "home", "garden", "furniture", "lamp", "light", "decor", "storage", "organizer", "pillow", "blanket", "towel"], "Home & Living"],
    [["shirt", "dress", "pants", "jacket", "coat", "shoe", "sneaker", "boot", "hat", "cap", "scarf", "bag", "wallet", "watch", "sunglasses", "jewelry", "ring", "necklace", "bracelet"], "Fashion"],
    [["toy", "game", "puzzle", "doll", "lego", "figure", "plush"], "Toys"],
    [["baby", "kid", "child", "infant", "toddler", "stroller"], "Kids"],
    [["sport", "fitness", "gym", "yoga", "exercise", "outdoor", "camping", "hiking", "bicycle", "bike"], "Sports"],
    [["makeup", "skincare", "beauty", "cosmetic", "hair", "shampoo", "cream", "serum", "perfume"], "Beauty"],
    [["car", "auto", "vehicle", "motorcycle", "truck", "dash cam"], "Automotive"],
    [["pet", "dog", "cat", "fish", "bird", "aquarium"], "Pet Supplies"],
    [["tool", "drill", "wrench", "screwdriver", "hammer"], "Tools"],
    [["office", "desk", "pen", "notebook", "printer", "paper"], "Office"],
  ];
  for (const [keywords, cat] of map) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return "General";
}

function normalizeAmazonItem(item: AmazonRawItem): {
  title: string;
  imageUrl: string | null;
  priceUSD: number;
  originalPriceUSD: number;
  ordersNum: number;
  ratingNum: number;
  numRatings: number;
  productUrl: string | null;
  category: string;
  asin: string;
  isBestSeller: boolean;
  isAmazonChoice: boolean;
  isPrime: boolean;
} | null {
  const title = (item.product_title || "").trim();
  if (!title) return null;

  const priceUSD = parsePrice(item.product_price);
  const originalPriceUSD = parsePrice(item.product_original_price) || priceUSD;
  if (priceUSD <= 0) return null;

  const imageUrl = item.product_photo || null;
  const ordersNum = parseSalesVolume(item.sales_volume);
  const ratingNum = parseRating(item.product_star_rating);
  const numRatings = item.product_num_ratings || 0;
  const productUrl = item.product_url || (item.asin ? `https://www.amazon.com/dp/${item.asin}` : null);
  const category = guessCategory(title);
  const asin = item.asin || "";

  return {
    title, imageUrl, priceUSD, originalPriceUSD, ordersNum, ratingNum, numRatings,
    productUrl, category, asin,
    isBestSeller: item.is_best_seller || false,
    isAmazonChoice: item.is_amazon_choice || false,
    isPrime: item.is_prime || false,
  };
}

function mapToInsertProduct(norm: NonNullable<ReturnType<typeof normalizeAmazonItem>>): InsertProduct {
  const supplierUSD = norm.priceUSD * 0.6;
  const supplierSAR = parseFloat((supplierUSD * USD_TO_SAR).toFixed(2));

  const multiplier = norm.priceUSD < 15 ? 2.5 : norm.priceUSD < 30 ? 2 : norm.priceUSD < 60 ? 1.8 : 1.5;
  const suggestedSAR = parseFloat((norm.priceUSD * multiplier * USD_TO_SAR).toFixed(2));
  const actualSellSAR = parseFloat((norm.priceUSD * USD_TO_SAR).toFixed(2));

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

  return {
    title: norm.title,
    imageUrl: norm.imageUrl,
    shortDescription: norm.isBestSeller ? "Best Seller" : norm.isAmazonChoice ? "Amazon Choice" : null,
    category: norm.category,
    niche: null,
    sourcePlatform: "Amazon",
    source: "amazon",
    supplierPrice: String(supplierSAR),
    suggestedSellPrice: String(suggestedSAR),
    actualSellPrice: String(actualSellSAR),
    estimatedMargin: String(margin),
    ordersCount: norm.ordersNum > 0 ? norm.ordersNum : norm.numRatings,
    rating: norm.ratingNum > 0 ? String(norm.ratingNum) : null,
    supplierName: "Amazon",
    isHalalSafe: isHalal,
    discoverySource: "amazon",
    supplierSource: "amazon",
    trendScore,
    saturationScore,
    opportunityScore,
    aiSummary: null,
    supplierLink: norm.productUrl || "",
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

async function fetchViaApify(keyword: string, maxResults: number, country: string): Promise<AmazonRawItem[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.log("[amazon] No APIFY_API_TOKEN set.");
    return [];
  }

  const actorInput = {
    keyword,
    maxItems: maxResults,
    searchTerms: [keyword],
    country,
  };

  console.log(`[amazon] Starting Apify actor run for "${keyword}" (max ${maxResults} results, country: ${country})...`);

  try {
    const startUrl = `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${token}`;

    const startRes = await fetch(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    });

    if (!startRes.ok) {
      const errorText = await startRes.text().catch(() => "");
      console.error(`[amazon] Apify API error ${startRes.status}: ${errorText.slice(0, 300)}`);

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

    console.log(`[amazon] Actor run started: ${runId}. Polling for completion...`);

    const finalStatus = await pollRunStatus(runId, token);
    if (finalStatus !== "SUCCEEDED") {
      throw new Error(`Apify actor run ${finalStatus}. Run ID: ${runId}`);
    }

    const datasetUrl = `${APIFY_BASE_URL}/actor-runs/${runId}/dataset/items?token=${token}`;
    const dataRes = await fetch(datasetUrl);
    const items = await dataRes.json() as unknown[];

    if (!Array.isArray(items)) {
      const obj = items as any;
      if (obj?.items && Array.isArray(obj.items)) return obj.items as AmazonRawItem[];
      if (obj?.data && Array.isArray(obj.data)) return obj.data as AmazonRawItem[];
      console.error("[amazon] Could not parse Apify response");
      return [];
    }

    console.log(`[amazon] Apify returned ${items.length} items`);
    return items as AmazonRawItem[];
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.error("[amazon] Apify request timed out.");
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

export async function importAmazonProducts(options: AmazonSearchOptions): Promise<ImportSummary> {
  const {
    keyword,
    halalOnly = false,
    minOrders = 0,
    minRating = 3.5,
    maxResults = 20,
    country = "US",
  } = options;

  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    unsafe: 0,
    duplicate: 0,
    totalFetched: 0,
    errors: [],
    source: "amazon",
    apiActive: false,
  };

  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    summary.errors.push("APIFY_API_TOKEN not configured.");
    return summary;
  }

  summary.apiActive = true;

  let rawItems: AmazonRawItem[];
  try {
    rawItems = await fetchViaApify(keyword, maxResults, country);
  } catch (err: any) {
    summary.errors.push(err.message || "Failed to fetch from Apify");
    return summary;
  }

  summary.totalFetched = rawItems.length;

  if (rawItems.length === 0) {
    summary.errors.push("No products returned from Apify Amazon scraper");
    return summary;
  }

  console.log(`[amazon] Processing ${rawItems.length} raw items for "${keyword}"`);

  for (const raw of rawItems) {
    try {
      const normalized = normalizeAmazonItem(raw);
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

      if (minOrders > 0 && normalized.ordersNum < minOrders) {
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

      const isDuplicate = await checkDuplicate(insert.title, "amazon");
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

  console.log(`[amazon] Import complete: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.unsafe} unsafe, ${summary.duplicate} duplicates`);
  return summary;
}

export function getAmazonStatus(): {
  active: boolean;
  configured: boolean;
  message: string;
} {
  const hasToken = !!process.env.APIFY_API_TOKEN;
  return {
    active: hasToken,
    configured: hasToken,
    message: hasToken
      ? "Amazon importer is active (Apify)"
      : "Amazon importer requires APIFY_API_TOKEN.",
  };
}
