# tutturduk.com - Sports Betting Predictions Platform

## Overview

This is a mobile-first Turkish sports betting predictions platform called "tutturduk.com". The application provides users with match predictions, winning coupons, and AI-powered analysis for sports betting. Users must register with a referral code to access predictions and content. The platform includes a dealer code system (Bayi Kodu: 303603) for affiliate tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based architecture with reusable components. Key design patterns:
- Protected routes require authentication
- Mobile-first responsive design with fixed header and bottom navigation
- Context-based authentication state management

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage
- **API Pattern**: RESTful JSON APIs under `/api` prefix

The server handles:
- User authentication (register/login with referral codes)
- Predictions CRUD operations
- Invitation code management
- Admin functionality for content management

### Data Storage
- **Primary Database**: PostgreSQL (via DATABASE_URL environment variable)
- **Session Storage**: PostgreSQL sessions table
- **Schema Location**: `shared/schema.ts` using Drizzle ORM

Key entities include:
- Users (with roles: user/admin)
- Predictions (match predictions with status tracking)
- Invitation codes (referral system)
- Winning coupons

### Authentication Flow
- Session-based authentication using cookies
- Referral code required for registration
- Role-based access control (user vs admin)
- Admin has separate login page at `/admin-login`

### Build System
- Development: Vite dev server with HMR
- Production: Custom build script using esbuild for server, Vite for client
- Output: `dist/` directory with `public/` for static assets

## Match Filtering & Optimization

### League Filtering (matchFilter.ts)
- Automatically excludes U23, U21, U20, U19 youth leagues
- Filters out Women's/Kadın leagues
- Removes Reserve/Rezerv team matches
- Excludes Amateur and B Team matches
- Uses keyword-based filtering on league names and team names

### AI Token Optimization
- AI analysis results are cached in PostgreSQL `api_cache` table
- 24-hour TTL for AI analysis cache (saves tokens on repeated views)
- Statistics score check before publishing (minimum score: 30)
- Only matches with valid form data and comparisons are published

### Statistics Validation
- `hasValidStatistics()`: Checks if match has form data and comparison data
- `getStatisticsScore()`: Returns 0-100 score based on available data
- Matches without sufficient statistics cannot be published
- This ensures AI analysis has meaningful data to work with

## External Dependencies

### Third-Party APIs
- **API-Football (v3)**: Live match scores, fixtures, predictions, H2H data, betting odds (via API_FOOTBALL_KEY)
- **OpenAI GPT-4o**: AI-powered match analysis and predictions with value betting (via OPENAI_API_KEY)

### Key NPM Packages
- `@tanstack/react-query`: Data fetching and caching
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express-session` / `connect-pg-simple`: Session management
- `shadcn/ui` components via Radix UI primitives
- `date-fns`: Date formatting with Turkish locale support

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (optional, has default)
- `API_FOOTBALL_KEY`: API-Football (RapidAPI) key for match data and odds
- `OPENAI_API_KEY`: OpenAI API key for AI analysis

## Coupon System

### How Coupons Work
- Admin creates coupons via Admin Panel > Kuponlar tab
- Best bets (AI predictions) are added to coupons from the `best_bets` table
- Coupon odds are calculated based on risk levels (düşük=1.5x, orta=2.0x, yüksek=3.5x)
- Coupons store references in `coupon_predictions` table (links to `best_bet_id`)

### Match Status Automation
- `matchStatusService.ts` runs every 15 minutes via setInterval
- Checks pending/in_progress matches against API-Football for live scores
- When match finishes: updates `published_matches` with final score and status
- Evaluates `best_bets` predictions (won/lost) based on actual scores
- Auto-evaluates coupon results when all predictions are evaluated

### Prediction Evaluation Logic
- **2.5/3.5/4.5 Üst/Alt**: Compares total goals against threshold
- **KG Var/Yok**: Checks if both teams scored
- **Ev/Beraberlik/Deplasman**: Match winner evaluation
- Results stored in `best_bets.result` column (pending/won/lost)

## Recent Changes

### January 2026
- Added match filtering to exclude U23/Women's/Reserve leagues
- Implemented AI analysis caching in PostgreSQL (24h TTL)
- Added statistics validation before match publishing
- Created AI-powered Coupon Creator feature
- Added "Kuponlar" tab in bottom navigation
- Implemented automatic match status tracking (15-min cron job)
- Added prediction result evaluation based on API-Football scores
- Enhanced coupon system to work with best_bets instead of predictions table
- Added admin routes for managing best bets in coupons

### January 16, 2026 - Major Fixes
- **Fixed autoPublishService**: Rewrote to iterate through SUPPORTED_LEAGUES and fetch matches by date using `getFixtures()` API
- **AI Analysis Best Bets Integration**: AI analysis now automatically saves predictions to `best_bets` table for tracking and evaluation
- **Admin Panel Filtering**: Finished matches are now automatically hidden from admin "Yayınlanan Maçlar" section (keeps last 2 hours visible for review)
- **WinnersPage Enhancement**: Finished matches now show all predictions with won/lost status using color-coded badges
- **New AI Analysis Structure**: Uses 3-tier prediction format (expected/medium/risky) with score-goal consistency validation
- **Cache Key Versioning**: AI analysis uses v6 cache keys for fresh generation
- **Global Consistency System**: Comprehensive two-layer enforcement to prevent contradictory predictions:
  1. OpenAI prompt includes "GLOBAL TUTARLILIK" rule requiring all 3 predictions to share the same match scenario
  2. TypeScript post-processing with scenario-aware replacement logic:
     - Mutually exclusive scoring flags (isHighScoring/isLowScoring cannot both be true)
     - Score-based scenario detection (avg goals determines high/low, not just keywords)
     - Bet-specific score requirements enforced (2.5 Üst → 3+ goals, KG Var → both score)
     - High-scoring clean sheet handling (Ev 1.5 Üst with 3-0, 4-0 instead of 2.5 Alt)
     - All replacement scores meet the scenario's goal band requirement

### January 18, 2026 - Auto-Publish Enhancement & API Consolidation
- **Unified API Architecture**: All match data, statistics, and odds now come from API-Football (single source of truth)
- **Removed NosyAPI**: Eliminated dependency on secondary odds API for simpler, more reliable data flow
- **Enhanced Auto-Publish Flow**:
  1. Fetches ALL matches for date via single API call (no league iteration)
  2. Filters out U23/Women's/Reserve matches automatically
  3. Validates statistics score (minimum 20)
  4. Fetches odds from API-Football for each valid match
  5. Generates AI analysis with full odds data
  6. Maximum 40 matches published per day
- **Collapsible Odds Display**: MatchDetailPage shows "Oranlar" with MS, Alt/Üst, KG, and Çifte Şans markets
- **Quality Control**: Only matches with sufficient statistics (score 20+) are published

### January 19, 2026 - AI Model Upgrade & Decision-Based Value Betting System
- **GPT-4o Upgrade**: Switched AI model from GPT-4o-mini to GPT-4o for improved prediction accuracy
- **Decision-Based System ("karar" field)**:
  - AI returns `karar: "bahis"` for confident predictions or `karar: "pas"` to skip unclear matches
  - Prevents forced predictions on volatile/uncertain matches
  - Expected to improve success rate by 10-15%
- **Single Bet Value Betting**:
  - Value calculation: ((Probability / 100 × Odds) - 1) - must be positive
  - Minimum odds: 1.50 strictly enforced (rejected if below, not rounded)
  - Bets with zero or negative value automatically rejected
- **Market Priority Order**:
  1. 2.5 Üst / 2.5 Alt (equal priority)
  2. KG Var (Karşılıklı Gol)
  3. Çifte Şans (1X, X2)
  4. DNB (Beraberlikte İade)
  5. 1.5 Üst (only if odds ≥1.50)
  6. MS (Maç Sonucu) - only very clear scenarios
  7. İY (İlk Yarı) - last resort
- **Confidence-Risk Thresholds**:
  - Confidence ≥70 → düşük risk
  - Confidence 60-69 → orta risk
  - Confidence <60 → yüksek risk
- **avoidBets Format**: Changed from array to object with explanatory reasons: `{"bahis": "sebep"}`
- **Enhanced Odds Parsing**: Added first half betting options and DNB (Draw No Bet)
  - İY 0.5 Üst/Alt (First Half Over/Under 0.5)
  - İY 1.5 Alt (First Half Under 1.5)
  - İY Beraberlik (First Half Draw)
  - DNB Ev/Deplasman (Draw No Bet)
- **Simplified AI Prompt**: Streamlined prompt focusing on value betting principles
- **Backwards Compatibility**: singleBet results converted to predictions array for existing UI
- **Value Percentage Validation**: Post-processing ensures value calculations are accurate