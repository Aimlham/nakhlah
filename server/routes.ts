import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { supabaseConfigured, supabaseAdmin, verifySupabaseToken } from "./supabase";
import { scoreProduct } from "@shared/scoring";
import { generateProductAnalysis } from "./openai";
import { searchCJProducts, translateProductToArabic, translateProductNamesToArabic, calculateProductScores, getWinningProducts, enrichProduct } from "./cj-dropshipping";
import { checkHalalSafe } from "./storage";
import { importAliExpressProducts, getAliExpressStatus } from "./aliexpress-importer";
import { importAmazonProducts, getAmazonStatus } from "./amazon-importer";
import { z } from "zod";

const cjProductSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  bigImage: z.string().nullable().optional().default(""),
  sellPrice: z.string(),
  nowPrice: z.string().nullable().optional(),
  listedNum: z.number().int().min(0).nullable().optional().default(0),
  threeCategoryName: z.string().nullable().optional(),
  twoCategoryName: z.string().nullable().optional(),
  oneCategoryName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  addMarkStatus: z.number().int().nullable().optional().default(0),
  createAt: z.number().nullable().optional().default(0),
});

function extractPrice(price: string | null | undefined): string {
  if (!price) return "0";
  const cleaned = price.replace(/\s+/g, "");
  const match = cleaned.match(/[\d.]+/);
  return match ? match[0] : "0";
}

const SessionStore = MemoryStore(session);

async function getAuthUserId(req: Request): Promise<string | null> {
  if (supabaseConfigured) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const user = await verifySupabaseToken(token);
    return user?.id ?? null;
  }
  return (req.session as any)?.userId ?? null;
}

async function getAuthUser(req: Request): Promise<{
  id: string;
  email: string;
  fullName: string | null;
} | null> {
  if (supabaseConfigured) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return verifySupabaseToken(token);
  }
  const userId = (req.session as any)?.userId;
  if (!userId) return null;
  const user = await storage.getUser(userId);
  if (!user) return null;
  return { id: user.id, email: user.username, fullName: user.fullName };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  if (!supabaseConfigured) {
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "trenddrop-dev-secret",
        resave: false,
        saveUninitialized: false,
        store: new SessionStore({ checkPeriod: 86400000 }),
        cookie: {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        },
      })
    );
  }

  app.get("/api/config", (_req: Request, res: Response) => {
    res.json({ supabaseEnabled: supabaseConfigured });
  });

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (supabaseConfigured && supabaseAdmin) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName || null },
        });
        if (error) {
          const status = error.message.includes("already") ? 409 : 400;
          return res.status(status).json({ message: error.message });
        }
        const { data: signIn, error: signInErr } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (signInErr || !signIn.session) {
          return res.json({
            user: {
              id: data.user.id,
              email: data.user.email,
              fullName: fullName || null,
            },
            needsClientSignIn: true,
          });
        }
        return res.json({
          user: {
            id: data.user.id,
            email: data.user.email,
            fullName: fullName || null,
          },
          session: {
            access_token: signIn.session.access_token,
            refresh_token: signIn.session.refresh_token,
          },
        });
      }

      const existing = await storage.getUserByUsername(email);
      if (existing) {
        return res.status(409).json({ message: "Email already taken" });
      }
      const user = await storage.createUser({
        username: email,
        password,
        fullName: fullName || null,
        email: null,
      });
      (req.session as any).userId = user.id;
      res.json({ user: { id: user.id, email: user.username, fullName: user.fullName } });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (supabaseConfigured && supabaseAdmin) {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        return res.json({
          user: {
            id: data.user.id,
            email: data.user.email,
            fullName: (data.user.user_metadata?.full_name as string) ?? null,
          },
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
      }

      const user = await storage.getUserByUsername(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      (req.session as any).userId = user.id;
      res.json({ user: { id: user.id, email: user.username, fullName: user.fullName } });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json({ user });
    } catch {
      return res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (!supabaseConfigured) {
      req.session.destroy(() => {});
    }
    res.json({ success: true });
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      let products = await storage.getAllProducts();
      products = products.map(scoreProduct);

      const { halal_only } = req.query;
      if (halal_only === "true") {
        products = products.filter(p => p.isHalalSafe !== false);
      }

      res.json(products);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(scoreProduct(product));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch product" });
    }
  });

  app.get("/api/saved/ids", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.json({ savedProductIds: [] });
      }
      const ids = await storage.getSavedProductIds(userId);
      res.json({ savedProductIds: ids });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch saved IDs" });
    }
  });

  app.get("/api/saved/products", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.json([]);
      }
      const products = await storage.getSavedProducts(userId);
      res.json(products.map(scoreProduct));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch saved products" });
    }
  });

  app.post("/api/saved/:productId", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const product = await storage.getProduct(req.params.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      const saved = await storage.saveProduct(userId, req.params.productId);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to save product" });
    }
  });

  app.delete("/api/saved/:productId", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await storage.unsaveProduct(userId, req.params.productId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to unsave product" });
    }
  });

  app.get("/api/products/:id/ads", async (req: Request, res: Response) => {
    try {
      let ads = await storage.getAdsByProductId(req.params.id);
      if (ads.length === 0) {
        const products = await storage.getAllProducts();
        const sortedProducts = [...products].sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        const productIndex = sortedProducts.findIndex(p => p.id === req.params.id);
        if (productIndex >= 0) {
          const mockIndex = String(productIndex + 1);
          const allAds = await storage.getAllAds();
          ads = allAds
            .filter(a => a.productId === mockIndex)
            .map(a => ({ ...a, productId: req.params.id }));
        }
      }
      res.json(ads);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch ads" });
    }
  });

  app.post("/api/products/:id/analyze", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const aiSummary = await generateProductAnalysis({
        title: product.title,
        category: product.category,
        niche: product.niche,
        shortDescription: product.shortDescription,
        supplierPrice: product.supplierPrice,
        suggestedSellPrice: product.suggestedSellPrice,
        estimatedMargin: product.estimatedMargin,
        trendScore: product.trendScore,
        saturationScore: product.saturationScore,
        sourcePlatform: product.sourcePlatform,
      });

      await storage.updateProductAiSummary(req.params.id, aiSummary);

      res.json({ aiSummary });
    } catch (err: any) {
      console.error("[openai] Analysis error:", err.message);
      res.status(500).json({ message: err.message || "Failed to generate analysis" });
    }
  });

  app.get("/api/ads", async (req: Request, res: Response) => {
    try {
      let ads = await storage.getAllAds();
      const products = await storage.getAllProducts();
      const productMap = new Map(products.map(p => [p.id, p]));

      const sortedProducts = [...products].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      const indexToIdMap = new Map<string, string>();
      sortedProducts.forEach((p, i) => indexToIdMap.set(String(i + 1), p.id));

      ads = ads.map(ad => {
        if (productMap.has(ad.productId)) return ad;
        const realId = indexToIdMap.get(ad.productId);
        if (realId) return { ...ad, productId: realId };
        return ad;
      });

      const { search, platform, niche, minViews } = req.query;

      if (platform && platform !== "all") {
        ads = ads.filter(a => a.platform === platform);
      }

      if (minViews) {
        const min = parseInt(minViews as string, 10);
        if (!isNaN(min)) ads = ads.filter(a => (a.views || 0) >= min);
      }

      if (niche && niche !== "all") {
        ads = ads.filter(a => {
          if (a.niche === niche) return true;
          const product = productMap.get(a.productId);
          return product?.niche === niche;
        });
      }

      if (search) {
        const q = (search as string).toLowerCase();
        ads = ads.filter(a => {
          const product = productMap.get(a.productId);
          return product?.title.toLowerCase().includes(q) || product?.category.toLowerCase().includes(q);
        });
      }

      const enriched = ads.map(ad => {
        const product = productMap.get(ad.productId);
        return {
          ...ad,
          productTitle: product?.title || "",
          productCategory: product?.category || "",
          productNiche: ad.niche || product?.niche || "",
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch ads" });
    }
  });

  app.get("/api/cj/winning", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!process.env.CJ_API_TOKEN) {
        return res.status(500).json({ message: "CJ Dropshipping not configured" });
      }

      const { keyword, page, size, sort } = req.query;
      const result = await getWinningProducts({
        keyword: keyword as string,
        page: page ? parseInt(page as string) : 1,
        size: size ? parseInt(size as string) : 20,
        sort: (sort as any) || "winning",
      });

      const translations = await translateProductNamesToArabic(result.products);
      const productsWithArabic = result.products.map(p => ({
        ...p,
        nameAr: translations[p.id] || p.nameEn,
      }));

      res.json({ ...result, products: productsWithArabic });
    } catch (err: any) {
      console.error("[cj] Winning products error:", err.message);
      res.status(500).json({ message: err.message || "Failed to fetch winning products" });
    }
  });

  app.post("/api/cj/analyze", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsed = cjProductSchema.safeParse(req.body?.product);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product data" });
      }

      const cjProduct = parsed.data;
      const translated = await translateProductToArabic(cjProduct);
      const enriched = enrichProduct(cjProduct);

      let analysis = null;
      try {
        analysis = await generateProductAnalysis({
          title: translated.title,
          category: translated.category,
          niche: translated.niche || null,
          shortDescription: translated.shortDescription || null,
          supplierPrice: String(enriched.supplierPriceSAR),
          suggestedSellPrice: String(enriched.suggestedPriceSAR),
          estimatedMargin: String(enriched.profitMarginPercent),
          trendScore: enriched.winningScore,
          saturationScore: enriched.competitionLevel === "عالية" ? 70 : enriched.competitionLevel === "متوسطة" ? 45 : 20,
          sourcePlatform: "CJ Dropshipping",
        });
      } catch {}

      res.json({
        ...enriched,
        nameAr: translated.title,
        shortDescription: translated.shortDescription,
        categoryAr: translated.category,
        nicheAr: translated.niche,
        aiAnalysis: analysis,
      });
    } catch (err: any) {
      console.error("[cj] Analyze error:", err.message);
      res.status(500).json({ message: err.message || "Failed to analyze product" });
    }
  });

  app.get("/api/cj/search", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!process.env.CJ_API_TOKEN) {
        return res.status(500).json({ message: "CJ Dropshipping not configured" });
      }

      const { keyword, page, size, productFlag, categoryId } = req.query;
      const result = await searchCJProducts({
        keyword: keyword as string,
        page: page ? parseInt(page as string) : 1,
        size: size ? parseInt(size as string) : 20,
        productFlag: productFlag !== undefined ? parseInt(productFlag as string) : undefined,
        categoryId: categoryId as string,
      });

      const translations = await translateProductNamesToArabic(result.products);
      const productsWithArabic = result.products.map(p => ({
        ...p,
        nameAr: translations[p.id] || p.nameEn,
      }));

      res.json({ ...result, products: productsWithArabic });
    } catch (err: any) {
      console.error("[cj] Search error:", err.message);
      res.status(500).json({ message: err.message || "Failed to search CJ products" });
    }
  });

  app.post("/api/cj/import", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsed = cjProductSchema.safeParse(req.body?.product);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product data", errors: parsed.error.flatten().fieldErrors });
      }
      const cjProduct = parsed.data;

      const translated = await translateProductToArabic(cjProduct);
      const scores = calculateProductScores(cjProduct);
      const supplierPrice = extractPrice(cjProduct.nowPrice || cjProduct.sellPrice);

      const isHalalSafe = checkHalalSafe({ nameEn: cjProduct.nameEn, description: cjProduct.description || "", category: translated.category, niche: translated.niche });

      const newProduct = await storage.createProduct({
        title: translated.title,
        imageUrl: cjProduct.bigImage || null,
        shortDescription: translated.shortDescription,
        category: translated.category,
        niche: translated.niche,
        sourcePlatform: "CJ Dropshipping",
        source: "cj",
        supplierPrice,
        suggestedSellPrice: scores.suggestedSellPrice,
        actualSellPrice: scores.suggestedSellPrice,
        estimatedMargin: scores.estimatedMargin,
        ordersCount: cjProduct.listedNum || 0,
        rating: null,
        supplierName: "CJ Dropshipping",
        isHalalSafe: isHalalSafe,
        discoverySource: "cj",
        supplierSource: "cj",
        trendScore: scores.trendScore,
        saturationScore: scores.saturationScore,
        opportunityScore: null,
        aiSummary: null,
        supplierLink: `https://cjdropshipping.com/product/detail-${cjProduct.id}.html`,
      });

      res.json(newProduct);
    } catch (err: any) {
      console.error("[cj] Import error:", err.message);
      res.status(500).json({ message: err.message || "Failed to import product" });
    }
  });

  app.post("/api/cj/import-batch", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { products: cjProducts } = req.body;
      if (!Array.isArray(cjProducts) || cjProducts.length === 0) {
        return res.status(400).json({ message: "Products array required" });
      }

      const limit = Math.min(cjProducts.length, 10);
      const imported = [];
      const failed: { index: number; error: string }[] = [];

      for (let i = 0; i < limit; i++) {
        try {
          const parsed = cjProductSchema.safeParse(cjProducts[i]);
          if (!parsed.success) {
            failed.push({ index: i, error: "Invalid product data" });
            continue;
          }
          const cjProduct = parsed.data;
          const translated = await translateProductToArabic(cjProduct);
          const scores = calculateProductScores(cjProduct);
          const supplierPrice = extractPrice(cjProduct.nowPrice || cjProduct.sellPrice);
          const isHalalSafe = checkHalalSafe({ nameEn: cjProduct.nameEn, description: cjProduct.description || "", category: translated.category, niche: translated.niche });

          const newProduct = await storage.createProduct({
            title: translated.title,
            imageUrl: cjProduct.bigImage || null,
            shortDescription: translated.shortDescription,
            category: translated.category,
            niche: translated.niche,
            sourcePlatform: "CJ Dropshipping",
            source: "cj",
            supplierPrice,
            suggestedSellPrice: scores.suggestedSellPrice,
            actualSellPrice: scores.suggestedSellPrice,
            estimatedMargin: scores.estimatedMargin,
            ordersCount: cjProduct.listedNum || 0,
            rating: null,
            supplierName: "CJ Dropshipping",
            isHalalSafe: isHalalSafe,
            discoverySource: "cj",
            supplierSource: "cj",
            trendScore: scores.trendScore,
            saturationScore: scores.saturationScore,
            opportunityScore: null,
            aiSummary: null,
            supplierLink: `https://cjdropshipping.com/product/detail-${cjProduct.id}.html`,
          });
          imported.push(newProduct);
        } catch (err: any) {
          console.error(`[cj] Failed to import product ${i}:`, err.message);
          failed.push({ index: i, error: err.message });
        }
      }

      res.json({ imported: imported.length, failed: failed.length, products: imported, errors: failed });
    } catch (err: any) {
      console.error("[cj] Batch import error:", err.message);
      res.status(500).json({ message: err.message || "Failed to batch import" });
    }
  });

  const aliexpressImportSchema = z.object({
    keyword: z.string().min(1).max(200),
    halal_only: z.boolean().optional().default(false),
    min_orders: z.number().int().min(0).max(100000).optional().default(50),
    min_rating: z.number().min(0).max(5).optional().default(4.0),
    max_results: z.number().int().min(1).max(100).optional().default(20),
  });

  app.post("/api/import/aliexpress", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsed = aliexpressImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
      }

      const { keyword, halal_only, min_orders, min_rating, max_results } = parsed.data;

      const result = await importAliExpressProducts({
        keyword: keyword.trim(),
        halalOnly: halal_only,
        minOrders: min_orders,
        minRating: min_rating,
        maxResults: max_results,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[aliexpress] Import route error:", err.message);
      res.status(500).json({ message: err.message || "Failed to import AliExpress products" });
    }
  });

  app.get("/api/import/aliexpress/status", async (_req: Request, res: Response) => {
    res.json(getAliExpressStatus());
  });

  const amazonImportSchema = z.object({
    keyword: z.string().min(1).max(200),
    halal_only: z.boolean().optional().default(false),
    min_orders: z.number().int().min(0).max(100000).optional().default(0),
    min_rating: z.number().min(0).max(5).optional().default(3.5),
    max_results: z.number().int().min(1).max(100).optional().default(20),
    country: z.string().min(2).max(5).optional().default("US"),
  });

  app.post("/api/import/amazon", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsed = amazonImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
      }

      const { keyword, halal_only, min_orders, min_rating, max_results, country } = parsed.data;

      const result = await importAmazonProducts({
        keyword: keyword.trim(),
        halalOnly: halal_only,
        minOrders: min_orders,
        minRating: min_rating,
        maxResults: max_results,
        country,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[amazon] Import route error:", err.message);
      res.status(500).json({ message: err.message || "Failed to import Amazon products" });
    }
  });

  app.get("/api/import/amazon/status", async (_req: Request, res: Response) => {
    res.json(getAmazonStatus());
  });

  return httpServer;
}
