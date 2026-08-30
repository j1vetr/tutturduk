import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';
import { apiFootball, SUPPORTED_LEAGUES, CURRENT_SEASON } from './apiFootball';
import { filterMatches, hasValidStatistics, getStatisticsScore } from './matchFilter';

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


const PgSession = connectPgSimple(session);

async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttlMinutes: number = 60): Promise<T> {
  const cached = await pool.query(
    'SELECT data FROM api_cache WHERE key = $1 AND expires_at > NOW()',
    [key]
  );
  
  if (cached.rows.length > 0) {
    return (typeof cached.rows[0].data === 'string' ? JSON.parse(cached.rows[0].data) : cached.rows[0].data) as T;
  }
  
  const data = await fetchFn();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  
  await pool.query(
    `INSERT INTO api_cache (key, data, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = $3`,
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
    // Map database fields to frontend expected format
    const mappedCodes = codes.map(code => ({
      ...code,
      uses: code.current_uses,
      status: code.is_active ? 'active' : 'inactive'
    }));
    res.json(mappedCodes);
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
        localDate: new Date(f.fixture.date).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }),
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
      // Get today's date in Turkey timezone (Europe/Istanbul)
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
      
      // Only fetch the specified date or today (no tomorrow)
      const fetchDate = dateParam || todayStr;
      const cacheKey = `fixtures_validated_${fetchDate}`;
      
      // Check cache first (60 min TTL)
      const cached = await pool.query(
        'SELECT data FROM api_cache WHERE key = $1 AND expires_at > NOW()',
        [cacheKey]
      );
      
      if (cached.rows.length > 0) {
        console.log('[ValidatedFixtures] Returning cached data');
        return res.json((typeof cached.rows[0].data === 'string' ? JSON.parse(cached.rows[0].data) : cached.rows[0].data));
      }
      
      console.log(`[ValidatedFixtures] Fetching fixtures for ${fetchDate}...`);
      
      const allFixtures = await apiFootball.getFixtures({ date: fetchDate });
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
        localDate: new Date(f.fixture.date).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }),
        localTime: new Date(f.fixture.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
        validated: true
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Wrap in { matches } for frontend compatibility
      const responseData = { matches: formatted, total: formatted.length };
      
      // Cache for 6 hours (so admin doesn't reload on every visit)
      await pool.query(
        `INSERT INTO api_cache (key, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '6 hours')
         ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = NOW() + INTERVAL '6 hours'`,
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
        localDate: new Date(f.fixture.date).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }),
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
      
      // Enrich matches with best_bets predictions (all predictions with bet_category)
      const enrichedMatches = await Promise.all(matches.map(async (match) => {
        const bestBetsResult = await pool.query(
          `SELECT bet_type, confidence, risk_level, result, bet_category, odds 
           FROM best_bets WHERE fixture_id = $1 ORDER BY bet_category ASC, confidence DESC`,
          [match.fixture_id]
        );
        
        const predictions = bestBetsResult.rows.map(row => ({
          bet_type: row.bet_type,
          confidence: row.confidence,
          risk_level: row.risk_level,
          result: row.result,
          bet_category: row.bet_category || 'primary',
          odds: row.odds
        }));
        
        const primaryBet = predictions.find(p => p.bet_category === 'primary');
        
        return {
          ...match,
          predictions,
          best_bet: primaryBet || predictions[0] || null
        };
      }));
      
      res.json(enrichedMatches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Live scores endpoint - returns current scores for in-progress matches

  app.get('/api/matches/featured', async (req, res) => {
    try {
      const match = await storage.getFeaturedMatch();
      if (!match) {
        return res.json(null);
      }
      
      // Add predictions with bet_category
      const bestBetsResult = await pool.query(
        `SELECT bet_type, confidence, risk_level, result, bet_category, odds 
         FROM best_bets WHERE fixture_id = $1 ORDER BY bet_category ASC, confidence DESC`,
        [match.fixture_id]
      );
      
      const predictions = bestBetsResult.rows.map(row => ({
        bet_type: row.bet_type,
        confidence: row.confidence,
        bet_category: row.bet_category || 'primary'
      }));
      
      res.json({ ...match, predictions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // First try by fixture_id (for frontend navigation), then by internal id
      let match = await storage.getPublishedMatchByFixtureId(id);
      if (!match) {
        match = await storage.getPublishedMatchById(id);
      }
      if (!match) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }
      
      // Add predictions with bet_category
      const bestBetsResult = await pool.query(
        `SELECT bet_type, confidence, risk_level, result, bet_category, odds 
         FROM best_bets WHERE fixture_id = $1 ORDER BY bet_category ASC, confidence DESC`,
        [match.fixture_id]
      );
      
      const predictions = bestBetsResult.rows.map(row => ({
        bet_type: row.bet_type,
        confidence: row.confidence,
        risk_level: row.risk_level,
        result: row.result,
        bet_category: row.bet_category || 'primary',
        odds: row.odds
      }));
      
      res.json({ ...match, predictions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/:id/lineups', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let match = await storage.getPublishedMatchByFixtureId(id);
      if (!match) match = await storage.getPublishedMatchById(id);
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
      let match = await storage.getPublishedMatchByFixtureId(id);
      if (!match) match = await storage.getPublishedMatchById(id);
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

  // Best bets statistics (must be before :date route)
  app.get('/api/best-bets/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE result = 'won' AND bet_category = 'primary') as won,
          COUNT(*) FILTER (WHERE result = 'lost' AND bet_category = 'primary') as lost,
          COUNT(*) FILTER (WHERE result = 'pending' AND bet_category = 'primary') as pending,
          COUNT(*) FILTER (WHERE bet_category = 'primary') as total
        FROM best_bets
      `);
      const row = result.rows[0];
      const won = parseInt(row.won) || 0;
      const lost = parseInt(row.lost) || 0;
      const total = won + lost;
      const successRate = total > 0 ? Math.round((won / total) * 100) : 0;
      
      res.json({
        won,
        lost,
        pending: parseInt(row.pending) || 0,
        total: parseInt(row.total) || 0,
        successRate
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/featured-bet', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await pool.query(
        `SELECT bb.*, pm.home_logo, pm.away_logo, pm.league_name, pm.league_logo
         FROM best_bets bb
         LEFT JOIN published_matches pm ON bb.fixture_id = pm.fixture_id
         WHERE bb.date_for = $1 AND bb.bet_category = 'primary' AND bb.result = 'pending'
         ORDER BY bb.confidence DESC
         LIMIT 5`,
        [today]
      );
      if (result.rows.length === 0) {
        return res.json(null);
      }
      const randomIndex = Math.floor(Math.random() * result.rows.length);
      res.json(result.rows[randomIndex]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/daily-coupon', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const couponResult = await pool.query(
        'SELECT * FROM coupons WHERE coupon_date = $1 ORDER BY created_at DESC LIMIT 1',
        [today]
      );
      if (couponResult.rows.length === 0) {
        return res.json(null);
      }
      const coupon = couponResult.rows[0];
      const predsResult = await pool.query(
        `SELECT bb.id, bb.home_team, bb.away_team, bb.home_logo, bb.away_logo,
                bb.league_name, bb.match_date, bb.match_time,
                bb.bet_type, bb.confidence, bb.odds, bb.result, bb.risk_level
         FROM best_bets bb
         INNER JOIN coupon_predictions cp ON bb.id = cp.best_bet_id
         WHERE cp.coupon_id = $1
         ORDER BY bb.match_time ASC`,
        [coupon.id]
      );
      coupon.predictions = predsResult.rows;
      res.json(coupon);
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
      const { fixtureId, isFeatured, manualPrediction } = req.body;

      // manualPrediction: { bet_type, odds, description }
      if (!manualPrediction || !manualPrediction.bet_type || !manualPrediction.odds) {
        return res.status(400).json({ message: 'Tahmin ve oran girilmesi zorunludur.' });
      }

      // Check if already published
      const existing = await storage.getPublishedMatchByFixtureId(fixtureId);
      if (existing) {
        return res.status(400).json({ message: 'Bu maç zaten yayınlanmış' });
      }

      // Get fixture details
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
      const isoDate = matchDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
      const localTime = matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' });

      // Use transaction to publish match and save prediction atomically
      const client = await pool.connect();
      let published: any;

      try {
        await client.query('BEGIN');

        const publishResult = await client.query(
          `INSERT INTO published_matches 
           (fixture_id, home_team, away_team, home_logo, away_logo, league_id, league_name, league_logo,
            match_date, match_time, timestamp, api_advice, api_winner_name, api_winner_comment,
            api_percent_home, api_percent_draw, api_percent_away, api_under_over,
            api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams, status, is_featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           RETURNING *`,
          [
            fixtureId, homeTeamName, awayTeamName, homeLogo, awayLogo,
            leagueId, leagueName, leagueLogo, isoDate, localTime,
            fixture.fixture?.timestamp,
            manualPrediction.description || null,
            null, null, null, null, null, null, null, null, null, null, null,
            'pending', isFeatured || false
          ]
        );
        published = publishResult.rows[0];

        // Save manual prediction to best_bets
        await client.query(
          `INSERT INTO best_bets 
           (match_id, fixture_id, home_team, away_team, home_logo, away_logo,
            league_name, league_logo, match_date, match_time,
            bet_type, bet_category, odds, confidence, risk_level, reasoning, result, date_for)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', $17)
           ON CONFLICT (fixture_id, date_for, bet_category) DO UPDATE SET
             bet_type = EXCLUDED.bet_type,
             odds = EXCLUDED.odds,
             reasoning = EXCLUDED.reasoning`,
          [
            published.id, fixtureId, homeTeamName, awayTeamName, homeLogo, awayLogo,
            leagueName, leagueLogo, isoDate, localTime,
            manualPrediction.bet_type,
            'primary',
            parseFloat(manualPrediction.odds),
            70,
            'orta',
            manualPrediction.description || null,
            isoDate
          ]
        );

        await client.query('COMMIT');
        console.log(`[ManualPublish] Published ${homeTeamName} vs ${awayTeamName}: ${manualPrediction.bet_type} @${manualPrediction.odds}`);
      } catch (txError: any) {
        await client.query('ROLLBACK');
        console.error(`[ManualPublish] Transaction failed:`, txError.message);
        throw new Error('Maç yayınlanırken hata oluştu: ' + txError.message);
      } finally {
        client.release();
      }

      res.json(published);
    } catch (error: any) {
      console.error('Publish match error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: publish a manually-entered match (no API-Football required)
  app.post('/api/admin/matches/publish-manual', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Oturum açılmamış' });
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Yetkiniz yok' });

    try {
      const {
        homeTeam, awayTeam, homeLogo, awayLogo,
        leagueName, leagueLogo, leagueId,
        matchDate, matchTime,
        bet_type, odds, description
      } = req.body;

      if (!homeTeam || !awayTeam || !matchDate || !matchTime || !bet_type || !odds) {
        return res.status(400).json({ message: 'Ev sahibi, deplasman, tarih, saat, tahmin ve oran zorunludur.' });
      }

      // Generate a unique fixture_id for manual entries (large range that won't conflict with real IDs)
      const fixtureId = Math.floor(Date.now() / 1000) + 2000000000;

      const existing = await pool.query('SELECT id FROM published_matches WHERE fixture_id = $1', [fixtureId]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Bu maç zaten yayınlanmış' });
      }

      const client = await pool.connect();
      let published: any;

      try {
        await client.query('BEGIN');

        const publishResult = await client.query(
          `INSERT INTO published_matches
           (fixture_id, home_team, away_team, home_logo, away_logo, league_id, league_name, league_logo,
            match_date, match_time, timestamp, api_advice, api_winner_name, api_winner_comment,
            api_percent_home, api_percent_draw, api_percent_away, api_under_over,
            api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams, status, is_featured)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
           RETURNING *`,
          [
            fixtureId, homeTeam, awayTeam, homeLogo || null, awayLogo || null,
            leagueId || null, leagueName || null, leagueLogo || null,
            matchDate, matchTime, null,
            description || null, null, null, null, null, null, null, null, null, null, null, null,
            'pending', false
          ]
        );
        published = publishResult.rows[0];

        await client.query(
          `INSERT INTO best_bets
           (match_id, fixture_id, home_team, away_team, home_logo, away_logo,
            league_name, league_logo, match_date, match_time,
            bet_type, bet_category, odds, confidence, risk_level, reasoning, result, date_for)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',$17)
           ON CONFLICT (fixture_id, date_for, bet_category) DO UPDATE SET
             bet_type = EXCLUDED.bet_type, odds = EXCLUDED.odds, reasoning = EXCLUDED.reasoning`,
          [
            published.id, fixtureId, homeTeam, awayTeam, homeLogo || null, awayLogo || null,
            leagueName || null, leagueLogo || null, matchDate, matchTime,
            bet_type, 'primary', parseFloat(odds), 70, 'orta',
            description || null, matchDate
          ]
        );

        await client.query('COMMIT');
        console.log(`[ManualPublish] ${homeTeam} vs ${awayTeam} | ${bet_type} @${odds}`);
      } catch (txError: any) {
        await client.query('ROLLBACK');
        throw new Error('Maç kaydedilemedi: ' + txError.message);
      } finally {
        client.release();
      }

      res.json(published);
    } catch (error: any) {
      console.error('Manual publish error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: manually set match result + evaluate predictions
  app.post('/api/admin/matches/:id/result', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Oturum açılmamış' });
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Yetkiniz yok' });

    try {
      const matchId = parseInt(req.params.id);
      const { home_score, away_score, ht_home, ht_away } = req.body;

      if (home_score === undefined || away_score === undefined || isNaN(Number(home_score)) || isNaN(Number(away_score))) {
        return res.status(400).json({ message: 'Ev sahibi ve deplasman skoru zorunludur.' });
      }

      const result = await setManualMatchResult(
        matchId,
        Number(home_score),
        Number(away_score),
        ht_home !== undefined ? Number(ht_home) : null,
        ht_away !== undefined ? Number(ht_away) : null
      );

      res.json({ success: true, evaluated: result.evaluated, message: `Sonuç kaydedildi. ${result.evaluated} tahmin değerlendirildi.` });
    } catch (error: any) {
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
           'bet_category', COALESCE(bb.bet_category, 'primary'),
           'odds', bb.odds,
           'risk_level', bb.risk_level,
           'result', bb.result,
           'confidence', bb.confidence,
           'reasoning', bb.reasoning
         ) ORDER BY 
           CASE COALESCE(bb.bet_category, 'primary')
             WHEN 'primary' THEN 1 
             WHEN 'alternative' THEN 2 
             ELSE 3
           END
         ) FROM best_bets bb WHERE bb.fixture_id = pm.fixture_id) as predictions
         FROM published_matches pm
         WHERE pm.status = 'finished' AND pm.final_score_home IS NOT NULL ${dateFilter}
         ORDER BY pm.match_time DESC
         LIMIT 100`;
      
      const matches = await pool.query(matchesQuery, params);

      // Get daily stats for selected date - PRIMARY BETS ONLY (bet_category = 'primary')
      const dailyStatsQuery = date 
        ? `SELECT 
             COUNT(*) FILTER (WHERE result = 'won') as won,
             COUNT(*) FILTER (WHERE result = 'lost') as lost,
             COUNT(*) FILTER (WHERE result = 'pending') as pending,
             COUNT(*) as total
           FROM best_bets WHERE date_for::date = $1::date AND COALESCE(bet_category, 'primary') = 'primary'`
        : `SELECT 
             COUNT(*) FILTER (WHERE result = 'won') as won,
             COUNT(*) FILTER (WHERE result = 'lost') as lost,
             COUNT(*) FILTER (WHERE result = 'pending') as pending,
             COUNT(*) as total
           FROM best_bets WHERE COALESCE(bet_category, 'primary') = 'primary'`;
      
      const dailyStats = await pool.query(dailyStatsQuery, date ? [date] : []);
      const daily = dailyStats.rows[0];

      // Calculate overall stats - PRIMARY BETS ONLY (bet_category = 'primary' = Ana Bahis)
      const overallStats = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE result = 'won') as total_won,
          COUNT(*) FILTER (WHERE result = 'lost') as total_lost,
          COUNT(*) FILTER (WHERE result IN ('won','lost')) as total_evaluated,
          COUNT(*) as total
        FROM best_bets
        WHERE COALESCE(bet_category, 'primary') = 'primary'
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
