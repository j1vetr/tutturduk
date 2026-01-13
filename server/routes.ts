import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

const LEAGUE_CODES: Record<string, string> = {
  pl: 'PL',           // Premier League
  laliga: 'PD',       // La Liga (Primera División)
  bundesliga: 'BL1',  // Bundesliga
  seriea: 'SA',       // Serie A
  ligue1: 'FL1',      // Ligue 1
  eredivisie: 'DED',  // Eredivisie (Hollanda)
  primeiraligia: 'PPL', // Primeira Liga (Portekiz)
  championship: 'ELC', // Championship (İngiltere 2. Lig)
  championsleague: 'CL', // UEFA Champions League
  brasilseriea: 'BSA', // Brezilya Serie A
};

async function fetchFromFootballData(endpoint: string) {
  if (!FOOTBALL_DATA_API_KEY) {
    throw new Error('Football Data API key not configured');
  }
  
  const response = await fetch(`${FOOTBALL_DATA_BASE_URL}${endpoint}`, {
    headers: {
      'X-Auth-Token': FOOTBALL_DATA_API_KEY,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Football Data API error: ${response.status}`);
  }
  
  return response.json();
}

const PgSession = connectPgSimple(session);

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
      if (!invCode || invCode.status !== 'active' || invCode.uses >= invCode.max_uses) {
        return res.status(400).json({ message: 'Geçersiz veya kullanılmış davet kodu' });
      }

      // Create user
      const user = await storage.createUser({
        username,
        password,
        referral_code: referralCode,
        role: invCode.type === 'vip' ? 'vip' : 'user',
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
    res.json(coupons);
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

  // Football Data API routes
  app.get('/api/football/leagues', async (req, res) => {
    try {
      const data = await fetchFromFootballData('/competitions');
      const supportedLeagues = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED', 'PPL', 'ELC', 'CL'];
      const leagues = data.competitions
        .filter((c: any) => supportedLeagues.includes(c.code))
        .map((c: any) => ({
          id: c.code.toLowerCase(),
          code: c.code,
          name: c.name,
          logo: c.emblem,
          country: c.area?.name,
        }));
      res.json(leagues);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all upcoming matches from all leagues (next 7 days)
  app.get('/api/football/upcoming-matches', async (req, res) => {
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = nextWeek.toISOString().split('T')[0];
      
      const data = await fetchFromFootballData(`/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      
      const leagueNames: Record<string, string> = {
        'PL': 'Premier League',
        'PD': 'La Liga',
        'BL1': 'Bundesliga',
        'SA': 'Serie A',
        'FL1': 'Ligue 1',
        'DED': 'Eredivisie',
        'PPL': 'Primeira Liga',
        'ELC': 'Championship',
        'CL': 'Champions League',
      };
      
      const matches = data.matches
        .filter((m: any) => m.status === 'SCHEDULED' || m.status === 'TIMED')
        .map((m: any) => ({
          id: m.id,
          homeTeam: {
            id: m.homeTeam.id,
            name: m.homeTeam.name,
            shortName: m.homeTeam.shortName || m.homeTeam.name,
            logo: m.homeTeam.crest,
          },
          awayTeam: {
            id: m.awayTeam.id,
            name: m.awayTeam.name,
            shortName: m.awayTeam.shortName || m.awayTeam.name,
            logo: m.awayTeam.crest,
          },
          utcDate: m.utcDate,
          localDate: new Date(m.utcDate).toLocaleDateString('tr-TR'),
          localTime: new Date(m.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          matchday: m.matchday,
          status: m.status,
          competition: {
            id: m.competition.id,
            code: m.competition.code,
            name: leagueNames[m.competition.code] || m.competition.name,
            logo: m.competition.emblem,
          },
        }))
        .sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
      
      res.json(matches);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/teams/:leagueId', async (req, res) => {
    try {
      const { leagueId } = req.params;
      const code = LEAGUE_CODES[leagueId];
      
      if (!code) {
        return res.status(400).json({ message: 'Geçersiz lig kodu' });
      }
      
      const data = await fetchFromFootballData(`/competitions/${code}/teams`);
      const teams = data.teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        tla: t.tla,
        logo: t.crest,
        leagueId: leagueId,
      }));
      res.json(teams);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/football/matches/:leagueId', async (req, res) => {
    try {
      const { leagueId } = req.params;
      const code = LEAGUE_CODES[leagueId];
      
      if (!code) {
        return res.status(400).json({ message: 'Geçersiz lig kodu' });
      }
      
      const data = await fetchFromFootballData(`/competitions/${code}/matches?status=SCHEDULED`);
      const matches = data.matches.slice(0, 20).map((m: any) => ({
        id: m.id,
        homeTeam: {
          id: m.homeTeam.id,
          name: m.homeTeam.name,
          shortName: m.homeTeam.shortName,
          logo: m.homeTeam.crest,
        },
        awayTeam: {
          id: m.awayTeam.id,
          name: m.awayTeam.name,
          shortName: m.awayTeam.shortName,
          logo: m.awayTeam.crest,
        },
        utcDate: m.utcDate,
        matchday: m.matchday,
        status: m.status,
      }));
      res.json(matches);
    } catch (error: any) {
      console.error('Football API error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Sync teams from Football Data API to local teamsData
  app.post('/api/admin/sync-teams', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Oturum açılmamış' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    try {
      const allTeams: any[] = [];
      const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1'];
      const leagueIdMap: Record<string, string> = {
        'PL': 'pl',
        'PD': 'laliga',
        'BL1': 'bundesliga',
        'SA': 'seriea',
        'FL1': 'ligue1',
      };

      for (const code of leagues) {
        const data = await fetchFromFootballData(`/competitions/${code}/teams`);
        const teams = data.teams.map((t: any) => ({
          id: t.tla?.toLowerCase() || t.id.toString(),
          name: t.shortName || t.name,
          logo: t.crest,
          leagueId: leagueIdMap[code],
        }));
        allTeams.push(...teams);
      }

      res.json({
        message: 'Takımlar başarıyla senkronize edildi',
        totalTeams: allTeams.length,
        teams: allTeams,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
