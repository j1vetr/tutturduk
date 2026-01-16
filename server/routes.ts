import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';
import { apiFootball, SUPPORTED_LEAGUES, CURRENT_SEASON } from './apiFootball';
import { generateMatchAnalysis } from './openai-analysis';
import { filterMatches, hasValidStatistics, getStatisticsScore } from './matchFilter';
import { checkAndUpdateMatchStatuses } from './matchStatusService';
import { autoPublishTomorrowMatches } from './autoPublishService';

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
        
        // Filter out U23, Women's, Reserve leagues BEFORE fetching predictions (saves API calls)
        const filteredFixtures = filterMatches(allFixtures);
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
      
      res.json(result);
    } catch (error: any) {
      console.error('All predictions error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Published matches endpoints (public)
  app.get('/api/matches', async (req, res) => {
    try {
      const matches = await storage.getPublishedMatches();
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/matches/ai-badges', async (req, res) => {
    try {
      const matches = await storage.getPublishedMatches();
      const badges: Record<number, { bestBet?: string; riskLevel?: string; over25?: boolean; btts?: boolean; winner?: string }> = {};
      
      for (const match of matches) {
        const cacheKey = `ai_analysis_v3_${match.fixture_id}`;
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
      const odds = await apiFootball.getOdds(match.fixture_id);
      res.json(odds || []);
    } catch (error: any) {
      console.error('Odds fetch error:', error);
      res.json([]);
    }
  });

  app.get('/api/matches/:id/ai-analysis', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const match = await storage.getPublishedMatchById(id);
      if (!match) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }

      const cacheKey = `ai_analysis_v3_${match.fixture_id}`;
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
          apiPrediction: apiPred ? {
            winner: apiPred.winner,
            winOrDraw: apiPred.win_or_draw,
            underOver: apiPred.under_over,
            goalsHome: apiPred.goals?.home,
            goalsAway: apiPred.goals?.away,
            advice: apiPred.advice,
            percent: apiPred.percent,
          } : undefined,
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

      // Get fixture details
      const cacheKey = `fixture_${fixtureId}`;
      const fixture = await getCachedData(cacheKey, async () => {
        return apiFootball.getFixtureById(fixtureId);
      }, 60);

      if (!fixture) {
        return res.status(404).json({ message: 'Maç bulunamadı' });
      }

      // Get API prediction
      const predCacheKey = `predictions_${fixtureId}`;
      let apiPrediction: any = null;
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

      const matchDate = new Date(fixture.fixture?.date);
      const isoDate = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD format for database
      const displayDate = matchDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' });
      const localTime = matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' });

      const published = await storage.publishMatch({
        fixture_id: fixtureId,
        home_team: fixture.teams?.home?.name,
        away_team: fixture.teams?.away?.name,
        home_logo: fixture.teams?.home?.logo,
        away_logo: fixture.teams?.away?.logo,
        league_id: fixture.league?.id,
        league_name: fixture.league?.name,
        league_logo: fixture.league?.logo,
        match_date: isoDate,
        match_time: localTime,
        timestamp: fixture.fixture?.timestamp,
        api_advice: apiPrediction?.predictions?.advice,
        api_winner_name: apiPrediction?.predictions?.winner?.name,
        api_winner_comment: apiPrediction?.predictions?.winner?.comment,
        api_percent_home: apiPrediction?.predictions?.percent?.home,
        api_percent_draw: apiPrediction?.predictions?.percent?.draw,
        api_percent_away: apiPrediction?.predictions?.percent?.away,
        api_under_over: apiPrediction?.predictions?.under_over,
        api_goals_home: apiPrediction?.predictions?.goals?.home,
        api_goals_away: apiPrediction?.predictions?.goals?.away,
        api_comparison: apiPrediction?.comparison,
        api_h2h: apiPrediction?.h2h?.slice(0, 5).map((h: any) => ({
          date: h.fixture?.date,
          homeTeam: h.teams?.home?.name,
          awayTeam: h.teams?.away?.name,
          homeGoals: h.goals?.home,
          awayGoals: h.goals?.away,
        })),
        api_teams: apiPrediction?.teams,
        status: 'pending',
        is_featured: isFeatured || false,
      });

      res.json(published);
      
      // Trigger AI analysis in background (don't wait)
      (async () => {
        try {
          const cacheKey = `ai_analysis_v2_${fixtureId}`;
          await getCachedData(cacheKey, async () => {
            const homeTeam = apiPrediction?.teams?.home;
            const awayTeam = apiPrediction?.teams?.away;
            const h2h = apiPrediction?.h2h || [];
            const comparison = apiPrediction?.comparison;
            
            let oddsData: any = null;
            let homeTeamStats: any = null;
            let awayTeamStats: any = null;
            
            try {
              const homeTeamId = homeTeam?.id;
              const awayTeamId = awayTeam?.id;
              const leagueId = fixture.league?.id;
              
              const [oddsRes, homeStatsRes, awayStatsRes] = await Promise.all([
                apiFootball.getOdds(fixtureId).catch(() => []),
                (homeTeamId && leagueId) ? apiFootball.getTeamStatistics(homeTeamId, leagueId, CURRENT_SEASON).catch(() => null) : null,
                (awayTeamId && leagueId) ? apiFootball.getTeamStatistics(awayTeamId, leagueId, CURRENT_SEASON).catch(() => null) : null,
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
                  oddsData = { ...oddsData, over25: parseFloat(overUnder.values.find((v: any) => v.value === 'Over 2.5')?.odd || 0), under25: parseFloat(overUnder.values.find((v: any) => v.value === 'Under 2.5')?.odd || 0) };
                }
              }
              
              if (homeStats) {
                homeTeamStats = { cleanSheets: homeStats.clean_sheet?.total || 0, failedToScore: homeStats.failed_to_score?.total || 0, avgGoalsHome: homeStats.goals?.for?.average?.home ? parseFloat(homeStats.goals.for.average.home) : undefined, avgGoalsAway: homeStats.goals?.for?.average?.away ? parseFloat(homeStats.goals.for.average.away) : undefined };
              }
              if (awayStats) {
                awayTeamStats = { cleanSheets: awayStats.clean_sheet?.total || 0, failedToScore: awayStats.failed_to_score?.total || 0, avgGoalsHome: awayStats.goals?.for?.average?.home ? parseFloat(awayStats.goals.for.average.home) : undefined, avgGoalsAway: awayStats.goals?.for?.average?.away ? parseFloat(awayStats.goals.for.average.away) : undefined };
              }
            } catch (e) { console.log('Error fetching additional stats:', e); }
            
            return generateMatchAnalysis({
              homeTeam: fixture.teams?.home?.name || '',
              awayTeam: fixture.teams?.away?.name || '',
              league: fixture.league?.name || '',
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
              h2hResults: h2h.slice(0, 5).map((m: any) => ({ homeGoals: m.goals?.home || 0, awayGoals: m.goals?.away || 0 })),
              comparison,
              apiPrediction: apiPrediction?.predictions ? {
                winner: apiPrediction.predictions.winner,
                winOrDraw: apiPrediction.predictions.win_or_draw,
                underOver: apiPrediction.predictions.under_over,
                goalsHome: apiPrediction.predictions.goals?.home,
                goalsAway: apiPrediction.predictions.goals?.away,
                advice: apiPrediction.predictions.advice,
                percent: apiPrediction.predictions.percent,
              } : undefined,
              homeTeamStats,
              awayTeamStats,
              odds: oddsData,
            });
          }, 1440);
          console.log(`[AI] Pre-generated analysis for fixture ${fixtureId}`);
        } catch (e) {
          console.log(`[AI] Failed to pre-generate analysis for fixture ${fixtureId}:`, e);
        }
      })();
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

  // Admin: auto-publish tomorrow's matches
  app.post('/api/admin/auto-publish', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    try {
      const { count = 25 } = req.body;
      const result = await autoPublishTomorrowMatches(count);
      res.json({ 
        success: true, 
        message: `${result.published} maç yayınlandı (${result.date} için)`,
        ...result 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Winners API - Get all completed predictions with results
  app.get('/api/winners', async (req, res) => {
    try {
      // Get finished matches with scores and their predictions
      const finishedMatches = await pool.query(
        `SELECT pm.*, 
         (SELECT json_agg(json_build_object(
           'id', bb.id,
           'bet_type', bb.bet_type,
           'risk_level', bb.risk_level,
           'result', bb.result,
           'confidence', bb.confidence
         )) FROM best_bets bb WHERE bb.fixture_id = pm.fixture_id) as predictions
         FROM published_matches pm
         WHERE pm.status = 'finished' AND pm.final_score_home IS NOT NULL
         ORDER BY pm.match_date DESC, pm.match_time DESC
         LIMIT 50`
      );

      // Get won best bets
      const wonBestBets = await pool.query(
        `SELECT * FROM best_bets 
         WHERE result = 'won'
         ORDER BY created_at DESC
         LIMIT 30`
      );

      // Get won predictions
      const wonPredictions = await pool.query(
        `SELECT * FROM predictions 
         WHERE result = 'won'
         ORDER BY created_at DESC
         LIMIT 30`
      );

      // Get won coupons with predictions
      const wonCoupons = await pool.query(
        `SELECT c.*, 
         (SELECT COUNT(*) FROM coupon_predictions WHERE coupon_id = c.id) as match_count
         FROM coupons c 
         WHERE c.result = 'won'
         ORDER BY c.created_at DESC
         LIMIT 10`
      );

      // Calculate stats
      const statsResult = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM best_bets WHERE result != 'pending') as total_evaluated,
          (SELECT COUNT(*) FROM best_bets WHERE result = 'won') as total_won,
          (SELECT COUNT(*) FROM best_bets WHERE result = 'lost') as total_lost,
          (SELECT COUNT(*) FROM coupons WHERE result != 'pending') as coupons_evaluated,
          (SELECT COUNT(*) FROM coupons WHERE result = 'won') as coupons_won
      `);

      const stats = statsResult.rows[0];
      const winRate = stats.total_evaluated > 0 
        ? Math.round((parseInt(stats.total_won) / parseInt(stats.total_evaluated)) * 100) 
        : 0;

      res.json({
        finishedMatches: finishedMatches.rows,
        wonBestBets: wonBestBets.rows,
        wonPredictions: wonPredictions.rows,
        wonCoupons: wonCoupons.rows,
        stats: {
          totalEvaluated: parseInt(stats.total_evaluated) || 0,
          totalWon: parseInt(stats.total_won) || 0,
          totalLost: parseInt(stats.total_lost) || 0,
          winRate,
          couponsEvaluated: parseInt(stats.coupons_evaluated) || 0,
          couponsWon: parseInt(stats.coupons_won) || 0
        }
      });
    } catch (error: any) {
      console.error('Winners API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
