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

## External Dependencies

### Third-Party APIs
- **RapidAPI Football Data**: Live match scores and upcoming fixtures (API key in client-side code)

### Key NPM Packages
- `@tanstack/react-query`: Data fetching and caching
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express-session` / `connect-pg-simple`: Session management
- `shadcn/ui` components via Radix UI primitives
- `date-fns`: Date formatting with Turkish locale support

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (optional, has default)