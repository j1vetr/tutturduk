import { pool } from './db';
import { apiFootball } from './apiFootball';

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
    // First, auto-mark very old matches (>4 hours) as finished
    const fourHoursAgo = Math.floor(Date.now() / 1000) - (4 * 60 * 60);
    await pool.query(
      `UPDATE published_matches 
       SET status = 'finished' 
       WHERE status IN ('pending', 'in_progress') 
       AND timestamp IS NOT NULL 
       AND timestamp < $1`,
      [fourHoursAgo]
    );
    
    const result = await pool.query(
      `SELECT id, fixture_id, home_team, away_team, match_date, match_time, status, timestamp 
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
          continue;
        }
        
        const apiStatus = fixture.fixture.status.short;
        const homeScore = fixture.goals?.home;
        const awayScore = fixture.goals?.away;
        const elapsed = fixture.fixture.status.elapsed;
        
        let newStatus = match.status;
        
        if (['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(apiStatus)) {
          newStatus = 'in_progress';
        } else if (['FT', 'AET', 'PEN'].includes(apiStatus)) {
          newStatus = 'finished';
        } else if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) {
          newStatus = 'cancelled';
        }
        
        if (newStatus !== match.status || (newStatus === 'finished' && homeScore !== null)) {
          await pool.query(
            `UPDATE published_matches 
             SET status = $1, final_score_home = $2, final_score_away = $3
             WHERE id = $4`,
            [newStatus, homeScore, awayScore, match.id]
          );
          
          console.log(`[MatchStatus] Updated ${match.home_team} vs ${match.away_team}: ${match.status} -> ${newStatus} (${homeScore}-${awayScore})`);
          updatedCount++;
          
          if (newStatus === 'finished' && homeScore !== null && awayScore !== null) {
            const evalResult = await evaluateMatchPredictions(match.fixture_id, homeScore, awayScore);
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

async function evaluateMatchPredictions(fixtureId: number, homeScore: number, awayScore: number): Promise<number> {
  let evaluatedCount = 0;
  const totalGoals = homeScore + awayScore;
  const bothTeamsScored = homeScore > 0 && awayScore > 0;
  
  const bestBetsResult = await pool.query(
    `SELECT id, bet_type FROM best_bets WHERE fixture_id = $1`,
    [fixtureId]
  );
  
  for (const bet of bestBetsResult.rows) {
    const won = evaluateBet(bet.bet_type, homeScore, awayScore, totalGoals, bothTeamsScored);
    await pool.query(
      `UPDATE best_bets SET result = $1 WHERE id = $2`,
      [won ? 'won' : 'lost', bet.id]
    );
    evaluatedCount++;
    console.log(`[MatchStatus] Best bet ${bet.bet_type}: ${won ? 'WON' : 'LOST'}`);
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
    const won = evaluateBet(pred.prediction, homeScore, awayScore, totalGoals, bothTeamsScored);
    await pool.query(
      `UPDATE predictions SET result = $1 WHERE id = $2`,
      [won ? 'won' : 'lost', pred.id]
    );
    evaluatedCount++;
  }
  
  await updateCouponResults();
  
  return evaluatedCount;
}

function evaluateBet(betType: string, homeScore: number, awayScore: number, totalGoals: number, bothTeamsScored: boolean): boolean {
  const bet = betType.toLowerCase().trim();
  const betOriginal = betType.trim();
  
  console.log(`[MatchStatus] Evaluating bet: "${betOriginal}" | Score: ${homeScore}-${awayScore} | Total: ${totalGoals} | BTS: ${bothTeamsScored}`);
  
  // Over/Under bets (Alt/Üst)
  if (bet.includes('2.5 üst') || bet.includes('2,5 üst') || bet.includes('over 2.5')) {
    const result = totalGoals > 2.5;
    console.log(`[MatchStatus] 2.5 Üst: ${totalGoals} > 2.5 = ${result}`);
    return result;
  }
  if (bet.includes('2.5 alt') || bet.includes('2,5 alt') || bet.includes('under 2.5')) {
    const result = totalGoals < 2.5;
    console.log(`[MatchStatus] 2.5 Alt: ${totalGoals} < 2.5 = ${result}`);
    return result;
  }
  if (bet.includes('3.5 üst') || bet.includes('3,5 üst') || bet.includes('over 3.5')) {
    const result = totalGoals > 3.5;
    console.log(`[MatchStatus] 3.5 Üst: ${totalGoals} > 3.5 = ${result}`);
    return result;
  }
  if (bet.includes('3.5 alt') || bet.includes('3,5 alt') || bet.includes('under 3.5')) {
    const result = totalGoals < 3.5;
    console.log(`[MatchStatus] 3.5 Alt: ${totalGoals} < 3.5 = ${result}`);
    return result;
  }
  if (bet.includes('4.5 üst') || bet.includes('4,5 üst') || bet.includes('over 4.5')) {
    const result = totalGoals > 4.5;
    console.log(`[MatchStatus] 4.5 Üst: ${totalGoals} > 4.5 = ${result}`);
    return result;
  }
  if (bet.includes('4.5 alt') || bet.includes('4,5 alt') || bet.includes('under 4.5')) {
    const result = totalGoals < 4.5;
    console.log(`[MatchStatus] 4.5 Alt: ${totalGoals} < 4.5 = ${result}`);
    return result;
  }
  if (bet.includes('1.5 üst') || bet.includes('1,5 üst') || bet.includes('over 1.5')) {
    const result = totalGoals > 1.5;
    console.log(`[MatchStatus] 1.5 Üst: ${totalGoals} > 1.5 = ${result}`);
    return result;
  }
  if (bet.includes('1.5 alt') || bet.includes('1,5 alt') || bet.includes('under 1.5')) {
    const result = totalGoals < 1.5;
    console.log(`[MatchStatus] 1.5 Alt: ${totalGoals} < 1.5 = ${result}`);
    return result;
  }
  if (bet.includes('0.5 üst') || bet.includes('0,5 üst') || bet.includes('over 0.5')) {
    const result = totalGoals > 0.5;
    console.log(`[MatchStatus] 0.5 Üst: ${totalGoals} > 0.5 = ${result}`);
    return result;
  }
  if (bet.includes('0.5 alt') || bet.includes('0,5 alt') || bet.includes('under 0.5')) {
    const result = totalGoals < 0.5;
    console.log(`[MatchStatus] 0.5 Alt: ${totalGoals} < 0.5 = ${result}`);
    return result;
  }
  if (bet.includes('5.5 üst') || bet.includes('5,5 üst') || bet.includes('over 5.5')) {
    const result = totalGoals > 5.5;
    console.log(`[MatchStatus] 5.5 Üst: ${totalGoals} > 5.5 = ${result}`);
    return result;
  }
  if (bet.includes('5.5 alt') || bet.includes('5,5 alt') || bet.includes('under 5.5')) {
    const result = totalGoals < 5.5;
    console.log(`[MatchStatus] 5.5 Alt: ${totalGoals} < 5.5 = ${result}`);
    return result;
  }
  
  // Both Teams to Score (KG)
  if (bet.includes('kg var') || bet.includes('btts yes') || bet === 'kg var' || bet.includes('karşılıklı gol var')) {
    const result = bothTeamsScored;
    console.log(`[MatchStatus] KG Var: ${bothTeamsScored} = ${result}`);
    return result;
  }
  if (bet.includes('kg yok') || bet.includes('btts no') || bet === 'kg yok' || bet.includes('karşılıklı gol yok')) {
    const result = !bothTeamsScored;
    console.log(`[MatchStatus] KG Yok: !${bothTeamsScored} = ${result}`);
    return result;
  }
  
  // Match Result (MS) - Home Win (MS1)
  if (bet === 'ms1' || bet === 'ms 1' || bet === '1' || 
      bet.includes('ev kazanır') || bet.includes('ev sahibi kazanır') || 
      bet.includes('home win') || bet.includes('ev sahibi galibiyeti')) {
    const result = homeScore > awayScore;
    console.log(`[MatchStatus] MS1 (Ev Kazanır): ${homeScore} > ${awayScore} = ${result}`);
    return result;
  }
  
  // Match Result - Draw (MSX)
  if (bet === 'msx' || bet === 'ms x' || bet === 'x' || 
      bet.includes('beraberlik') || bet.includes('draw')) {
    const result = homeScore === awayScore;
    console.log(`[MatchStatus] MSX (Beraberlik): ${homeScore} === ${awayScore} = ${result}`);
    return result;
  }
  
  // Match Result - Away Win (MS2)
  if (bet === 'ms2' || bet === 'ms 2' || bet === '2' || 
      bet.includes('deplasman kazanır') || bet.includes('deplasman galibiyeti') || 
      bet.includes('away win') || bet.includes('konuk kazanır')) {
    const result = homeScore < awayScore;
    console.log(`[MatchStatus] MS2 (Deplasman Kazanır): ${homeScore} < ${awayScore} = ${result}`);
    return result;
  }
  
  // Double Chance (1X, X2, 12)
  if (bet === '1x' || bet.includes('1x') || bet.includes('ev veya beraberlik') || bet.includes('ev sahibi veya beraberlik')) {
    const result = homeScore >= awayScore;
    console.log(`[MatchStatus] 1X (Ev veya Beraberlik): ${homeScore} >= ${awayScore} = ${result}`);
    return result;
  }
  if (bet === 'x2' || bet.includes('x2') || bet.includes('beraberlik veya deplasman')) {
    const result = homeScore <= awayScore;
    console.log(`[MatchStatus] X2 (Beraberlik veya Deplasman): ${homeScore} <= ${awayScore} = ${result}`);
    return result;
  }
  if (bet === '12' || bet.includes('ev veya deplasman') || bet.includes('ev sahibi veya deplasman') || bet.includes('gol olur')) {
    const result = homeScore !== awayScore;
    console.log(`[MatchStatus] 12 (Ev veya Deplasman): ${homeScore} !== ${awayScore} = ${result}`);
    return result;
  }
  
  // Handicap bets
  if (bet.includes('ev -1.5') || bet.includes('ev 1.5 üst') || bet.includes('ev -1,5')) {
    const result = homeScore - awayScore > 1.5;
    console.log(`[MatchStatus] Ev -1.5: ${homeScore - awayScore} > 1.5 = ${result}`);
    return result;
  }
  if (bet.includes('ev +1.5') || bet.includes('ev +1,5')) {
    const result = homeScore + 1.5 > awayScore;
    console.log(`[MatchStatus] Ev +1.5: ${homeScore + 1.5} > ${awayScore} = ${result}`);
    return result;
  }
  if (bet.includes('dep -1.5') || bet.includes('deplasman -1.5') || bet.includes('dep -1,5')) {
    const result = awayScore - homeScore > 1.5;
    console.log(`[MatchStatus] Dep -1.5: ${awayScore - homeScore} > 1.5 = ${result}`);
    return result;
  }
  if (bet.includes('dep +1.5') || bet.includes('deplasman +1.5') || bet.includes('dep +1,5')) {
    const result = awayScore + 1.5 > homeScore;
    console.log(`[MatchStatus] Dep +1.5: ${awayScore + 1.5} > ${homeScore} = ${result}`);
    return result;
  }
  
  // Exact score
  const scoreMatch = bet.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (scoreMatch) {
    const predHome = parseInt(scoreMatch[1]);
    const predAway = parseInt(scoreMatch[2]);
    const result = homeScore === predHome && awayScore === predAway;
    console.log(`[MatchStatus] Skor Tahmini ${predHome}-${predAway}: ${homeScore}-${awayScore} = ${result}`);
    return result;
  }
  
  console.log(`[MatchStatus] UNKNOWN bet type: "${betOriginal}" - marking as LOST`);
  return false;
}

// Re-evaluate all finished matches with pending predictions
export async function reEvaluateAllFinishedMatches(): Promise<{ evaluated: number; scoresFetched: number }> {
  console.log('[MatchStatus] Re-evaluating all finished matches...');
  
  try {
    // STEP 1: Find matches that should be finished but don't have scores yet
    // These are matches older than 2.5 hours that might have finished
    const twoAndHalfHoursAgo = Math.floor(Date.now() / 1000) - (2.5 * 60 * 60);
    
    const matchesWithoutScores = await pool.query(
      `SELECT id, fixture_id, home_team, away_team, status
       FROM published_matches 
       WHERE (final_score_home IS NULL OR final_score_away IS NULL)
       AND timestamp IS NOT NULL 
       AND timestamp < $1
       AND status != 'cancelled'`,
      [twoAndHalfHoursAgo]
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
            
            // Only update if match is actually finished
            if (['FT', 'AET', 'PEN'].includes(apiStatus) && homeScore !== null && awayScore !== null) {
              await pool.query(
                `UPDATE published_matches 
                 SET status = 'finished', final_score_home = $1, final_score_away = $2
                 WHERE id = $3`,
                [homeScore, awayScore, match.id]
              );
              console.log(`[MatchStatus] Fetched score: ${match.home_team} ${homeScore}-${awayScore} ${match.away_team}`);
              scoresFetched++;
            } else if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) {
              await pool.query(
                `UPDATE published_matches SET status = 'cancelled' WHERE id = $1`,
                [match.id]
              );
              console.log(`[MatchStatus] Match cancelled: ${match.home_team} vs ${match.away_team}`);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`[MatchStatus] Error fetching score for ${match.fixture_id}:`, err);
        }
      }
    }
    
    // STEP 2: Now evaluate all finished matches with scores and pending predictions
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
        
        console.log(`[MatchStatus] Re-evaluating: ${match.home_team} vs ${match.away_team} (${homeScore}-${awayScore})`);
        
        const count = await evaluateMatchPredictions(match.fixture_id, homeScore, awayScore);
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
