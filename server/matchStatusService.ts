import { pool } from './db';
import { apiFootball } from './apiFootball';

// FAZ 1.3 + 4.3: bahis sonucu üç değer alır.
type BetOutcome = 'won' | 'lost' | 'void';

interface MatchResult {
  fixtureId: number;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  elapsed: number | null;
}

export async function checkAndUpdateMatchStatuses() {
  console.log('[MatchStatus] Starting match status check...');
  
  try {
    const result = await pool.query(
      `SELECT id, fixture_id, home_team, away_team, match_date, match_time, status, timestamp,
              final_score_home, final_score_away
       FROM published_matches 
       WHERE status IN ('pending', 'in_progress')
       ORDER BY timestamp ASC`
    );
    
    const matches = result.rows;
    
    if (matches.length === 0) {
      console.log('[MatchStatus] No pending or in-progress matches found');
      return { updated: 0, evaluated: 0 };
    }
    
    console.log(`[MatchStatus] Checking ${matches.length} matches...`);
    
    let updatedCount = 0;
    let evaluatedCount = 0;
    
    for (const match of matches) {
      try {
        const fixture = await apiFootball.getFixtureById(match.fixture_id);
        
        if (!fixture) {
          console.log(`[MatchStatus] Fixture ${match.fixture_id} not found in API`);
          const fourHoursAgo = Math.floor(Date.now() / 1000) - (4 * 60 * 60);
          if (match.timestamp && match.timestamp < fourHoursAgo) {
            await pool.query(
              `UPDATE published_matches SET status = 'finished' WHERE id = $1`,
              [match.id]
            );
            console.log(`[MatchStatus] Auto-finished old match (no API data): ${match.home_team} vs ${match.away_team}`);
          }
          continue;
        }
        
        const apiStatus = fixture.fixture.status.short;
        const homeScore = fixture.goals?.home ?? null;
        const awayScore = fixture.goals?.away ?? null;
        const htHome = fixture.score?.halftime?.home ?? null;
        const htAway = fixture.score?.halftime?.away ?? null;
        
        let newStatus = match.status;
        
        if (['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(apiStatus)) {
          newStatus = 'in_progress';
        } else if (['FT', 'AET', 'PEN'].includes(apiStatus)) {
          newStatus = 'finished';
        } else if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) {
          newStatus = 'cancelled';
        }
        
        const statusChanged = newStatus !== match.status;
        const scoreChanged = homeScore !== null && (
          match.final_score_home !== homeScore || match.final_score_away !== awayScore
        );
        
        if (statusChanged || scoreChanged) {
          await pool.query(
            `UPDATE published_matches 
             SET status = $1, final_score_home = $2, final_score_away = $3
             WHERE id = $4`,
            [newStatus, homeScore, awayScore, match.id]
          );
          
          console.log(`[MatchStatus] Updated ${match.home_team} vs ${match.away_team}: ${match.status} -> ${newStatus} (${homeScore}-${awayScore})`);
          updatedCount++;
          
          if (newStatus === 'finished' && homeScore !== null && awayScore !== null) {
            const evalResult = await evaluateMatchPredictions(match.fixture_id, homeScore, awayScore, htHome, htAway);
            evaluatedCount += evalResult;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[MatchStatus] Error checking fixture ${match.fixture_id}:`, error);
      }
    }
    
    console.log(`[MatchStatus] Completed: ${updatedCount} matches updated, ${evaluatedCount} predictions evaluated`);
    return { updated: updatedCount, evaluated: evaluatedCount };
    
  } catch (error) {
    console.error('[MatchStatus] Error in checkAndUpdateMatchStatuses:', error);
    throw error;
  }
}

async function evaluateMatchPredictions(fixtureId: number, homeScore: number, awayScore: number, htHome?: number | null, htAway?: number | null): Promise<number> {
  let evaluatedCount = 0;
  const totalGoals = homeScore + awayScore;
  const bothTeamsScored = homeScore > 0 && awayScore > 0;
  const htHomeScore = htHome ?? null;
  const htAwayScore = htAway ?? null;

  console.log(`[MatchStatus] Evaluating predictions for fixture ${fixtureId} | FT: ${homeScore}-${awayScore} | HT: ${htHomeScore ?? '-'}-${htAwayScore ?? '-'} | Total: ${totalGoals} | BTS: ${bothTeamsScored}`);

  const bestBetsResult = await pool.query(
    `SELECT id, bet_type, bet_category, result FROM best_bets WHERE fixture_id = $1`,
    [fixtureId]
  );

  if (bestBetsResult.rows.length === 0) {
    console.log(`[MatchStatus] No best_bets found for fixture ${fixtureId}`);
    return 0;
  }

  console.log(`[MatchStatus] Found ${bestBetsResult.rows.length} best_bets for fixture ${fixtureId}`);

  for (const bet of bestBetsResult.rows) {
    if (bet.result !== 'pending') {
      console.log(`[MatchStatus] Skipping already evaluated bet ${bet.id} (${bet.bet_type}): ${bet.result}`);
      continue;
    }
    const outcome = evaluateBet(bet.bet_type, homeScore, awayScore, totalGoals, bothTeamsScored, htHomeScore, htAwayScore);
    await pool.query(
      `UPDATE best_bets SET result = $1 WHERE id = $2`,
      [outcome, bet.id]
    );
    evaluatedCount++;
    const marker = outcome === 'won' ? 'WON ✓' : outcome === 'void' ? 'VOID ◯' : 'LOST ✗';
    console.log(`[MatchStatus] Best bet #${bet.id} "${bet.bet_type}" (${bet.bet_category}): ${marker}`);
  }

  const predictionsResult = await pool.query(
    `SELECT p.id, p.prediction 
     FROM predictions p
     INNER JOIN coupon_predictions cp ON p.id = cp.prediction_id
     WHERE p.home_team = (SELECT home_team FROM published_matches WHERE fixture_id = $1)
     AND p.away_team = (SELECT away_team FROM published_matches WHERE fixture_id = $1)
     AND p.result = 'pending'`,
    [fixtureId]
  );

  for (const pred of predictionsResult.rows) {
    const outcome = evaluateBet(pred.prediction, homeScore, awayScore, totalGoals, bothTeamsScored, htHomeScore, htAwayScore);
    await pool.query(
      `UPDATE predictions SET result = $1 WHERE id = $2`,
      [outcome, pred.id]
    );
    evaluatedCount++;
  }

  await updateCouponResults();

  return evaluatedCount;
}

function evaluateBet(
  betType: string,
  homeScore: number,
  awayScore: number,
  totalGoals: number,
  bothTeamsScored: boolean,
  htHome?: number | null,
  htAway?: number | null
): BetOutcome {
  const bet = betType.toLowerCase().trim();
  const betOriginal = betType.trim();
  const toRes = (b: boolean): BetOutcome => (b ? 'won' : 'lost');

  // ─── HT/FT (İY/MS Çift) — FAZ 4.3 ───────────────────────────
  // ÖNEMLİ: Generic HT marketten ÖNCE kontrol edilmeli.
  // Format: "1/1", "1/X", "X/2", "İY/MS 1/X", "ht/ft Home/Draw"
  const htftMatch =
    bet.match(/^([12x])\s*\/\s*([12x])$/i) ||
    bet.match(/(?:iy\/ms|i̇y\/ms|ht\/ft)\s+([12xa-zçğıöşü]+)\s*\/\s*([12xa-zçğıöşü]+)/i);
  if (htftMatch) {
    if (htHome === null || htHome === undefined || htAway === null || htAway === undefined) {
      console.log(`[MatchStatus] HT/FT "${betOriginal}" — HT skoru yok, VOID`);
      return 'void';
    }
    const norm = (s: string) => {
      const v = s.toLowerCase();
      if (v === '1' || v.startsWith('ev') || v.startsWith('home')) return 'home';
      if (v === '2' || v.startsWith('dep') || v.startsWith('konuk') || v.startsWith('away')) return 'away';
      return 'draw';
    };
    const wantHt = norm(htftMatch[1]);
    const wantFt = norm(htftMatch[2]);
    const actualHt = htHome > htAway ? 'home' : htHome < htAway ? 'away' : 'draw';
    const actualFt = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
    return toRes(wantHt === actualHt && wantFt === actualFt);
  }

  // ─── İLK YARI (HT/IY) — FAZ 4.3 ─────────────────────────────
  // İY önekli market varsa ve HT skoru bilinmiyorsa → void
  const isHtMarket = /^iy\b|^i̇y\b|^h(alf)?t\b|i̇lk yarı|ilk yari|first half|^ht /.test(bet);
  if (isHtMarket) {
    if (htHome === null || htHome === undefined || htAway === null || htAway === undefined) {
      console.log(`[MatchStatus] HT/IY market "${betOriginal}" — HT skoru yok, VOID`);
      return 'void';
    }
    const htTotal = htHome + htAway;
    const htBts = htHome > 0 && htAway > 0;

    // İY 0.5/1.5 üst/alt
    if (bet.includes('0.5 üst') || bet.includes('0,5 üst') || bet.includes('over 0.5')) return toRes(htTotal > 0.5);
    if (bet.includes('0.5 alt') || bet.includes('0,5 alt') || bet.includes('under 0.5')) return toRes(htTotal < 0.5);
    if (bet.includes('1.5 üst') || bet.includes('1,5 üst') || bet.includes('over 1.5')) return toRes(htTotal > 1.5);
    if (bet.includes('1.5 alt') || bet.includes('1,5 alt') || bet.includes('under 1.5')) return toRes(htTotal < 1.5);
    if (bet.includes('2.5 üst') || bet.includes('2,5 üst') || bet.includes('over 2.5')) return toRes(htTotal > 2.5);
    if (bet.includes('2.5 alt') || bet.includes('2,5 alt') || bet.includes('under 2.5')) return toRes(htTotal < 2.5);

    // İY MS
    if (bet.includes('ms1') || bet.endsWith(' 1') || bet.includes('ev kazanır')) return toRes(htHome > htAway);
    if (bet.includes('msx') || bet.endsWith(' x') || bet.includes('beraberlik')) return toRes(htHome === htAway);
    if (bet.includes('ms2') || bet.endsWith(' 2') || bet.includes('deplasman kazanır')) return toRes(htHome < htAway);

    // İY KG
    if (bet.includes('kg var') || bet.includes('btts yes')) return toRes(htBts);
    if (bet.includes('kg yok') || bet.includes('btts no')) return toRes(!htBts);

    console.log(`[MatchStatus] UNKNOWN HT bet: "${betOriginal}" → VOID`);
    return 'void';
  }

  console.log(`[MatchStatus] Evaluating bet: "${betOriginal}" | FT: ${homeScore}-${awayScore} | Total: ${totalGoals} | BTS: ${bothTeamsScored}`);

  // ─── Over/Under (FT) ────────────────────────────────────────
  if (bet.includes('2.5 üst') || bet.includes('2,5 üst') || bet.includes('over 2.5')) return toRes(totalGoals > 2.5);
  if (bet.includes('2.5 alt') || bet.includes('2,5 alt') || bet.includes('under 2.5')) return toRes(totalGoals < 2.5);
  if (bet.includes('3.5 üst') || bet.includes('3,5 üst') || bet.includes('over 3.5')) return toRes(totalGoals > 3.5);
  if (bet.includes('3.5 alt') || bet.includes('3,5 alt') || bet.includes('under 3.5')) return toRes(totalGoals < 3.5);
  if (bet.includes('4.5 üst') || bet.includes('4,5 üst') || bet.includes('over 4.5')) return toRes(totalGoals > 4.5);
  if (bet.includes('4.5 alt') || bet.includes('4,5 alt') || bet.includes('under 4.5')) return toRes(totalGoals < 4.5);
  if (bet.includes('1.5 üst') || bet.includes('1,5 üst') || bet.includes('over 1.5')) return toRes(totalGoals > 1.5);
  if (bet.includes('1.5 alt') || bet.includes('1,5 alt') || bet.includes('under 1.5')) return toRes(totalGoals < 1.5);
  if (bet.includes('0.5 üst') || bet.includes('0,5 üst') || bet.includes('over 0.5')) return toRes(totalGoals > 0.5);
  if (bet.includes('0.5 alt') || bet.includes('0,5 alt') || bet.includes('under 0.5')) return toRes(totalGoals < 0.5);
  if (bet.includes('5.5 üst') || bet.includes('5,5 üst') || bet.includes('over 5.5')) return toRes(totalGoals > 5.5);
  if (bet.includes('5.5 alt') || bet.includes('5,5 alt') || bet.includes('under 5.5')) return toRes(totalGoals < 5.5);

  // ─── KG (BTTS) ──────────────────────────────────────────────
  if (bet.includes('kg var') || bet.includes('btts yes') || bet === 'kg var' || bet.includes('karşılıklı gol var')) return toRes(bothTeamsScored);
  if (bet.includes('kg yok') || bet.includes('btts no') || bet === 'kg yok' || bet.includes('karşılıklı gol yok')) return toRes(!bothTeamsScored);

  // ─── Match Result ───────────────────────────────────────────
  if (bet === 'ms1' || bet === 'ms 1' || bet === '1' ||
      bet.includes('ev kazanır') || bet.includes('ev sahibi kazanır') ||
      bet.includes('home win') || bet.includes('ev sahibi galibiyeti')) return toRes(homeScore > awayScore);
  if (bet === 'msx' || bet === 'ms x' || bet === 'x' ||
      bet.includes('beraberlik') || bet.includes('draw')) return toRes(homeScore === awayScore);
  if (bet === 'ms2' || bet === 'ms 2' || bet === '2' ||
      bet.includes('deplasman kazanır') || bet.includes('deplasman galibiyeti') ||
      bet.includes('away win') || bet.includes('konuk kazanır')) return toRes(homeScore < awayScore);

  // ─── Double Chance ──────────────────────────────────────────
  if (bet === '1x' || bet.includes(' 1x ') || bet.endsWith(' 1x') || bet.startsWith('1x ') ||
      bet.includes('ev veya beraberlik') || bet.includes('ev sahibi veya beraberlik')) return toRes(homeScore >= awayScore);
  if (bet === 'x2' || bet.includes(' x2 ') || bet.endsWith(' x2') || bet.startsWith('x2 ') ||
      bet.includes('beraberlik veya deplasman')) return toRes(homeScore <= awayScore);
  if (bet === '12' || bet.includes('ev veya deplasman') || bet.includes('ev sahibi veya deplasman') || bet.includes('gol olur')) return toRes(homeScore !== awayScore);

  // ─── DNB — FAZ 1.3: berabere = VOID ────────────────────────
  if (bet.includes('dnb ev') || bet.includes('dnb 1') || bet.includes('dnb home') ||
      bet.includes('beraberlikte iade ev') || bet.includes('beraberlikte iade 1')) {
    if (homeScore === awayScore) {
      console.log(`[MatchStatus] DNB Ev: Berabere → VOID (iade)`);
      return 'void';
    }
    return toRes(homeScore > awayScore);
  }
  if (bet.includes('dnb dep') || bet.includes('dnb deplasman') || bet.includes('dnb 2') || bet.includes('dnb away') ||
      bet.includes('beraberlikte iade dep') || bet.includes('beraberlikte iade 2')) {
    if (homeScore === awayScore) {
      console.log(`[MatchStatus] DNB Deplasman: Berabere → VOID (iade)`);
      return 'void';
    }
    return toRes(homeScore < awayScore);
  }

  // ─── Handicap ───────────────────────────────────────────────
  if (bet.includes('ev -1.5') || bet.includes('ev -1,5')) return toRes(homeScore - awayScore > 1.5);
  if (bet.includes('ev +1.5') || bet.includes('ev +1,5')) return toRes(homeScore + 1.5 > awayScore);
  if (bet.includes('dep -1.5') || bet.includes('deplasman -1.5') || bet.includes('dep -1,5')) return toRes(awayScore - homeScore > 1.5);
  if (bet.includes('dep +1.5') || bet.includes('deplasman +1.5') || bet.includes('dep +1,5')) return toRes(awayScore + 1.5 > homeScore);

  // ─── Exact Score ────────────────────────────────────────────
  const scoreMatch = bet.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (scoreMatch) {
    const predHome = parseInt(scoreMatch[1]);
    const predAway = parseInt(scoreMatch[2]);
    return toRes(homeScore === predHome && awayScore === predAway);
  }

  console.log(`[MatchStatus] UNKNOWN bet type: "${betOriginal}" — marking as LOST`);
  return 'lost';
}

export async function reEvaluateAllFinishedMatches(): Promise<{ evaluated: number; scoresFetched: number }> {
  console.log('[MatchStatus] Re-evaluating all finished matches...');
  
  try {
    // STEP 1: Find ALL matches without scores that should be finished (>2 hours old)
    const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 60 * 60);
    
    const matchesWithoutScores = await pool.query(
      `SELECT id, fixture_id, home_team, away_team, status
       FROM published_matches 
       WHERE (final_score_home IS NULL OR final_score_away IS NULL)
       AND timestamp IS NOT NULL 
       AND timestamp < $1
       AND status != 'cancelled'`,
      [twoHoursAgo]
    );
    
    let scoresFetched = 0;
    
    if (matchesWithoutScores.rows.length > 0) {
      console.log(`[MatchStatus] Found ${matchesWithoutScores.rows.length} matches without scores, fetching from API...`);
      
      for (const match of matchesWithoutScores.rows) {
        try {
          const fixture = await apiFootball.getFixtureById(match.fixture_id);
          
          if (fixture) {
            const apiStatus = fixture.fixture?.status?.short;
            const homeScore = fixture.goals?.home;
            const awayScore = fixture.goals?.away;
            
            if (['FT', 'AET', 'PEN'].includes(apiStatus) && homeScore !== null && awayScore !== null) {
              const htHome = fixture.score?.halftime?.home ?? null;
              const htAway = fixture.score?.halftime?.away ?? null;
              await pool.query(
                `UPDATE published_matches 
                 SET status = 'finished', final_score_home = $1, final_score_away = $2
                 WHERE id = $3`,
                [homeScore, awayScore, match.id]
              );
              console.log(`[MatchStatus] Fetched score: ${match.home_team} ${homeScore}-${awayScore} ${match.away_team} | HT ${htHome ?? '-'}-${htAway ?? '-'}`);
              scoresFetched++;
              
              await evaluateMatchPredictions(match.fixture_id, homeScore, awayScore, htHome, htAway);
            } else if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) {
              await pool.query(
                `UPDATE published_matches SET status = 'cancelled' WHERE id = $1`,
                [match.id]
              );
              console.log(`[MatchStatus] Match cancelled: ${match.home_team} vs ${match.away_team}`);
            } else if (['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(apiStatus)) {
              await pool.query(
                `UPDATE published_matches SET status = 'in_progress' WHERE id = $1`,
                [match.id]
              );
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`[MatchStatus] Error fetching score for ${match.fixture_id}:`, err);
        }
      }
    }
    
    // STEP 2: Evaluate ALL finished matches that have scores but still have pending predictions
    const finishedMatches = await pool.query(
      `SELECT pm.id, pm.fixture_id, pm.home_team, pm.away_team, pm.final_score_home, pm.final_score_away
       FROM published_matches pm
       WHERE pm.status = 'finished' 
       AND pm.final_score_home IS NOT NULL 
       AND pm.final_score_away IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM best_bets bb 
         WHERE bb.fixture_id = pm.fixture_id 
         AND bb.result = 'pending'
       )`
    );
    
    console.log(`[MatchStatus] Found ${finishedMatches.rows.length} finished matches with pending predictions`);
    
    let totalEvaluated = 0;
    
    for (const match of finishedMatches.rows) {
      try {
        const homeScore = match.final_score_home;
        const awayScore = match.final_score_away;

        // HT skoru DB'de saklanmıyor — yeniden değerlendirmede API'den çek (varsa).
        let htHome: number | null = null;
        let htAway: number | null = null;
        try {
          const fx = await apiFootball.getFixtureById(match.fixture_id);
          htHome = fx?.score?.halftime?.home ?? null;
          htAway = fx?.score?.halftime?.away ?? null;
        } catch { /* skip */ }

        console.log(`[MatchStatus] Re-evaluating: ${match.home_team} vs ${match.away_team} (FT ${homeScore}-${awayScore} | HT ${htHome ?? '-'}-${htAway ?? '-'})`);

        const count = await evaluateMatchPredictions(match.fixture_id, homeScore, awayScore, htHome, htAway);
        totalEvaluated += count;

      } catch (error) {
        console.error(`[MatchStatus] Error re-evaluating ${match.fixture_id}:`, error);
      }
    }
    
    console.log(`[MatchStatus] Re-evaluation completed: ${scoresFetched} scores fetched, ${totalEvaluated} predictions evaluated`);
    return { evaluated: totalEvaluated, scoresFetched };
    
  } catch (error) {
    console.error('[MatchStatus] Re-evaluation error:', error);
    throw error;
  }
}

async function updateCouponResults() {
  try {
    const couponsResult = await pool.query(
      `SELECT c.id, c.name FROM coupons c WHERE c.result = 'pending'`
    );
    
    for (const coupon of couponsResult.rows) {
      const predsResult = await pool.query(
        `SELECT p.result FROM predictions p
         INNER JOIN coupon_predictions cp ON p.id = cp.prediction_id
         WHERE cp.coupon_id = $1`,
        [coupon.id]
      );
      
      const predictions = predsResult.rows;
      
      if (predictions.length === 0) continue;
      
      const allEvaluated = predictions.every(p => p.result !== 'pending');
      
      if (allEvaluated) {
        const allWon = predictions.every(p => p.result === 'won');
        const anyLost = predictions.some(p => p.result === 'lost');
        
        let couponResult = 'pending';
        if (anyLost) {
          couponResult = 'lost';
        } else if (allWon) {
          couponResult = 'won';
        }
        
        if (couponResult !== 'pending') {
          await pool.query(
            `UPDATE coupons SET result = $1 WHERE id = $2`,
            [couponResult, coupon.id]
          );
          console.log(`[MatchStatus] Coupon "${coupon.name}" result: ${couponResult}`);
        }
      }
    }
  } catch (error) {
    console.error('[MatchStatus] Error updating coupon results:', error);
  }
}

export async function filterActiveMatches(matches: any[]): Promise<any[]> {
  const now = Date.now();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  
  return matches.filter(match => {
    if (match.status === 'finished' || match.status === 'cancelled') {
      return false;
    }
    
    if (match.timestamp) {
      const matchTime = match.timestamp * 1000;
      const matchEndEstimate = matchTime + (2.5 * 60 * 60 * 1000);
      
      if (now > matchEndEstimate) {
        return false;
      }
    }
    
    return true;
  });
}

let statusCheckInterval: ReturnType<typeof setInterval> | null = null;

export function startMatchStatusService(intervalMinutes: number = 15) {
  console.log(`[MatchStatus] Starting service with ${intervalMinutes} minute interval`);
  
  // Run initial check
  checkAndUpdateMatchStatuses().then(() => {
    return reEvaluateAllFinishedMatches();
  }).catch(err => {
    console.error('[MatchStatus] Initial check failed:', err);
  });
  
  statusCheckInterval = setInterval(async () => {
    try {
      await checkAndUpdateMatchStatuses();
      await reEvaluateAllFinishedMatches();
    } catch (err) {
      console.error('[MatchStatus] Scheduled check failed:', err);
    }
  }, intervalMinutes * 60 * 1000);
  
  return statusCheckInterval;
}

export function stopMatchStatusService() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
    console.log('[MatchStatus] Service stopped');
  }
}
