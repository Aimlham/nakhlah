import { storage } from "./storage";
import type { InsertProductAd } from "@shared/schema";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "lexis-solutions~tiktok-ads-scraper";
const APIFY_BASE = "https://api.apify.com/v2";

interface TikTokImportOptions {
  query: string;
  startDate?: string;
  endDate?: string;
  maxResults?: number;
}

interface ApifyRawAd {
  id?: string;
  ad_id?: string;
  adId?: string;
  adTitle?: string;
  advertiser_name?: string;
  advertiserName?: string;
  business_name?: string;
  paid_for_by?: string;
  advertiserPaidForBy?: string;
  adVideoUrl?: string | null;
  adVideoCover?: string | null;
  videos?: Array<{
    cover_image_url?: string;
    video_url?: string;
    url?: string;
  }>;
  video_url?: string;
  videoUrl?: string;
  cover_image_url?: string;
  coverImageUrl?: string;
  thumbnail_url?: string;
  thumbnailUrl?: string;
  image_urls?: string[];
  reach?: number;
  impressions?: number;
  total_impressions?: string;
  totalImpressions?: string;
  adImpressions?: string | null;
  adEstimatedAudience?: string | null;
  likes?: number;
  like_count?: number;
  first_shown_date?: string;
  firstShownDate?: string;
  last_shown_date?: string;
  lastShownDate?: string;
  adStartDate?: number | null;
  adEndDate?: number | null;
  ad_text?: string;
  adText?: string;
  caption?: string;
  description?: string;
  landing_page_url?: string;
  landingPageUrl?: string;
  target_regions?: string[];
  targetRegions?: string[];
  targetingByLocation?: Array<{ region?: string; impressions?: string }>;
  [key: string]: unknown;
}

function parseImpressionRange(str: string | null | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, "").trim();
  const multiplier = (s: string) => {
    if (s === "K" || s === "k") return 1000;
    if (s === "M" || s === "m") return 1000000;
    if (s === "B" || s === "b") return 1000000000;
    return 1;
  };
  const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)([KkMmBb]?)\s*-\s*(\d+(?:\.\d+)?)([KkMmBb]?)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]) * multiplier(rangeMatch[2]);
    const high = parseFloat(rangeMatch[3]) * multiplier(rangeMatch[4]);
    return Math.round((low + high) / 2);
  }
  const singleMatch = cleaned.match(/(\d+(?:\.\d+)?)([KkMmBb]?)\+?/);
  if (singleMatch) {
    return Math.round(parseFloat(singleMatch[1]) * multiplier(singleMatch[2]));
  }
  return parseInt(cleaned.replace(/[^0-9]/g, "")) || 0;
}

function normalizeAd(raw: ApifyRawAd): {
  externalId: string;
  advertiserName: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  description: string;
  landingPageUrl: string;
  publishedAt: Date | null;
} | null {
  const externalId = raw.adId || raw.ad_id || raw.id || "";

  let videoUrl = "";
  if (raw.adVideoUrl) {
    videoUrl = raw.adVideoUrl;
  } else if (raw.videos && raw.videos.length > 0) {
    videoUrl = raw.videos[0].video_url || raw.videos[0].url || "";
  }
  if (!videoUrl) {
    videoUrl = raw.video_url || raw.videoUrl || "";
  }

  let thumbnailUrl = "";
  if (raw.adVideoCover) {
    thumbnailUrl = raw.adVideoCover;
  } else if (raw.videos && raw.videos.length > 0) {
    thumbnailUrl = raw.videos[0].cover_image_url || "";
  }
  if (!thumbnailUrl) {
    thumbnailUrl = raw.cover_image_url || raw.coverImageUrl || raw.thumbnail_url || raw.thumbnailUrl || "";
  }
  if (!thumbnailUrl && raw.image_urls && raw.image_urls.length > 0) {
    thumbnailUrl = raw.image_urls[0];
  }

  const advertiserName = raw.advertiser_name || raw.advertiserName || raw.business_name || raw.adTitle || raw.paid_for_by || "";
  const description = raw.ad_text || raw.adText || raw.caption || raw.description || "";
  const landingPageUrl = raw.landing_page_url || raw.landingPageUrl || "";

  let views = 0;
  if (raw.adImpressions) {
    views = parseImpressionRange(raw.adImpressions);
  } else if (raw.reach) {
    views = raw.reach;
  } else if (raw.impressions) {
    views = raw.impressions;
  } else if (raw.total_impressions || raw.totalImpressions) {
    views = parseImpressionRange(raw.total_impressions || raw.totalImpressions);
  } else if (raw.adEstimatedAudience) {
    views = parseImpressionRange(raw.adEstimatedAudience);
  }

  const likes = raw.likes || raw.like_count || 0;

  let publishedAt: Date | null = null;
  if (raw.adStartDate && typeof raw.adStartDate === "number") {
    const ts = raw.adStartDate < 1e12 ? raw.adStartDate * 1000 : raw.adStartDate;
    const d = new Date(ts);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) publishedAt = d;
  } else {
    const dateStr = raw.first_shown_date || raw.firstShownDate || raw.last_shown_date || raw.lastShownDate;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) publishedAt = d;
    }
  }

  if (!videoUrl && !thumbnailUrl) return null;

  return {
    externalId,
    advertiserName,
    videoUrl: videoUrl || `https://library.tiktok.com/ads?adv_name=${encodeURIComponent(advertiserName)}`,
    thumbnailUrl,
    views,
    likes,
    description,
    landingPageUrl,
    publishedAt,
  };
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set(["for", "with", "and", "the", "a", "an", "in", "on", "of", "to", "is", "by", "at", "or", "it", "its", "your", "new", "best", "top", "hot", "get", "buy", "now"]);
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  );
}

function matchAdToProduct(
  adText: string,
  queryKeywords: string,
  products: Array<{ id: string; title: string; category: string; niche: string | null }>
): string | null {
  const adWords = extractKeywords(`${adText} ${queryKeywords}`);
  if (adWords.size === 0) return null;

  let bestMatch: { id: string; score: number } | null = null;

  for (const product of products) {
    const productWords = extractKeywords(product.title);
    if (productWords.size === 0) continue;

    const intersection = [...adWords].filter(w => productWords.has(w));
    const score = intersection.length / Math.min(adWords.size, productWords.size);

    if (score > 0.2 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: product.id, score };
    }
  }

  return bestMatch?.id || null;
}

export async function importTikTokAds(options: TikTokImportOptions): Promise<{
  imported: number;
  skipped: number;
  linked: number;
  total: number;
  message: string;
}> {
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_API_TOKEN not configured");
  }

  console.log(`[tiktok] Starting import for query: "${options.query}"`);

  const input: Record<string, unknown> = {
    query: options.query,
  };
  if (options.startDate) input.startDate = options.startDate;
  if (options.endDate) input.endDate = options.endDate;

  const encodedActorId = encodeURIComponent(ACTOR_ID);
  const startRes = await fetch(`${APIFY_BASE}/acts/${encodedActorId}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APIFY_TOKEN}`,
    },
    body: JSON.stringify(input),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Apify actor start failed: ${startRes.status} - ${errText}`);
  }

  const runData = await startRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  console.log(`[tiktok] Apify run started: ${runId}, polling...`);

  let status = "RUNNING";
  let attempts = 0;
  const maxAttempts = 60;

  while (status === "RUNNING" || status === "READY") {
    if (attempts >= maxAttempts) {
      throw new Error("Apify run timed out after 5 minutes");
    }
    await new Promise(r => setTimeout(r, 5000));
    attempts++;

    const pollRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
      headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    status = pollData.data?.status || "RUNNING";
    console.log(`[tiktok] Poll ${attempts}: status=${status}`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  const datasetId = runData.data?.defaultDatasetId;
  if (!datasetId) throw new Error("No dataset ID from Apify run");

  const maxResults = options.maxResults || 50;
  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=${maxResults}&format=json`,
    { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } }
  );
  if (!itemsRes.ok) throw new Error("Failed to fetch Apify dataset items");

  const rawItems: ApifyRawAd[] = await itemsRes.json();
  console.log(`[tiktok] Got ${rawItems.length} raw ads from Apify`);

  const allProducts = await storage.getAllProducts();
  const productList = allProducts.map(p => ({
    id: p.id,
    title: p.title,
    category: p.category,
    niche: p.niche,
  }));

  const existingAds = await storage.getAllAds();
  const existingExternalIds = new Set(
    existingAds.filter(a => a.externalAdId).map(a => a.externalAdId)
  );
  const existingVideoUrls = new Set(
    existingAds.map(a => a.videoUrl).filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;
  let linked = 0;

  for (const raw of rawItems) {
    const normalized = normalizeAd(raw);
    if (!normalized) {
      skipped++;
      continue;
    }

    if (normalized.externalId && existingExternalIds.has(normalized.externalId)) {
      skipped++;
      continue;
    }
    if (normalized.videoUrl && existingVideoUrls.has(normalized.videoUrl)) {
      skipped++;
      continue;
    }

    const adText = [normalized.advertiserName, normalized.description, normalized.landingPageUrl].filter(Boolean).join(" ");
    const matchedProductId = matchAdToProduct(adText, options.query, productList);

    try {
      const adInsert: InsertProductAd = {
        productId: matchedProductId,
        platform: "TikTok",
        niche: null,
        videoUrl: normalized.videoUrl,
        thumbnailUrl: normalized.thumbnailUrl || null,
        views: normalized.views,
        likes: normalized.likes,
        publishedAt: normalized.publishedAt,
        advertiserName: normalized.advertiserName || null,
        adDescription: normalized.description || null,
        landingPageUrl: normalized.landingPageUrl || null,
        externalAdId: normalized.externalId || null,
      };

      await storage.createAd(adInsert);
      imported++;
      if (matchedProductId) linked++;
      if (normalized.externalId) existingExternalIds.add(normalized.externalId);
      if (normalized.videoUrl) existingVideoUrls.add(normalized.videoUrl);
    } catch (err: any) {
      console.error(`[tiktok] Failed to save ad:`, err.message);
      skipped++;
    }
  }

  console.log(`[tiktok] Import complete: ${imported} imported, ${linked} linked to products, ${skipped} skipped`);

  return {
    imported,
    skipped,
    linked,
    total: rawItems.length,
    message: `تم استيراد ${imported} إعلان من TikTok (${linked} مرتبط بمنتجات)`,
  };
}

export function getTikTokStatus(): { active: boolean; configured: boolean; message: string } {
  const configured = !!APIFY_TOKEN;
  return {
    active: configured,
    configured,
    message: configured ? "TikTok importer ready" : "APIFY_API_TOKEN not set",
  };
}
