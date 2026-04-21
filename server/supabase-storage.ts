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
  Category,
  InsertCategory,
  SupplierProduct,
  InsertSupplierProduct,
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

let savedItemTypeAvailable = false;
let savedItemTypeProbed = false;

const SUPPLIER_PRODUCT_PRICE_COLS = ["supplier_price", "suggested_sell_price", "estimated_margin", "minimum_order_quantity", "dozen_price"];
let supplierProductPriceColsAvailable: Set<string> = new Set();
let supplierProductPriceColsProbed = false;

async function probeSupplierProductPriceCols(): Promise<Set<string>> {
  if (supplierProductPriceColsProbed || !supabaseAdmin) return supplierProductPriceColsAvailable;
  supplierProductPriceColsProbed = true;
  for (const col of SUPPLIER_PRODUCT_PRICE_COLS) {
    try {
      const { error } = await supabaseAdmin.from("supplier_products").select(col).limit(1);
      if (!error) supplierProductPriceColsAvailable.add(col);
    } catch {}
  }
  const missing = SUPPLIER_PRODUCT_PRICE_COLS.filter(c => !supplierProductPriceColsAvailable.has(c));
  if (missing.length > 0) {
    console.log("[supabase] Missing pricing columns in supplier_products:", missing.join(", "));
  } else {
    console.log("[supabase] All supplier_products pricing columns available");
  }
  return supplierProductPriceColsAvailable;
}

async function probeSavedItemType(): Promise<boolean> {
  if (savedItemTypeProbed || !supabaseAdmin) return savedItemTypeAvailable;
  savedItemTypeProbed = true;
  try {
    const { error } = await supabaseAdmin.from("saved_products").select("item_type").limit(1);
    savedItemTypeAvailable = !error;
    if (!savedItemTypeAvailable) {
      console.log("[supabase] saved_products.item_type column missing — listings save shares product namespace");
    }
  } catch {
    savedItemTypeAvailable = false;
  }
  return savedItemTypeAvailable;
}

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
    itemType: (row.item_type as string) ?? "product",
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

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}

function mapSupplierProduct(row: Record<string, unknown>): SupplierProduct {
  return {
    id: row.id as string,
    title: row.title as string,
    imageUrl: (row.image_url as string) ?? null,
    description: (row.description as string) ?? null,
    category: (row.category as string) ?? null,
    supplierId: (row.supplier_id as string) ?? null,
    status: (row.status as string) ?? "draft",
    supplierPrice: row.supplier_price != null ? String(row.supplier_price) : null,
    suggestedSellPrice: row.suggested_sell_price != null ? String(row.suggested_sell_price) : null,
    estimatedMargin: row.estimated_margin != null ? String(row.estimated_margin) : null,
    minimumOrderQuantity: row.minimum_order_quantity != null ? Number(row.minimum_order_quantity) : null,
    dozenPrice: row.dozen_price != null ? String(row.dozen_price) : null,
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
    refundStatus: (row.refund_status as string) ?? null,
    refundedAt: row.refunded_at ? new Date(row.refunded_at as string) : null,
    refundAmountHalalas: (row.refund_amount_halalas as number) ?? null,
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
    await probeSavedItemType();
    await probeSupplierProductPriceCols();
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
    const hasItemType = await probeSavedItemType();
    const selectCols = hasItemType ? "product_id, item_type" : "product_id";
    const { data, error } = await this.db
      .from("saved_products")
      .select(selectCols)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((row: any) => !hasItemType || (row.item_type ?? "product") === "product")
      .map((row: any) => row.product_id);
  }

  async getSavedProducts(userId: string): Promise<Product[]> {
    const ids = await this.getSavedProductIds(userId);
    if (ids.length === 0) return [];
    const { data: products, error: prodErr } = await this.db
      .from("products")
      .select("*")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);
    return (products ?? []).map(mapProduct);
  }

  async saveProduct(userId: string, productId: string): Promise<SavedProduct> {
    const hasItemType = await probeSavedItemType();
    let query = this.db
      .from("saved_products")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (hasItemType) query = query.eq("item_type", "product");
    const { data: existing } = await query.maybeSingle();
    if (existing) return mapSavedProduct(existing);

    const insertRow: Record<string, unknown> = { user_id: userId, product_id: productId };
    if (hasItemType) insertRow.item_type = "product";
    const { data, error } = await this.db
      .from("saved_products")
      .insert(insertRow)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to save product");
    return mapSavedProduct(data);
  }

  async unsaveProduct(userId: string, productId: string): Promise<void> {
    const hasItemType = await probeSavedItemType();
    let query = this.db
      .from("saved_products")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (hasItemType) query = query.eq("item_type", "product");
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async getSavedListingIds(userId: string): Promise<string[]> {
    const hasItemType = await probeSavedItemType();
    if (!hasItemType) return []; // Cannot distinguish listings without column
    const { data, error } = await this.db
      .from("saved_products")
      .select("product_id, item_type")
      .eq("user_id", userId)
      .eq("item_type", "listing");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => row.product_id);
  }

  async getSavedListings(userId: string): Promise<Listing[]> {
    const ids = await this.getSavedListingIds(userId);
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from("listings")
      .select("*")
      .in("id", ids);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapListing);
  }

  async saveListing(userId: string, listingId: string): Promise<SavedProduct> {
    const hasItemType = await probeSavedItemType();
    if (!hasItemType) {
      throw new Error("لتفعيل حفظ الموردين والمصانع، يجب إضافة عمود item_type في قاعدة البيانات أولاً");
    }
    const { data: existing } = await this.db
      .from("saved_products")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", listingId)
      .eq("item_type", "listing")
      .maybeSingle();
    if (existing) return mapSavedProduct(existing);

    const { data, error } = await this.db
      .from("saved_products")
      .insert({ user_id: userId, product_id: listingId, item_type: "listing" })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to save listing");
    return mapSavedProduct(data);
  }

  async unsaveListing(userId: string, listingId: string): Promise<void> {
    const hasItemType = await probeSavedItemType();
    if (!hasItemType) return;
    const { error } = await this.db
      .from("saved_products")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", listingId)
      .eq("item_type", "listing");
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

  async getSubscriptionById(id: string): Promise<Subscription | undefined> {
    if (!supabaseAdmin) return undefined;
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", id)
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

  async cancelSubscription(id: string): Promise<Subscription> {
    const { data, error } = await this.db
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error("Failed to cancel subscription");
    return mapSubscription(data);
  }

  async markSubscriptionRefundProcessing(id: string): Promise<void> {
    const { error } = await this.db
      .from("subscriptions")
      .update({ refund_status: "processing" })
      .eq("id", id);
    if (error) throw new Error("Failed to mark refund as processing");
  }

  async resetSubscriptionRefundStatus(id: string): Promise<void> {
    const { error } = await this.db
      .from("subscriptions")
      .update({ refund_status: null })
      .eq("id", id);
    if (error) throw new Error("Failed to reset refund status");
  }

  async markSubscriptionRefunded(id: string, refundAmountHalalas: number): Promise<Subscription> {
    const { data, error } = await this.db
      .from("subscriptions")
      .update({
        refund_status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_amount_halalas: refundAmountHalalas,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error("Failed to mark subscription as refunded");
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

  async getAllCategories(): Promise<Category[]> {
    const { data, error } = await this.db
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCategory);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const { data, error } = await this.db
      .from("categories")
      .insert({ name: category.name })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapCategory(data);
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.db
      .from("categories")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async getAllSupplierProducts(): Promise<SupplierProduct[]> {
    const { data, error } = await this.db
      .from("supplier_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSupplierProduct);
  }

  async getPublishedSupplierProducts(): Promise<SupplierProduct[]> {
    const { data, error } = await this.db
      .from("supplier_products")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSupplierProduct);
  }

  async getSupplierProduct(id: string): Promise<SupplierProduct | undefined> {
    const { data, error } = await this.db
      .from("supplier_products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapSupplierProduct(data);
  }

  async getSupplierProductsBySupplier(supplierId: string): Promise<SupplierProduct[]> {
    const { data, error } = await this.db
      .from("supplier_products")
      .select("*")
      .eq("supplier_id", supplierId)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSupplierProduct);
  }

  async createSupplierProduct(product: InsertSupplierProduct): Promise<SupplierProduct> {
    const priceCols = await probeSupplierProductPriceCols();
    const insertData: Record<string, unknown> = {
      title: product.title,
      image_url: product.imageUrl ?? null,
      description: product.description ?? null,
      category: product.category ?? null,
      supplier_id: product.supplierId ?? null,
      status: product.status ?? "draft",
    };
    if (priceCols.has("supplier_price")) insertData.supplier_price = product.supplierPrice ?? null;
    if (priceCols.has("suggested_sell_price")) insertData.suggested_sell_price = product.suggestedSellPrice ?? null;
    if (priceCols.has("estimated_margin")) insertData.estimated_margin = product.estimatedMargin ?? null;
    if (priceCols.has("minimum_order_quantity")) insertData.minimum_order_quantity = product.minimumOrderQuantity ?? null;
    if (priceCols.has("dozen_price")) insertData.dozen_price = product.dozenPrice ?? null;

    const { data, error } = await this.db
      .from("supplier_products")
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapSupplierProduct(data);
  }

  async updateSupplierProduct(id: string, product: Partial<InsertSupplierProduct>): Promise<SupplierProduct> {
    const priceCols = await probeSupplierProductPriceCols();
    const { data: existingRow } = await this.db
      .from("supplier_products")
      .select("supplier_id")
      .eq("id", id)
      .single();
    const existingSupplierId = (existingRow?.supplier_id as string) ?? null;

    const updateData: Record<string, unknown> = {};
    if (product.title !== undefined) updateData.title = product.title;
    if (product.imageUrl !== undefined) updateData.image_url = product.imageUrl;
    if (product.description !== undefined) updateData.description = product.description;
    if (product.category !== undefined) updateData.category = product.category;
    if (product.supplierId !== undefined && product.supplierId !== existingSupplierId) {
      updateData.supplier_id = product.supplierId;
    }
    if (product.status !== undefined) updateData.status = product.status;
    if (product.supplierPrice !== undefined && priceCols.has("supplier_price")) updateData.supplier_price = product.supplierPrice;
    if (product.suggestedSellPrice !== undefined && priceCols.has("suggested_sell_price")) updateData.suggested_sell_price = product.suggestedSellPrice;
    if (product.estimatedMargin !== undefined && priceCols.has("estimated_margin")) updateData.estimated_margin = product.estimatedMargin;
    if (product.minimumOrderQuantity !== undefined && priceCols.has("minimum_order_quantity")) updateData.minimum_order_quantity = product.minimumOrderQuantity;
    if (product.dozenPrice !== undefined && priceCols.has("dozen_price")) updateData.dozen_price = product.dozenPrice;

    const { data, error } = await this.db
      .from("supplier_products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapSupplierProduct(data);
  }

  async deleteSupplierProduct(id: string): Promise<void> {
    const { error } = await this.db
      .from("supplier_products")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
