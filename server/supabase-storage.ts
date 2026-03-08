import type {
  User,
  InsertUser,
  Product,
  InsertProduct,
  SavedProduct,
  ProductAd,
} from "@shared/schema";
import { supabaseAdmin } from "./supabase";
import type { IStorage } from "./storage";
import { getMockAds } from "./mock-ads";

const NEW_COLUMNS = ["source", "sell_price", "orders", "rating", "supplier_name", "is_halal_safe"];
let availableNewColumns: Set<string> = new Set();
let columnsProbed = false;

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
    console.log("[supabase] Run this SQL in Supabase Dashboard > SQL Editor:");
    console.log(`
ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS orders INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_halal_safe BOOLEAN DEFAULT true;
    `.trim());
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
    sellPrice: row.sell_price != null ? String(row.sell_price) : null,
    estimatedMargin: row.estimated_margin != null ? String(row.estimated_margin) : null,
    orders: (row.orders as number) ?? null,
    rating: row.rating != null ? String(row.rating) : null,
    supplierName: (row.supplier_name as string) ?? null,
    isHalalSafe: row.is_halal_safe != null ? (row.is_halal_safe as boolean) : true,
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

export class SupabaseStorage implements IStorage {
  private get db() {
    if (!supabaseAdmin) throw new Error("Supabase not configured");
    return supabaseAdmin;
  }

  async init() {
    await probeColumns();
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
    if (hasCol("sell_price")) row.sell_price = product.sellPrice || null;
    if (hasCol("orders")) row.orders = product.orders || null;
    if (hasCol("rating")) row.rating = product.rating || null;
    if (hasCol("supplier_name")) row.supplier_name = product.supplierName || null;
    if (hasCol("is_halal_safe")) row.is_halal_safe = product.isHalalSafe ?? true;

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
      console.log("[supabase] product_ads table not available, using mock ads fallback");
      return getMockAds().filter(ad => ad.productId === productId);
    }
    if (data && data.length > 0) return data.map(mapProductAd);
    return getMockAds().filter(ad => ad.productId === productId);
  }

  async getAllAds(): Promise<ProductAd[]> {
    const { data, error } = await this.db
      .from("product_ads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.log("[supabase] product_ads table not available, using mock ads fallback");
      return getMockAds();
    }
    if (data && data.length > 0) return data.map(mapProductAd);
    return getMockAds();
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
}

function mapProductAd(row: Record<string, unknown>): ProductAd {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    platform: row.platform as string,
    niche: (row.niche as string) ?? null,
    videoUrl: row.video_url as string,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    views: (row.views as number) ?? 0,
    likes: (row.likes as number) ?? 0,
    publishedAt: row.published_at ? new Date(row.published_at as string) : null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}
