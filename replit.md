# TrendDrop - Winning Product Discovery Platform

## Overview
A SaaS web application for e-commerce and dropshipping sellers to discover trending/winning products. Features AI-powered opportunity scoring, supplier pricing, marketing insights, and product research tools.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query
- **Backend**: Express 5 (Node.js) + express-session + memorystore
- **Database**: In-memory storage (MVP) - schema ready for PostgreSQL via Drizzle ORM
- **Build**: Vite

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
  data/
    mock-products.ts   - Mock product data (used for frontend reference)
  lib/
    auth.tsx           - Auth context provider
    queryClient.ts     - TanStack Query config
    utils.ts           - Formatting helpers (money, scores, margins)
  pages/
    landing.tsx        - Public landing page
    login.tsx          - Login form
    signup.tsx         - Signup form
    dashboard.tsx      - Dashboard with KPIs
    products.tsx       - Product listing with filters
    product-details.tsx - Single product details + AI analysis
    saved-products.tsx - User's saved products
    pricing-page.tsx   - Pricing plans
    settings.tsx       - Account settings placeholder

server/
  index.ts             - Express server entry
  routes.ts            - API endpoints (auth, products, saved)
  storage.ts           - IStorage interface + MemStorage (with seed data)

shared/
  schema.ts            - Drizzle schema + TypeScript types
```

## API Routes
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout
- `GET /api/products` - List all products
- `GET /api/products/:id` - Single product
- `GET /api/saved/ids` - Saved product IDs for current user
- `GET /api/saved/products` - Saved products for current user
- `POST /api/saved/:productId` - Save a product
- `DELETE /api/saved/:productId` - Unsave a product

## Key Features
- Landing page with hero, features, pricing, FAQ
- Auth with session-based login/signup
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
