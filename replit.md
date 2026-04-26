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
- **Live indicators**: Pulse-soft (yanıp sönen) noktalar artık kullanılmıyor. Canlı maçlar için sadece düz lime metin (örn. `63'`) gösterilir; "Günün Bahsi" tile'ı `FeaturedBetCountdown` ile dakika bazında güncellenen geri sayım (`Başlar · 1s 14d` / `Canlı · 35'` / `Maç Bitti`) gösterir. Geri sayım kickoff'u Türkiye saatine (`+03:00`) sabitlenmiştir; iskelet `animate-pulse` (yükleniyor parıltıları) korunur.
- **Tahmin kartı (Versus Strip)**: `/tahminler` MatchRow tek satır halinde [ev logosu] takım adları + skorlar [deplasman logosu] gösterir, üstte `[no] [lig logosu] LİG ADI ........ saat / dk'` meta satırı, altta hairline ile ayrılmış bahis bloğu (Tahmin · TUTTU/TUTMADI · oran · güven · →) bulunur.

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
- **Central Config**: All thresholds live in `server/predictionConfig.ts` (`MAX_DAILY_MATCHES=35`, `MIN_STATS_SCORE=35`, `MIN_CONF=70`, `MIN_VALUE=0.05`, `MIN_ODDS=1.40`, sweet-spot 1.55–2.20, AI batch size 5).
- **AI-Powered Analysis**: OpenAI GPT-4o; output includes `karar` (bahis/pas), confidence and probability as separate fields, and an alternative bet decorrelated from the primary.
- **Value Betting**: Primary bets need ≥5% value and odds ≥1.40. Low-odds (1.40–1.49) require ≥8% edge AND ≥75% confidence.
- **Adaptive Markets**: 11-market pool — Goal/Result/Safety sets — selected by AI per match (low-scoring leagues prefer Alt 2.5 / 1.5 lines).
- **Correlation Rule**: Alternative bet is dropped if positively correlated with primary (e.g., 2.5 Üst + KG Var).
- **Poisson xG**: League-aware expected-goals calc with home advantage factor (1.10) and `LEAGUE_AVG_GOALS=2.65`.
- **Daily Pipeline (cron 01:00 Türkiye)**: Fetch validated fixtures → Postgres advisory lock (`pg_try_advisory_lock`) → DB count check (35 cap) → odds early-elim (sweet spot) → top-N by stats score + buffer → parallel AI batch (5×) → `INSERT ... ON CONFLICT DO NOTHING RETURNING id` (publishedCount sadece gerçek insert'te artar) → lock'u `finally`'de bırak. Bu sayede paralel cron veya manuel tetiklemede 35 cap atomik korunur.
- **Cache**: AI results cached in `api_cache` with auto-versioned key `ai_analysis_<md5_8>_<fixtureId>` (24h TTL); prompt/schema changes auto-invalidate the cache.
- **Coupon Automation**: `autoCreateDailyCoupon()` picks top 2–3 primary bets; bets with missing/invalid odds are excluded — coupon is rolled back if fewer than 2 valid bets remain.
- **Match Status Automation**: Every 15 minutes, statuses updated and bets evaluated. HT skoru fixture API'sinden (`score.halftime`) çekilip `evaluateBet`'e iletilir; DB-only yeniden değerlendirmede HT için API tekrar çağrılır. Outcomes are `won` / `lost` / `void`; success rate = `won / (won + lost)`. Supports MS, Alt/Üst, KG, çift şans, DNB (void on draw), İY (HT) markets, and HT/FT pairs (HT/FT regex generic HT'den önce çalışır — composite formatlar `1/X`, `İY/MS Ev/Konuk` doğru parse edilir).
- **Odds Refresh Service**: Her 30 dakikada bir, sonraki 180 dakika içinde başlayacak maçların oranları yeniden çekilir. Eski oran cache'ten (`primaryBet/alternativeBet/predictions[].odds` şeması) okunur. 2.5 Üst veya KG Var oranları %10+ değişmişse AI yeniden çalıştırılır; karar `pas`'a dönerse pending best_bet'ler silinir. Tüm eşikler `predictionConfig`'tedir.

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