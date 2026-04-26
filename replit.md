# tutturduk.com - Sports Betting Predictions Platform

## Overview
tutturduk.com is a mobile-first Turkish sports betting predictions platform offering AI-powered match predictions, winning coupons, and analysis. It aims to provide a premium user experience with a focus on value betting and high-quality predictions for registered users. The platform utilizes a referral system for user acquisition and features a dealer code system for affiliate tracking.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology**: React 18 with TypeScript, Wouter for routing, TanStack React Query for state management.
- **Styling**: Tailwind CSS v4 with shadcn/ui for components.
- **Design Principles**: Mobile-first, responsive, fixed header, floating pill bottom navigation.
- **UI/UX**: Premium dark aesthetic with a pure dark background (`#0a0a0c`), hairline white borders, and specific typography (Fraunces for headlines, Inter for body, JetBrains Mono for numerics). Betting clichés are avoided.
- **Routes**: User-facing routes are localized to Turkish (e.g., `/predictions` → `/tahminler`).

### Backend
- **Technology**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for data persistence and `connect-pg-simple` for session storage.
- **API**: RESTful JSON APIs under the `/api` prefix.
- **Key Features**: User authentication (including referral codes), predictions management, invitation code handling, and administrative functions for content.
- **Authentication**: Session-based with cookies, role-based access control, and a separate admin login.

### Data Management
- **Schema**: Defined in `shared/schema.ts` using Drizzle ORM.
- **Entities**: Users, Predictions, Invitation Codes, Winning Coupons.
- **AI Analysis Cache**: Stored in PostgreSQL `api_cache` with a 24-hour TTL to optimize API token usage.
- **Match Filtering**: Automatic exclusion of youth, women's, reserve, amateur, and B team leagues based on keywords. Matches require a minimum statistics score (35) to be published.

### Prediction & Coupon System
- **AI-Powered Analysis**: Utilizes OpenAI GPT-4o for match analysis and value betting, generating predictions with a `karar` field ("bahis" for confident bets, "pas" for uncertain matches).
- **Value Betting**: Predictions must have a positive value percentage (minimum 5%) and minimum odds of 1.50.
- **Decision-Based System**: AI explicitly determines whether to "bet" or "pass" on a match based on confidence (minimum 70%) and value.
- **Dual Bet System**: For each match, AI generates a primary bet (e.g., 2.5 Üst) and an alternative bet (e.g., KG Var).
- **Coupon Automation**: `autoCreateDailyCoupon()` automatically generates daily coupons by picking 2-3 highest confidence primary bets with real odds.
- **Match Status Automation**: A service runs every 15 minutes to update match statuses, evaluate predictions, and assess coupon results based on API-Football data.

## External Dependencies

### Third-Party APIs
-   **API-Football (v3)**: Provides live match scores, fixtures, predictions, H2H data, betting odds, injuries, and team statistics.
-   **OpenAI GPT-4o**: Used for AI-powered match analysis and value betting calculations.

### Key NPM Packages
-   `@tanstack/react-query`: For server state management and data fetching.
-   `drizzle-orm` / `drizzle-kit`: ORM for PostgreSQL and schema migrations.
-   `express-session` / `connect-pg-simple`: For managing user sessions.
-   `shadcn/ui`: Component library built on Radix UI.
-   `date-fns`: For date manipulation and formatting, with Turkish locale support.

### Environment Variables
-   `DATABASE_URL`: PostgreSQL connection string.
-   `SESSION_SECRET`: Secret key for session encryption.
-   `API_FOOTBALL_KEY`: API key for API-Football.
-   `OPENAI_API_KEY`: API key for OpenAI services.