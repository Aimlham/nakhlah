import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { supabaseConfigured, supabaseAdmin, verifySupabaseToken } from "./supabase";
import { scoreProduct } from "@shared/scoring";

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

  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products.map(scoreProduct));
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

  return httpServer;
}
