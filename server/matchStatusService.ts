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
  
  const htResult = await pool.query(
    `SELECT id, ai_analysis FROM published_matches WHERE fixture_id = $1`,
    [fixtureId]
  );
  
  const matchId = htResult.rows[0]?.id;
  const aiAnalysis = htResult.rows[0]?.ai_analysis;
  
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
  
  if (bet.includes('2.5 üst') || bet.includes('2.5 over') || bet === '2.5 üst') {
    return totalGoals > 2.5;
  }
  if (bet.includes('2.5 alt') || bet.includes('2.5 under') || bet === '2.5 alt') {
    return totalGoals < 2.5;
  }
  if (bet.includes('3.5 üst') || bet.includes('3.5 over')) {
    return totalGoals > 3.5;
  }
  if (bet.includes('3.5 alt') || bet.includes('3.5 under')) {
    return totalGoals < 3.5;
  }
  if (bet.includes('4.5 üst') || bet.includes('4.5 over')) {
    return totalGoals > 4.5;
  }
  if (bet.includes('4.5 alt') || bet.includes('4.5 under')) {
    return totalGoals < 4.5;
  }
  if (bet.includes('1.5 üst') || bet.includes('1.5 over')) {
    return totalGoals > 1.5;
  }
  if (bet.includes('1.5 alt') || bet.includes('1.5 under')) {
    return totalGoals < 1.5;
  }
  
  if (bet.includes('kg var') || bet.includes('btts yes') || bet === 'kg var') {
    return bothTeamsScored;
  }
  if (bet.includes('kg yok') || bet.includes('btts no') || bet === 'kg yok') {
    return !bothTeamsScored;
  }
  
  if (bet.includes('ev kazanır') || bet.includes('ev sahibi') || bet === '1' || bet === 'ms 1') {
    return homeScore > awayScore;
  }
  if (bet.includes('beraberlik') || bet === 'x' || bet === 'ms x') {
    return homeScore === awayScore;
  }
  if (bet.includes('deplasman kazanır') || bet.includes('deplasman') || bet === '2' || bet === 'ms 2') {
    return homeScore < awayScore;
  }
  
  if (bet.includes('1x') || bet.includes('ev sahibi veya beraberlik')) {
    return homeScore >= awayScore;
  }
  if (bet.includes('x2') || bet.includes('beraberlik veya deplasman')) {
    return homeScore <= awayScore;
  }
  if (bet.includes('12') || bet.includes('ev sahibi veya deplasman')) {
    return homeScore !== awayScore;
  }
  
  const scoreMatch = bet.match(/(\d+)-(\d+)/);
  if (scoreMatch) {
    const predHome = parseInt(scoreMatch[1]);
    const predAway = parseInt(scoreMatch[2]);
    return homeScore === predHome && awayScore === predAway;
  }
  
  console.log(`[MatchStatus] Unknown bet type: ${betType}`);
  return false;
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

let statusCheckInterval: NodeJS.Timer | null = null;

export function startMatchStatusService(intervalMinutes: number = 15) {
  console.log(`[MatchStatus] Starting service with ${intervalMinutes} minute interval`);
  
  checkAndUpdateMatchStatuses().catch(err => {
    console.error('[MatchStatus] Initial check failed:', err);
  });
  
  statusCheckInterval = setInterval(() => {
    checkAndUpdateMatchStatuses().catch(err => {
      console.error('[MatchStatus] Scheduled check failed:', err);
    });
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
