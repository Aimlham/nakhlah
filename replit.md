# Nakhlah (نخلة) - Product Discovery Platform (MVP)

## Overview
Nakhlah (نخلة) is an Arabic-first RTL SaaS platform for dropshipping/e-commerce sellers. MVP mode: projects page shows available opportunities with supplier info gated behind subscription. Domain: nakhlah.io

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
Frontend: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query. Backend: Express 5 (Node.js). Database: Supabase (PostgreSQL) with in-memory fallback (no seeded data). Auth: Supabase Auth with session-based fallback. AI: OpenAI API (gpt-4o-mini). Build: Vite. Payments: Moyasar (SAR).

## MVP App Flow
1. `/` → redirects to `/projects`
2. `/projects` — Browse all opportunities. Supplier info visible only for subscribers.
3. `/dashboard` — Overview KPIs and top projects
4. `/saved` — Bookmarked products (requires subscription)
5. `/pricing` — Hidden from nav. Accessible only via "اشترك لعرض بيانات المورد" buttons or internal redirects.
6. `/settings` — Account settings

## Subscription Model
- **Single plan**: "نخلة برو" = 99 SAR/month (9900 halalas)
- **No free tier**: Subscription required for supplier info and saved products
- **Server-side protection**: `/api/projects` strips `supplierLink`, `supplierSource`, `supplierName` for non-subscribers
- **Client-side**: Non-subscribers see locked card with "اشترك لعرض بيانات المورد" button

## Route Guards
- **PublicRoute**: Login/signup only — redirects logged-in users to `/projects`
- **ProtectedRoute**: Requires login (pricing, settings)
- **SubscribedRoute**: Requires login + active subscription (saved products)
- **ProjectsRoute**: Requires login, passes `isSubscribed` prop to page (no redirect)

## Data Policy
All data comes from real sources (Supabase database, Apify importers). No mock/fake/seeded data exists anywhere in the codebase. Pages show proper Arabic empty states when no data is available. The MemStorage fallback starts completely empty.

## External Dependencies
- **Supabase**: Database (PostgreSQL) and authentication
- **Moyasar**: Payment gateway (SAR, supports mada/Visa/Mastercard)
- **OpenAI API**: AI product analysis
- **Apify**: Product importing from AliExpress, Amazon, TikTok ads
- **Google Fonts**: IBM Plex Sans Arabic

## Environment Secrets
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Public anon key (client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only)
- `OPENAI_API_KEY` — OpenAI API key
- `APIFY_API_TOKEN` — Apify API token for importers
- `SESSION_SECRET` — Express session secret
- `MOYASAR_SECRET_KEY` — Moyasar secret key (server-only)
- `MOYASAR_PUBLISHABLE_KEY` — Moyasar publishable key
- `MOYASAR_WEBHOOK_TOKEN` — Webhook verification token

## File Structure
```
client/src/
  App.tsx              - Root router with auth protection + ProjectsRoute
  components/
    app-sidebar.tsx    - Navigation sidebar (Dashboard, Projects, Saved, Settings)
    app-layout.tsx     - Authenticated page layout wrapper
    topbar.tsx         - Top bar with theme toggle and logout
    product-card.tsx   - Product card (legacy, kept for reference)
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
    projects.tsx       - NEW: Main projects/opportunities page with supplier gating
    landing.tsx        - Public landing page (kept, but / now redirects to /projects)
    login.tsx          - Login form
    signup.tsx         - Signup form
    dashboard.tsx      - Dashboard with KPIs and top projects
    saved-products.tsx - User's saved products
    pricing-page.tsx   - Subscription page (hidden from nav)
    settings.tsx       - Account settings
    payment-callback.tsx - Payment result handler
    products.tsx       - Legacy products page (kept, removed from nav)
    product-details.tsx - Legacy product details (kept, removed from nav)
    ads.tsx            - Legacy ads page (kept, removed from nav)

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints (includes /api/projects with supplier gating)
  storage.ts           - IStorage interface + MemStorage fallback
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

## Key API Routes
- `GET /api/projects` - Projects list (supplier info stripped for non-subscribers)
- `GET /api/products` - All products (internal)
- `GET /api/products/winning` - Qualified winning products
- `GET /api/products/:id` - Single product
- `GET /api/saved/ids` - Saved product IDs
- `GET /api/saved/products` - Saved products
- `POST /api/saved/:productId` - Save product
- `DELETE /api/saved/:productId` - Unsave product
- `POST /api/payments/create` - Create Moyasar invoice
- `GET /api/payments/verify/:id` - Verify payment
- `GET /api/payments/subscription` - Get subscription status
- `POST /api/moyasar/webhook` - Moyasar webhook

## Moyasar Payment Integration
- **Flow**: User clicks subscribe → POST `/api/payments/create` → Moyasar hosted page → redirect to `/payment/callback` → verify
- **Plan**: Pro = 99 SAR/month (9900 halalas)
- **back_url**: Uses `x-forwarded-proto`/`x-forwarded-host` headers; production override to `https://nakhlah.io`
- **Invoice ID fallback**: Saved in sessionStorage (`nakhlah_pending_invoice`) for cases where Moyasar doesn't append `id=` to redirect URL
- **Auth**: Callback page uses `getAccessToken()` for Bearer token in verify calls

## Database Tables
- `users`: id, username, password, full_name, email
- `products`: id, title, image_url, category, supplier_price, suggested_sell_price, estimated_margin, supplier_link, supplier_source, opportunity_score, trend_score, saturation_score, ai_summary, etc.
- `product_ads`: id, product_id, platform, video_url, thumbnail_url, views, likes, advertiser_name, ad_description, etc.
- `saved_products`: id, user_id, product_id, created_at
- `subscriptions`: id, user_id, plan, status, moyasar_invoice_id, moyasar_payment_id, amount_halalas, activated_at, created_at

## RTL / Arabic
- HTML `dir="rtl"` and `lang="ar"`
- Font: IBM Plex Sans Arabic
- CSS logical properties (ms-*, me-*, start-*, end-*)
- Sidebar on right side
- Prices in Saudi Riyal (ر.س), USD→SAR × 3.75

## Security
- Helmet security headers, CORS restricted in production
- Rate limiting: 200 req/15min API, 20 req/15min auth
- HTTPS redirect in production
- Supplier data server-side protected (stripped from API for non-subscribers)
- Moyasar webhook verified with timing-safe comparison
