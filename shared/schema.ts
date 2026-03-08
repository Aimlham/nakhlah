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
  sellPrice: numeric("sell_price"),
  estimatedMargin: numeric("estimated_margin"),
  orders: integer("orders"),
  rating: numeric("rating"),
  supplierName: text("supplier_name"),
  isHalalSafe: boolean("is_halal_safe").default(true),
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
  productId: varchar("product_id").notNull(),
  platform: text("platform").notNull(),
  niche: text("niche"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type SavedProduct = typeof savedProducts.$inferSelect;
export type InsertSavedProduct = z.infer<typeof insertSavedProductSchema>;
export type ProductAd = typeof productAds.$inferSelect;
export type InsertProductAd = z.infer<typeof insertProductAdSchema>;
