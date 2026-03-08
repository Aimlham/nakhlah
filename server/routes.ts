import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { supabaseConfigured, supabaseAdmin, verifySupabaseToken } from "./supabase";
import { scoreProduct } from "@shared/scoring";
import { generateProductAnalysis } from "./openai";
import { checkHalalSafe } from "./storage";
import { importAliExpressProducts, getAliExpressStatus } from "./aliexpress-importer";
import { importAmazonProducts, getAmazonStatus } from "./amazon-importer";
import { importTikTokAds, getTikTokStatus } from "./tiktok-importer";
import { isProductPublishable, qualifyProduct } from "@shared/qualification";
import { z } from "zod";

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

  app.get("/api/products/winning", async (req: Request, res: Response) => {
    try {
      let products = await storage.getAllProducts();
      products = products.map(scoreProduct);
      const winning = products
        .filter(p => isProductPublishable(p))
        .sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));
      res.json(winning);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch winning products" });
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
          const product = a.productId ? productMap.get(a.productId) : null;
          return (
            product?.title.toLowerCase().includes(q) ||
            product?.category.toLowerCase().includes(q) ||
            (a.advertiserName || "").toLowerCase().includes(q) ||
            (a.adDescription || "").toLowerCase().includes(q)
          );
        });
      }

      const enriched = ads.map(ad => {
        const product = ad.productId ? productMap.get(ad.productId) : null;
        return {
          ...ad,
          productTitle: product?.title || ad.advertiserName || ad.platform,
          productCategory: product?.category || "",
          productNiche: ad.niche || product?.niche || "",
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch ads" });
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

  const tiktokImportSchema = z.object({
    query: z.string().min(1).max(200),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    max_results: z.number().int().min(1).max(100).optional().default(30),
  });

  app.post("/api/import/tiktok-ads", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsed = tiktokImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
      }

      const { query, start_date, end_date, max_results } = parsed.data;

      const result = await importTikTokAds({
        query: query.trim(),
        startDate: start_date,
        endDate: end_date,
        maxResults: max_results,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[tiktok] Import route error:", err.message);
      res.status(500).json({ message: err.message || "Failed to import TikTok ads" });
    }
  });

  app.get("/api/import/tiktok-ads/status", async (_req: Request, res: Response) => {
    res.json(getTikTokStatus());
  });

  return httpServer;
}
