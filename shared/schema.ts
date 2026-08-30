import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, bigint, boolean, timestamp, decimal, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").default("user"),
  referral_code: text("referral_code"),
  created_at: timestamp("created_at").defaultNow(),
});

export const invitationCodes = pgTable("invitation_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").default("single"),
  max_uses: integer("max_uses").default(1),
  current_uses: integer("current_uses").default(0),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const publishedMatches = pgTable("published_matches", {
  id: serial("id").primaryKey(),
  fixture_id: bigint("fixture_id", { mode: "number" }).notNull().unique(),
  home_team: text("home_team").notNull(),
  away_team: text("away_team").notNull(),
  home_logo: text("home_logo"),
  away_logo: text("away_logo"),
  league_id: integer("league_id"),
  league_name: text("league_name"),
  league_logo: text("league_logo"),
  match_date: text("match_date"),
  match_time: text("match_time"),
  timestamp: integer("timestamp"),
  api_advice: text("api_advice"),
  api_winner_name: text("api_winner_name"),
  api_winner_comment: text("api_winner_comment"),
  api_percent_home: text("api_percent_home"),
  api_percent_draw: text("api_percent_draw"),
  api_percent_away: text("api_percent_away"),
  api_under_over: text("api_under_over"),
  api_goals_home: text("api_goals_home"),
  api_goals_away: text("api_goals_away"),
  api_comparison: jsonb("api_comparison"),
  api_h2h: jsonb("api_h2h"),
  api_teams: jsonb("api_teams"),
  status: text("status").default("pending"),
  result: text("result"),
  is_featured: boolean("is_featured").default(false),
  final_score_home: integer("final_score_home"),
  final_score_away: integer("final_score_away"),
  created_at: timestamp("created_at").defaultNow(),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  coupon_date: text("coupon_date").notNull(),
  combined_odds: decimal("combined_odds", { precision: 10, scale: 2 }).default("1.00"),
  status: text("status").default("pending"),
  result: text("result").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const apiCache = pgTable("api_cache", {
  key: varchar("key", { length: 255 }).primaryKey(),
  data: jsonb("data").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  home_team: text("home_team").notNull(),
  away_team: text("away_team").notNull(),
  home_logo: text("home_logo"),
  away_logo: text("away_logo"),
  league_id: integer("league_id"),
  league_name: text("league_name"),
  league_logo: text("league_logo"),
  prediction: text("prediction").notNull(),
  odds: decimal("odds", { precision: 5, scale: 2 }),
  match_time: text("match_time"),
  match_date: text("match_date"),
  analysis: text("analysis"),
  confidence: integer("confidence").default(70),
  is_hero: boolean("is_hero").default(false),
  result: text("result").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const couponPredictions = pgTable("coupon_predictions", {
  id: serial("id").primaryKey(),
  coupon_id: integer("coupon_id").notNull(),
  prediction_id: integer("prediction_id").notNull(),
});

export const bestBets = pgTable("best_bets", {
  id: serial("id").primaryKey(),
  match_id: integer("match_id"),
  fixture_id: bigint("fixture_id", { mode: "number" }).notNull(),
  home_team: text("home_team").notNull(),
  away_team: text("away_team").notNull(),
  home_logo: text("home_logo"),
  away_logo: text("away_logo"),
  league_name: text("league_name"),
  league_logo: text("league_logo"),
  match_date: text("match_date"),
  match_time: text("match_time"),
  bet_type: text("bet_type").notNull(),
  bet_category: text("bet_category").default("primary"), // 'primary' = 2.5 Üst, 'alternative' = KG Var
  bet_description: text("bet_description"),
  odds: decimal("odds", { precision: 5, scale: 2 }),
  confidence: integer("confidence").default(70),
  risk_level: text("risk_level").default("orta"),
  reasoning: text("reasoning"),
  result: text("result").default("pending"),
  date_for: text("date_for").notNull(),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("best_bets_fixture_date_category_unique").on(table.fixture_id, table.date_for, table.bet_category)
]);

export const userCoupons = pgTable("user_coupons", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  coupon_type: text("coupon_type").default("single"),
  status: text("status").default("pending"),
  total_odds: decimal("total_odds", { precision: 10, scale: 2 }),
  created_at: timestamp("created_at").defaultNow(),
});

export const userCouponItems = pgTable("user_coupon_items", {
  id: serial("id").primaryKey(),
  coupon_id: integer("coupon_id").notNull(),
  match_id: integer("match_id"),
  fixture_id: bigint("fixture_id", { mode: "number" }).notNull(),
  home_team: text("home_team").notNull(),
  away_team: text("away_team").notNull(),
  home_logo: text("home_logo"),
  away_logo: text("away_logo"),
  league_name: text("league_name"),
  match_date: text("match_date"),
  match_time: text("match_time"),
  bet_type: text("bet_type").notNull(),
  odds: decimal("odds", { precision: 5, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Football Team Database ────────────────────────────────────
export const footballTeams = pgTable("football_teams", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  normalized_name: text("normalized_name").notNull(),
  country: text("country"),
  abbreviation: text("abbreviation"),
  stadium: text("stadium"),
  logo: text("logo"),                // e.g. /team-logos/galatasaray.svg
  logo_source: text("logo_source"),  // 'local' | 'cdn' | null
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country"),
  type: text("type"),   // 'league' | 'cup' | 'european'
  season: text("season"),
});

export const teamCompetitions = pgTable("team_competitions", {
  id: serial("id").primaryKey(),
  team_id: integer("team_id").notNull(),
  competition_id: integer("competition_id").notNull(),
  season: text("season"),
});

export type FootballTeam = typeof footballTeams.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type TeamCompetition = typeof teamCompetitions.$inferSelect;

// ─────────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password_hash: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InvitationCode = typeof invitationCodes.$inferSelect;
export type PublishedMatch = typeof publishedMatches.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type BestBet = typeof bestBets.$inferSelect;
export type UserCoupon = typeof userCoupons.$inferSelect & { items?: UserCouponItem[] };
export type UserCouponItem = typeof userCouponItems.$inferSelect;
