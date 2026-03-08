# TrendDrop - Winning Product Discovery Platform

## Overview
A SaaS web application for e-commerce and dropshipping sellers to discover trending/winning products. Features AI-powered opportunity scoring, supplier pricing, marketing insights, and product research tools.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query
- **Backend**: Express 5 (Node.js) + Supabase Auth (with session fallback)
- **Database**: Supabase (PostgreSQL) with in-memory fallback when not configured
- **Auth**: Supabase Auth (email/password) — falls back to express-session + memorystore
- **Build**: Vite

## Supabase Integration
The app connects to Supabase for auth and data when these env vars are set:
- `VITE_SUPABASE_URL` — Supabase project URL (e.g. https://xxxxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY` — Public anon key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS)

**If any are missing or invalid**, the app gracefully falls back to in-memory storage with session-based auth.

### Required Supabase Tables
```sql
CREATE TABLE products (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  short_description TEXT,
  category TEXT NOT NULL,
  niche TEXT,
  source_platform TEXT,
  supplier_price NUMERIC NOT NULL,
  suggested_sell_price NUMERIC NOT NULL,
  estimated_margin NUMERIC,
  trend_score INTEGER,
  saturation_score INTEGER,
  opportunity_score INTEGER,
  ai_summary TEXT,
  supplier_link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE saved_products (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  product_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Architecture
```
client/src/
  App.tsx              - Root router with auth protection
  components/
    app-sidebar.tsx    - Navigation sidebar (shadcn Sidebar)
    app-layout.tsx     - Authenticated page layout wrapper
    topbar.tsx         - Top bar with theme toggle and logout
    product-card.tsx   - Reusable product card component
    score-badge.tsx    - Score indicator badge
    kpi-card.tsx       - Dashboard KPI metric card
    filter-bar.tsx     - Search + filter controls
    empty-state.tsx    - Empty state placeholder
    theme-provider.tsx - Dark/light mode context
  lib/
    supabase.ts        - Client-side Supabase client (with fallback)
    auth.tsx           - Auth context (Supabase Auth or session fallback)
    queryClient.ts     - TanStack Query config (adds Bearer token for Supabase)
    utils.ts           - Formatting helpers (money, scores, margins)
  pages/
    landing.tsx        - Public landing page
    login.tsx          - Login form (email/password)
    signup.tsx         - Signup form (email/password)
    dashboard.tsx      - Dashboard with KPIs
    products.tsx       - Product listing with filters
    product-details.tsx - Single product details + AI analysis
    saved-products.tsx - User's saved products
    pricing-page.tsx   - Pricing plans
    settings.tsx       - Account settings placeholder

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints (auth, products, saved) with dual auth support
  storage.ts           - IStorage interface + MemStorage (fallback) + conditional selection
  supabase.ts          - Server-side Supabase admin client
  supabase-storage.ts  - SupabaseStorage implementation of IStorage

shared/
  schema.ts            - Drizzle schema + TypeScript types
```

## API Routes
- `POST /api/auth/signup` - Create account (Supabase Auth or session)
- `POST /api/auth/login` - Login (Supabase Auth or session)
- `GET /api/auth/me` - Current user (JWT or session)
- `POST /api/auth/logout` - Logout
- `GET /api/products` - List all products
- `GET /api/products/:id` - Single product
- `GET /api/saved/ids` - Saved product IDs for current user
- `GET /api/saved/products` - Saved products for current user
- `POST /api/saved/:productId` - Save a product
- `DELETE /api/saved/:productId` - Unsave a product

## Auth Flow
- **Supabase mode**: Client uses `@supabase/supabase-js` for auth → gets JWT → sends `Authorization: Bearer <token>` header → server verifies with `supabase.auth.getUser(token)`
- **Fallback mode**: Client calls API routes → server uses express-session with cookie → userId stored in session

## Key Features
- Landing page with hero, features, pricing, FAQ
- Auth with Supabase or session-based fallback
- Dashboard with KPI cards and recent/top products
- Product listing with search, category/niche/platform filters, sorting
- Product details with scores, pricing, AI analysis (ad angles, hooks, target audience)
- Save/unsave products
- Dark/light mode toggle
- Responsive design (mobile + desktop)

## User Preferences
- Clean, modern SaaS dashboard style
- Inter font family
- Blue primary color scheme
- No emojis
