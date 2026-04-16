import { type User, type InsertUser, type Product, type InsertProduct, type SavedProduct, type InsertSavedProduct, type ProductAd, type InsertProductAd, type Subscription, type Listing, type InsertListing, type Profile } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { supabaseConfigured } from "./supabase";
import { SupabaseStorage } from "./supabase-storage";
import { checkHalalSafeText } from "@shared/halal";

const BCRYPT_ROUNDS = 12;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword?(plaintext: string, hashed: string): Promise<boolean>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getSavedProductIds(userId: string): Promise<string[]>;
  getSavedProducts(userId: string): Promise<Product[]>;
  saveProduct(userId: string, productId: string): Promise<SavedProduct>;
  unsaveProduct(userId: string, productId: string): Promise<void>;
  createProduct(product: InsertProduct): Promise<Product>;
  getAdsByProductId(productId: string): Promise<ProductAd[]>;
  getAllAds(): Promise<ProductAd[]>;
  createAd(ad: InsertProductAd): Promise<ProductAd>;
  updateProductAiSummary(productId: string, aiSummary: string): Promise<void>;
  updateProductPrices(productId: string, supplierPrice: string, suggestedSellPrice: string, actualSellPrice: string, estimatedMargin: string): Promise<void>;
  findProductByTitle(title: string, source: string): Promise<Product | undefined>;
  upsertSubscription(sub: {
    userId: string;
    plan: string;
    status: string;
    moyasarInvoiceId?: string;
    moyasarPaymentId?: string;
    amountHalalas?: number;
    activatedAt?: Date | null;
  }): Promise<Subscription>;
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByInvoiceId(invoiceId: string): Promise<Subscription | undefined>;

  getProfile(userId: string): Promise<Profile | undefined>;

  getAllListings(): Promise<Listing[]>;
  getPublishedListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing>;
  deleteListing(id: string): Promise<void>;

  init?(): Promise<void>;
}

export function checkHalalSafe(product: { nameEn?: string; title?: string; description?: string; category?: string; niche?: string }): boolean {
  const text = [
    product.nameEn || "",
    product.title || "",
    product.description || "",
    product.category || "",
    product.niche || "",
  ].join(" ");

  return checkHalalSafeText(text);
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private savedProducts: Map<string, SavedProduct>;
  private ads: Map<string, ProductAd>;
  private subscriptions: Map<string, Subscription>;
  private profiles: Map<string, Profile>;
  private listings: Map<string, Listing>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.savedProducts = new Map();
    this.ads = new Map();
    this.subscriptions = new Map();
    this.profiles = new Map();
    this.listings = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, BCRYPT_ROUNDS);
    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      fullName: insertUser.fullName ?? null,
      email: insertUser.email ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async verifyPassword(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getSavedProductIds(userId: string): Promise<string[]> {
    return Array.from(this.savedProducts.values())
      .filter(sp => sp.userId === userId)
      .map(sp => sp.productId);
  }

  async getSavedProducts(userId: string): Promise<Product[]> {
    const ids = await this.getSavedProductIds(userId);
    return ids.map(id => this.products.get(id)).filter(Boolean) as Product[];
  }

  async saveProduct(userId: string, productId: string): Promise<SavedProduct> {
    const key = `${userId}:${productId}`;
    const existing = this.savedProducts.get(key);
    if (existing) return existing;
    const sp: SavedProduct = {
      id: randomUUID(),
      userId,
      productId,
      createdAt: new Date(),
    };
    this.savedProducts.set(key, sp);
    return sp;
  }

  async unsaveProduct(userId: string, productId: string): Promise<void> {
    const key = `${userId}:${productId}`;
    this.savedProducts.delete(key);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = {
      id,
      title: product.title,
      imageUrl: product.imageUrl || null,
      shortDescription: product.shortDescription || null,
      category: product.category,
      niche: product.niche || null,
      sourcePlatform: product.sourcePlatform || null,
      source: product.source || null,
      supplierPrice: product.supplierPrice,
      suggestedSellPrice: product.suggestedSellPrice,
      actualSellPrice: product.actualSellPrice || null,
      estimatedMargin: product.estimatedMargin || null,
      ordersCount: product.ordersCount || null,
      rating: product.rating || null,
      supplierName: product.supplierName || null,
      isHalalSafe: product.isHalalSafe ?? true,
      discoverySource: product.discoverySource || null,
      supplierSource: product.supplierSource || null,
      trendScore: product.trendScore || null,
      saturationScore: product.saturationScore || null,
      opportunityScore: product.opportunityScore || null,
      aiSummary: product.aiSummary || null,
      supplierLink: product.supplierLink || null,
      createdAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getAdsByProductId(productId: string): Promise<ProductAd[]> {
    return Array.from(this.ads.values()).filter(ad => ad.productId === productId);
  }

  async getAllAds(): Promise<ProductAd[]> {
    return Array.from(this.ads.values());
  }

  async createAd(ad: InsertProductAd): Promise<ProductAd> {
    const id = randomUUID();
    const newAd: ProductAd = {
      id,
      productId: ad.productId ?? null,
      platform: ad.platform,
      niche: ad.niche ?? null,
      videoUrl: ad.videoUrl,
      thumbnailUrl: ad.thumbnailUrl ?? null,
      views: ad.views ?? 0,
      likes: ad.likes ?? 0,
      publishedAt: ad.publishedAt ?? null,
      createdAt: new Date(),
      advertiserName: ad.advertiserName ?? null,
      adDescription: ad.adDescription ?? null,
      landingPageUrl: ad.landingPageUrl ?? null,
      externalAdId: ad.externalAdId ?? null,
    };
    this.ads.set(id, newAd);
    return newAd;
  }

  async updateProductAiSummary(productId: string, aiSummary: string): Promise<void> {
    const product = this.products.get(productId);
    if (product) {
      product.aiSummary = aiSummary;
      this.products.set(productId, product);
    }
  }

  async updateProductPrices(productId: string, supplierPrice: string, suggestedSellPrice: string, actualSellPrice: string, estimatedMargin: string): Promise<void> {
    const product = this.products.get(productId);
    if (product) {
      product.supplierPrice = supplierPrice;
      product.suggestedSellPrice = suggestedSellPrice;
      product.actualSellPrice = actualSellPrice;
      product.estimatedMargin = estimatedMargin;
      this.products.set(productId, product);
    }
  }

  async findProductByTitle(title: string, source: string): Promise<Product | undefined> {
    const lower = title.toLowerCase().trim();
    for (const p of this.products.values()) {
      if (p.source === source && (p.title || "").toLowerCase().trim() === lower) {
        return p;
      }
    }
    return undefined;
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
    const existing = Array.from(this.subscriptions.values()).find(s => s.userId === sub.userId);
    const record: Subscription = {
      id: existing?.id ?? randomUUID(),
      userId: sub.userId,
      plan: sub.plan,
      status: sub.status,
      moyasarInvoiceId: sub.moyasarInvoiceId ?? existing?.moyasarInvoiceId ?? null,
      moyasarPaymentId: sub.moyasarPaymentId ?? existing?.moyasarPaymentId ?? null,
      amountHalalas: sub.amountHalalas ?? existing?.amountHalalas ?? null,
      activatedAt: sub.activatedAt !== undefined ? sub.activatedAt : (existing?.activatedAt ?? null),
      createdAt: existing?.createdAt ?? new Date(),
    };
    this.subscriptions.set(record.id, record);
    return record;
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(s => s.userId === userId);
  }

  async getSubscriptionByInvoiceId(invoiceId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(s => s.moyasarInvoiceId === invoiceId);
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    return this.profiles.get(userId);
  }

  async getAllListings(): Promise<Listing[]> {
    return Array.from(this.listings.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getPublishedListings(): Promise<Listing[]> {
    return (await this.getAllListings()).filter(l => l.status === "published");
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    const id = randomUUID();
    const newListing: Listing = {
      id,
      title: listing.title,
      imageUrl: listing.imageUrl ?? null,
      description: listing.description ?? null,
      category: listing.category ?? null,
      supplierName: listing.supplierName ?? null,
      supplierPhone: listing.supplierPhone ?? null,
      supplierWhatsapp: listing.supplierWhatsapp ?? null,
      supplierCity: listing.supplierCity ?? null,
      supplierType: listing.supplierType ?? null,
      supplierLocation: listing.supplierLocation ?? null,
      status: listing.status ?? "draft",
      createdAt: new Date(),
    };
    this.listings.set(id, newListing);
    return newListing;
  }

  async updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing> {
    const existing = this.listings.get(id);
    if (!existing) throw new Error("Listing not found");
    const updated: Listing = { ...existing, ...listing };
    this.listings.set(id, updated);
    return updated;
  }

  async deleteListing(id: string): Promise<void> {
    this.listings.delete(id);
  }
}

function createStorage(): IStorage {
  if (supabaseConfigured) {
    console.log("[storage] Using Supabase backend");
    return new SupabaseStorage();
  }
  console.log("[storage] Supabase not configured — using in-memory storage");
  return new MemStorage();
}

export const storage = createStorage();
