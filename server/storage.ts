import { pool } from './db';
import * as crypto from 'crypto';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  referral_code: string | null;
  created_at: Date;
}

export interface InsertUser {
  username: string;
  password: string;
  referral_code?: string;
  role?: string;
}

export interface InvitationCode {
  id: number;
  code: string;
  type: string;
  max_uses: number;
  uses: number;
  status: string;
  created_at: Date;
}

export interface Prediction {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_id: string;
  league_name?: string;
  league_logo?: string;
  prediction: string;
  odds: number;
  match_time: string;
  match_date: string | null;
  analysis: string | null;
  confidence?: string;
  is_hero: boolean;
  result: string; // 'pending' | 'won' | 'lost'
  created_at: Date;
}

export interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  status: string;
  result: string;
  created_at: Date;
  predictions?: Prediction[];
}

export interface CouponPrediction {
  id: number;
  coupon_id: number;
  prediction_id: number;
  created_at: Date;
}

export interface UserCoupon {
  id: number;
  user_id: number;
  name: string;
  coupon_type: string;
  total_odds: number;
  status: string;
  created_at: Date;
  items?: UserCouponItem[];
}

export interface UserCouponItem {
  id: number;
  coupon_id: number;
  match_id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_date: string;
  match_time: string;
  bet_type: string;
  odds: number;
  result: string;
  created_at: Date;
}

export interface BestBet {
  id: number;
  match_id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date: string;
  match_time: string;
  bet_type: string;
  bet_description: string;
  confidence: number;
  risk_level: string;
  reasoning?: string;
  created_at: Date;
  date_for: string;
}

export interface PublishedMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_id?: number;
  league_name?: string;
  league_logo?: string;
  match_date?: string;
  match_time?: string;
  timestamp?: number;
  api_advice?: string;
  api_winner_name?: string;
  api_winner_comment?: string;
  api_percent_home?: string;
  api_percent_draw?: string;
  api_percent_away?: string;
  api_under_over?: string;
  api_goals_home?: string;
  api_goals_away?: string;
  api_comparison?: any;
  api_h2h?: any[];
  api_teams?: any;
  status: string;
  result?: string;
  final_score_home?: number;
  final_score_away?: number;
  is_featured: boolean;
  created_at: Date;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Invitation code methods
  getInvitationCode(code: string): Promise<InvitationCode | undefined>;
  getAllInvitationCodes(): Promise<InvitationCode[]>;
  createInvitationCode(code: string, type: string, maxUses: number): Promise<InvitationCode>;
  useInvitationCode(code: string): Promise<boolean>;
  deleteInvitationCode(id: number): Promise<boolean>;
  
  // Prediction methods
  getHeroPrediction(): Promise<Prediction | undefined>;
  getPredictionById(id: number): Promise<Prediction | undefined>;
  getAllPredictions(): Promise<Prediction[]>;
  getPendingPredictions(): Promise<Prediction[]>;
  getWonPredictions(): Promise<Prediction[]>;
  getLostPredictions(): Promise<Prediction[]>;
  getPredictionsByDate(date: string): Promise<Prediction[]>;
  createPrediction(prediction: Partial<Prediction>): Promise<Prediction>;
  updatePrediction(id: number, prediction: Partial<Prediction>): Promise<Prediction | null>;
  deletePrediction(id: number): Promise<boolean>;
  updateHeroPrediction(prediction: Partial<Prediction>): Promise<Prediction>;
  
  // Coupon methods
  getAllCoupons(): Promise<Coupon[]>;
  getCouponsByDate(date: string): Promise<Coupon[]>;
  getCouponWithPredictions(id: number): Promise<Coupon | undefined>;
  createCoupon(name: string, date: string): Promise<Coupon>;
  addPredictionToCoupon(couponId: number, predictionId: number): Promise<void>;
  removePredictionFromCoupon(couponId: number, predictionId: number): Promise<void>;
  updateCouponOdds(couponId: number): Promise<Coupon>;
  updateCouponResult(couponId: number, result: string): Promise<Coupon>;
  deleteCoupon(id: number): Promise<boolean>;
  
  // Published match methods
  getPublishedMatches(): Promise<PublishedMatch[]>;
  getPublishedMatchById(id: number): Promise<PublishedMatch | undefined>;
  getPublishedMatchByFixtureId(fixtureId: number): Promise<PublishedMatch | undefined>;
  publishMatch(match: Partial<PublishedMatch>): Promise<PublishedMatch>;
  unpublishMatch(id: number): Promise<boolean>;
  updatePublishedMatch(id: number, data: Partial<PublishedMatch>): Promise<PublishedMatch | null>;
  getFeaturedMatch(): Promise<PublishedMatch | undefined>;
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const passwordHash = hashPassword(insertUser.password);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, referral_code, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [insertUser.username, passwordHash, insertUser.referral_code || null, insertUser.role || 'user']
    );
    return result.rows[0];
  }

  async getAllUsers(): Promise<User[]> {
    const result = await pool.query('SELECT id, username, role, referral_code, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  }

  // Invitation code methods
  async getInvitationCode(code: string): Promise<InvitationCode | undefined> {
    const result = await pool.query('SELECT * FROM invitation_codes WHERE code = $1', [code]);
    return result.rows[0];
  }

  async getAllInvitationCodes(): Promise<InvitationCode[]> {
    const result = await pool.query('SELECT * FROM invitation_codes ORDER BY created_at DESC');
    return result.rows;
  }

  async createInvitationCode(code: string, type: string, maxUses: number): Promise<InvitationCode> {
    const result = await pool.query(
      'INSERT INTO invitation_codes (code, type, max_uses) VALUES ($1, $2, $3) RETURNING *',
      [code, type, maxUses]
    );
    return result.rows[0];
  }

  async useInvitationCode(code: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE invitation_codes 
       SET uses = uses + 1, status = CASE WHEN uses + 1 >= max_uses THEN 'used' ELSE status END
       WHERE code = $1 AND uses < max_uses AND status = 'active'
       RETURNING *`,
      [code]
    );
    return result.rows.length > 0;
  }

  async deleteInvitationCode(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM invitation_codes WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  // Prediction methods
  async getHeroPrediction(): Promise<Prediction | undefined> {
    const result = await pool.query('SELECT * FROM predictions WHERE is_hero = TRUE AND result = \'pending\' ORDER BY created_at DESC LIMIT 1');
    return result.rows[0];
  }

  async getPredictionById(id: number): Promise<Prediction | undefined> {
    const result = await pool.query('SELECT * FROM predictions WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const result = await pool.query('SELECT * FROM predictions ORDER BY created_at DESC');
    return result.rows;
  }

  async getPendingPredictions(): Promise<Prediction[]> {
    const result = await pool.query('SELECT * FROM predictions WHERE result = \'pending\' ORDER BY match_date DESC, created_at DESC');
    return result.rows;
  }

  async getWonPredictions(): Promise<Prediction[]> {
    const result = await pool.query('SELECT * FROM predictions WHERE result = \'won\' ORDER BY match_date DESC, created_at DESC');
    return result.rows;
  }

  async getLostPredictions(): Promise<Prediction[]> {
    const result = await pool.query('SELECT * FROM predictions WHERE result = \'lost\' ORDER BY match_date DESC, created_at DESC');
    return result.rows;
  }

  async createPrediction(prediction: Partial<Prediction>): Promise<Prediction> {
    const result = await pool.query(
      `INSERT INTO predictions (home_team, away_team, home_logo, away_logo, league_id, league_name, league_logo, prediction, odds, match_time, match_date, analysis, confidence, is_hero, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        prediction.home_team,
        prediction.away_team,
        prediction.home_logo || null,
        prediction.away_logo || null,
        prediction.league_id,
        prediction.league_name || null,
        prediction.league_logo || null,
        prediction.prediction,
        prediction.odds,
        prediction.match_time,
        prediction.match_date || null,
        prediction.analysis,
        prediction.confidence || 'medium',
        prediction.is_hero || false,
        prediction.result || 'pending'
      ]
    );
    return result.rows[0];
  }

  async updatePrediction(id: number, prediction: Partial<Prediction>): Promise<Prediction | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (prediction.home_team !== undefined) {
      fields.push(`home_team = $${paramCount++}`);
      values.push(prediction.home_team);
    }
    if (prediction.away_team !== undefined) {
      fields.push(`away_team = $${paramCount++}`);
      values.push(prediction.away_team);
    }
    if (prediction.league_id !== undefined) {
      fields.push(`league_id = $${paramCount++}`);
      values.push(prediction.league_id);
    }
    if (prediction.prediction !== undefined) {
      fields.push(`prediction = $${paramCount++}`);
      values.push(prediction.prediction);
    }
    if (prediction.odds !== undefined) {
      fields.push(`odds = $${paramCount++}`);
      values.push(prediction.odds);
    }
    if (prediction.match_time !== undefined) {
      fields.push(`match_time = $${paramCount++}`);
      values.push(prediction.match_time);
    }
    if (prediction.match_date !== undefined) {
      fields.push(`match_date = $${paramCount++}`);
      values.push(prediction.match_date);
    }
    if (prediction.analysis !== undefined) {
      fields.push(`analysis = $${paramCount++}`);
      values.push(prediction.analysis);
    }
    if (prediction.is_hero !== undefined) {
      fields.push(`is_hero = $${paramCount++}`);
      values.push(prediction.is_hero);
    }
    if (prediction.result !== undefined) {
      fields.push(`result = $${paramCount++}`);
      values.push(prediction.result);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE predictions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async deletePrediction(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM predictions WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  async updateHeroPrediction(prediction: Partial<Prediction>): Promise<Prediction> {
    // First, set all predictions as not hero
    await pool.query('UPDATE predictions SET is_hero = FALSE');
    
    // Then create new hero prediction
    return this.createPrediction({ ...prediction, is_hero: true, result: 'pending' });
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) return null;
    
    return user;
  }

  // Prediction by date
  async getPredictionsByDate(date: string): Promise<Prediction[]> {
    const result = await pool.query('SELECT * FROM predictions WHERE match_date = $1 ORDER BY match_time ASC', [date]);
    return result.rows;
  }

  // Coupon methods
  async getAllCoupons(): Promise<Coupon[]> {
    const result = await pool.query('SELECT * FROM coupons ORDER BY coupon_date DESC, created_at DESC');
    return result.rows;
  }

  async getCouponsByDate(date: string): Promise<Coupon[]> {
    const result = await pool.query('SELECT * FROM coupons WHERE coupon_date = $1 ORDER BY created_at DESC', [date]);
    return result.rows;
  }

  async getCouponWithPredictions(id: number): Promise<Coupon | undefined> {
    const couponResult = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (couponResult.rows.length === 0) return undefined;
    
    const coupon = couponResult.rows[0];
    const predictionsResult = await pool.query(
      `SELECT p.* FROM predictions p 
       INNER JOIN coupon_predictions cp ON p.id = cp.prediction_id 
       WHERE cp.coupon_id = $1 
       ORDER BY p.match_time ASC`,
      [id]
    );
    coupon.predictions = predictionsResult.rows;
    return coupon;
  }

  async createCoupon(name: string, date: string): Promise<Coupon> {
    const result = await pool.query(
      'INSERT INTO coupons (name, coupon_date) VALUES ($1, $2) RETURNING *',
      [name, date]
    );
    return result.rows[0];
  }

  async addPredictionToCoupon(couponId: number, predictionId: number): Promise<void> {
    await pool.query(
      'INSERT INTO coupon_predictions (coupon_id, prediction_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [couponId, predictionId]
    );
    await this.updateCouponOdds(couponId);
  }

  async removePredictionFromCoupon(couponId: number, predictionId: number): Promise<void> {
    await pool.query(
      'DELETE FROM coupon_predictions WHERE coupon_id = $1 AND prediction_id = $2',
      [couponId, predictionId]
    );
    await this.updateCouponOdds(couponId);
  }

  async updateCouponOdds(couponId: number): Promise<Coupon> {
    const result = await pool.query(
      `SELECT COALESCE(
        (SELECT EXP(SUM(LN(CAST(p.odds AS DECIMAL)))) 
         FROM predictions p 
         INNER JOIN coupon_predictions cp ON p.id = cp.prediction_id 
         WHERE cp.coupon_id = $1),
        1.00
      ) as combined_odds`,
      [couponId]
    );
    const combinedOdds = parseFloat(result.rows[0].combined_odds).toFixed(2);
    
    const updateResult = await pool.query(
      'UPDATE coupons SET combined_odds = $1 WHERE id = $2 RETURNING *',
      [combinedOdds, couponId]
    );
    return updateResult.rows[0];
  }

  async updateCouponResult(couponId: number, result: string): Promise<Coupon> {
    const updateResult = await pool.query(
      'UPDATE coupons SET result = $1 WHERE id = $2 RETURNING *',
      [result, couponId]
    );
    return updateResult.rows[0];
  }

  async deleteCoupon(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  // Published match methods
  async getPublishedMatches(): Promise<PublishedMatch[]> {
    const result = await pool.query(
      'SELECT * FROM published_matches WHERE status != $1 ORDER BY timestamp ASC, created_at DESC',
      ['finished']
    );
    return result.rows;
  }

  async getPublishedMatchById(id: number): Promise<PublishedMatch | undefined> {
    const result = await pool.query('SELECT * FROM published_matches WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getPublishedMatchByFixtureId(fixtureId: number): Promise<PublishedMatch | undefined> {
    const result = await pool.query('SELECT * FROM published_matches WHERE fixture_id = $1', [fixtureId]);
    return result.rows[0];
  }

  async publishMatch(match: Partial<PublishedMatch>): Promise<PublishedMatch> {
    const result = await pool.query(
      `INSERT INTO published_matches (
        fixture_id, home_team, away_team, home_logo, away_logo, 
        league_id, league_name, league_logo, match_date, match_time, timestamp,
        api_advice, api_winner_name, api_winner_comment, 
        api_percent_home, api_percent_draw, api_percent_away,
        api_under_over, api_goals_home, api_goals_away,
        api_comparison, api_h2h, api_teams, status, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) 
      ON CONFLICT (fixture_id) DO UPDATE SET
        api_advice = EXCLUDED.api_advice,
        api_winner_name = EXCLUDED.api_winner_name,
        api_winner_comment = EXCLUDED.api_winner_comment,
        api_percent_home = EXCLUDED.api_percent_home,
        api_percent_draw = EXCLUDED.api_percent_draw,
        api_percent_away = EXCLUDED.api_percent_away,
        api_under_over = EXCLUDED.api_under_over,
        api_goals_home = EXCLUDED.api_goals_home,
        api_goals_away = EXCLUDED.api_goals_away,
        api_comparison = EXCLUDED.api_comparison,
        api_h2h = EXCLUDED.api_h2h,
        api_teams = EXCLUDED.api_teams
      RETURNING *`,
      [
        match.fixture_id,
        match.home_team,
        match.away_team,
        match.home_logo,
        match.away_logo,
        match.league_id,
        match.league_name,
        match.league_logo,
        match.match_date,
        match.match_time,
        match.timestamp,
        match.api_advice,
        match.api_winner_name,
        match.api_winner_comment,
        match.api_percent_home,
        match.api_percent_draw,
        match.api_percent_away,
        match.api_under_over,
        match.api_goals_home,
        match.api_goals_away,
        JSON.stringify(match.api_comparison),
        JSON.stringify(match.api_h2h),
        JSON.stringify(match.api_teams),
        match.status || 'pending',
        match.is_featured || false
      ]
    );
    return result.rows[0];
  }

  async unpublishMatch(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM published_matches WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  async updatePublishedMatch(id: number, data: Partial<PublishedMatch>): Promise<PublishedMatch | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.result !== undefined) {
      fields.push(`result = $${paramCount++}`);
      values.push(data.result);
    }
    if (data.final_score_home !== undefined) {
      fields.push(`final_score_home = $${paramCount++}`);
      values.push(data.final_score_home);
    }
    if (data.final_score_away !== undefined) {
      fields.push(`final_score_away = $${paramCount++}`);
      values.push(data.final_score_away);
    }
    if (data.is_featured !== undefined) {
      fields.push(`is_featured = $${paramCount++}`);
      values.push(data.is_featured);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE published_matches SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async getFeaturedMatch(): Promise<PublishedMatch | undefined> {
    const result = await pool.query(
      'SELECT * FROM published_matches WHERE is_featured = TRUE AND status = $1 ORDER BY created_at DESC LIMIT 1',
      ['pending']
    );
    return result.rows[0];
  }

  // Best Bets methods
  async getBestBetsForDate(date: string): Promise<BestBet[]> {
    const result = await pool.query(
      `SELECT * FROM best_bets WHERE date_for = $1 ORDER BY confidence DESC LIMIT 5`,
      [date]
    );
    return result.rows;
  }

  async getTodaysBestBets(): Promise<BestBet[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getBestBetsForDate(today);
  }

  async createBestBet(bet: Omit<BestBet, 'id' | 'created_at'>): Promise<BestBet> {
    const result = await pool.query(
      `INSERT INTO best_bets (
        match_id, fixture_id, home_team, away_team, home_logo, away_logo,
        league_name, league_logo, match_date, match_time, bet_type, 
        bet_description, confidence, risk_level, reasoning, date_for
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (fixture_id, date_for) DO UPDATE SET
        bet_type = EXCLUDED.bet_type,
        bet_description = EXCLUDED.bet_description,
        confidence = EXCLUDED.confidence,
        risk_level = EXCLUDED.risk_level,
        reasoning = EXCLUDED.reasoning
      RETURNING *`,
      [
        bet.match_id, bet.fixture_id, bet.home_team, bet.away_team,
        bet.home_logo, bet.away_logo, bet.league_name, bet.league_logo,
        bet.match_date, bet.match_time, bet.bet_type, bet.bet_description,
        bet.confidence, bet.risk_level, bet.reasoning, bet.date_for
      ]
    );
    return result.rows[0];
  }

  async clearBestBetsForDate(date: string): Promise<void> {
    await pool.query('DELETE FROM best_bets WHERE date_for = $1', [date]);
  }

  // User Coupons methods
  async getUserCoupons(userId: number): Promise<UserCoupon[]> {
    const result = await pool.query(
      'SELECT * FROM user_coupons WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    const coupons = result.rows;
    for (const coupon of coupons) {
      const items = await pool.query(
        'SELECT * FROM user_coupon_items WHERE coupon_id = $1 ORDER BY created_at ASC',
        [coupon.id]
      );
      coupon.items = items.rows;
    }
    return coupons;
  }

  async createUserCoupon(userId: number, name: string, couponType: string = 'custom'): Promise<UserCoupon> {
    const result = await pool.query(
      'INSERT INTO user_coupons (user_id, name, coupon_type) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, couponType]
    );
    return { ...result.rows[0], items: [] };
  }

  async addCouponItem(item: Omit<UserCouponItem, 'id' | 'created_at'>): Promise<UserCouponItem> {
    const result = await pool.query(
      `INSERT INTO user_coupon_items (
        coupon_id, match_id, fixture_id, home_team, away_team, 
        home_logo, away_logo, league_name, match_date, match_time, bet_type, odds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        item.coupon_id, item.match_id, item.fixture_id, item.home_team, item.away_team,
        item.home_logo, item.away_logo, item.league_name, item.match_date, item.match_time,
        item.bet_type, item.odds
      ]
    );
    
    await this.updateCouponOdds(item.coupon_id);
    return result.rows[0];
  }

  async removeCouponItem(itemId: number, couponId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM user_coupon_items WHERE id = $1', [itemId]);
    await this.updateCouponOdds(couponId);
    return result.rowCount! > 0;
  }

  async updateCouponOdds(couponId: number): Promise<void> {
    const result = await pool.query(
      'SELECT COALESCE(EXP(SUM(LN(odds))), 1) as total_odds FROM user_coupon_items WHERE coupon_id = $1',
      [couponId]
    );
    const totalOdds = parseFloat(result.rows[0]?.total_odds || 1).toFixed(2);
    await pool.query('UPDATE user_coupons SET total_odds = $1 WHERE id = $2', [totalOdds, couponId]);
  }

  async deleteUserCoupon(couponId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM user_coupons WHERE id = $1', [couponId]);
    return result.rowCount! > 0;
  }

  async createAICoupon(userId: number, riskLevel: string): Promise<UserCoupon> {
    const today = new Date().toISOString().split('T')[0];
    const bestBets = await this.getBestBetsForDate(today);
    
    let filteredBets = bestBets;
    if (riskLevel === 'low') {
      filteredBets = bestBets.filter(b => b.risk_level === 'düşük').slice(0, 3);
    } else if (riskLevel === 'medium') {
      filteredBets = bestBets.filter(b => b.risk_level !== 'yüksek').slice(0, 4);
    } else {
      filteredBets = bestBets.slice(0, 5);
    }

    const couponName = riskLevel === 'low' ? 'Güvenli Kupon' : 
                       riskLevel === 'medium' ? 'Dengeli Kupon' : 'Yüksek Kazanç Kuponu';
    
    const coupon = await this.createUserCoupon(userId, couponName, 'ai-generated');
    
    for (const bet of filteredBets) {
      await this.addCouponItem({
        coupon_id: coupon.id,
        match_id: bet.match_id,
        fixture_id: bet.fixture_id,
        home_team: bet.home_team,
        away_team: bet.away_team,
        home_logo: bet.home_logo,
        away_logo: bet.away_logo,
        league_name: bet.league_name,
        match_date: bet.match_date,
        match_time: bet.match_time,
        bet_type: bet.bet_type,
        odds: 1.50,
        result: 'pending'
      });
    }

    return this.getUserCoupons(userId).then(coupons => coupons.find(c => c.id === coupon.id)!);
  }
}

export const storage = new PostgresStorage();
export { hashPassword };
