# TrendDrop - Winning Product Discovery Platform

## Overview
TrendDrop is an Arabic-first RTL SaaS platform for dropshipping/e-commerce sellers. The core flow is: discover trending ads → identify winning products → go to AliExpress product page. The platform uses AI-powered opportunity scoring, supplier pricing, and marketing insights.

## User Preferences
- Clean, modern SaaS dashboard style
- IBM Plex Sans Arabic font family (primary)
- Blue primary color scheme
- Arabic-first, RTL-first
- No emojis

## System Architecture
Frontend: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query. Backend: Express 5 (Node.js). Database: Supabase (PostgreSQL) with in-memory fallback. Auth: Supabase Auth with session-based fallback. AI: OpenAI API (gpt-4o-mini). Build: Vite.

## External Dependencies
- **Supabase**: Database (PostgreSQL) and authentication
- **OpenAI API**: AI product analysis, marketing insights, ad angles, Arabic translation
- **Apify**: Product importing from AliExpress (`piotrv1001/aliexpress-listings-scraper`) and Amazon (`igview-owner/amazon-search-scraper`)
- **Google Fonts**: IBM Plex Sans Arabic

## Environment Secrets
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Public anon key (client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only)
- `OPENAI_API_KEY` — OpenAI API key
- `APIFY_API_TOKEN` — Apify API token for AliExpress/Amazon importers
- `SESSION_SECRET` — Express session secret

## App Flow
1. **Ads Library** (`/ads`) — Browse trending ads to discover winning products
2. **Winning Products** (`/products`) — Qualified products filtered through qualification system, with AliExpress links
3. **Product Details** (`/products/:id`) — Full analysis, AI insights, "عرض على AliExpress" button
4. **Dashboard** (`/dashboard`) — Overview KPIs, top winning products
5. **Saved** (`/saved`) — User's bookmarked products

## File Structure
```
client/src/
  App.tsx              - Root router with auth protection
  components/
    app-sidebar.tsx    - Navigation sidebar (side="right" for RTL)
    app-layout.tsx     - Authenticated page layout wrapper
    topbar.tsx         - Top bar with theme toggle and logout
    product-card.tsx   - Product card with source badge, halal badge, scores
    score-badge.tsx    - Score indicator badge
    filter-bar.tsx     - Search + filter controls
    empty-state.tsx    - Empty state placeholder
    theme-provider.tsx - Dark/light mode context
  lib/
    supabase.ts        - Client-side Supabase client
    auth.tsx           - Auth context (Supabase or session fallback)
    queryClient.ts     - TanStack Query config
    utils.ts           - Formatting helpers (money, scores, margins)
  pages/
    landing.tsx        - Public landing page
    login.tsx          - Login form
    signup.tsx         - Signup form
    dashboard.tsx      - Dashboard with KPIs and top winning products
    products.tsx       - Winning products list (filtered by qualification)
    product-details.tsx - Product details + AI analysis + AliExpress link
    ads.tsx            - Ads library (Minea-style)
    saved-products.tsx - User's saved products
    pricing-page.tsx   - Pricing plans
    settings.tsx       - Account settings

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints
  storage.ts           - IStorage interface + MemStorage fallback
  supabase.ts          - Server-side Supabase admin client
  supabase-storage.ts  - SupabaseStorage implementation
  aliexpress-importer.ts - AliExpress product importer (Apify)
  amazon-importer.ts   - Amazon product importer (Apify)
  openai.ts            - OpenAI API client

shared/
  schema.ts            - Drizzle schema + TypeScript types
  scoring.ts           - Product scoring engine
  halal.ts             - Halal keyword blocklist
  qualification.ts     - Product qualification system
```

## API Routes
- `GET /api/config` - Supabase enabled check
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout
- `GET /api/health` - Healthcheck
- `GET /api/products` - All products (with scoring)
- `GET /api/products/winning` - Qualified winning products only
- `GET /api/products/:id` - Single product
- `POST /api/products/:id/analyze` - AI analysis
- `GET /api/products/:id/ads` - Product ads
- `GET /api/ads` - All ads
- `GET /api/saved/ids` - Saved product IDs
- `GET /api/saved/products` - Saved products
- `POST /api/saved/:productId` - Save product
- `DELETE /api/saved/:productId` - Unsave product
- `POST /api/import/aliexpress` - Import AliExpress products
- `GET /api/import/aliexpress/status` - AliExpress importer status
- `POST /api/import/amazon` - Import Amazon products
- `GET /api/import/amazon/status` - Amazon importer status

## Product Qualification System (`shared/qualification.ts`)
- `qualifyProduct(product)` → `{ isPublishable, reasons[] }`
- `isProductPublishable(product)` → boolean
- **Criteria**: halal-safe, excluded keywords (phones/laptops/TVs/gaming), excluded categories, price range ($0.50-$80 USD), opportunityScore >= 55, rating >= 3.5, valid supplier price
- **Source roles**: AliExpress = supplier+discovery, Amazon = discovery-only
- Products must have a valid `supplierLink` to AliExpress for the "عرض على AliExpress" button

## Scoring Engine (`shared/scoring.ts`)
- Weighted: 40% demand + 30% margin + 20% competition + 10% rating
- All scores 0-100 integers
- Applied server-side in API routes

## RTL / Arabic
- HTML `dir="rtl"` and `lang="ar"`
- Font: IBM Plex Sans Arabic
- CSS logical properties (ms-*, me-*, start-*, end-*)
- Sidebar on right side
- Prices in Saudi Riyal (ر.س), USD→SAR × 3.75
- data-testid attributes use English keys

## AliExpress Importer
- Actor: `piotrv1001/aliexpress-listings-scraper` (async: start→poll→get)
- Pipeline: Apify → normalize → halal filter → quality filter → dedup → score → save
- Products include `supplierLink` to AliExpress product page

## Amazon Importer
- Actor: `igview-owner/amazon-search-scraper` (async)
- Amazon = discovery-only source (no supplier link for dropshipping)
