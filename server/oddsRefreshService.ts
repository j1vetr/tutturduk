// FAZ 4.1 — Pre-match odds refresh (her saat başı, sonraki 2 saatte oynanacak maçlar)
// 2.5 Üst veya KG Var oranı %10+ kaymışsa AI analizini yenile.

import { pool } from './db';
import { apiFootball } from './apiFootball';
import { generateMatchAnalysis, aiCacheKey } from './openai-analysis';
import type { MatchData } from './openai-analysis';
import {
  ODDS_REFRESH_DRIFT_THRESHOLD,
  ODDS_REFRESH_LOOKAHEAD_MAX,
  ODDS_REFRESH_TICK_MS,
} from './predictionConfig';

let interval: NodeJS.Timeout | null = null;
let lastRunHour = -1;

function pickOdd(oddsData: any[], betName: string, valueLabel: string): number | null {
  if (!Array.isArray(oddsData) || oddsData.length === 0) return null;
  for (const bookmaker of oddsData[0]?.bookmakers || []) {
    for (const bet of bookmaker.bets || []) {
      if (bet.name === betName) {
        const v = bet.values?.find((x: any) => x.value === valueLabel);
        if (v?.odd) {
          const num = parseFloat(v.odd);
          if (Number.isFinite(num)) return num;
        }
      }
    }
  }
  return null;
}

async function refreshOddsForUpcomingMatches(): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + ODDS_REFRESH_LOOKAHEAD_MAX * 60 * 1000);

  // Sonraki 2 saatte oynanacak yayında pending best_bet'leri olan maçlar
  const upcoming = await pool.query(
    `SELECT DISTINCT pm.fixture_id, pm.home_team, pm.away_team, pm.league_id, pm.league_name,
            pm.timestamp, pm.match_date, pm.match_time
     FROM published_matches pm
     INNER JOIN best_bets bb ON bb.fixture_id = pm.fixture_id
     WHERE pm.status = 'pending'
       AND bb.result = 'pending'
       AND pm.timestamp IS NOT NULL
       AND to_timestamp(pm.timestamp) BETWEEN $1 AND $2`,
    [now.toISOString(), cutoff.toISOString()]
  );

  if (upcoming.rows.length === 0) {
    console.log('[OddsRefresh] Sonraki 2 saatte yenilenecek maç yok');
    return;
  }

  console.log(`[OddsRefresh] ${upcoming.rows.length} yaklaşan maç kontrol ediliyor`);

  for (const m of upcoming.rows) {
    try {
      const fixtureId = Number(m.fixture_id);
      const freshOdds = await apiFootball.getOdds(fixtureId);
      if (!freshOdds || freshOdds.length === 0) continue;

      const newOver25 = pickOdd(freshOdds, 'Goals Over/Under', 'Over 2.5');
      const newBtts = pickOdd(freshOdds, 'Both Teams Score', 'Yes');

      // Mevcut cache'deki AI analizinden eski oranları çıkar
      const cacheRes = await pool.query(
        'SELECT data FROM api_cache WHERE key = $1',
        [aiCacheKey(fixtureId)]
      );
      if (cacheRes.rows.length === 0) continue;

      let oldAnalysis: any;
      try { oldAnalysis = (typeof cacheRes.rows[0].data === 'string' ? JSON.parse(cacheRes.rows[0].data) : cacheRes.rows[0].data); } catch { continue; }

      // Yeni şema: primaryBet, alternativeBet (BetResult — odds: number),
      // predictions[] (PredictionItem — odds: string)
      const toNum = (v: any): number | null => {
        if (v === null || v === undefined) return null;
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        return Number.isFinite(n) ? n : null;
      };
      const findOddsFor = (regex: RegExp): number | null => {
        const candidates: Array<{ bet?: string; odds?: number | string } | null | undefined> = [
          oldAnalysis?.primaryBet,
          oldAnalysis?.alternativeBet,
          ...((oldAnalysis?.predictions as any[]) ?? []),
        ];
        for (const c of candidates) {
          if (c && typeof c.bet === 'string' && regex.test(c.bet)) {
            const n = toNum(c.odds);
            if (n !== null) return n;
          }
        }
        return null;
      };

      const oldOver25 = findOddsFor(/2[.,]?5\s*üst|over\s*2[.,]?5/i);
      const oldBtts = findOddsFor(/kg\s*var|btts\s*yes/i);

      const drift = (a: number | null, b: number | null) =>
        (a && b) ? Math.abs((b - a) / a) : 0;

      const driftOver25 = drift(oldOver25, newOver25);
      const driftBtts = drift(oldBtts, newBtts);
      const maxDrift = Math.max(driftOver25, driftBtts);

      if (maxDrift < ODDS_REFRESH_DRIFT_THRESHOLD) {
        // Önemli kayma yok — atla
        continue;
      }

      console.log(`[OddsRefresh] DRIFT ${(maxDrift * 100).toFixed(1)}% — ${m.home_team} vs ${m.away_team} → AI yeniden çalıştırılıyor`);

      // AI'yı yeniden çalıştırmak için DB'deki kayıtlı verilerden minimal MatchData inşa et
      const matchData: MatchData = {
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        league: m.league_name || '',
        leagueId: m.league_id,
        odds: {
          over25: newOver25 ?? undefined,
          under25: pickOdd(freshOdds, 'Goals Over/Under', 'Under 2.5') ?? undefined,
          bttsYes: newBtts ?? undefined,
          bttsNo: pickOdd(freshOdds, 'Both Teams Score', 'No') ?? undefined,
          home: pickOdd(freshOdds, 'Match Winner', 'Home') ?? undefined,
          draw: pickOdd(freshOdds, 'Match Winner', 'Draw') ?? undefined,
          away: pickOdd(freshOdds, 'Match Winner', 'Away') ?? undefined,
          doubleChanceHomeOrDraw: pickOdd(freshOdds, 'Double Chance', 'Home/Draw') ?? undefined,
          doubleChanceHomeOrAway: pickOdd(freshOdds, 'Double Chance', 'Home/Away') ?? undefined,
          doubleChanceAwayOrDraw: pickOdd(freshOdds, 'Double Chance', 'Draw/Away') ?? undefined,
        },
      };

      const refreshed = await generateMatchAnalysis(matchData);
      if (!refreshed) continue;

      // Yeni analizi cache'e yaz
      await pool.query(
        `INSERT INTO api_cache (key, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')
         ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = NOW() + INTERVAL '24 hours'`,
        [aiCacheKey(fixtureId), JSON.stringify(refreshed)]
      );

      // Eğer karar 'pas' ise, pending best_bet'leri sil (artık değer yok)
      if (refreshed.karar === 'pas') {
        await pool.query(
          `DELETE FROM best_bets WHERE fixture_id = $1 AND result = 'pending'`,
          [fixtureId]
        );
        console.log(`[OddsRefresh] ${m.home_team} vs ${m.away_team} — yeniden değerlendirme: PAS, bahisler silindi`);
      } else {
        console.log(`[OddsRefresh] ${m.home_team} vs ${m.away_team} — yeniden değerlendirme: BAHIS güncel`);
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (err: any) {
      console.error(`[OddsRefresh] Hata fixture ${m.fixture_id}: ${err.message}`);
    }
  }
}

export function startOddsRefreshService(): void {
  console.log('[OddsRefresh] Servis başlatıldı: her saat başı sonraki 2 saatlik maçlar kontrol edilir');

  const tick = async () => {
    const now = new Date();
    const turkeyHour = parseInt(
      new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
        .getHours().toString()
    );
    const minute = parseInt(
      new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
        .getMinutes().toString()
    );

    // Saat başının ilk 5 dakikasında çalış, aynı saatte tekrar çalışma
    if (minute < 5 && lastRunHour !== turkeyHour) {
      lastRunHour = turkeyHour;
      try {
        await refreshOddsForUpcomingMatches();
      } catch (err: any) {
        console.error('[OddsRefresh] Cron hatası:', err.message);
      }
    }
  };

  interval = setInterval(tick, ODDS_REFRESH_TICK_MS);
  tick();
}

export function stopOddsRefreshService(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log('[OddsRefresh] Servis durduruldu');
  }
}
