# TrendDrop - Winning Product Discovery Platform

## Overview
TrendDrop is a SaaS web application designed for e-commerce and dropshipping sellers, primarily targeting the Arabic-speaking market. Its core purpose is to facilitate the discovery of trending and winning products. The platform offers AI-powered opportunity scoring, supplier pricing integration, marketing insights, and comprehensive product research tools. The application is built with an Arabic-first and RTL-first approach.

## User Preferences
- Clean, modern SaaS dashboard style
- IBM Plex Sans Arabic font family (primary)
- Blue primary color scheme
- Arabic-first, RTL-first
- No emojis

## System Architecture
TrendDrop is a web application utilizing a modern JavaScript ecosystem. The frontend is built with React 18, TypeScript, Tailwind CSS, shadcn/ui, wouter for routing, and TanStack Query for data fetching. The backend is an Express 5 (Node.js) server. Data persistence is managed by Supabase (PostgreSQL), with a graceful fallback to in-memory storage if Supabase is not configured. User authentication is handled by Supabase Auth, also with a session-based fallback. AI capabilities, particularly for product analysis and generating Arabic insights, are powered by the OpenAI API (gpt-4o-mini). The application is built using Vite.

The UI/UX adheres to an RTL layout with Arabic as the primary language, using IBM Plex Sans Arabic as the main font. CSS utilizes logical properties for directionality. Key features include a comprehensive product dashboard with KPIs, advanced product filtering, detailed product pages with AI analysis, an ads library (Minea-style), and dedicated hubs for CJ Dropshipping, AliExpress, and Amazon products. The system incorporates a product qualification system to identify publishable winning products based on various criteria like halal-safety, price range, and opportunity scores. A sophisticated scoring engine calculates trend, saturation, and opportunity scores for products.

## External Dependencies
- **Supabase**: Used for database (PostgreSQL) and authentication services.
- **OpenAI API**: Utilized for AI product analysis, generating marketing insights, ad angles, and translating product information into Arabic.
- **CJ Dropshipping API**: Integrated for product search, translation, scoring, and importing winning products.
- **Apify**: Powers product importing from AliExpress (using `piotrv1001/aliexpress-listings-scraper`) and Amazon (using `igview-owner/amazon-search-scraper`).
- **Google Fonts**: Provides the IBM Plex Sans Arabic font.