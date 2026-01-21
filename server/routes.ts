import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';
import { apiFootball, SUPPORTED_LEAGUES, CURRENT_SEASON } from './apiFootball';
import { generateMatchAnalysis, generateAndSavePredictions } from './openai-analysis';
import { filterMatches, hasValidStatistics, getStatisticsScore } from './matchFilter';
import { checkAndUpdateMatchStatuses, reEvaluateAllFinishedMatches } from './matchStatusService';

function parseApiFootballOdds(oddsData: any[]): any {
  const parsed: any = {};
  
  if (!oddsData || !Array.isArray(oddsData) || oddsData.length === 0) {
    return parsed;
  }
  
  const bookmaker = oddsData[0]?.bookmakers?.[0];
  if (!bookmaker?.bets) return parsed;
  
  for (const bet of bookmaker.bets) {
    const betName = bet.name?.toLowerCase() || '';
    const values = bet.values || [];
    
    if (betName.includes('match winner') || betName === 'home/away' || betName === '1x2') {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        if (v.value === 'Home' || v.value === '1') parsed.home = val;
        if (v.value === 'Draw' || v.value === 'X') parsed.draw = val;
        if (v.value === 'Away' || v.value === '2') parsed.away = val;
      }
    }
    
    if (betName.includes('goals over/under') || betName.includes('over/under')) {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        const line = v.value || '';
        if (line.includes('Over 1.5')) parsed.over15 = val;
        if (line.includes('Under 1.5')) parsed.under15 = val;
        if (line.includes('Over 2.5')) parsed.over25 = val;
        if (line.includes('Under 2.5')) parsed.under25 = val;
        if (line.includes('Over 3.5')) parsed.over35 = val;
        if (line.includes('Under 3.5')) parsed.under35 = val;
        if (line.includes('Over 4.5')) parsed.over45 = val;
        if (line.includes('Under 4.5')) parsed.under45 = val;
      }
    }
    
    if (betName.includes('both teams') || betName.includes('btts')) {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        if (v.value === 'Yes') parsed.bttsYes = val;
        if (v.value === 'No') parsed.bttsNo = val;
      }
    }
    
    if (betName.includes('double chance')) {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        if (v.value === 'Home/Draw' || v.value === '1X') parsed.doubleChanceHomeOrDraw = val;
        if (v.value === 'Away/Draw' || v.value === 'X2') parsed.doubleChanceAwayOrDraw = val;
        if (v.value === 'Home/Away' || v.value === '12') parsed.doubleChanceHomeOrAway = val;
      }
    }
    
    // First Half Result (İlk Yarı Sonucu)
    if (betName.includes('first half') || betName.includes('1st half') || betName === 'ht result') {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        if (v.value === 'Home' || v.value === '1') parsed.halfTimeHome = val;
        if (v.value === 'Draw' || v.value === 'X') parsed.halfTimeDraw = val;
        if (v.value === 'Away' || v.value === '2') parsed.halfTimeAway = val;
      }
    }
    
    // First Half Over/Under (İlk Yarı Alt/Üst)
    if (betName.includes('first half over') || betName.includes('1st half goals') || betName.includes('ht over')) {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        const line = v.value || '';
        if (line.includes('Over 0.5')) parsed.htOver05 = val;
        if (line.includes('Under 0.5')) parsed.htUnder05 = val;
        if (line.includes('Over 1.5')) parsed.htOver15 = val;
        if (line.includes('Under 1.5')) parsed.htUnder15 = val;
      }
    }
    
    // Draw No Bet
    if (betName.includes('draw no bet')) {
      for (const v of values) {
        const val = parseFloat(v.odd) || 0;
        if (v.value === 'Home' || v.value === '1') parsed.dnbHome = val;
        if (v.value === 'Away' || v.value === '2') parsed.dnbAway = val;
      }
    }
  }
  
  return parsed;
}

import { autoPublishTomorrowMatchesValidated, autoPublishTodayMatchesValidated, prefetchValidatedFixtures } from './autoPublishService';
import { generatePredictionsForAllPendingMatches } from './openai-analysis';

const PgSession = connectPgSimple(session);

async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttlMinutes: number = 60): Promise<T> {
  const cached = await pool.query(
    'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
    [key]
  );
  
  if (cached.rows.length > 0) {
    return JSON.parse(cached.rows[0].value) as T;
  }
  
  const data = await fetchFn();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  
  await pool.query(
    `INSERT INTO api_cache (key, value, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3`,
    [key, JSON.stringify(data), expiresAt]
  );
  
  return data;
}

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session setup
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: 'sessions',
      }),
      secret: process.env.SESSION_SECRET || 'tutturduk-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    })
  );

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, referralCode } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir' });
      }

      if (!referralCode) {
        return res.status(400).json({ message: 'Davet kodu gereklidir' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
      }

      // Verify invitation code
      const invCode = await storage.getInvitationCode(referralCode);
      if (!invCode || !invCode.is_active || invCode.current_uses >= invCode.max_uses) {
        return res.status(400).json({ message: 'Geçersiz veya kullanılmış davet kodu' });
      }

      // Create user
      const user = await storage.createUser({
        username,
        password,
        referral_code: referralCode,
        role: 'user',
      });

      // Use the invitation code
      await storage.useInvitationCode(referralCode);

      // Log in the user
      req.session.userId = user.id;
      await req.session.save();

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'Kayıt sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir' });
      }

      const user = await (storage as any).verifyPassword(username, password);
      if (!user) {
        return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
      }

      req.session.userId = user.id;
      await req.session.save();

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Giriş sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Çıkış sırasında hata oluştu' });
      }
      res.json({ message: 'Başarıyla çıkış yapıldı' });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  });

  // User routes (admin only)
  app.get('/api/admin/users', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Invitation code routes (admin only)
  app.get('/api/admin/invitations', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const codes = await storage.getAllInvitationCodes();
    res.json(codes);
  });

  app.post('/api/admin/invitations', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const { code, type, maxUses } = req.body;
    if (!code || !type || !maxUses) {
      return res.status(400).json({ message: 'Kod, tip ve maksimum kullanım sayısı gereklidir' });
    }

    const invCode = await storage.createInvitationCode(code, type, maxUses);
    res.json(invCode);
  });

  app.delete('/api/admin/invitations/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const success = await storage.deleteInvitationCode(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ message: 'Davet kodu bulunamadı' });
    }

    res.json({ message: 'Başarıyla silindi' });
  });

  // Prediction routes
  app.get('/api/predictions/hero', async (req, res) => {
    const prediction = await storage.getHeroPrediction();
    res.json(prediction || null);
  });

  app.get('/api/predictions', async (req, res) => {
    const predictions = await storage.getAllPredictions();
    res.json(predictions);
  });

  app.get('/api/predictions/pending', async (req, res) => {
    const predictions = await storage.getPendingPredictions();
    res.json(predictions);
  });

  app.get('/api/predictions/won', async (req, res) => {
    const predictions = await storage.getWonPredictions();
    res.json(predictions);
  });

  app.get('/api/predictions/lost', async (req, res) => {
    const predictions = await storage.getLostPredictions();
    res.json(predictions);
  });

  app.get('/api/predictions/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Geçersiz ID' });
    }
    const prediction = await storage.getPredictionById(id);
    if (!prediction) {
      return res.status(404).json({ message: 'Tahmin bulunamadı' });
    }
    res.json(prediction);
  });

  // Admin prediction routes
  app.post('/api/admin/predictions', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const { home_team, away_team, league_id, prediction, odds, match_time, match_date, analysis, is_hero } = req.body;
    
    // If this will be the hero, first unset current hero
    if (is_hero) {
      await pool.query('UPDATE predictions SET is_hero = FALSE');
    }

    const newPrediction = await storage.createPrediction({
      home_team,
      away_team,
      league_id,
      prediction,
      odds: parseFloat(odds),
      match_time,
      match_date: match_date || null,
      analysis,
      is_hero: is_hero || false,
      result: 'pending'
    });

    res.json(newPrediction);
  });

  app.put('/api/admin/predictions/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const id = parseInt(req.params.id);
    const { home_team, away_team, league_id, prediction, odds, match_time, match_date, analysis, is_hero, result } = req.body;
    
    // If this will be the hero, first unset current hero
    if (is_hero) {
      await pool.query('UPDATE predictions SET is_hero = FALSE WHERE id != $1', [id]);
    }

    const updated = await storage.updatePrediction(id, {
      home_team,
      away_team,
      league_id,
      prediction,
      odds: odds ? parseFloat(odds) : undefined,
      match_time,
      match_date,
      analysis,
      is_hero,
      result
    });

    if (!updated) {
      return res.status(404).json({ message: 'Tahmin bulunamadı' });
    }

    res.json(updated);
  });

  app.delete('/api/admin/predictions/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const success = await storage.deletePrediction(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ message: 'Tahmin bulunamadı' });
    }

    res.json({ message: 'Başarıyla silindi' });
  });

  app.post('/api/admin/predictions/hero', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const { home_team, away_team, league_id, prediction, odds, match_time, match_date, analysis } = req.body;
    
    const heroPrediction = await storage.updateHeroPrediction({
      home_team,
      away_team,
      league_id,
      prediction,
      odds: parseFloat(odds),
      match_time,
      match_date: match_date || null,
      analysis,
      is_hero: true,
    });

    res.json(heroPrediction);
  });

  // Coupon routes (Admin)
  app.get('/api/admin/coupons', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const coupons = await storage.getAllCoupons();
    res.json(coupons);
  });

  app.get('/api/admin/coupons/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const coupon = await storage.getCouponWithPredictions(parseInt(req.params.id));
    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }
    res.json(coupon);
  });

  app.post('/api/admin/coupons', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ message: 'Kupon adı ve tarihi gereklidir' });
    }
    const coupon = await storage.createCoupon(name, date);
    res.json(coupon);
  });

  app.post('/api/admin/coupons/:id/predictions', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const { predictionId } = req.body;
    await storage.addPredictionToCoupon(parseInt(req.params.id), predictionId);
    const coupon = await storage.getCouponWithPredictions(parseInt(req.params.id));
    res.json(coupon);
  });

  app.delete('/api/admin/coupons/:id/predictions/:predictionId', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    await storage.removePredictionFromCoupon(parseInt(req.params.id), parseInt(req.params.predictionId));
    const coupon = await storage.getCouponWithPredictions(parseInt(req.params.id));
    res.json(coupon);
  });

  // Add best bet to coupon
  app.post('/api/admin/coupons/:id/best-bets', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const { bestBetId } = req.body;
    await storage.addBestBetToCoupon(parseInt(req.params.id), bestBetId);
    const coupon = await storage.getCouponWithPredictions(parseInt(req.params.id));
    res.json(coupon);
  });

  // Remove best bet from coupon
  app.delete('/api/admin/coupons/:id/best-bets/:bestBetId', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    await storage.removeBestBetFromCoupon(parseInt(req.params.id), parseInt(req.params.bestBetId));
    const coupon = await storage.getCouponWithPredictions(parseInt(req.params.id));
    res.json(coupon);
  });

  // Get all best bets for coupon selection
  app.get('/api/admin/best-bets/all', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    try {
      const result = await pool.query(
        `SELECT * FROM best_bets WHERE result = 'pending' ORDER BY match_date ASC, match_time ASC`
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get best bets stats for admin dashboard
  app.get('/api/admin/best-bets/stats', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE result = 'won') as won_count,
          COUNT(*) FILTER (WHERE result = 'lost') as lost_count,
          COUNT(*) FILTER (WHERE result = 'pending') as pending_count,
          COUNT(*) as total_count
        FROM best_bets
      `);
      
      const wonBets = await pool.query(
        `SELECT bb.*, pm.home_team, pm.away_team, pm.home_logo, pm.away_logo, pm.league_name
         FROM best_bets bb
         LEFT JOIN published_matches pm ON bb.fixture_id = pm.fixture_id
         WHERE bb.result = 'won'
         ORDER BY bb.created_at DESC
         LIMIT 10`
      );
      
      const s = stats.rows[0];
      const evaluated = parseInt(s.won_count) + parseInt(s.lost_count);
      
      res.json({
        wonCount: parseInt(s.won_count) || 0,
        lostCount: parseInt(s.lost_count) || 0,
        pendingCount: parseInt(s.pending_count) || 0,
        totalCount: parseInt(s.total_count) || 0,
        successRate: evaluated > 0 ? Math.round((parseInt(s.won_count) / evaluated) * 100) : 0,
        wonBets: wonBets.rows
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: manually update best bet result (won/lost)
  app.put('/api/admin/best-bets/:id/result', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    try {
      const { result } = req.body;
      if (!['won', 'lost', 'pending'].includes(result)) {
        return res.status(400).json({ message: 'Geçersiz sonuç değeri' });
      }
      
      await pool.query(
        'UPDATE best_bets SET result = $1 WHERE id = $2',
        [result, parseInt(req.params.id)]
      );
      
      console.log(`[Admin] Best bet ${req.params.id} manually set to: ${result}`);
      res.json({ success: true, message: `Tahmin ${result === 'won' ? 'kazandı' : result === 'lost' ? 'kaybetti' : 'bekliyor'} olarak işaretlendi` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/admin/coupons/:id/result', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const { result } = req.body;
    const coupon = await storage.updateCouponResult(parseInt(req.params.id), result);
    res.json(coupon);
  });

  app.delete('/api/admin/coupons/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    const success = await storage.deleteCoupon(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }
    res.json({ message: 'Kupon silindi' });
  });

  // Public coupon routes
  app.get('/api/coupons', async (req, res) => {
    const coupons = await storage.getAllCoupons();
    const couponsWithPredictions = await Promise.all(
      coupons.slice(0, 3).map(async (coupon) => {
        const couponWithPreds = await storage.getCouponWithPredictions(coupon.id);
        return couponWithPreds || coupon;
      })
    );
    res.json(couponsWithPredictions);
  });

  app.get('/api/coupons/date/:date', async (req, res) => {
    const coupons = await storage.getCouponsByDate(req.params.date);
    res.json(coupons);
  });

  app.get('/api/coupons/:id', async (req, res) => {
    const coupon = await storage.getCouponWithPredictions(parseInt(req.params.id));
    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }
    res.json(coupon);
  });

  // Predictions by date
  app.get('/api/predictions/date/:date', async (req, res) => {
    const predictions = await storage.getPredictionsByDate(req.params.date);
    res.json(predictions);
  });

  // API-Football routes
  app.get('/api/football/leagues', async (req, res) => {
    try {
      res.json(SUPPORTED_LEAGUES);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/fixtures', async (req, res) => {
    try {
      const { league, date } = req.query;
      const leagueId = league ? parseInt(league as string) : undefined;
      
      // Bugün ve yarın tarihleri
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const cacheKey = `fixtures_${leagueId || 'all'}_${todayStr}`;
      
      const fixtures = await getCachedData(cacheKey, async () => {
        if (leagueId) {
          // Belirli lig için bugün ve yarının maçları
          const [todayFixtures, tomorrowFixtures] = await Promise.all([
            apiFootball.getFixtures({ league: leagueId, date: todayStr }),
            apiFootball.getFixtures({ league: leagueId, date: tomorrowStr })
          ]);
          return [...todayFixtures, ...tomorrowFixtures];
        } else {
          // Tüm ligler için bugün ve yarının TÜM maçları
          // API'den tarih bazlı sorgu - lig kısıtlaması YOK
          console.log(`[Fixtures] ${todayStr} ve ${tomorrowStr} için tüm maçlar çekiliyor...`);
          
          const [todayFixtures, tomorrowFixtures] = await Promise.all([
            apiFootball.getFixtures({ date: todayStr }),
            apiFootball.getFixtures({ date: tomorrowStr })
          ]);
          
          const allFixtures = [...todayFixtures, ...tomorrowFixtures];
          console.log(`[Fixtures] Bugün: ${todayFixtures.length}, Yarın: ${tomorrowFixtures.length}, Toplam: ${allFixtures.length} maç`);
          
          // Filter out U23, Women's, Reserve leagues
          const filteredFixtures = filterMatches(allFixtures);
          
          return filteredFixtures.sort((a, b) => 
            new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
          );
        }
      }, 300);

      const formatted = fixtures.map((f: any) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        timestamp: f.fixture.timestamp,
        status: f.fixture.status,
        homeTeam: {
          id: f.teams.home.id,
          name: f.teams.home.name,
          logo: f.teams.home.logo,
        },
        awayTeam: {
          id: f.teams.away.id,
          name: f.teams.away.name,
          logo: f.teams.away.logo,
        },
        league: {
          id: f.league.id,
          name: f.league.name,
          logo: f.league.logo,
          country: f.league.country,
          round: f.league.round,
        },
        goals: f.goals,
        localDate: new Date(f.fixture.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
        localTime: new Date(f.fixture.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
      }));

      res.json(formatted);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Validated fixtures - only returns matches with stats, odds, and H2H
  app.get('/api/football/fixtures-validated', async (req, res) => {
    try {
      const dateParam = req.query.date as string | undefined;
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // If date parameter provided, only fetch that specific date
      const fetchDates = dateParam ? [dateParam] : [todayStr, tomorrowStr];
      const cacheKey = dateParam 
        ? `fixtures_validated_${dateParam}` 
        : `fixtures_validated_${todayStr}`;
      
      // Check cache first (60 min TTL)
      const cached = await pool.query(
        'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
        [cacheKey]
      );
      
      if (cached.rows.length > 0) {
        console.log('[ValidatedFixtures] Returning cached data');
        return res.json(JSON.parse(cached.rows[0].value));
      }
      
      console.log(`[ValidatedFixtures] Fetching fixtures for ${fetchDates.join(', ')}...`);
      
      const fixturePromises = fetchDates.map(date => apiFootball.getFixtures({ date }));
      const fixtureResults = await Promise.all(fixturePromises);
      
      const allFixtures = fixtureResults.flat();
      console.log(`[ValidatedFixtures] Total: ${allFixtures.length} matches`);
      
      // Filter out U23, Women's, Reserve
      const filteredFixtures = filterMatches(allFixtures);
      console.log(`[ValidatedFixtures] After basic filter: ${filteredFixtures.length} matches`);
      
      // Filter out matches that have already started
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const upcomingFixtures = filteredFixtures.filter((f: any) => {
        const matchTimestamp = f.fixture?.timestamp || 0;
        return matchTimestamp > nowTimestamp;
      });
      
      // Sort by match time to ensure we get matches from all hours
      upcomingFixtures.sort((a: any, b: any) => {
        const timeA = a.fixture?.timestamp || 0;
        const timeB = b.fixture?.timestamp || 0;
        return timeA - timeB;
      });
      
      console.log(`[ValidatedFixtures] Upcoming only: ${upcomingFixtures.length} matches (sorted by time)`);
      
      // Validate each fixture for stats/odds (with delays)
      const validatedFixtures: any[] = [];
      const batchSize = 5; // 5 matches per batch
      const delayBetweenBatches = 7000; // 7 seconds between batches to avoid rate limits
      
      // Check ALL upcoming fixtures, no limit - so we get matches from all hours
      for (let i = 0; i < upcomingFixtures.length; i += batchSize) {
        const batch = upcomingFixtures.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(async (fixture: any) => {
            try {
              // Check predictions/stats first
              const prediction = await apiFootball.getPrediction(fixture.fixture.id);
              
              if (!prediction) return null;
              
              // Check if has valid comparison data
              const comparison = prediction.comparison;
              const hasComparison = comparison && 
                (comparison.form?.home || comparison.form?.away || 
                 comparison.att?.home || comparison.def?.home);
              
              // Check if has H2H
              const h2h = prediction.h2h;
              const hasH2H = h2h && Array.isArray(h2h) && h2h.length >= 1;
              
              // Check if has team form data
              const teams = prediction.teams;
              const hasTeamData = teams?.home?.league?.form || teams?.away?.league?.form;
              
              // Must have at least 2 of 3 stat criteria
              const statCriteria = [hasComparison, hasH2H, hasTeamData].filter(Boolean).length;
              if (statCriteria < 2) return null;
              
              // NOW also check odds (same as publish endpoint)
              let hasOdds = false;
              try {
                const oddsData = await apiFootball.getOdds(fixture.fixture.id);
                const parsedOdds = parseApiFootballOdds(oddsData);
                const hasBasicOdds = parsedOdds.home && parsedOdds.draw && parsedOdds.away;
                const hasOverUnderOdds = parsedOdds.over25 || parsedOdds.over15 || parsedOdds.over35;
                const hasBttsOdds = parsedOdds.bttsYes && parsedOdds.bttsNo;
                hasOdds = hasBasicOdds && (hasOverUnderOdds || hasBttsOdds);
              } catch (e) {
                hasOdds = false;
              }
              
              // Must have both stats AND odds
              if (!hasOdds) return null;
              
              return {
                fixture,
                hasComparison,
                hasH2H,
                hasTeamData,
                hasOdds
              };
            } catch (e) {
              return null;
            }
          })
        );
        
        const validResults = results.filter(r => r !== null);
        validatedFixtures.push(...validResults.map(r => r!.fixture));
        
        console.log(`[ValidatedFixtures] Batch ${Math.floor(i/batchSize) + 1}: ${validResults.length}/${batch.length} valid`);
        
        // Delay between batches
        if (i + batchSize < upcomingFixtures.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      console.log(`[ValidatedFixtures] Final: ${validatedFixtures.length} validated matches`);
      
      const formatted = validatedFixtures.map((f: any) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        timestamp: f.fixture.timestamp,
        status: f.fixture.status,
        homeTeam: {
          id: f.teams.home.id,
          name: f.teams.home.name,
          logo: f.teams.home.logo,
        },
        awayTeam: {
          id: f.teams.away.id,
          name: f.teams.away.name,
          logo: f.teams.away.logo,
        },
        league: {
          id: f.league.id,
          name: f.league.name,
          logo: f.league.logo,
          country: f.league.country,
          round: f.league.round,
        },
        goals: f.goals,
        localDate: new Date(f.fixture.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
        localTime: new Date(f.fixture.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
        validated: true
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Wrap in { matches } for frontend compatibility
      const responseData = { matches: formatted, total: formatted.length };
      
      // Cache for 6 hours (so admin doesn't reload on every visit)
      await pool.query(
        `INSERT INTO api_cache (key, value, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '6 hours')
         ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '6 hours'`,
        [cacheKey, JSON.stringify(responseData)]
      );
      
      res.json(responseData);
    } catch (error: any) {
      console.error('[ValidatedFixtures] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/fixtures/:id', async (req, res) => {
    try {
      const fixtureId = parseInt(req.params.id);
      const cacheKey = `fixture_${fixtureId}`;
      
      const fixture = await getCachedData(cacheKey, async () => {
        return apiFootball.getFixtureById(fixtureId);
      }, 30);

      if (!fixture) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }

      res.json({
        id: fixture.fixture.id,
        date: fixture.fixture.date,
        timestamp: fixture.fixture.timestamp,
        status: fixture.fixture.status,
        homeTeam: {
          id: fixture.teams.home.id,
          name: fixture.teams.home.name,
          logo: fixture.teams.home.logo,
        },
        awayTeam: {
          id: fixture.teams.away.id,
          name: fixture.teams.away.name,
          logo: fixture.teams.away.logo,
        },
        league: {
          id: fixture.league.id,
          name: fixture.league.name,
          logo: fixture.league.logo,
          country: fixture.league.country,
          round: fixture.league.round,
        },
        goals: fixture.goals,
        score: fixture.score,
      });
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/standings/:leagueId', async (req, res) => {
    try {
      const leagueId = parseInt(req.params.leagueId);
      const cacheKey = `standings_${leagueId}_${CURRENT_SEASON}`;
      
      const standings = await getCachedData(cacheKey, async () => {
        return apiFootball.getStandings(leagueId, CURRENT_SEASON);
      }, 360);

      res.json(standings);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/predictions/:fixtureId', async (req, res) => {
    try {
      const fixtureId = parseInt(req.params.fixtureId);
      const cacheKey = `prediction_${fixtureId}`;
      
      const prediction = await getCachedData(cacheKey, async () => {
        return apiFootball.getPrediction(fixtureId);
      }, 120);

      if (!prediction) {
        return res.status(404).json({ message: 'Tahmin bulunamadı' });
      }

      res.json({
        winner: prediction.predictions.winner,
        advice: prediction.predictions.advice,
        percent: prediction.predictions.percent,
        underOver: prediction.predictions.under_over,
        goals: prediction.predictions.goals,
        comparison: prediction.comparison,
        teams: {
          home: {
            id: prediction.teams.home.id,
            name: prediction.teams.home.name,
            logo: prediction.teams.home.logo,
            form: prediction.teams.home.last_5?.form,
          },
          away: {
            id: prediction.teams.away.id,
            name: prediction.teams.away.name,
            logo: prediction.teams.away.logo,
            form: prediction.teams.away.last_5?.form,
          }
        },
        h2h: prediction.h2h?.slice(0, 5).map((h: any) => ({
          date: h.fixture?.date,
          homeTeam: h.teams?.home?.name,
          awayTeam: h.teams?.away?.name,
          homeGoals: h.goals?.home,
          awayGoals: h.goals?.away,
        }))
      });
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/h2h/:team1Id/:team2Id', async (req, res) => {
    try {
      const team1Id = parseInt(req.params.team1Id);
      const team2Id = parseInt(req.params.team2Id);
      const cacheKey = `h2h_${team1Id}_${team2Id}`;
      
      const h2h = await getCachedData(cacheKey, async () => {
        return apiFootball.getHeadToHead(team1Id, team2Id, 10);
      }, 120);

      const formatted = h2h.map((match: any) => ({
        date: match.fixture?.date,
        homeTeam: {
          name: match.teams?.home?.name,
          logo: match.teams?.home?.logo,
          winner: match.teams?.home?.winner,
        },
        awayTeam: {
          name: match.teams?.away?.name,
          logo: match.teams?.away?.logo,
          winner: match.teams?.away?.winner,
        },
        score: {
          home: match.goals?.home,
          away: match.goals?.away,
        },
        league: match.league?.name,
      }));

      res.json(formatted);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bitmiş maçları getir (dün ve bugün)
  app.get('/api/football/finished', async (req, res) => {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const cacheKey = `finished_${todayStr}`;
      
      const fixtures = await getCachedData(cacheKey, async () => {
        console.log(`[Finished] ${yesterdayStr} ve ${todayStr} için bitmiş maçlar çekiliyor...`);
        
        const [yesterdayFixtures, todayFixtures] = await Promise.all([
          apiFootball.getFixtures({ date: yesterdayStr, status: 'FT' }),
          apiFootball.getFixtures({ date: todayStr, status: 'FT' })
        ]);
        
        const allFinished = [...todayFixtures, ...yesterdayFixtures];
        console.log(`[Finished] Toplam ${allFinished.length} bitmiş maç bulundu`);
        
        // Filter out U23, Women's, Reserve leagues
        const filteredFinished = filterMatches(allFinished);
        
        return filteredFinished.sort((a, b) => 
          new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
        );
      }, 120);
      
      const formatted = fixtures.map((f: any) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        localDate: new Date(f.fixture.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
        localTime: new Date(f.fixture.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
        homeTeam: {
          id: f.teams.home.id,
          name: f.teams.home.name,
          logo: f.teams.home.logo,
        },
        awayTeam: {
          id: f.teams.away.id,
          name: f.teams.away.name,
          logo: f.teams.away.logo,
        },
        league: {
          id: f.league.id,
          name: f.league.name,
          logo: f.league.logo,
          country: f.league.country,
        },
        score: {
          home: f.goals.home,
          away: f.goals.away,
        },
        status: f.fixture.status.short,
      }));
      
      res.json(formatted);
    } catch (error: any) {
      console.error('Finished matches error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bugün ve yarının TÜM maçlarını tahminleriyle birlikte getir
  app.get('/api/football/all-predictions', async (req, res) => {
    try {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const cacheKey = `all_predictions_${todayStr}`;
      
      const result = await getCachedData(cacheKey, async () => {
        console.log(`[All Predictions] ${todayStr} ve ${tomorrowStr} için tüm tahminler çekiliyor...`);
        
        // 1. Bugün ve yarının tüm maçlarını çek
        const [todayFixtures, tomorrowFixtures] = await Promise.all([
          apiFootball.getFixtures({ date: todayStr }),
          apiFootball.getFixtures({ date: tomorrowStr })
        ]);
        
        const allFixtures = [...todayFixtures, ...tomorrowFixtures];
        console.log(`[All Predictions] Bugün: ${todayFixtures.length}, Yarın: ${tomorrowFixtures.length}, Toplam: ${allFixtures.length} maç`);
        
        // Filter out matches that have already started (timestamp in the past)
        const nowTimestamp = Math.floor(Date.now() / 1000);
        const upcomingFixtures = allFixtures.filter((f: any) => {
          const matchTimestamp = f.fixture?.timestamp || 0;
          return matchTimestamp > nowTimestamp;
        });
        console.log(`[All Predictions] Başlamamış maçlar: ${upcomingFixtures.length} (${allFixtures.length - upcomingFixtures.length} geçmiş maç filtrelendi)`);
        
        // Filter out U23, Women's, Reserve leagues BEFORE fetching predictions (saves API calls)
        const filteredFixtures = filterMatches(upcomingFixtures);
        console.log(`[All Predictions] Filtreleme sonrası: ${filteredFixtures.length} maç`);
        
        // 2. Her maç için tahmin çek (paralel, 10'lu gruplar halinde)
        const matchesWithPredictions: any[] = [];
        const batchSize = 10;
        
        for (let i = 0; i < filteredFixtures.length; i += batchSize) {
          const batch = filteredFixtures.slice(i, i + batchSize);
          const predictions = await Promise.all(
            batch.map(async (fixture: any) => {
              try {
                const prediction = await apiFootball.getPrediction(fixture.fixture.id);
                return { fixture, prediction };
              } catch (e) {
                return { fixture, prediction: null };
              }
            })
          );
          matchesWithPredictions.push(...predictions);
        }
        
        console.log(`[All Predictions] ${matchesWithPredictions.length} maç için tahmin alındı`);
        
        return matchesWithPredictions.map(({ fixture, prediction }) => ({
          id: fixture.fixture.id,
          date: fixture.fixture.date,
          localDate: new Date(fixture.fixture.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
          localTime: new Date(fixture.fixture.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
          homeTeam: {
            id: fixture.teams.home.id,
            name: fixture.teams.home.name,
            logo: fixture.teams.home.logo,
          },
          awayTeam: {
            id: fixture.teams.away.id,
            name: fixture.teams.away.name,
            logo: fixture.teams.away.logo,
          },
          league: {
            id: fixture.league.id,
            name: fixture.league.name,
            logo: fixture.league.logo,
            country: fixture.league.country,
          },
          prediction: prediction ? {
            winner: prediction.predictions?.winner,
            advice: prediction.predictions?.advice,
            percent: prediction.predictions?.percent,
            goals: prediction.predictions?.goals,
            comparison: prediction.comparison,
            homeForm: prediction.teams?.home?.last_5?.form,
            awayForm: prediction.teams?.away?.last_5?.form,
          } : null
        }));
      }, 300); // 5 dakika cache
      
      // Filter out past matches from cached data (in case cache is stale)
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const filteredResult = result.filter((m: any) => {
        const matchTimestamp = new Date(m.date).getTime() / 1000;
        return matchTimestamp > nowTimestamp;
      });
      
      res.json(filteredResult);
    } catch (error: any) {
      console.error('All predictions error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Published matches endpoints (public)
  app.get('/api/matches', async (req, res) => {
    try {
      const matches = await storage.getPublishedMatches();
      
      // Enrich matches with best_bets predictions
      const enrichedMatches = await Promise.all(matches.map(async (match) => {
        const bestBetsResult = await pool.query(
          `SELECT bet_type, confidence, risk_level, result FROM best_bets WHERE fixture_id = $1 ORDER BY confidence DESC LIMIT 1`,
          [match.fixture_id]
        );
        
        const bestBet = bestBetsResult.rows[0];
        return {
          ...match,
          best_bet: bestBet ? {
            bet_type: bestBet.bet_type,
            confidence: bestBet.confidence,
            risk_level: bestBet.risk_level,
            result: bestBet.result
          } : null
        };
      }));
      
      res.json(enrichedMatches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/ai-badges', async (req, res) => {
    try {
      const matches = await storage.getPublishedMatches();
      const badges: Record<number, { bestBet?: string; riskLevel?: string; over25?: boolean; btts?: boolean; winner?: string }> = {};
      
      for (const match of matches) {
        const cacheKey = `ai_analysis_v8_${match.fixture_id}`;
        const cachedResult = await pool.query(
          'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
          [cacheKey]
        );
        if (cachedResult.rows.length > 0) {
          try {
            const analysis = JSON.parse(cachedResult.rows[0].value);
            badges[match.id] = {
              bestBet: analysis.bestBet,
              riskLevel: analysis.riskLevel,
              over25: analysis.over25?.prediction,
              btts: analysis.btts?.prediction,
              winner: analysis.winner?.prediction,
            };
          } catch (e) {}
        }
      }
      
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/featured', async (req, res) => {
    try {
      const match = await storage.getFeaturedMatch();
      res.json(match || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const match = await storage.getPublishedMatchById(id);
      if (!match) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }
      res.json(match);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/:id/lineups', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const match = await storage.getPublishedMatchById(id);
      if (!match) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }
      const lineups = await apiFootball.getLineups(match.fixture_id);
      res.json(lineups || []);
    } catch (error: any) {
      console.error('Lineups fetch error:', error);
      res.json([]);
    }
  });

  app.get('/api/matches/:id/odds', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const match = await storage.getPublishedMatchById(id);
      if (!match) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }
      
      // Fetch odds from API-Football
      const oddsData = await apiFootball.getOdds(match.fixture_id);
      const parsed = parseApiFootballOdds(oddsData);
      
      const hasOdds = parsed.home || parsed.over25;
      
      res.json({
        found: hasOdds,
        source: 'api-football',
        odds: hasOdds ? {
          msOdds: { home: parsed.home, draw: parsed.draw, away: parsed.away },
          overUnder: { 
            over15: parsed.over15, under15: parsed.under15,
            over25: parsed.over25, under25: parsed.under25,
            over35: parsed.over35, under35: parsed.under35,
            over45: parsed.over45, under45: parsed.under45
          },
          btts: { yes: parsed.bttsYes, no: parsed.bttsNo },
          doubleChance: { 
            homeOrDraw: parsed.doubleChanceHomeOrDraw, 
            awayOrDraw: parsed.doubleChanceAwayOrDraw, 
            homeOrAway: parsed.doubleChanceHomeOrAway 
          }
        } : null
      });
    } catch (error: any) {
      console.error('Odds fetch error:', error);
      res.json({ found: false, source: 'api-football', odds: null });
    }
  });

  app.get('/api/matches/:id/ai-analysis', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const match = await storage.getPublishedMatchById(id);
      if (!match) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }

      const cacheKey = `ai_analysis_v8_${match.fixture_id}`;
      
      // Helper function to reconstruct analysis from best_bets
      const reconstructFromBestBets = async () => {
        const existingBets = await pool.query(
          'SELECT * FROM best_bets WHERE fixture_id = $1 ORDER BY risk_level',
          [match.fixture_id]
        );
        
        if (existingBets.rows.length >= 1) {
          console.log(`[AI Analysis] Reconstructing from ${existingBets.rows.length} existing best_bets for fixture ${match.fixture_id}`);
          return {
            matchContext: { 
              type: 'league', 
              significance: 'normal',
              homeLeagueLevel: 1,
              awayLeagueLevel: 1,
              isCupUpset: false,
              isDerby: false
            },
            analysis: existingBets.rows[0]?.reasoning || 'Analiz mevcut.',
            predictions: existingBets.rows.map((bet: any) => ({
              type: bet.risk_level === 'düşük' ? 'expected' : bet.risk_level === 'orta' ? 'medium' : 'risky',
              bet: bet.bet_type,
              odds: bet.odds ? `${bet.odds.toFixed(2)}` : '~1.50',
              confidence: bet.confidence || 65,
              reasoning: bet.reasoning || '',
              consistentScores: bet.bet_description ? bet.bet_description.split(', ') : ['1-1', '2-1']
            })),
            avoidBets: [],
            expertTip: existingBets.rows[0]?.reasoning || 'İstatistiklere dayalı tahminler.',
            expectedGoalRange: '2-3 gol',
            expertCommentary: {
              headline: `${match.home_team} vs ${match.away_team} Analizi`,
              keyInsight: existingBets.rows[0]?.reasoning || '',
              riskAssessment: 'Mevcut tahminler otomatik yayından alınmıştır.'
            }
          };
        }
        return null;
      };

      // 1. First check cache
      const cachedResult = await pool.query(
        'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
        [cacheKey]
      );
      
      if (cachedResult.rows.length > 0) {
        console.log(`[AI Analysis] Returning cached analysis for fixture ${match.fixture_id}`);
        return res.json(JSON.parse(cachedResult.rows[0].value));
      }

      // 2. Check if best_bets exist (from auto-publish or previous generation)
      const reconstructed = await reconstructFromBestBets();
      if (reconstructed) {
        // Also cache this reconstructed analysis for future requests
        try {
          await pool.query(
            `INSERT INTO api_cache (key, value, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '24 hours')
             ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '24 hours'`,
            [cacheKey, JSON.stringify(reconstructed)]
          );
        } catch (e) { /* ignore cache errors */ }
        return res.json(reconstructed);
      }
      
      // 3. No cache, no best_bets - generate new analysis immediately
      console.log(`[AI Analysis] No cache or best_bets found for fixture ${match.fixture_id}, generating new analysis...`);

      // No cache, no existing bets - generate new analysis
      const analysis = await getCachedData(cacheKey, async () => {
        const homeTeam = (match as any).api_teams?.home;
        const awayTeam = (match as any).api_teams?.away;
        const h2h = (match as any).api_h2h || [];
        const apiPred = (match as any).api_predictions;
        const comparison = (match as any).api_comparison;
        
        let oddsData: any = null;
        let homeTeamStats: any = null;
        let awayTeamStats: any = null;
        
        try {
          const homeTeamId = homeTeam?.id;
          const awayTeamId = awayTeam?.id;
          
          const [oddsRes, homeStatsRes, awayStatsRes] = await Promise.all([
            apiFootball.getOdds(match.fixture_id).catch(() => []),
            (homeTeamId && match.league_id) ? apiFootball.getTeamStatistics(homeTeamId, match.league_id, CURRENT_SEASON).catch(() => null) : Promise.resolve(null),
            (awayTeamId && match.league_id) ? apiFootball.getTeamStatistics(awayTeamId, match.league_id, CURRENT_SEASON).catch(() => null) : Promise.resolve(null),
          ]);
          
          const homeStats = homeStatsRes as any;
          const awayStats = awayStatsRes as any;
          
          if (oddsRes && (oddsRes as any)[0]?.bookmakers?.[0]?.bets) {
            const bets = (oddsRes as any)[0].bookmakers[0].bets;
            const matchWinner = bets.find((b: any) => b.name === 'Match Winner');
            const overUnder = bets.find((b: any) => b.name === 'Goals Over/Under');
            
            if (matchWinner?.values) {
              oddsData = {
                home: parseFloat(matchWinner.values.find((v: any) => v.value === 'Home')?.odd || 0),
                draw: parseFloat(matchWinner.values.find((v: any) => v.value === 'Draw')?.odd || 0),
                away: parseFloat(matchWinner.values.find((v: any) => v.value === 'Away')?.odd || 0),
              };
            }
            if (overUnder?.values) {
              oddsData = {
                ...oddsData,
                over25: parseFloat(overUnder.values.find((v: any) => v.value === 'Over 2.5')?.odd || 0),
                under25: parseFloat(overUnder.values.find((v: any) => v.value === 'Under 2.5')?.odd || 0),
              };
            }
          }
          
          if (homeStats) {
            homeTeamStats = {
              cleanSheets: homeStats.clean_sheet?.total || 0,
              failedToScore: homeStats.failed_to_score?.total || 0,
              avgGoalsHome: homeStats.goals?.for?.average?.home ? parseFloat(homeStats.goals.for.average.home) : undefined,
              avgGoalsAway: homeStats.goals?.for?.average?.away ? parseFloat(homeStats.goals.for.average.away) : undefined,
              avgGoalsConcededHome: homeStats.goals?.against?.average?.home ? parseFloat(homeStats.goals.against.average.home) : undefined,
              avgGoalsConcededAway: homeStats.goals?.against?.average?.away ? parseFloat(homeStats.goals.against.average.away) : undefined,
              biggestWinStreak: homeStats.biggest?.streak?.wins || 0,
              biggestLoseStreak: homeStats.biggest?.streak?.loses || 0,
              penaltyScored: homeStats.penalty?.scored?.total || 0,
              penaltyMissed: homeStats.penalty?.missed?.total || 0,
              goalsMinutes: homeStats.goals?.for?.minute ? {
                '0-15': homeStats.goals.for.minute['0-15']?.total || 0,
                '16-30': homeStats.goals.for.minute['16-30']?.total || 0,
                '31-45': homeStats.goals.for.minute['31-45']?.total || 0,
                '46-60': homeStats.goals.for.minute['46-60']?.total || 0,
                '61-75': homeStats.goals.for.minute['61-75']?.total || 0,
                '76-90': homeStats.goals.for.minute['76-90']?.total || 0,
              } : undefined,
            };
          }
          
          if (awayStats) {
            awayTeamStats = {
              cleanSheets: awayStats.clean_sheet?.total || 0,
              failedToScore: awayStats.failed_to_score?.total || 0,
              avgGoalsHome: awayStats.goals?.for?.average?.home ? parseFloat(awayStats.goals.for.average.home) : undefined,
              avgGoalsAway: awayStats.goals?.for?.average?.away ? parseFloat(awayStats.goals.for.average.away) : undefined,
              avgGoalsConcededHome: awayStats.goals?.against?.average?.home ? parseFloat(awayStats.goals.against.average.home) : undefined,
              avgGoalsConcededAway: awayStats.goals?.against?.average?.away ? parseFloat(awayStats.goals.against.average.away) : undefined,
              biggestWinStreak: awayStats.biggest?.streak?.wins || 0,
              biggestLoseStreak: awayStats.biggest?.streak?.loses || 0,
              penaltyScored: awayStats.penalty?.scored?.total || 0,
              penaltyMissed: awayStats.penalty?.missed?.total || 0,
              goalsMinutes: awayStats.goals?.for?.minute ? {
                '0-15': awayStats.goals.for.minute['0-15']?.total || 0,
                '16-30': awayStats.goals.for.minute['16-30']?.total || 0,
                '31-45': awayStats.goals.for.minute['31-45']?.total || 0,
                '46-60': awayStats.goals.for.minute['46-60']?.total || 0,
                '61-75': awayStats.goals.for.minute['61-75']?.total || 0,
                '76-90': awayStats.goals.for.minute['76-90']?.total || 0,
              } : undefined,
            };
          }
        } catch (e) {
          console.log('Error fetching additional stats:', e);
        }
        
        return generateMatchAnalysis({
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          league: match.league_name || '',
          homeForm: homeTeam?.league?.form,
          awayForm: awayTeam?.league?.form,
          homeGoalsFor: homeTeam?.league?.goals?.for?.total,
          homeGoalsAgainst: homeTeam?.league?.goals?.against?.total,
          awayGoalsFor: awayTeam?.league?.goals?.for?.total,
          awayGoalsAgainst: awayTeam?.league?.goals?.against?.total,
          homeWins: homeTeam?.league?.fixtures?.wins?.total,
          homeDraws: homeTeam?.league?.fixtures?.draws?.total,
          homeLosses: homeTeam?.league?.fixtures?.loses?.total,
          awayWins: awayTeam?.league?.fixtures?.wins?.total,
          awayDraws: awayTeam?.league?.fixtures?.draws?.total,
          awayLosses: awayTeam?.league?.fixtures?.loses?.total,
          h2hResults: h2h.map((m: any) => ({ homeGoals: m.homeGoals, awayGoals: m.awayGoals })),
          comparison: comparison,
          homeTeamStats,
          awayTeamStats,
          odds: oddsData,
        });
      }, 1440);

      // Save predictions to best_bets for tracking and evaluation
      if (analysis && analysis.predictions && Array.isArray(analysis.predictions)) {
        const matchDate = match.match_date || new Date().toISOString().split('T')[0];
        
        // First delete existing predictions for this fixture/date
        await pool.query(
          `DELETE FROM best_bets WHERE fixture_id = $1 AND date_for = $2`,
          [match.fixture_id, matchDate]
        );
        
        for (const pred of analysis.predictions) {
          try {
            const riskLevel = pred.type === 'expected' ? 'düşük' : pred.type === 'medium' ? 'orta' : 'yüksek';
            
            await pool.query(
              `INSERT INTO best_bets 
               (match_id, fixture_id, home_team, away_team, home_logo, away_logo, league_name, league_logo,
                match_date, match_time, bet_type, bet_description, confidence, risk_level, reasoning, date_for)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
              [
                match.id,
                match.fixture_id,
                match.home_team,
                match.away_team,
                match.home_logo,
                match.away_logo,
                match.league_name,
                match.league_logo,
                match.match_date,
                match.match_time,
                pred.bet,
                pred.consistentScores?.join(', ') || '',
                pred.confidence,
                riskLevel,
                pred.reasoning,
                matchDate
              ]
            );
          } catch (e) {
            console.log('[BestBets] Error inserting prediction:', e);
          }
        }
        console.log(`[BestBets] Saved ${analysis.predictions.length} predictions for fixture ${match.fixture_id}`);
      }

      res.json(analysis);
    } catch (error: any) {
      console.error('AI Analysis error:', error);
      res.status(500).json({ message: 'AI analizi oluşturulamadı', error: error.message });
    }
  });

  // User Coupons endpoints
  app.get('/api/user/coupons', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    try {
      const coupons = await storage.getUserCoupons(req.session.userId);
      res.json(coupons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/user/coupons', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    try {
      const { name } = req.body;
      const coupon = await storage.createUserCoupon(req.session.userId, name || 'Yeni Kupon');
      res.json(coupon);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/user/coupons/ai', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    try {
      const { riskLevel } = req.body;
      const coupon = await storage.createAICoupon(req.session.userId, riskLevel || 'medium');
      res.json(coupon);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/user/coupons/:couponId/items', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    try {
      const couponId = parseInt(req.params.couponId);
      const item = await storage.addCouponItem({
        coupon_id: couponId,
        ...req.body
      });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete('/api/user/coupons/:couponId/items/:itemId', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    try {
      const couponId = parseInt(req.params.couponId);
      const itemId = parseInt(req.params.itemId);
      await storage.removeCouponItem(itemId, couponId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete('/api/user/coupons/:couponId', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    try {
      const couponId = parseInt(req.params.couponId);
      await storage.deleteUserCoupon(couponId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Best Bets endpoints
  app.get('/api/best-bets', async (req, res) => {
    try {
      const bets = await storage.getTodaysBestBets();
      res.json(bets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/best-bets/:date', async (req, res) => {
    try {
      const bets = await storage.getBestBetsForDate(req.params.date);
      res.json(bets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: generate best bets for today
  app.post('/api/admin/best-bets/generate', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const matches = await storage.getPublishedMatches();
      
      const todayMatches = matches.filter(m => m.match_date === today);
      
      if (todayMatches.length === 0) {
        return res.status(400).json({ message: 'Bugün için yayınlanmış maç yok' });
      }

      const bestBets = [];
      
      for (const match of todayMatches.slice(0, 10)) {
        try {
          const cacheKey = `ai_analysis_${match.fixture_id}`;
          const analysis = await getCachedData(cacheKey, async () => {
            const homeTeam = match.api_teams?.home;
            const awayTeam = match.api_teams?.away;
            const h2h = match.api_h2h || [];
            
            return generateMatchAnalysis({
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              league: match.league_name || '',
              homeForm: homeTeam?.league?.form,
              awayForm: awayTeam?.league?.form,
              homeGoalsFor: homeTeam?.league?.goals?.for?.total,
              homeGoalsAgainst: homeTeam?.league?.goals?.against?.total,
              awayGoalsFor: awayTeam?.league?.goals?.for?.total,
              awayGoalsAgainst: awayTeam?.league?.goals?.against?.total,
              homeWins: homeTeam?.league?.fixtures?.wins?.total,
              homeDraws: homeTeam?.league?.fixtures?.draws?.total,
              homeLosses: homeTeam?.league?.fixtures?.loses?.total,
              awayWins: awayTeam?.league?.fixtures?.wins?.total,
              awayDraws: awayTeam?.league?.fixtures?.draws?.total,
              awayLosses: awayTeam?.league?.fixtures?.loses?.total,
              h2hResults: h2h.map((m: any) => ({ homeGoals: m.homeGoals, awayGoals: m.awayGoals })),
              comparison: (match as any).api_comparison,
            });
          }, 1440);

          // Use new predictions array from AIAnalysisResult
          if (analysis.predictions && analysis.predictions.length > 0) {
            // Get the best prediction (expected type has highest confidence)
            const expectedPred = analysis.predictions.find(p => p.type === 'expected') || analysis.predictions[0];
            
            const riskLevel = expectedPred.type === 'expected' ? 'düşük' : 
                             expectedPred.type === 'medium' ? 'orta' : 'yüksek';
            
            const bet = await storage.createBestBet({
              match_id: match.id,
              fixture_id: match.fixture_id,
              home_team: match.home_team,
              away_team: match.away_team,
              home_logo: match.home_logo,
              away_logo: match.away_logo,
              league_name: match.league_name,
              league_logo: match.league_logo,
              match_date: match.match_date!,
              match_time: match.match_time!,
              bet_type: expectedPred.bet,
              bet_description: expectedPred.consistentScores?.join(', ') || '',
              confidence: expectedPred.confidence,
              risk_level: riskLevel,
              reasoning: expectedPred.reasoning,
              date_for: today
            });
            
            bestBets.push(bet);
          }
        } catch (err) {
          console.error(`Error generating best bet for match ${match.id}:`, err);
        }
      }

      bestBets.sort((a, b) => b.confidence - a.confidence);
      
      res.json({ 
        message: `${bestBets.length} günün en iyi bahsi oluşturuldu`,
        bets: bestBets.slice(0, 5)
      });
    } catch (error: any) {
      console.error('Generate best bets error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get cached AI results for matches
  app.post('/api/admin/matches/ai-cache', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    
    const { fixtureIds } = req.body;
    if (!fixtureIds || !Array.isArray(fixtureIds) || fixtureIds.length === 0) {
      return res.json({ results: [] });
    }
    
    const results: any[] = [];
    
    for (const fixtureId of fixtureIds) {
      const aiCacheKey = `ai_analysis_v8_${fixtureId}`;
      const cachedResult = await pool.query(
        'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
        [aiCacheKey]
      );
      
      if (cachedResult.rows.length > 0) {
        const cached = JSON.parse(cachedResult.rows[0].value);
        results.push({
          fixtureId,
          karar: cached.karar || (cached.predictions?.length > 0 ? 'bahis' : 'pas'),
          prediction: cached.predictions?.[0] || null,
          reason: cached.karar === 'pas' ? (cached.analysis || 'Değer bulunamadı') : null
        });
      }
    }
    
    res.json({ results });
  });

  // Admin: AI pre-check for multiple matches
  app.post('/api/admin/matches/ai-check', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    
    const { fixtureIds } = req.body;
    if (!fixtureIds || !Array.isArray(fixtureIds) || fixtureIds.length === 0) {
      return res.status(400).json({ message: 'Fixture ID listesi gerekli' });
    }
    
    console.log(`[AICheck] Starting AI check for ${fixtureIds.length} matches`);
    const results: any[] = [];
    
    for (const fixtureId of fixtureIds) {
      try {
        // Check cache first
        const aiCacheKey = `ai_analysis_v8_${fixtureId}`;
        const cachedResult = await pool.query(
          'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
          [aiCacheKey]
        );
        
        if (cachedResult.rows.length > 0) {
          const cached = JSON.parse(cachedResult.rows[0].value);
          results.push({
            fixtureId,
            karar: cached.karar || (cached.predictions?.length > 0 ? 'bahis' : 'pas'),
            prediction: cached.predictions?.[0] || null,
            reason: cached.karar === 'pas' ? (cached.analysis || 'Değer bulunamadı') : null,
            cached: true
          });
          continue;
        }
        
        // Fetch fixture data
        const fixture = await apiFootball.getFixtureById(fixtureId);
        if (!fixture) {
          results.push({ fixtureId, karar: 'pas', reason: 'Maç bilgisi alınamadı', cached: false });
          continue;
        }
        
        // Add delay to avoid rate limiting (max 30 requests/min = 1 per 2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Fetch prediction and odds data
        const [apiPrediction, oddsData] = await Promise.all([
          apiFootball.getPrediction(fixtureId),
          apiFootball.getOdds(fixtureId)
        ]);
        
        const teams = apiPrediction?.teams;
        const h2h = (apiPrediction as any)?.h2h;
        const homeTeamName = fixture.teams?.home?.name || 'Ev Sahibi';
        const awayTeamName = fixture.teams?.away?.name || 'Deplasman';
        const leagueName = fixture.league?.name || 'Bilinmeyen Lig';
        
        // Parse odds
        const parsedOdds = parseApiFootballOdds(oddsData);
        
        // Prepare match data for AI - use last_5 from prediction data
        const matchData = {
          homeTeam: homeTeamName,
          awayTeam: awayTeamName,
          league: leagueName,
          matchDate: fixture.fixture?.date,
          homeForm: teams?.home?.last_5?.form,
          awayForm: teams?.away?.last_5?.form,
          h2hResults: h2h?.slice(0, 5).map((h: any) => ({
            homeGoals: h.goals?.home || 0,
            awayGoals: h.goals?.away || 0
          })),
          homeGoalsFor: teams?.home?.last_5?.goals?.for?.total,
          homeGoalsAgainst: teams?.home?.last_5?.goals?.against?.total,
          awayGoalsFor: teams?.away?.last_5?.goals?.for?.total,
          awayGoalsAgainst: teams?.away?.last_5?.goals?.against?.total,
          odds: parsedOdds,
        };
        
        // Run AI analysis
        const aiAnalysis = await generateMatchAnalysis(matchData);
        
        // Cache the result
        try {
          await pool.query(
            `INSERT INTO api_cache (key, value, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '24 hours')
             ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '24 hours'`,
            [aiCacheKey, JSON.stringify(aiAnalysis)]
          );
        } catch (e) { /* ignore cache errors */ }
        
        const karar = (!aiAnalysis || aiAnalysis.karar === 'pas' || !aiAnalysis.predictions?.length) ? 'pas' : 'bahis';
        
        results.push({
          fixtureId,
          karar,
          prediction: aiAnalysis?.predictions?.[0] || null,
          reason: karar === 'pas' ? (aiAnalysis?.analysis || 'AI değer bulamadı') : null,
          cached: false
        });
        
        console.log(`[AICheck] ${homeTeamName} vs ${awayTeamName}: ${karar}`);
        
      } catch (error: any) {
        console.error(`[AICheck] Error for fixture ${fixtureId}:`, error.message);
        results.push({
          fixtureId,
          karar: 'pas',
          reason: 'Analiz hatası: ' + error.message,
          cached: false
        });
      }
    }
    
    const bahisCount = results.filter(r => r.karar === 'bahis').length;
    const pasCount = results.filter(r => r.karar === 'pas').length;
    console.log(`[AICheck] Completed: ${bahisCount} bahis, ${pasCount} pas`);
    
    res.json({ results, summary: { total: results.length, bahis: bahisCount, pas: pasCount } });
  });

  // Admin: publish a match
  app.post('/api/admin/matches/publish', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const { fixtureId, isFeatured } = req.body;
      
      // Check if already published
      const existing = await storage.getPublishedMatchByFixtureId(fixtureId);
      if (existing) {
        return res.status(400).json({ message: 'Bu maç zaten yayınlanmış' });
      }

      // STEP 1: Check AI cache FIRST - if exists with "bahis", skip all validations
      const aiCacheKey = `ai_analysis_v8_${fixtureId}`;
      let aiAnalysis: any = null;
      let hasCachedAI = false;
      
      const cachedAI = await pool.query(
        'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
        [aiCacheKey]
      );
      
      if (cachedAI.rows.length > 0) {
        aiAnalysis = JSON.parse(cachedAI.rows[0].value);
        hasCachedAI = true;
        console.log(`[ManualPublish] Found cached AI analysis for fixture ${fixtureId}`);
        
        // If cached analysis says "pas", reject immediately
        if (aiAnalysis.karar === 'pas' || !aiAnalysis.predictions || aiAnalysis.predictions.length === 0) {
          return res.status(400).json({ 
            message: 'Bu maç için AI "pas" kararı vermiş.',
            reason: aiAnalysis?.analysis || 'AI değer bulunamadığı için bahis önermiyor.',
            karar: 'pas'
          });
        }
      }

      // Get fixture details (needed for publishing)
      const cacheKey = `fixture_${fixtureId}`;
      const fixture = await getCachedData(cacheKey, async () => {
        return apiFootball.getFixtureById(fixtureId);
      }, 60);

      if (!fixture) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }

      const homeTeamName = fixture.teams?.home?.name || '';
      const awayTeamName = fixture.teams?.away?.name || '';
      const homeLogo = fixture.teams?.home?.logo || '';
      const awayLogo = fixture.teams?.away?.logo || '';
      const leagueName = fixture.league?.name || '';
      const leagueLogo = fixture.league?.logo || '';
      const leagueId = fixture.league?.id;
      
      const matchDate = new Date(fixture.fixture?.date);
      const isoDate = matchDate.toISOString().split('T')[0];
      const displayDate = matchDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' });
      const localTime = matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' });

      // If we have cached AI with "bahis", skip all validations and API calls
      let apiPrediction: any = null;
      let parsedOddsCheck: any = {};
      
      if (!hasCachedAI) {
        console.log(`[ManualPublish] No cached AI, running full validation for ${homeTeamName} vs ${awayTeamName}...`);
        
        // Get API prediction
        const predCacheKey = `predictions_${fixtureId}`;
        try {
          apiPrediction = await getCachedData(predCacheKey, async () => {
            return apiFootball.getPrediction(fixtureId);
          }, 120);
        } catch (e) {
          console.log('No prediction available for fixture', fixtureId);
        }

        // Check if match has valid statistics
        if (!hasValidStatistics(apiPrediction)) {
          const statsScore = getStatisticsScore(apiPrediction);
          console.log(`[Publish] Fixture ${fixtureId} has low statistics score: ${statsScore}`);
          if (statsScore < 30) {
            return res.status(400).json({ 
              message: 'Bu maç için yeterli istatistik verisi yok. Sadece istatistik verisi olan maçlar yayınlanabilir.',
              statsScore 
            });
          }
        }

        // Check if match has valid odds
        try {
          const oddsData = await apiFootball.getOdds(fixtureId);
          parsedOddsCheck = parseApiFootballOdds(oddsData);
        } catch (e) {
          console.log(`[Publish] No odds available for fixture ${fixtureId}`);
        }
        
        const hasBasicOdds = parsedOddsCheck.home && parsedOddsCheck.draw && parsedOddsCheck.away;
        const hasOverUnderOdds = parsedOddsCheck.over25 || parsedOddsCheck.over15 || parsedOddsCheck.over35;
        const hasBttsOdds = parsedOddsCheck.bttsYes && parsedOddsCheck.bttsNo;
        
        if (!hasBasicOdds || (!hasOverUnderOdds && !hasBttsOdds)) {
          return res.status(400).json({ 
            message: 'Bu maç için yeterli oran verisi yok. MS oranları ve Alt/Üst veya KG oranları gereklidir.',
            hasBasicOdds,
            hasOverUnderOdds,
            hasBttsOdds
          });
        }

        // Generate AI analysis
        console.log(`[ManualPublish] Generating AI analysis for ${homeTeamName} vs ${awayTeamName}...`);
        
        const teams = apiPrediction?.teams;
        const h2h = apiPrediction?.h2h || [];
        const comparison = apiPrediction?.comparison;
        
        const matchData = {
          homeTeam: homeTeamName,
          awayTeam: awayTeamName,
          league: leagueName,
          leagueId: leagueId,
          comparison: comparison || undefined,
          homeForm: teams?.home?.last_5?.form || teams?.home?.league?.form,
          awayForm: teams?.away?.last_5?.form || teams?.away?.league?.form,
          h2hResults: h2h?.slice(0, 5).map((h: any) => ({
            homeGoals: h.goals?.home || 0,
            awayGoals: h.goals?.away || 0
          })),
          homeGoalsFor: teams?.home?.last_5?.goals?.for?.total || teams?.home?.league?.goals?.for?.total,
          homeGoalsAgainst: teams?.home?.last_5?.goals?.against?.total || teams?.home?.league?.goals?.against?.total,
          awayGoalsFor: teams?.away?.last_5?.goals?.for?.total || teams?.away?.league?.goals?.for?.total,
          awayGoalsAgainst: teams?.away?.last_5?.goals?.against?.total || teams?.away?.league?.goals?.against?.total,
          odds: parsedOddsCheck,
        };
        
        aiAnalysis = await generateMatchAnalysis(matchData);
        
        // Cache the new analysis
        try {
          await pool.query(
            `INSERT INTO api_cache (key, value, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '24 hours')
             ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '24 hours'`,
            [aiCacheKey, JSON.stringify(aiAnalysis)]
          );
        } catch (e) { /* ignore cache errors */ }
      }
      
      // STEP 2: Check if AI has a valid prediction
      if (!aiAnalysis || aiAnalysis.karar === 'pas' || !aiAnalysis.predictions || aiAnalysis.predictions.length === 0) {
        console.log(`[ManualPublish] AI returned 'pas' for ${homeTeamName} vs ${awayTeamName} - NOT publishing`);
        return res.status(400).json({ 
          message: 'Bu maç için güvenilir bir tahmin bulunamadı. AI analizi "pas" kararı verdi.',
          reason: aiAnalysis?.analysis || 'AI değer bulunamadığı için bahis önermiyor.',
          karar: 'pas'
        });
      }
      
      console.log(`[ManualPublish] AI approved: ${aiAnalysis.predictions.map(p => p.bet).join(', ')}`);
      
      // STEP 3: Use transaction to publish match and save predictions atomically
      const client = await pool.connect();
      let published: any;
      
      try {
        await client.query('BEGIN');
        
        // Insert published match
        const publishResult = await client.query(
          `INSERT INTO published_matches 
           (fixture_id, home_team, away_team, home_logo, away_logo, league_id, league_name, league_logo,
            match_date, match_time, timestamp, api_advice, api_winner_name, api_winner_comment,
            api_percent_home, api_percent_draw, api_percent_away, api_under_over,
            api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams, status, is_featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           RETURNING *`,
          [
            fixtureId,
            homeTeamName,
            awayTeamName,
            homeLogo,
            awayLogo,
            leagueId,
            leagueName,
            leagueLogo,
            isoDate,
            localTime,
            fixture.fixture?.timestamp,
            apiPrediction?.predictions?.advice || null,
            apiPrediction?.predictions?.winner?.name || null,
            apiPrediction?.predictions?.winner?.comment || null,
            apiPrediction?.predictions?.percent?.home || null,
            apiPrediction?.predictions?.percent?.draw || null,
            apiPrediction?.predictions?.percent?.away || null,
            apiPrediction?.predictions?.under_over || null,
            apiPrediction?.predictions?.goals?.home || null,
            apiPrediction?.predictions?.goals?.away || null,
            apiPrediction?.comparison ? JSON.stringify(apiPrediction.comparison) : null,
            apiPrediction?.h2h ? JSON.stringify(apiPrediction.h2h.slice(0, 5).map((h: any) => ({
              date: h.fixture?.date,
              homeTeam: h.teams?.home?.name,
              awayTeam: h.teams?.away?.name,
              homeGoals: h.goals?.home,
              awayGoals: h.goals?.away,
            }))) : null,
            apiPrediction?.teams ? JSON.stringify(apiPrediction.teams) : null,
            'pending',
            isFeatured || false
          ]
        );
        published = publishResult.rows[0];
        
        // Save predictions to best_bets
        const riskToLevel: Record<string, string> = {
          'expected': 'düşük',
          'medium': 'orta',
          'risky': 'yüksek'
        };
        
        for (const pred of aiAnalysis.predictions) {
          await client.query(
            `INSERT INTO best_bets 
             (match_id, fixture_id, home_team, away_team, home_logo, away_logo, 
              league_name, league_logo, match_date, match_time,
              bet_type, bet_description, confidence, risk_level, reasoning, result, date_for)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', $16)
             ON CONFLICT (fixture_id, date_for) DO NOTHING`,
            [
              published.id,
              fixtureId,
              homeTeamName,
              awayTeamName,
              homeLogo,
              awayLogo,
              leagueName,
              leagueLogo,
              isoDate,
              localTime,
              pred.bet,
              '',
              pred.confidence,
              riskToLevel[pred.type] || 'orta',
              pred.reasoning,
              isoDate
            ]
          );
          console.log(`[ManualPublish] Saved prediction: ${pred.bet} for fixture ${fixtureId}`);
        }
        
        await client.query('COMMIT');
      } catch (txError: any) {
        await client.query('ROLLBACK');
        console.error(`[ManualPublish] Transaction failed:`, txError.message);
        throw new Error('Maç yayınlanırken hata oluştu: ' + txError.message);
      } finally {
        client.release();
      }
      
      // AI analysis is already cached in STEP 1
      
      console.log(`[ManualPublish] Successfully published ${homeTeamName} vs ${awayTeamName} with ${aiAnalysis.predictions.length} predictions`);
      res.json(published);
    } catch (error: any) {
      console.error('Publish match error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: unpublish a match
  app.delete('/api/admin/matches/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const id = parseInt(req.params.id);
      await storage.unpublishMatch(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: update match status
  app.patch('/api/admin/matches/:id', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const id = parseInt(req.params.id);
      const { status, result, is_featured, final_score_home, final_score_away } = req.body;
      
      // If setting as featured, unset others first
      if (is_featured) {
        await pool.query('UPDATE published_matches SET is_featured = FALSE');
      }
      
      const updated = await storage.updatePublishedMatch(id, {
        status,
        result,
        is_featured,
        final_score_home,
        final_score_away
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: get all published matches (separating active from finished)
  app.get('/api/admin/matches', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const includeFinished = req.query.includeFinished === 'true';
      
      let query = 'SELECT * FROM published_matches';
      if (!includeFinished) {
        // Only show active matches (not finished, or finished within last 2 hours for review)
        const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 60 * 60);
        query = `SELECT * FROM published_matches 
                 WHERE status != 'finished' 
                 OR (status = 'finished' AND timestamp > ${twoHoursAgo})`;
      }
      query += ' ORDER BY match_date ASC, match_time ASC';
      
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: manually trigger match status check
  app.post('/api/admin/check-match-status', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const result = await checkAndUpdateMatchStatuses();
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: re-evaluate all finished matches with pending predictions
  app.post('/api/admin/re-evaluate', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const result = await reEvaluateAllFinishedMatches();
      res.json({ 
        success: true, 
        message: `${result.evaluated} tahmin değerlendirildi`,
        ...result 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: auto-publish tomorrow's matches (validated, 70 total, 5 per hour)
  app.post('/api/admin/auto-publish', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const { totalLimit = 70, perHour = 5 } = req.body;
      const result = await autoPublishTomorrowMatchesValidated(totalLimit, perHour);
      res.json({ 
        success: true, 
        message: `${result.published} kaliteli maç yayınlandı (${result.date} için)`,
        ...result 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: auto-publish today's matches (validated, manual trigger, 70 total, 5 per hour)
  app.post('/api/admin/auto-publish-today', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const { totalLimit = 70, perHour = 5 } = req.body;
      const result = await autoPublishTodayMatchesValidated(totalLimit, perHour);
      res.json({ 
        success: true, 
        message: `${result.published} kaliteli maç yayınlandı (bugün ${result.date} için)`,
        ...result 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: manually trigger prefetch for tomorrow's matches
  app.post('/api/admin/prefetch-tomorrow', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const result = await prefetchValidatedFixtures(tomorrowStr);
      res.json({ 
        success: true, 
        message: `${result.length} kaliteli maç önbelleğe alındı (${tomorrowStr} için)`,
        count: result.length,
        date: tomorrowStr
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: clear API cache
  app.post('/api/admin/clear-cache', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const result = await pool.query('DELETE FROM api_cache');
      console.log(`[Admin] Cache cleared: ${result.rowCount} entries deleted`);
      res.json({ 
        success: true, 
        message: `Cache temizlendi (${result.rowCount} kayıt silindi)`,
        deleted: result.rowCount 
      });
    } catch (error: any) {
      console.error('[Admin] Cache clear error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: generate AI predictions for all pending matches without predictions
  app.post('/api/admin/generate-predictions', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      console.log('[Admin] Starting batch prediction generation...');
      const result = await generatePredictionsForAllPendingMatches();
      res.json({ 
        success: true, 
        message: `${result.success} maç için AI tahmin oluşturuldu (${result.failed} hata)`,
        ...result 
      });
    } catch (error: any) {
      console.error('[Admin] Batch prediction generation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: reset database (clear all match/prediction data)
  app.post('/api/admin/reset-database', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    
    const { confirmReset } = req.body;
    if (confirmReset !== 'SIFIRLA') {
      return res.status(400).json({ message: 'Onay kodu yanlış. "SIFIRLA" yazın.' });
    }
    
    try {
      // Delete in correct order to respect foreign keys
      // Start a transaction for safety
      await pool.query('BEGIN');
      
      try {
        // Coupon related tables
        await pool.query('DELETE FROM coupon_predictions');
        await pool.query('DELETE FROM user_coupon_items');
        await pool.query('DELETE FROM user_coupons');
        await pool.query('DELETE FROM coupons');
        
        // Predictions and bets
        await pool.query('DELETE FROM best_bets');
        await pool.query('DELETE FROM predictions');
        
        // Matches
        await pool.query('DELETE FROM published_matches');
        
        // Cache
        await pool.query('DELETE FROM api_cache');
        
        // Reset sequences for serial columns
        await pool.query("SELECT setval(pg_get_serial_sequence('published_matches', 'id'), 1, false)");
        await pool.query("SELECT setval(pg_get_serial_sequence('predictions', 'id'), 1, false)");
        await pool.query("SELECT setval(pg_get_serial_sequence('best_bets', 'id'), 1, false)");
        await pool.query("SELECT setval(pg_get_serial_sequence('coupons', 'id'), 1, false)");
        await pool.query("SELECT setval(pg_get_serial_sequence('coupon_predictions', 'id'), 1, false)");
        await pool.query("SELECT setval(pg_get_serial_sequence('user_coupons', 'id'), 1, false)");
        await pool.query("SELECT setval(pg_get_serial_sequence('user_coupon_items', 'id'), 1, false)");
        
        await pool.query('COMMIT');
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
      
      console.log('[Admin] Database reset completed by admin:', user.username);
      
      res.json({ 
        success: true, 
        message: 'Veritabanı sıfırlandı. Tüm maçlar, tahminler ve kuponlar silindi. Kullanıcılar korundu.' 
      });
    } catch (error: any) {
      console.error('[Admin] Database reset error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: clear finished matches history (Tuttu/Tutmadı geçmişi)
  app.post('/api/admin/clear-history', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    
    try {
      await pool.query('BEGIN');
      
      // Delete best bets for finished matches only
      const deletedBets = await pool.query(
        `DELETE FROM best_bets WHERE fixture_id IN (
          SELECT fixture_id FROM published_matches WHERE status = 'finished'
        )`
      );
      
      // Delete finished matches
      const deletedMatches = await pool.query(
        `DELETE FROM published_matches WHERE status = 'finished'`
      );
      
      await pool.query('COMMIT');
      
      console.log(`[Admin] History cleared: ${deletedMatches.rowCount} matches, ${deletedBets.rowCount} bets`);
      
      res.json({ 
        success: true, 
        message: `Geçmiş temizlendi: ${deletedMatches.rowCount} maç, ${deletedBets.rowCount} tahmin silindi`,
        deletedMatches: deletedMatches.rowCount,
        deletedBets: deletedBets.rowCount
      });
    } catch (error: any) {
      await pool.query('ROLLBACK');
      console.error('[Admin] Clear history error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Winners API - Get all completed predictions with results (with date filtering)
  app.get('/api/winners', async (req, res) => {
    try {
      const { date } = req.query;
      
      // Get available dates that have matches
      const availableDates = await pool.query(
        `SELECT DISTINCT match_date, COUNT(*) as match_count
         FROM published_matches 
         WHERE status = 'finished' OR match_date::date <= CURRENT_DATE
         GROUP BY match_date
         ORDER BY match_date DESC
         LIMIT 30`
      );

      // Filter by date if provided - use explicit date comparison
      const dateFilter = date ? `AND pm.match_date::date = $1::date` : '';
      const params = date ? [date] : [];

      // Get matches with predictions for the selected date (only finished matches with scores)
      const matchesQuery = `
        SELECT pm.id, pm.fixture_id, pm.home_team, pm.away_team, pm.home_logo, pm.away_logo,
               pm.league_name, pm.league_logo, pm.match_date, pm.match_time, pm.status,
               pm.final_score_home, pm.final_score_away,
         (SELECT json_agg(json_build_object(
           'id', bb.id,
           'bet_type', bb.bet_type,
           'risk_level', bb.risk_level,
           'result', bb.result,
           'confidence', bb.confidence,
           'reasoning', bb.reasoning
         ) ORDER BY 
           CASE bb.risk_level 
             WHEN 'düşük' THEN 1 
             WHEN 'orta' THEN 2 
             WHEN 'yüksek' THEN 3 
           END
         ) FROM best_bets bb WHERE bb.fixture_id = pm.fixture_id) as predictions
         FROM published_matches pm
         WHERE pm.status = 'finished' AND pm.final_score_home IS NOT NULL ${dateFilter}
         ORDER BY pm.match_time DESC
         LIMIT 100`;
      
      const matches = await pool.query(matchesQuery, params);

      // Get daily stats for selected date - MAIN BETS ONLY (risk_level = 'düşük')
      const dailyStatsQuery = date 
        ? `SELECT 
             COUNT(*) FILTER (WHERE result = 'won') as won,
             COUNT(*) FILTER (WHERE result = 'lost') as lost,
             COUNT(*) FILTER (WHERE result = 'pending') as pending,
             COUNT(*) as total
           FROM best_bets WHERE date_for::date = $1::date AND risk_level = 'düşük'`
        : `SELECT 
             COUNT(*) FILTER (WHERE result = 'won') as won,
             COUNT(*) FILTER (WHERE result = 'lost') as lost,
             COUNT(*) FILTER (WHERE result = 'pending') as pending,
             COUNT(*) as total
           FROM best_bets WHERE risk_level = 'düşük'`;
      
      const dailyStats = await pool.query(dailyStatsQuery, date ? [date] : []);
      const daily = dailyStats.rows[0];

      // Calculate overall stats - MAIN BETS ONLY (risk_level = 'düşük' = Ana Tahmin)
      const overallStats = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE result = 'won') as total_won,
          COUNT(*) FILTER (WHERE result = 'lost') as total_lost,
          COUNT(*) FILTER (WHERE result != 'pending') as total_evaluated,
          COUNT(*) as total
        FROM best_bets
        WHERE risk_level = 'düşük'
      `);
      
      const overall = overallStats.rows[0];
      const winRate = overall.total_evaluated > 0 
        ? Math.round((parseInt(overall.total_won) / parseInt(overall.total_evaluated)) * 100) 
        : 0;

      // Get won coupons
      const wonCoupons = await pool.query(
        `SELECT c.*, 
         (SELECT COUNT(*) FROM coupon_predictions WHERE coupon_id = c.id) as match_count
         FROM coupons c 
         WHERE c.result = 'won'
         ORDER BY c.created_at DESC
         LIMIT 10`
      );

      res.json({
        matches: matches.rows,
        availableDates: availableDates.rows,
        dailyStats: {
          won: parseInt(daily.won) || 0,
          lost: parseInt(daily.lost) || 0,
          pending: parseInt(daily.pending) || 0,
          total: parseInt(daily.total) || 0,
          winRate: daily.total > 0 && (parseInt(daily.won) + parseInt(daily.lost)) > 0
            ? Math.round((parseInt(daily.won) / (parseInt(daily.won) + parseInt(daily.lost))) * 100)
            : 0
        },
        overallStats: {
          totalWon: parseInt(overall.total_won) || 0,
          totalLost: parseInt(overall.total_lost) || 0,
          totalEvaluated: parseInt(overall.total_evaluated) || 0,
          winRate
        },
        wonCoupons: wonCoupons.rows
      });
    } catch (error: any) {
      console.error('Winners API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
