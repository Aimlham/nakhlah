import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  category: text("category"),
  supplierName: text("supplier_name"),
  supplierPhone: text("supplier_phone"),
  supplierWhatsapp: text("supplier_whatsapp"),
  supplierCity: text("supplier_city"),
  supplierType: text("supplier_type"),
  supplierLocation: text("supplier_link"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supplierProducts = pgTable("supplier_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  category: text("category"),
  supplierId: text("supplier_id"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  shortDescription: text("short_description"),
  category: text("category").notNull(),
  niche: text("niche"),
  sourcePlatform: text("source_platform"),
  source: text("source"),
  supplierPrice: numeric("supplier_price").notNull(),
  suggestedSellPrice: numeric("suggested_sell_price").notNull(),
  actualSellPrice: numeric("actual_sell_price"),
  estimatedMargin: numeric("estimated_margin"),
  ordersCount: integer("orders_count"),
  rating: numeric("rating"),
  supplierName: text("supplier_name"),
  isHalalSafe: boolean("is_halal_safe").default(true),
  discoverySource: text("discovery_source"),
  supplierSource: text("supplier_source"),
  trendScore: integer("trend_score"),
  saturationScore: integer("saturation_score"),
  opportunityScore: integer("opportunity_score"),
  aiSummary: text("ai_summary"),
  supplierLink: text("supplier_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedProducts = pgTable("saved_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productAds = pgTable("product_ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id"),
  platform: text("platform").notNull(),
  niche: text("niche"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  advertiserName: text("advertiser_name"),
  adDescription: text("ad_description"),
  landingPageUrl: text("landing_page_url"),
  externalAdId: text("external_ad_id"),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull().default("pending"),
  moyasarInvoiceId: text("moyasar_invoice_id"),
  moyasarPaymentId: text("moyasar_payment_id"),
  amountHalalas: integer("amount_halalas"),
  activatedAt: timestamp("activated_at"),
  refundStatus: text("refund_status"),
  refundedAt: timestamp("refunded_at"),
  refundAmountHalalas: integer("refund_amount_halalas"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertSavedProductSchema = createInsertSchema(savedProducts).omit({
  id: true,
  createdAt: true,
});

export const insertProductAdSchema = createInsertSchema(productAds).omit({
  id: true,
  createdAt: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierProductSchema = createInsertSchema(supplierProducts).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type SavedProduct = typeof savedProducts.$inferSelect;
export type InsertSavedProduct = z.infer<typeof insertSavedProductSchema>;
export type ProductAd = typeof productAds.$inferSelect;
export type InsertProductAd = z.infer<typeof insertProductAdSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Profile = typeof profiles.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type InsertSupplierProduct = z.infer<typeof insertSupplierProductSchema>;

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export interface SupplierProductWithSupplier extends SupplierProduct {
  supplier?: {
    id: string;
    title: string;
    supplierCity?: string | null;
    supplierType?: string | null;
    imageUrl?: string | null;
  } | null;
}
