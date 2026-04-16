# Nakhlah (نخلة) - Local Listings Platform (MVP)

## Overview
Nakhlah (نخلة) is an Arabic-first RTL SaaS platform for local supplier and project discovery. Admin adds listings (posts) manually. Users browse published listings. Supplier contact info (name, phone, WhatsApp, link) is gated behind "نخلة برو" subscription at 99 SAR/month. Domain: nakhlah.io

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
Frontend: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query. Backend: Express 5 (Node.js). Database: Supabase (PostgreSQL) with in-memory fallback. Auth: Supabase Auth with session-based fallback. Build: Vite. Payments: Moyasar (SAR).

## MVP App Flow
1. `/` → redirects to `/projects`
2. `/projects` — Browse published listings. Supplier info visible only for subscribers.
3. `/saved` — Bookmarked products (requires subscription)
4. `/pricing` — Hidden from nav. Accessible only via "اشترك لعرض بيانات المورد" buttons.
5. `/settings` — Account settings
6. `/admin/listings` — Admin-only: manage all listings (add, edit, delete, publish/hide)
7. `/admin/listings/new` — Admin: add new listing
8. `/admin/listings/:id/edit` — Admin: edit listing

## Subscription Model
- **Single plan**: "نخلة برو" = 99 SAR/month (9900 halalas)
- **No free tier**: Subscription required for supplier contact info
- **Server-side protection**: `/api/listings` strips `supplierName`, `supplierPhone`, `supplierWhatsapp`, `supplierLink` for non-subscribers
- **Client-side**: Non-subscribers see locked card with "اشترك لعرض بيانات المورد" button

## Admin System
- Admin role is determined by `profiles.plan = 'admin'` in Supabase
- Admin user: momdfasail@gmail.com (Supabase auth ID: 660fe18d-0673-40b5-b39e-fc8718886d89)
- Admin pages are protected by `AdminRoute` which checks `/api/auth/role`
- Admin sidebar section "إدارة البوستات" appears only for admin users

## Route Guards
- **PublicRoute**: Login/signup only — redirects logged-in users to `/projects`
- **ProtectedRoute**: Requires login (pricing, settings)
- **SubscribedRoute**: Requires login + active subscription (saved products)
- **ProjectsRoute**: Requires login, passes `isSubscribed` prop to page
- **AdminRoute**: Requires login + admin role (admin pages)

## Data Policy
Admin manually adds listings via `/admin/listings/new`. `/projects` page shows only published listings from the `listings` table. No imported products shown in the main interface.

## External Dependencies
- **Supabase**: Database (PostgreSQL) and authentication
- **Moyasar**: Payment gateway (SAR, supports mada/Visa/Mastercard)
- **Google Fonts**: IBM Plex Sans Arabic

## Environment Secrets
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Public anon key (client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only)
- `SESSION_SECRET` — Express session secret
- `MOYASAR_SECRET_KEY` — Moyasar secret key (server-only)
- `MOYASAR_PUBLISHABLE_KEY` — Moyasar publishable key
- `MOYASAR_WEBHOOK_TOKEN` — Webhook verification token
- `OPENAI_API_KEY` — OpenAI API key (legacy, optional)
- `APIFY_API_TOKEN` — Apify API token (legacy, optional)

## File Structure
```
client/src/
  App.tsx              - Root router with all route guards
  components/
    app-sidebar.tsx    - Navigation sidebar (Projects, Saved, Settings, + Admin section for admins)
    app-layout.tsx     - Authenticated page layout wrapper
    topbar.tsx         - Top bar with theme toggle and logout
    empty-state.tsx    - Empty state placeholder
    theme-provider.tsx - Dark/light mode context
  lib/
    supabase.ts        - Client-side Supabase client
    auth.tsx           - Auth context (Supabase or session fallback)
    queryClient.ts     - TanStack Query config
    utils.ts           - Formatting helpers
  pages/
    projects.tsx       - Main listings page with supplier data gating
    admin/
      listings.tsx     - Admin listings management page
      listing-form.tsx - Add/edit listing form
    landing.tsx        - Public landing page
    login.tsx / signup.tsx - Auth pages
    saved-products.tsx - User's saved products
    pricing-page.tsx   - Subscription page (hidden from nav)
    settings.tsx       - Account settings
    payment-callback.tsx - Payment result handler

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints (listings, admin, auth, payments)
  storage.ts           - IStorage interface + MemStorage fallback
  supabase.ts          - Server-side Supabase admin client
  supabase-storage.ts  - SupabaseStorage implementation

shared/
  schema.ts            - Drizzle schema + TypeScript types
```

## Key API Routes
- `GET /api/listings` - Published listings (supplier info stripped for non-subscribers)
- `GET /api/admin/listings` - All listings (admin only)
- `GET /api/admin/listings/:id` - Single listing (admin only)
- `POST /api/admin/listings` - Create listing (admin only)
- `PATCH /api/admin/listings/:id` - Update listing (admin only)
- `DELETE /api/admin/listings/:id` - Delete listing (admin only)
- `GET /api/auth/role` - Get user role (admin/user)
- `GET /api/auth/me` - Get authenticated user + role
- `GET /api/saved/ids` - Saved product IDs
- `GET /api/saved/products` - Saved products
- `POST /api/saved/:productId` - Save product
- `DELETE /api/saved/:productId` - Unsave product
- `POST /api/payments/create` - Create Moyasar invoice
- `GET /api/payments/verify/:id` - Verify payment
- `GET /api/payments/subscription` - Get subscription status
- `POST /api/moyasar/webhook` - Moyasar webhook

## Database Tables (Supabase)
- `profiles`: id, email, full_name, avatar_url, plan (admin|free), created_at
- `listings`: id, title, image_url, description, category, supplier_name, supplier_phone, supplier_whatsapp, supplier_city, supplier_type, supplier_link, status (draft|published), created_at
- `subscriptions`: id, user_id, plan, status, moyasar_invoice_id, moyasar_payment_id, amount_halalas, activated_at, created_at
- `products`: (legacy) id, title, image_url, category, supplier_price, etc.
- `saved_products`: id, user_id, product_id, created_at
- `users`: (legacy, used for session-based auth fallback)

## Supplier Data Gating
Hidden fields for non-subscribers (both server & client):
- `supplierName` — اسم المورد
- `supplierPhone` — رقم الهاتف
- `supplierWhatsapp` — واتساب
- `supplierLink` — رابط المورد

Visible to all:
- `title`, `imageUrl`, `description`, `category`, `supplierCity`, `supplierType`

## Moyasar Payment Integration
- **Flow**: User clicks subscribe → POST `/api/payments/create` → Moyasar hosted page → redirect to `/payment/callback` → verify
- **Plan**: Pro = 99 SAR/month (9900 halalas)
- **back_url**: Uses `x-forwarded-proto`/`x-forwarded-host` headers; production override to `https://nakhlah.io`
- **Invoice ID fallback**: Saved in sessionStorage (`nakhlah_pending_invoice`)
- **Auth**: Callback page uses `getAccessToken()` for Bearer token

## RTL / Arabic
- HTML `dir="rtl"` and `lang="ar"`
- Font: IBM Plex Sans Arabic
- CSS logical properties (ms-*, me-*, start-*, end-*)
- Sidebar on right side
- Prices in Saudi Riyal (ر.س)

## Security
- Helmet security headers, CORS restricted in production
- Rate limiting: 200 req/15min API, 20 req/15min auth
- HTTPS redirect in production
- Supplier data server-side protected
- Admin routes protected by role check
- Moyasar webhook verified with timing-safe comparison
