import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  SavedProduct,
  ProductAd,
  Subscription,
  Listing,
  InsertListing,
  Profile,
} from "@shared/schema";
import { supabaseAdmin } from "./supabase";
import type { IStorage } from "./storage";

const NEW_COLUMNS = [
  "source", "actual_sell_price", "orders_count", "rating",
  "supplier_name", "is_halal_safe", "discovery_source", "supplier_source",
];
let availableNewColumns: Set<string> = new Set();
let columnsProbed = false;

const AD_NEW_COLUMNS = [
  "advertiser_name", "ad_description", "landing_page_url", "external_ad_id",
];
let adColumnsAvailable: Set<string> = new Set();
let adColumnsProbed = false;

async function probeAdColumns() {
  if (adColumnsProbed || !supabaseAdmin) return;
  adColumnsProbed = true;

  for (const col of AD_NEW_COLUMNS) {
    try {
      const { error } = await supabaseAdmin.from("product_ads").select(col).limit(1);
      if (!error) {
        adColumnsAvailable.add(col);
      }
    } catch {}
  }

  const missing = AD_NEW_COLUMNS.filter(c => !adColumnsAvailable.has(c));
  if (missing.length > 0) {
    console.log("[supabase] Missing columns in product_ads table:", missing.join(", "));
  }
}

async function probeColumns() {
  if (columnsProbed || !supabaseAdmin) return;
  columnsProbed = true;

  for (const col of NEW_COLUMNS) {
    try {
      const { error } = await supabaseAdmin.from("products").select(col).limit(1);
      if (!error) {
        availableNewColumns.add(col);
      }
    } catch {}
  }

  const missing = NEW_COLUMNS.filter(c => !availableNewColumns.has(c));
  if (missing.length > 0) {
    console.log("[supabase] Missing columns in products table:", missing.join(", "));
  } else {
    console.log("[supabase] All product columns available");
  }
}

function hasCol(col: string): boolean {
  return availableNewColumns.has(col);
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    title: row.title as string,
    imageUrl: (row.image_url as string) ?? null,
    shortDescription: (row.short_description as string) ?? null,
    category: row.category as string,
    niche: (row.niche as string) ?? null,
    sourcePlatform: (row.source_platform as string) ?? null,
    source: (row.source as string) ?? null,
    supplierPrice: String(row.supplier_price),
    suggestedSellPrice: String(row.suggested_sell_price),
    actualSellPrice: row.actual_sell_price != null ? String(row.actual_sell_price) : null,
    estimatedMargin: row.estimated_margin != null ? String(row.estimated_margin) : null,
    ordersCount: (row.orders_count as number) ?? null,
    rating: row.rating != null ? String(row.rating) : null,
    supplierName: (row.supplier_name as string) ?? null,
    isHalalSafe: row.is_halal_safe != null ? (row.is_halal_safe as boolean) : true,
    discoverySource: (row.discovery_source as string) ?? null,
    supplierSource: (row.supplier_source as string) ?? null,
    trendScore: (row.trend_score as number) ?? null,
    saturationScore: (row.saturation_score as number) ?? null,
    opportunityScore: (row.opportunity_score as number) ?? null,
    aiSummary: (row.ai_summary as string) ?? null,
    supplierLink: (row.supplier_link as string) ?? null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}

function mapSavedProduct(row: Record<string, unknown>): SavedProduct {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    productId: row.product_id as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}

function mapListing(row: Record<string, unknown>): Listing {
  return {
    id: row.id as string,
    title: row.title as string,
    imageUrl: (row.image_url as string) ?? null,
    description: (row.description as string) ?? null,
    category: (row.category as string) ?? null,
    supplierName: (row.supplier_name as string) ?? null,
    supplierPhone: (row.supplier_phone as string) ?? null,
    supplierWhatsapp: (row.supplier_whatsapp as string) ?? null,
    supplierCity: (row.supplier_city as string) ?? null,
    supplierType: (row.supplier_type as string) ?? null,
    supplierLocation: (row.supplier_link as string) ?? null,
    status: (row.status as string) ?? "draft",
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}

function mapSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    plan: row.plan as string,
    status: row.status as string,
    moyasarInvoiceId: (row.moyasar_invoice_id as string) ?? null,
    moyasarPaymentId: (row.moyasar_payment_id as string) ?? null,
    amountHalalas: (row.amount_halalas as number) ?? null,
    activatedAt: row.activated_at ? new Date(row.activated_at as string) : null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}

function mapProductAd(row: Record<string, unknown>): ProductAd {
  return {
    id: row.id as string,
    productId: (row.product_id as string) ?? null,
    platform: row.platform as string,
    niche: (row.niche as string) ?? null,
    videoUrl: row.video_url as string,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    views: (row.views as number) ?? 0,
    likes: (row.likes as number) ?? 0,
    publishedAt: row.published_at ? new Date(row.published_at as string) : null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
    advertiserName: (row.advertiser_name as string) ?? null,
    adDescription: (row.ad_description as string) ?? null,
    landingPageUrl: (row.landing_page_url as string) ?? null,
    externalAdId: (row.external_ad_id as string) ?? null,
  };
}

export class SupabaseStorage implements IStorage {
  private get db() {
    if (!supabaseAdmin) throw new Error("Supabase not configured");
    return supabaseAdmin;
  }

  async init() {
    await probeColumns();
    await probeAdColumns();
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data } = await this.db.from("users").select("*").eq("id", id).single();
    if (!data) return undefined;
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      fullName: data.full_name ?? null,
      email: data.email ?? null,
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await this.db.from("users").select("*").eq("username", username).single();
    if (!data) return undefined;
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      fullName: data.full_name ?? null,
      email: data.email ?? null,
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await this.db
      .from("users")
      .insert({
        username: insertUser.username,
        password: insertUser.password,
        full_name: insertUser.fullName ?? null,
        email: insertUser.email ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create user");
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      fullName: data.full_name ?? null,
      email: data.email ?? null,
    };
  }

  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await this.db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProduct);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const { data, error } = await this.db
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return mapProduct(data);
  }

  async getSavedProductIds(userId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from("saved_products")
      .select("product_id")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.product_id);
  }

  async getSavedProducts(userId: string): Promise<Product[]> {
    const { data: savedRows, error: savedErr } = await this.db
      .from("saved_products")
      .select("product_id")
      .eq("user_id", userId);
    if (savedErr) throw new Error(savedErr.message);
    const ids = (savedRows ?? []).map((r) => r.product_id);
    if (ids.length === 0) return [];
    const { data: products, error: prodErr } = await this.db
      .from("products")
      .select("*")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);
    return (products ?? []).map(mapProduct);
  }

  async saveProduct(userId: string, productId: string): Promise<SavedProduct> {
    const { data: existing } = await this.db
      .from("saved_products")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single();
    if (existing) return mapSavedProduct(existing);

    const { data, error } = await this.db
      .from("saved_products")
      .insert({ user_id: userId, product_id: productId })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to save product");
    return mapSavedProduct(data);
  }

  async unsaveProduct(userId: string, productId: string): Promise<void> {
    const { error } = await this.db
      .from("saved_products")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    await probeColumns();

    const row: Record<string, unknown> = {
      title: product.title,
      image_url: product.imageUrl || null,
      short_description: product.shortDescription || null,
      category: product.category,
      niche: product.niche || null,
      source_platform: product.sourcePlatform || null,
      supplier_price: product.supplierPrice,
      suggested_sell_price: product.suggestedSellPrice,
      estimated_margin: product.estimatedMargin || null,
      trend_score: product.trendScore || null,
      saturation_score: product.saturationScore || null,
      opportunity_score: product.opportunityScore || null,
      ai_summary: product.aiSummary || null,
      supplier_link: product.supplierLink || null,
    };

    if (hasCol("source")) row.source = product.source || null;
    if (hasCol("actual_sell_price")) row.actual_sell_price = product.actualSellPrice || null;
    if (hasCol("orders_count")) row.orders_count = product.ordersCount || null;
    if (hasCol("rating")) row.rating = product.rating || null;
    if (hasCol("supplier_name")) row.supplier_name = product.supplierName || null;
    if (hasCol("is_halal_safe")) row.is_halal_safe = product.isHalalSafe ?? true;
    if (hasCol("discovery_source")) row.discovery_source = product.discoverySource || null;
    if (hasCol("supplier_source")) row.supplier_source = product.supplierSource || null;

    const { data, error } = await this.db
      .from("products")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapProduct(data);
  }

  async getAdsByProductId(productId: string): Promise<ProductAd[]> {
    const { data, error } = await this.db
      .from("product_ads")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) {
      console.log("[supabase] product_ads query error:", error.message);
      return [];
    }
    return (data || []).map(mapProductAd);
  }

  async getAllAds(): Promise<ProductAd[]> {
    const { data, error } = await this.db
      .from("product_ads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.log("[supabase] product_ads query error:", error.message);
      return [];
    }
    return (data || []).map(mapProductAd);
  }

  async createAd(ad: import("@shared/schema").InsertProductAd): Promise<ProductAd> {
    await probeAdColumns();
    const insertData: Record<string, unknown> = {
      product_id: ad.productId || null,
      platform: ad.platform,
      niche: ad.niche || null,
      video_url: ad.videoUrl,
      thumbnail_url: ad.thumbnailUrl || null,
      views: ad.views ?? 0,
      likes: ad.likes ?? 0,
      published_at: ad.publishedAt || null,
    };

    if (adColumnsAvailable.has("advertiser_name")) {
      insertData.advertiser_name = ad.advertiserName || null;
    }
    if (adColumnsAvailable.has("ad_description")) {
      insertData.ad_description = ad.adDescription || null;
    }
    if (adColumnsAvailable.has("landing_page_url")) {
      insertData.landing_page_url = ad.landingPageUrl || null;
    }
    if (adColumnsAvailable.has("external_ad_id")) {
      insertData.external_ad_id = ad.externalAdId || null;
    }

    const { data, error } = await this.db
      .from("product_ads")
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapProductAd(data);
  }

  async updateProductAiSummary(productId: string, aiSummary: string): Promise<void> {
    const { error } = await this.db
      .from("products")
      .update({ ai_summary: aiSummary })
      .eq("id", productId);
    if (error) {
      console.error("[supabase] Failed to update ai_summary:", error.message);
      throw new Error("Failed to update AI summary");
    }
  }

  async updateProductPrices(productId: string, supplierPrice: string, suggestedSellPrice: string, actualSellPrice: string, estimatedMargin: string): Promise<void> {
    const { error } = await this.db
      .from("products")
      .update({
        supplier_price: supplierPrice,
        suggested_sell_price: suggestedSellPrice,
        actual_sell_price: actualSellPrice,
        estimated_margin: estimatedMargin,
      })
      .eq("id", productId);
    if (error) {
      console.error("[supabase] Failed to update product prices:", error.message);
    }
  }

  async findProductByTitle(title: string, source: string): Promise<Product | undefined> {
    const { data } = await this.db
      .from("products")
      .select("*")
      .eq("source", source)
      .ilike("title", title);
    if (!data || data.length === 0) return undefined;
    return mapProduct(data[0]);
  }

  async upsertSubscription(sub: {
    userId: string;
    plan: string;
    status: string;
    moyasarInvoiceId?: string;
    moyasarPaymentId?: string;
    amountHalalas?: number;
    activatedAt?: Date | null;
  }): Promise<Subscription> {
    if (!supabaseAdmin) throw new Error("Supabase not configured");

    const existing = await this.getSubscriptionByUserId(sub.userId);

    const record = {
      user_id: sub.userId,
      plan: sub.plan,
      status: sub.status,
      moyasar_invoice_id: sub.moyasarInvoiceId ?? existing?.moyasarInvoiceId ?? null,
      moyasar_payment_id: sub.moyasarPaymentId ?? existing?.moyasarPaymentId ?? null,
      amount_halalas: sub.amountHalalas ?? existing?.amountHalalas ?? null,
      activated_at: sub.activatedAt !== undefined
        ? (sub.activatedAt ? sub.activatedAt.toISOString() : null)
        : (existing?.activatedAt ? existing.activatedAt.toISOString() : null),
    };

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .update(record)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return mapSubscription(data);
    } else {
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .insert(record)
        .select("*")
        .single();
      if (error) throw error;
      return mapSubscription(data);
    }
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    if (!supabaseAdmin) return undefined;
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapSubscription(data);
  }

  async getSubscriptionByInvoiceId(invoiceId: string): Promise<Subscription | undefined> {
    if (!supabaseAdmin) return undefined;
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("moyasar_invoice_id", invoiceId)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapSubscription(data);
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const { data, error } = await this.db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return undefined;
    return {
      id: data.id as string,
      email: (data.email as string) ?? null,
      fullName: (data.full_name as string) ?? null,
      avatarUrl: (data.avatar_url as string) ?? null,
      plan: (data.plan as string) ?? "free",
      createdAt: data.created_at ? new Date(data.created_at as string) : null,
    };
  }

  async getAllListings(): Promise<Listing[]> {
    const { data, error } = await this.db
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapListing);
  }

  async getPublishedListings(): Promise<Listing[]> {
    const { data, error } = await this.db
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapListing);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const { data, error } = await this.db
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapListing(data);
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    const { data, error } = await this.db
      .from("listings")
      .insert({
        title: listing.title,
        image_url: listing.imageUrl ?? null,
        description: listing.description ?? null,
        category: listing.category ?? null,
        supplier_name: listing.supplierName ?? null,
        supplier_phone: listing.supplierPhone ?? null,
        supplier_whatsapp: listing.supplierWhatsapp ?? null,
        supplier_city: listing.supplierCity ?? null,
        supplier_type: listing.supplierType ?? null,
        supplier_link: listing.supplierLocation ?? null,
        status: listing.status ?? "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapListing(data);
  }

  async updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing> {
    const updateData: Record<string, unknown> = {};
    if (listing.title !== undefined) updateData.title = listing.title;
    if (listing.imageUrl !== undefined) updateData.image_url = listing.imageUrl;
    if (listing.description !== undefined) updateData.description = listing.description;
    if (listing.category !== undefined) updateData.category = listing.category;
    if (listing.supplierName !== undefined) updateData.supplier_name = listing.supplierName;
    if (listing.supplierPhone !== undefined) updateData.supplier_phone = listing.supplierPhone;
    if (listing.supplierWhatsapp !== undefined) updateData.supplier_whatsapp = listing.supplierWhatsapp;
    if (listing.supplierCity !== undefined) updateData.supplier_city = listing.supplierCity;
    if (listing.supplierType !== undefined) updateData.supplier_type = listing.supplierType;
    if (listing.supplierLocation !== undefined) updateData.supplier_link = listing.supplierLocation;
    if (listing.status !== undefined) updateData.status = listing.status;

    const { data, error } = await this.db
      .from("listings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapListing(data);
  }

  async deleteListing(id: string): Promise<void> {
    const { error } = await this.db
      .from("listings")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
