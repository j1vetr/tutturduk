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
}

export const storage = new PostgresStorage();
export { hashPassword };
