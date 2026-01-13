import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
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

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  max_uses: integer("max_uses").default(1),
  current_uses: integer("current_uses").default(0),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const publishedMatches = pgTable("published_matches", {
  id: serial("id").primaryKey(),
  fixture_id: integer("fixture_id").notNull().unique(),
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
  matches: jsonb("matches").notNull(),
  total_odds: decimal("total_odds", { precision: 10, scale: 2 }),
  status: text("status").default("pending"),
  result: text("result"),
  created_at: timestamp("created_at").defaultNow(),
});

export const apiCache = pgTable("api_cache", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password_hash: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type PublishedMatch = typeof publishedMatches.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
