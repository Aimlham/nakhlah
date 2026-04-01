import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { supabaseConfigured, supabaseAdmin, verifySupabaseToken } from "./supabase";
import { scoreProduct } from "@shared/scoring";
import { generateProductAnalysis } from "./openai";
import { importAliExpressProducts, getAliExpressStatus } from "./aliexpress-importer";
import { importAmazonProducts, getAmazonStatus } from "./amazon-importer";
import { importTikTokAds, getTikTokStatus } from "./tiktok-importer";
import { isProductPublishable } from "@shared/qualification";
import { z } from "zod";

const SessionStore = MemoryStore(session);
const isProdEnv = process.env.NODE_ENV === "production";

function safeErrorMessage(err: any, fallback: string): string {
  if (isProdEnv) return fallback;
  return err?.message || fallback;
}

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
  const isProd = process.env.NODE_ENV === "production";

  if (!supabaseConfigured) {
    const sessionSecret = process.env.SESSION_SECRET;
    if (isProd && !sessionSecret) {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }

    app.use(
      session({
        secret: sessionSecret || "nakhlah-dev-secret",
        resave: false,
        saveUninitialized: false,
        store: new SessionStore({ checkPeriod: 86400000 }),
        cookie: {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: isProd,
          sameSite: isProd ? "strict" : "lax",
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
      res.status(500).json({ message: safeErrorMessage(err, "Server error") });
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
      const passwordValid = user && (
        storage.verifyPassword
          ? await storage.verifyPassword(password, user.password)
          : user.password === password
      );
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      (req.session as any).userId = user.id;
      res.json({ user: { id: user.id, email: user.username, fullName: user.fullName } });
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Server error") });
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

      res.json(products);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch products") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch winning products") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch product") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch saved IDs") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch saved products") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to save product") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to unsave product") });
    }
  });

  app.get("/api/products/:id/ads", async (req: Request, res: Response) => {
    try {
      const ads = await storage.getAdsByProductId(req.params.id);
      res.json(ads);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch ads") });
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
      res.status(500).json({ message: safeErrorMessage(err, "Failed to generate analysis") });
    }
  });

  const adsQuerySchema = z.object({
    search: z.string().max(200).optional(),
    platform: z.string().max(50).optional(),
    niche: z.string().max(100).optional(),
    minViews: z.string().regex(/^\d+$/).optional(),
  });

  app.get("/api/ads", async (req: Request, res: Response) => {
    try {
      const parsed = adsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid query parameters" });
      }

      let ads = await storage.getAllAds();
      const products = await storage.getAllProducts();
      const productMap = new Map(products.map(p => [p.id, p]));

      const { search, platform, niche, minViews } = parsed.data;

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
          const product = a.productId ? productMap.get(a.productId) : null;
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

      const adsWithProducts = ads.filter(ad => {
        if (!ad.productId) return false;
        return productMap.has(ad.productId);
      });

      const enriched = adsWithProducts.map(ad => {
        const product = productMap.get(ad.productId!)!;
        return {
          ...ad,
          productTitle: product.title,
          productCategory: product.category,
          productNiche: ad.niche || product.niche || "",
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch ads") });
    }
  });

  const aliexpressImportSchema = z.object({
    keyword: z.string().min(1).max(200),
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

      const { keyword, min_orders, min_rating, max_results } = parsed.data;

      const result = await importAliExpressProducts({
        keyword: keyword.trim(),
        minOrders: min_orders,
        minRating: min_rating,
        maxResults: max_results,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[aliexpress] Import route error:", err.message);
      res.status(500).json({ message: safeErrorMessage(err, "Failed to import AliExpress products") });
    }
  });

  app.get("/api/import/aliexpress/status", async (_req: Request, res: Response) => {
    res.json(getAliExpressStatus());
  });

  const amazonImportSchema = z.object({
    keyword: z.string().min(1).max(200),
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

      const { keyword, min_orders, min_rating, max_results, country } = parsed.data;

      const result = await importAmazonProducts({
        keyword: keyword.trim(),
        minOrders: min_orders,
        minRating: min_rating,
        maxResults: max_results,
        country,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[amazon] Import route error:", err.message);
      res.status(500).json({ message: safeErrorMessage(err, "Failed to import Amazon products") });
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
    country: z.string().optional(),
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
        country: parsed.data.country,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[tiktok] Import route error:", err.message);
      res.status(500).json({ message: safeErrorMessage(err, "Failed to import TikTok ads") });
    }
  });

  app.get("/api/import/tiktok-ads/status", async (_req: Request, res: Response) => {
    res.json(getTikTokStatus());
  });

  // ─── Moyasar Payment Integration ──────────────────────────────────────────
  //
  // Uses the Moyasar INVOICES API (/v1/invoices) which returns a hosted
  // payment URL the user is redirected to — correct for a SaaS upgrade flow.
  //
  // Flow:
  //   1. POST /api/payments/create  → creates invoice, saves pending sub, returns invoiceUrl
  //   2. User pays on Moyasar-hosted page
  //   3. POST /api/moyasar/webhook  → Moyasar calls this; we verify server-side, activate sub
  //   4. GET  /api/payments/verify/:invoiceId → callback page polls this to show result

  const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;

  const PLANS: Record<string, { nameAr: string; amountHalalas: number }> = {
    pro:        { nameAr: "باقة احترافية - نخلة", amountHalalas: 10900 },
    enterprise: { nameAr: "باقة مؤسسات - نخلة",  amountHalalas: 37100 },
  };

  function moyasarAuth(): string {
    return `Basic ${Buffer.from(`${MOYASAR_SECRET_KEY}:`).toString("base64")}`;
  }

  const createPaymentSchema = z.object({
    plan: z.enum(["pro", "enterprise"]),
  });

  // ── 1. Create Invoice ──────────────────────────────────────────────────────
  app.post("/api/payments/create", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      if (!MOYASAR_SECRET_KEY) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const parsed = createPaymentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid plan" });

      const { plan } = parsed.data;
      const planConfig = PLANS[plan];

      const host = isProdEnv
        ? "https://nakhlah.io"
        : `http://localhost:${process.env.PORT || 5000}`;

      // back_url is where Moyasar redirects the browser after payment
      // id= will be the invoice ID, status= will be paid/failed
      const backUrl = `${host}/payment/callback?plan=${encodeURIComponent(plan)}&userId=${encodeURIComponent(userId)}`;

      const moyasarRes = await fetch("https://api.moyasar.com/v1/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: moyasarAuth(),
        },
        body: JSON.stringify({
          amount:      planConfig.amountHalalas,
          currency:    "SAR",
          description: planConfig.nameAr,
          back_url:    backUrl,
          metadata:    { userId, plan },
        }),
      });

      if (!moyasarRes.ok) {
        const errBody = await moyasarRes.json().catch(() => ({}));
        console.error("[moyasar] Create invoice error:", errBody);
        return res.status(502).json({ message: safeErrorMessage(errBody, "Payment creation failed") });
      }

      const invoice = await moyasarRes.json();

      // invoice.url  is the hosted payment page URL
      if (!invoice?.url) {
        console.error("[moyasar] No url in invoice response:", invoice);
        return res.status(502).json({ message: "Payment gateway did not return a payment URL" });
      }

      // Save a pending subscription record so we can look it up on callback
      await storage.upsertSubscription({
        userId,
        plan,
        status:          "pending",
        moyasarInvoiceId: invoice.id,
        amountHalalas:   planConfig.amountHalalas,
      });

      res.json({ invoiceId: invoice.id, invoiceUrl: invoice.url });
    } catch (err: any) {
      console.error("[moyasar] Unexpected error:", err.message);
      res.status(500).json({ message: safeErrorMessage(err, "Payment request failed") });
    }
  });

  // ── 2. Webhook ─────────────────────────────────────────────────────────────
  // Moyasar POSTs here when an invoice status changes.
  // We always re-fetch from Moyasar to confirm the status (never trust the webhook body alone).
  // Idempotent: if subscription is already active for this invoice, we skip.
  app.post("/api/moyasar/webhook", async (req: Request, res: Response) => {
    try {
      if (!MOYASAR_SECRET_KEY) return res.status(503).end();

      // ── Token verification ────────────────────────────────────────────────
      // Moyasar sends the verification token in the Secret-Token header.
      // We use timingSafeEqual to prevent timing-based side-channel attacks.
      const WEBHOOK_TOKEN = process.env.MOYASAR_WEBHOOK_TOKEN;
      if (!WEBHOOK_TOKEN) {
        console.error("[moyasar webhook] MOYASAR_WEBHOOK_TOKEN not configured");
        return res.status(503).end();
      }

      const receivedToken = req.headers["secret-token"];
      if (typeof receivedToken !== "string") {
        return res.status(401).json({ message: "Missing webhook token" });
      }

      // Constant-time comparison — prevents timing attacks
      const { timingSafeEqual } = await import("crypto");
      const expected = Buffer.from(WEBHOOK_TOKEN,  "utf8");
      const received = Buffer.from(receivedToken,  "utf8");
      const tokensMatch =
        expected.length === received.length &&
        timingSafeEqual(expected, received);

      if (!tokensMatch) {
        console.warn("[moyasar webhook] Invalid token — request rejected");
        return res.status(401).json({ message: "Invalid webhook token" });
      }
      // ── End token verification ─────────────────────────────────────────────

      // Moyasar sends the payment/invoice object in the body
      const event = req.body;
      const invoiceId: string | undefined = event?.id ?? event?.invoice_id;

      if (!invoiceId || typeof invoiceId !== "string") {
        return res.status(400).json({ message: "Missing invoice id" });
      }

      // Always verify server-side — never trust the webhook body status alone
      const moyasarRes = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
        headers: { Authorization: moyasarAuth() },
      });

      if (!moyasarRes.ok) {
        console.error("[moyasar webhook] Could not fetch invoice", invoiceId);
        return res.status(502).end();
      }

      const invoice = await moyasarRes.json();
      const invoiceStatus: string = invoice?.status ?? "";

      // Find the pending subscription for this invoice
      const existing = await storage.getSubscriptionByInvoiceId(invoiceId);
      if (!existing) {
        // Invoice not created by us — ignore silently
        return res.status(200).json({ ignored: true });
      }

      // Idempotency: already activated — do not double-process
      if (existing.status === "active" && invoiceStatus === "paid") {
        return res.status(200).json({ already: "active" });
      }

      if (invoiceStatus === "paid") {
        // Extract the payment ID from the invoice (Moyasar nests it under payments[])
        const paymentId: string | undefined =
          invoice?.payments?.[0]?.id ?? invoice?.payment_id ?? undefined;

        await storage.upsertSubscription({
          userId:           existing.userId,
          plan:             existing.plan,
          status:           "active",
          moyasarInvoiceId: invoiceId,
          moyasarPaymentId: paymentId,
          amountHalalas:    existing.amountHalalas ?? undefined,
          activatedAt:      new Date(),
        });

        console.log(`[moyasar webhook] Subscription activated for user ${existing.userId}, plan ${existing.plan}`);
      } else if (invoiceStatus === "failed" || invoiceStatus === "expired") {
        await storage.upsertSubscription({
          userId:           existing.userId,
          plan:             existing.plan,
          status:           invoiceStatus,
          moyasarInvoiceId: invoiceId,
        });
      }
      // Any other status (initiated, pending) — ignore, webhook may fire again

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[moyasar webhook] Error:", err.message);
      res.status(500).end();
    }
  });

  // ── 3. Verify (called by callback page to show paid/failed UI) ──────────────
  // Looks up subscription in our DB first. If not yet active (webhook may lag),
  // also checks Moyasar directly so the UI is not stuck on "pending".
  app.get("/api/payments/verify/:invoiceId", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      if (!MOYASAR_SECRET_KEY) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const { invoiceId } = req.params;
      if (!invoiceId || !/^[a-zA-Z0-9_-]+$/.test(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      // Check our DB first
      const sub = await storage.getSubscriptionByInvoiceId(invoiceId);

      // If subscription is already active in DB, return immediately
      if (sub && sub.status === "active" && sub.userId === userId) {
        return res.json({ status: "paid", plan: sub.plan, activatedAt: sub.activatedAt });
      }

      // Otherwise fetch from Moyasar directly to handle webhook lag
      const moyasarRes = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
        headers: { Authorization: moyasarAuth() },
      });

      if (!moyasarRes.ok) {
        return res.status(502).json({ message: "Could not verify payment" });
      }

      const invoice = await moyasarRes.json();

      // Security: confirm this invoice belongs to the requesting user
      const metaUserId: string | undefined = invoice?.metadata?.userId;
      if (metaUserId && metaUserId !== userId) {
        return res.status(403).json({ message: "Payment does not belong to this account" });
      }

      const invoiceStatus: string = invoice?.status ?? "unknown";

      // If Moyasar says paid but webhook hasn't fired yet, activate now
      if (invoiceStatus === "paid" && sub && sub.userId === userId) {
        const paymentId: string | undefined =
          invoice?.payments?.[0]?.id ?? invoice?.payment_id ?? undefined;

        await storage.upsertSubscription({
          userId:           userId,
          plan:             sub.plan,
          status:           "active",
          moyasarInvoiceId: invoiceId,
          moyasarPaymentId: paymentId,
          amountHalalas:    sub.amountHalalas ?? undefined,
          activatedAt:      new Date(),
        });

        return res.json({ status: "paid", plan: sub.plan, activatedAt: new Date() });
      }

      // Map Moyasar statuses to a simple paid/failed/pending
      const statusMap: Record<string, string> = {
        paid:      "paid",
        failed:    "failed",
        expired:   "failed",
        initiated: "pending",
        pending:   "pending",
      };

      res.json({ status: statusMap[invoiceStatus] ?? "unknown" });
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Payment verification failed") });
    }
  });

  // ── 4. Get current user subscription ───────────────────────────────────────
  app.get("/api/payments/subscription", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const sub = await storage.getSubscriptionByUserId(userId);
      if (!sub) return res.json({ plan: "free", status: "none" });

      res.json({
        plan:        sub.plan,
        status:      sub.status,
        activatedAt: sub.activatedAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Could not load subscription") });
    }
  });

  return httpServer;
}
