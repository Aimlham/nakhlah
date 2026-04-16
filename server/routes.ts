import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { supabaseConfigured, supabaseAdmin, verifySupabaseToken } from "./supabase";
import { z } from "zod";

const SessionStore = MemoryStore(session);
const isProdEnv = process.env.NODE_ENV === "production";

function safeErrorMessage(err: any, fallback: string): string {
  if (isProdEnv) return fallback;
  return err?.message || fallback;
}

function stripListingSupplierFields<T extends Record<string, any>>(listing: T): T {
  return {
    ...listing,
    supplierName: null,
    supplierPhone: null,
    supplierWhatsapp: null,
    supplierLink: null,
  };
}

async function isUserSubscribed(req: Request): Promise<boolean> {
  const userId = await getAuthUserId(req);
  if (!userId) return false;
  const sub = await storage.getSubscriptionByUserId(userId);
  return sub?.status === "active";
}

async function isUserAdmin(req: Request): Promise<boolean> {
  const userId = await getAuthUserId(req);
  if (!userId) return false;
  const profile = await storage.getProfile(userId);
  return profile?.plan === "admin";
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
      const profile = await storage.getProfile(user.id);
      res.json({ user, role: profile?.plan === "admin" ? "admin" : "user" });
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

  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const subscribed = await isUserSubscribed(req);
      const listings = await storage.getPublishedListings();
      res.json(subscribed ? listings : listings.map(stripListingSupplierFields));
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch listings") });
    }
  });

  app.get("/api/admin/listings", async (req: Request, res: Response) => {
    try {
      const admin = await isUserAdmin(req);
      if (!admin) return res.status(403).json({ message: "Forbidden" });
      const listings = await storage.getAllListings();
      res.json(listings);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch listings") });
    }
  });

  app.get("/api/admin/listings/:id", async (req: Request, res: Response) => {
    try {
      const admin = await isUserAdmin(req);
      if (!admin) return res.status(403).json({ message: "Forbidden" });
      const listing = await storage.getListing(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      res.json(listing);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch listing") });
    }
  });

  const listingSchema = z.object({
    title: z.string().min(1).max(500),
    imageUrl: z.string().max(2000).optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    category: z.string().max(200).optional().nullable(),
    supplierName: z.string().max(500).optional().nullable(),
    supplierPhone: z.string().max(50).optional().nullable(),
    supplierWhatsapp: z.string().max(50).optional().nullable(),
    supplierCity: z.string().max(200).optional().nullable(),
    supplierType: z.string().max(200).optional().nullable(),
    supplierLink: z.string().max(2000).optional().nullable(),
    status: z.enum(["draft", "published"]).optional(),
  });

  app.post("/api/admin/listings", async (req: Request, res: Response) => {
    try {
      const admin = await isUserAdmin(req);
      if (!admin) return res.status(403).json({ message: "Forbidden" });
      const parsed = listingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten().fieldErrors });
      const listing = await storage.createListing(parsed.data);
      res.json(listing);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to create listing") });
    }
  });

  app.patch("/api/admin/listings/:id", async (req: Request, res: Response) => {
    try {
      const admin = await isUserAdmin(req);
      if (!admin) return res.status(403).json({ message: "Forbidden" });
      const existing = await storage.getListing(req.params.id);
      if (!existing) return res.status(404).json({ message: "Listing not found" });
      const parsed = listingSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten().fieldErrors });
      const updated = await storage.updateListing(req.params.id, parsed.data);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to update listing") });
    }
  });

  app.delete("/api/admin/listings/:id", async (req: Request, res: Response) => {
    try {
      const admin = await isUserAdmin(req);
      if (!admin) return res.status(403).json({ message: "Forbidden" });
      const existing = await storage.getListing(req.params.id);
      if (!existing) return res.status(404).json({ message: "Listing not found" });
      await storage.deleteListing(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to delete listing") });
    }
  });

  app.get("/api/auth/role", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const profile = await storage.getProfile(userId);
      res.json({ role: profile?.plan === "admin" ? "admin" : "user" });
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch role") });
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
      res.json(products);
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

  const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;

  const PLANS: Record<string, { nameAr: string; amountHalalas: number }> = {
    pro: { nameAr: "نخلة برو - اشتراك شهري", amountHalalas: 9900 },
  };

  function moyasarAuth(): string {
    return `Basic ${Buffer.from(`${MOYASAR_SECRET_KEY}:`).toString("base64")}`;
  }

  const createPaymentSchema = z.object({
    plan: z.enum(["pro"]),
  });

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

      let host: string;
      if (isProdEnv) {
        host = "https://nakhlah.io";
      } else {
        const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
        const reqHost = req.headers["x-forwarded-host"] as string || req.get("host") || "localhost:5000";
        host = `${proto}://${reqHost}`;
      }

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
          success_url: backUrl,
        }),
      });

      if (!moyasarRes.ok) {
        const errBody = await moyasarRes.text();
        console.error("[moyasar] Invoice creation failed:", errBody);
        return res.status(502).json({ message: "Failed to create payment" });
      }

      const invoice = (await moyasarRes.json()) as {
        id: string;
        url: string;
        status: string;
      };

      await storage.upsertSubscription({
        userId,
        plan,
        status: "pending",
        moyasarInvoiceId: invoice.id,
        amountHalalas: planConfig.amountHalalas,
      });

      res.json({ invoiceUrl: invoice.url, invoiceId: invoice.id });
    } catch (err: any) {
      console.error("[moyasar] Error:", err.message);
      res.status(500).json({ message: safeErrorMessage(err, "Payment error") });
    }
  });

  app.get("/api/payments/verify/:invoiceId", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      if (!MOYASAR_SECRET_KEY) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const { invoiceId } = req.params;

      const moyasarRes = await fetch(
        `https://api.moyasar.com/v1/invoices/${encodeURIComponent(invoiceId)}`,
        { headers: { Authorization: moyasarAuth() } }
      );

      if (!moyasarRes.ok) {
        return res.status(502).json({ message: "Failed to verify payment" });
      }

      const invoice = (await moyasarRes.json()) as {
        id: string;
        status: string;
        payments?: { id: string; status: string }[];
      };

      const paidPayment = invoice.payments?.find(
        (p) => p.status === "paid"
      );

      if (invoice.status === "paid" && paidPayment) {
        await storage.upsertSubscription({
          userId,
          plan: "pro",
          status: "active",
          moyasarInvoiceId: invoiceId,
          moyasarPaymentId: paidPayment.id,
          activatedAt: new Date(),
        });
        return res.json({ status: "active" });
      }

      return res.json({ status: invoice.status });
    } catch (err: any) {
      console.error("[moyasar] Verify error:", err.message);
      res.status(500).json({ message: safeErrorMessage(err, "Verification error") });
    }
  });

  const MOYASAR_WEBHOOK_TOKEN = process.env.MOYASAR_WEBHOOK_TOKEN;

  app.post("/api/moyasar/webhook", async (req: Request, res: Response) => {
    try {
      if (MOYASAR_WEBHOOK_TOKEN) {
        const providedToken =
          req.headers["x-moyasar-token"] || req.query.token;
        if (providedToken !== MOYASAR_WEBHOOK_TOKEN) {
          return res.status(401).json({ message: "Invalid webhook token" });
        }
      }

      const { id, type, data } = req.body;

      if (type === "payment_paid" && data) {
        const invoiceId = data.invoice_id;
        const paymentId = data.id;

        if (invoiceId) {
          const sub = await storage.getSubscriptionByInvoiceId(invoiceId);
          if (sub) {
            await storage.upsertSubscription({
              userId: sub.userId,
              plan: sub.plan,
              status: "active",
              moyasarInvoiceId: invoiceId,
              moyasarPaymentId: paymentId,
              activatedAt: new Date(),
            });
            console.log(`[webhook] Activated subscription for user ${sub.userId}`);
          }
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("[webhook] Error:", err.message);
      res.status(500).json({ message: "Webhook processing error" });
    }
  });

  app.get("/api/payments/subscription", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const sub = await storage.getSubscriptionByUserId(userId);
      if (!sub) {
        return res.json({ plan: null, status: "none" });
      }
      res.json({ plan: sub.plan, status: sub.status });
    } catch (err: any) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to fetch subscription") });
    }
  });

  return httpServer;
}
