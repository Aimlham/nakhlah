# Nakhlah (نخلة) - Winning Product Discovery Platform

## Overview
Nakhlah (نخلة) is an Arabic-first RTL SaaS platform for dropshipping/e-commerce sellers. The core flow is: discover trending ads → identify winning products → go to AliExpress product page. The platform uses AI-powered opportunity scoring, supplier pricing, and marketing insights. Domain: nakhlah.io

## Branding
- Site name: نخلة (Nakhlah)
- Logo: 3D palm tree (`attached_assets/nakhlah-logo.png`)
- Domain: nakhlah.io

## User Preferences
- Clean, modern SaaS dashboard style
- IBM Plex Sans Arabic font family (primary)
- Blue primary color scheme
- Arabic-first, RTL-first
- No emojis

## System Architecture
Frontend: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query. Backend: Express 5 (Node.js). Database: Supabase (PostgreSQL) with in-memory fallback (no seeded data). Auth: Supabase Auth with session-based fallback. AI: OpenAI API (gpt-4o-mini). Build: Vite.

## Data Policy
All data comes from real sources (Supabase database, Apify importers). No mock/fake/seeded data exists anywhere in the codebase. Pages show proper Arabic empty states when no data is available. The MemStorage fallback starts completely empty.

## External Dependencies
- **Supabase**: Database (PostgreSQL) and authentication
- **OpenAI API**: AI product analysis, marketing insights, ad angles, Arabic translation
- **Apify**: Product importing from AliExpress (`piotrv1001/aliexpress-listings-scraper`), Amazon (`igview-owner/amazon-search-scraper`), and TikTok ads (`lexis-solutions~tiktok-ads-scraper`). Note: TikTok ads actor requires a paid Apify subscription (free trial expired).
- **Google Fonts**: IBM Plex Sans Arabic

## Environment Secrets
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Public anon key (client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only)
- `OPENAI_API_KEY` — OpenAI API key
- `APIFY_API_TOKEN` — Apify API token for AliExpress/Amazon importers
- `SESSION_SECRET` — Express session secret

## App Flow
1. **Dashboard** (`/dashboard`) — Overview KPIs, recent ads section (shown first), then top winning products
2. **Ads Library** (`/ads`) — Browse trending ads to discover winning products
3. **Winning Products** (`/products`) — Qualified products filtered through qualification system, with AliExpress links
4. **Product Details** (`/products/:id`) — Full analysis, AI insights, "عرض على AliExpress" button
5. **Saved** (`/saved`) — User's bookmarked products

## File Structure
```
client/src/
  App.tsx              - Root router with auth protection
  components/
    app-sidebar.tsx    - Navigation sidebar (side="right" for RTL)
    app-layout.tsx     - Authenticated page layout wrapper
    topbar.tsx         - Top bar with theme toggle and logout
    product-card.tsx   - Product card with source badge, scores
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
  storage.ts           - IStorage interface + MemStorage fallback (empty, no seeded data)
  supabase.ts          - Server-side Supabase admin client
  supabase-storage.ts  - SupabaseStorage implementation
  aliexpress-importer.ts - AliExpress product importer (Apify)
  amazon-importer.ts   - Amazon product importer (Apify)
  tiktok-importer.ts   - TikTok ads importer (Apify)
  openai.ts            - OpenAI API client

shared/
  schema.ts            - Drizzle schema + TypeScript types
  scoring.ts           - Product scoring engine
  halal.ts             - Content safety keyword blocklist
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
- `POST /api/import/tiktok-ads` - Import TikTok ads via Apify (supports `country` param)
- `GET /api/import/tiktok-ads/status` - TikTok importer status

## Product Qualification System (`shared/qualification.ts`)
- `qualifyProduct(product)` → `{ isPublishable, reasons[] }`
- `isProductPublishable(product)` → boolean
- **Criteria**: content-safe, excluded keywords (phones/laptops/TVs/gaming), excluded categories, price range ($0.50-$80 USD), opportunityScore >= 55, rating >= 3.5, valid supplier price
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
- Pipeline: Apify → normalize → content safety filter → quality filter → dedup → score → save
- Products include `supplierLink` to AliExpress product page
- On duplicate: updates price if new price is lower

## Amazon Importer
- Actor: `igview-owner/amazon-search-scraper` (async)
- Amazon = discovery-only source (no supplier link for dropshipping)

## TikTok Ads Importer
- Actor: `lexis-solutions~tiktok-ads-scraper` (async: start→poll→get, requires paid Apify subscription)
- File: `server/tiktok-importer.ts`
- Saves to `product_ads` table with dedup via `externalAdId` + `videoUrl` fallback
- TikTok ads have `productId` (nullable in DB) — ads without a linked product are filtered out from API responses
- **Auto-matching**: On import, ads are automatically linked to existing products via keyword similarity (min 2 shared keywords, 30% overlap threshold)
- Extra columns: `advertiserName`, `adDescription`, `landingPageUrl`, `externalAdId`
- Supported countries: all, FR, AT, BE, BG, HR, CY, CZ, DK, EE, FI, DE, GR, HU, IS, IE, IT, LV, LI, LT, LU, MT, NL, NO, PL, PT, RO, SK, SI, ES, SE, CH, GB (no Saudi/Gulf support in TikTok Ad Library API)

## Pricing Logic
- **AliExpress**: `supplierPrice` = actual sale/discounted price (what we pay). `suggestedSellPrice` = supplierPrice × markup (3.5x under $5, 3x under $15, 2.5x under $30, 2x above). All in SAR (×3.75).
- **Amazon**: `supplierPrice` = estimated AliExpress cost (Amazon price × 0.6). `suggestedSellPrice` = Amazon price × markup. `actualSellPrice` = Amazon retail price in SAR.
- Rule: `supplierPrice` must ALWAYS be lower than `suggestedSellPrice` / `actualSellPrice`

## Supabase Migration Notes
- New `product_ads` columns (`advertiser_name`, `ad_description`, `landing_page_url`, `external_ad_id`) must be added via Supabase Dashboard SQL Editor
- `product_id` must be made nullable: `ALTER TABLE product_ads ALTER COLUMN product_id DROP NOT NULL;`
- App probes for column existence at startup and gracefully skips unavailable columns
