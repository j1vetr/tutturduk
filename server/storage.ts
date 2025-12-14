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
  league_id: string;
  prediction: string;
  odds: number;
  match_time: string;
  analysis: string | null;
  is_hero: boolean;
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
  
  // Invitation code methods
  getInvitationCode(code: string): Promise<InvitationCode | undefined>;
  getAllInvitationCodes(): Promise<InvitationCode[]>;
  createInvitationCode(code: string, type: string, maxUses: number): Promise<InvitationCode>;
  useInvitationCode(code: string): Promise<boolean>;
  deleteInvitationCode(id: number): Promise<boolean>;
  
  // Prediction methods
  getHeroPrediction(): Promise<Prediction | undefined>;
  getAllPredictions(): Promise<Prediction[]>;
  createPrediction(prediction: Omit<Prediction, 'id' | 'created_at'>): Promise<Prediction>;
  updateHeroPrediction(prediction: Omit<Prediction, 'id' | 'created_at'>): Promise<Prediction>;
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
    const result = await pool.query('SELECT * FROM predictions WHERE is_hero = TRUE ORDER BY created_at DESC LIMIT 1');
    return result.rows[0];
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const result = await pool.query('SELECT * FROM predictions ORDER BY created_at DESC');
    return result.rows;
  }

  async createPrediction(prediction: Omit<Prediction, 'id' | 'created_at'>): Promise<Prediction> {
    const result = await pool.query(
      `INSERT INTO predictions (home_team, away_team, league_id, prediction, odds, match_time, analysis, is_hero)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        prediction.home_team,
        prediction.away_team,
        prediction.league_id,
        prediction.prediction,
        prediction.odds,
        prediction.match_time,
        prediction.analysis,
        prediction.is_hero
      ]
    );
    return result.rows[0];
  }

  async updateHeroPrediction(prediction: Omit<Prediction, 'id' | 'created_at'>): Promise<Prediction> {
    // First, set all predictions as not hero
    await pool.query('UPDATE predictions SET is_hero = FALSE');
    
    // Then create new hero prediction
    return this.createPrediction({ ...prediction, is_hero: true });
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) return null;
    
    return user;
  }
}

export const storage = new PostgresStorage();
export { hashPassword };
