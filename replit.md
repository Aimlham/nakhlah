# Nakhlah (نخلة) - Local Supplier Marketplace

## Overview
Nakhlah (نخلة) is an Arabic-first RTL SaaS platform at nakhlah.io for dropshipping sellers. It's a local supplier marketplace: admin manually creates supplier listings and their products; users browse products on `/products` (main page), view product details, browse suppliers on `/suppliers`, view supplier detail pages, and discover factories on `/factories`. Supplier contact info is gated behind "نخلة برو" subscription at 99 SAR/month.

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

## Data Model
- **Suppliers** = `listings` table (supplier entities with contact info)
- **Products** = `supplier_products` table (products linked to suppliers via `supplier_id`)
- **Categories** = `categories` table (dynamic categories managed by admin)
- `supplier_id` in `supplier_products` is `text` referencing `listings.id`

## App Flow
1. `/` → redirects to `/products`
2. `/products` — Browse published supplier products (search + category filter)
3. `/products/:id` — Product detail with supplier info + gated contact section
4. `/suppliers` — Browse all published suppliers (search + city filter)
5. `/suppliers/:id` — Supplier detail with their products + gated contact section
6. `/factories` — Filtered suppliers (manufacturing types: مصنع, تصنيع)
7. `/saved` — Bookmarked products
8. `/pricing` — Hidden from nav. Accessible via subscribe buttons.
9. `/settings` — Account settings
10. `/admin/listings` — Admin: manage suppliers
11. `/admin/products` — Admin: manage supplier products
12. `/admin/categories` — Admin: manage categories

## Subscription Model
- **Single plan**: "نخلة برو" = 99 SAR/month (9900 halalas)
- **Server-side protection**: Strips `supplierName`, `supplierPhone`, `supplierWhatsapp`, `supplierLocation` for non-subscribers
- **Client-side**: Non-subscribers see blurred/locked supplier section with subscribe CTA
- **Admin auto-subscription**: `isUserSubscribed()` returns true if `profile.plan === "admin"`

## Admin System
- Admin role: `profiles.plan = 'admin'` in Supabase
- Admin user: momdfasail@gmail.com
- Admin sidebar: إدارة الموردين, إدارة المنتجات, إدارة التصنيفات
- All admin pages protected by `AdminRoute`

## Route Guards
- **PublicRoute**: Login/signup — redirects logged-in users to `/products`
- **ProtectedRoute**: Requires login
- **SubscriptionAwareRoute**: Requires login, passes `isSubscribed` prop
- **AdminRoute**: Requires login + admin role
- Legacy `/projects` → redirects to `/suppliers`, `/listings/:id` → redirects to `/suppliers/:id`

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

## File Structure
```
client/src/
  App.tsx              - Root router with all route guards
  components/
    app-sidebar.tsx    - Navigation sidebar (Products, Suppliers, Factories, Saved, Settings + Admin)
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
    products-page.tsx  - Main products listing with search/filter
    product-detail.tsx - Product detail with supplier info + gated contact
    suppliers-page.tsx - Suppliers listing (also used for /factories with filterTypes)
    supplier-detail.tsx - Supplier detail with products + gated contact
    admin/
      listings.tsx     - Admin supplier management
      listing-form.tsx - Add/edit supplier form
      supplier-products.tsx - Admin products management
      supplier-product-form.tsx - Add/edit product form
      categories.tsx   - Admin categories management
    login.tsx / signup.tsx - Auth pages
    saved-products.tsx - User's saved products
    pricing-page.tsx   - Subscription page
    settings.tsx       - Account settings
    payment-callback.tsx - Payment result handler

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints
  storage.ts           - IStorage interface + MemStorage fallback
  supabase.ts          - Server-side Supabase admin client
  supabase-storage.ts  - SupabaseStorage implementation

shared/
  schema.ts            - Drizzle schema + TypeScript types
```

## Key API Routes
### Public (auth required)
- `GET /api/supplier-products` - Published products with supplier preview info
- `GET /api/supplier-products/:id` - Product detail (supplier contact gated)
- `GET /api/listings` - Published suppliers (contact info stripped for non-subscribers)
- `GET /api/listings/:id` - Supplier detail + products (contact gated)
- `GET /api/categories` - All categories

### Admin only
- `GET/POST /api/admin/supplier-products` - CRUD products
- `PATCH/DELETE /api/admin/supplier-products/:id`
- `GET/POST /api/admin/listings` - CRUD suppliers
- `PATCH/DELETE /api/admin/listings/:id`
- `POST/DELETE /api/admin/categories` - CRUD categories
- `POST /api/admin/upload-image` - Image upload to Supabase Storage
- `POST /api/admin/subscriptions/:id/cancel` - Cancel subscription (status → cancelled)
- `POST /api/admin/subscriptions/:id/refund` - Refund via Moyasar API + mark refunded
- `GET /api/admin/overview` - Subscription stats + recent subscribers

### Auth & Payments
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/auth/role` - User role
- `POST /api/payments/create` - Create Moyasar invoice
- `GET /api/payments/verify/:id` - Verify payment
- `GET /api/payments/subscription` - Subscription status
- `POST /api/moyasar/webhook` - Moyasar webhook

## Database Tables (Supabase)
- `profiles`: id, email, full_name, avatar_url, plan (admin|free), created_at
- `listings`: id, title, image_url, description, category, supplier_name, supplier_phone, supplier_whatsapp, supplier_city, supplier_type, supplier_link, status, created_at
- `categories`: id, name, created_at
- `supplier_products`: id, title, image_url, description, category, supplier_id, status, created_at
- `subscriptions`: id, user_id, plan, status, moyasar_invoice_id, moyasar_payment_id, amount_halalas, activated_at, refund_status, refunded_at, refund_amount_halalas, created_at
- `products`: (legacy) id, title, image_url, category, supplier_price, etc.
- `saved_products`: id, user_id, product_id, created_at

## Supplier Data Gating
Hidden fields for non-subscribers (both server & client):
- `supplierName` — اسم المورد
- `supplierPhone` — رقم الهاتف
- `supplierWhatsapp` — واتساب
- `supplierLocation` — موقع المورد

Visible to all: `title`, `imageUrl`, `description`, `category`, `supplierCity`, `supplierType`

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
