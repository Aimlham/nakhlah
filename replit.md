# TrendDrop - Winning Product Discovery Platform

## Overview
A SaaS web application for e-commerce and dropshipping sellers to discover trending/winning products. Features AI-powered opportunity scoring, supplier pricing, marketing insights, and product research tools. **Arabic-first, RTL-first** — targeting the Arabic-speaking market.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query
- **Backend**: Express 5 (Node.js) + Supabase Auth (with session fallback)
- **Database**: Supabase (PostgreSQL) with in-memory fallback when not configured
- **Auth**: Supabase Auth (email/password, Google OAuth, forgot/reset password) — falls back to express-session + memorystore
- **Build**: Vite
- **Language**: Arabic (primary), RTL layout
- **Font**: IBM Plex Sans Arabic (primary), Inter (fallback)

## Supabase Integration
The app connects to Supabase for auth and data when these env vars are set:
- `VITE_SUPABASE_URL` — Supabase project URL (e.g. https://xxxxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY` — Public anon key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS)

**If any are missing or invalid**, the app gracefully falls back to in-memory storage with session-based auth. A `/api/config` endpoint tells the client whether Supabase is fully configured server-side, preventing auth mode mismatch.

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

CREATE TABLE product_ads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR NOT NULL,
  platform TEXT NOT NULL,
  niche TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Architecture
```
client/src/
  App.tsx              - Root router with auth protection
  components/
    app-sidebar.tsx    - Navigation sidebar (shadcn Sidebar, side="right" for RTL)
    app-layout.tsx     - Authenticated page layout wrapper
    topbar.tsx         - Top bar with theme toggle and logout
    product-card.tsx   - Reusable product card with images, hover animation, trending badge
    score-badge.tsx    - Score indicator badge
    kpi-card.tsx       - Dashboard KPI metric card
    filter-bar.tsx     - Search + filter controls (category, niche, platform, score/margin/trend ranges)
    empty-state.tsx    - Empty state placeholder
    theme-provider.tsx - Dark/light mode context
  lib/
    supabase.ts        - Client-side Supabase client (sync availability check via env vars)
    auth.tsx           - Auth context (Supabase Auth or session fallback, handles OAuth callback)
    queryClient.ts     - TanStack Query config (adds Bearer token for Supabase)
    utils.ts           - Formatting helpers (money, scores, margins)
  pages/
    landing.tsx        - Public landing page (Arabic)
    login.tsx          - Login form (email/password + Google OAuth, Arabic)
    signup.tsx         - Signup form (email/password + Google OAuth, Arabic)
    forgot-password.tsx - Forgot password form (sends reset email, Arabic)
    reset-password.tsx - Reset password form (updates password via token, Arabic)
    dashboard.tsx      - Dashboard with 5 KPIs, 3-column layout, saved products widget (Arabic)
    products.tsx       - Product listing with advanced filters (Arabic)
    product-details.tsx - Product details + AI analysis + TikTok ads section (Arabic)
    ads.tsx            - Ad library page with search/filter (Arabic)
    saved-products.tsx - User's saved products (Arabic)
    pricing-page.tsx   - Pricing plans (Arabic)
    auth-callback.tsx  - OAuth callback handler (processes tokens, redirects to dashboard)
    settings.tsx       - Account settings (Arabic)

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints (auth, products, saved, ads) with dual auth support
  storage.ts           - IStorage interface + MemStorage (fallback) + conditional selection
  supabase.ts          - Server-side Supabase admin client
  supabase-storage.ts  - SupabaseStorage implementation of IStorage

shared/
  schema.ts            - Drizzle schema + TypeScript types
  scoring.ts           - Reusable product scoring engine (trend, saturation, opportunity, margin)
```

## API Routes
- `GET /api/config` - Returns `{ supabaseEnabled: true/false }`
- `POST /api/auth/signup` - Create account (Supabase Auth or session)
- `POST /api/auth/login` - Login (Supabase Auth or session)
- `GET /api/auth/me` - Current user (JWT or session)
- `POST /api/auth/logout` - Logout
- `GET /api/health` - Healthcheck endpoint (for deployment)
- `GET /api/products` - List all products (with scoring applied server-side)
- `GET /api/products/:id` - Single product (with scoring applied)
- `GET /api/products/:id/ads` - TikTok ads for a specific product
- `GET /api/ads` - All ads (query: search, platform, niche, minViews)
- `GET /api/saved/ids` - Saved product IDs for current user
- `GET /api/saved/products` - Saved products for current user
- `POST /api/saved/:productId` - Save a product
- `DELETE /api/saved/:productId` - Unsave a product

## Auth Flow
- **Supabase mode**: Client uses `@supabase/supabase-js` for auth → gets JWT → sends `Authorization: Bearer <token>` header → server verifies with `supabase.auth.getUser(token)`
- **Google OAuth**: Uses `supabase.auth.signInWithOAuth({ provider: 'google' })` → redirects to Google → returns to `/auth/callback` with `#access_token=...` → callback page processes tokens via `getSession()` + `onAuthStateChange` → redirects to `/dashboard`. Google provider must be configured in Supabase dashboard. The redirect URL `origin/auth/callback` must be whitelisted in Supabase Auth settings.
- **Forgot/Reset Password**: Uses `supabase.auth.resetPasswordForEmail()` → sends email with reset link → user lands on `/reset-password` → `supabase.auth.updateUser({ password })` to change password.
- **Fallback mode**: Client calls API routes → server uses express-session with cookie → userId stored in session

## RTL / Arabic
- HTML `dir="rtl"` and `lang="ar"` set in `client/index.html`
- Primary font: IBM Plex Sans Arabic (loaded via Google Fonts)
- All UI text in professional Saudi/Gulf-friendly Arabic
- CSS uses logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) instead of physical `ml/mr/pl/pr/left/right`
- Sidebar positioned on the right (`side="right"`)
- Directional icons swapped (ArrowRight↔ArrowLeft for RTL)
- Product names/titles remain in English (data, not UI)
- data-testid attributes use English keys for testing stability
- Prepared for future i18n/bilingual support

## Scoring Engine (`shared/scoring.ts`)
- `scoreProduct(product)` — applies all scoring formulas to a Product, returns scored Product
- `calculateMargin(supplierPrice, sellPrice)` — margin percentage from prices
- `calculateTrendScore(...)` — uses existing score if present, otherwise estimates from margin/price/category
- `calculateSaturationScore(...)` — uses existing score if present, otherwise estimates from price/margin/category
- `calculateOpportunityScore(trend, saturation, margin)` — weighted: 40% trend + 30% anti-saturation + 30% margin
- Applied server-side in API routes (`/api/products`, `/api/products/:id`, `/api/saved/products`)
- All scores are 0-100 integers; margin is a percentage string with one decimal

## Key Features
- Landing page with hero, features, pricing, FAQ (Arabic)
- Auth with Supabase or session-based fallback
- Dashboard with 5 KPIs (total products, avg opportunity, avg margin, trending, saved), 3-column layout, saved products widget
- Product listing with advanced filters: search, category, niche, platform, sort, min opportunity/margin/trend scores
- Product cards with real Unsplash images, hover animation (shadow + translate), trending badge for opportunityScore >= 80, niche badge
- Product details with 4-metric scores row, colored AI analysis cards, TikTok ads section with video previews
- Ad library page (/ads) with search, platform/niche/views filters, ad cards grid
- Save/unsave products
- Product scoring engine with transparent, editable formulas
- Dark/light mode toggle
- Responsive design (mobile + desktop)

## User Preferences
- Clean, modern SaaS dashboard style
- IBM Plex Sans Arabic font family (primary)
- Blue primary color scheme
- Arabic-first, RTL-first
- No emojis
