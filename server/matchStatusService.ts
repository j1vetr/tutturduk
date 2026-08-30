import { pool } from './db';

// FAZ 1.3 + 4.3: bahis sonucu üç değer alır.
type BetOutcome = 'won' | 'lost' | 'void';

async function evaluateMatchPredictions(
  fixtureId: number,
  homeScore: number,
  awayScore: number,
  htHome?: number | null,
  htAway?: number | null
): Promise<number> {
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

  // ─── HT/FT (İY/MS Çift) ──────────────────────────────────────
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

  // ─── İLK YARI (HT/IY) ────────────────────────────────────────
  const isHtMarket = /^iy\b|^i̇y\b|^h(alf)?t\b|i̇lk yarı|ilk yari|first half|^ht /.test(bet);
  if (isHtMarket) {
    if (htHome === null || htHome === undefined || htAway === null || htAway === undefined) {
      console.log(`[MatchStatus] HT/IY market "${betOriginal}" — HT skoru yok, VOID`);
      return 'void';
    }
    const htTotal = htHome + htAway;
    const htBts = htHome > 0 && htAway > 0;

    if (bet.includes('0.5 üst') || bet.includes('0,5 üst') || bet.includes('over 0.5')) return toRes(htTotal > 0.5);
    if (bet.includes('0.5 alt') || bet.includes('0,5 alt') || bet.includes('under 0.5')) return toRes(htTotal < 0.5);
    if (bet.includes('1.5 üst') || bet.includes('1,5 üst') || bet.includes('over 1.5')) return toRes(htTotal > 1.5);
    if (bet.includes('1.5 alt') || bet.includes('1,5 alt') || bet.includes('under 1.5')) return toRes(htTotal < 1.5);
    if (bet.includes('2.5 üst') || bet.includes('2,5 üst') || bet.includes('over 2.5')) return toRes(htTotal > 2.5);
    if (bet.includes('2.5 alt') || bet.includes('2,5 alt') || bet.includes('under 2.5')) return toRes(htTotal < 2.5);

    if (bet.includes('ms1') || bet.endsWith(' 1') || bet.includes('ev kazanır')) return toRes(htHome > htAway);
    if (bet.includes('msx') || bet.endsWith(' x') || bet.includes('beraberlik')) return toRes(htHome === htAway);
    if (bet.includes('ms2') || bet.endsWith(' 2') || bet.includes('deplasman kazanır')) return toRes(htHome < htAway);

    if (bet.includes('kg var') || bet.includes('btts yes')) return toRes(htBts);
    if (bet.includes('kg yok') || bet.includes('btts no')) return toRes(!htBts);

    console.log(`[MatchStatus] UNKNOWN HT bet: "${betOriginal}" → VOID`);
    return 'void';
  }

  console.log(`[MatchStatus] Evaluating bet: "${betOriginal}" | FT: ${homeScore}-${awayScore} | Total: ${totalGoals} | BTS: ${bothTeamsScored}`);

  // ─── Over/Under (FT) ─────────────────────────────────────────
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

  // ─── KG (BTTS) ───────────────────────────────────────────────
  if (bet.includes('kg var') || bet.includes('btts yes') || bet === 'kg var' || bet.includes('karşılıklı gol var')) return toRes(bothTeamsScored);
  if (bet.includes('kg yok') || bet.includes('btts no') || bet === 'kg yok' || bet.includes('karşılıklı gol yok')) return toRes(!bothTeamsScored);

  // ─── Maç Sonucu ──────────────────────────────────────────────
  if (bet === 'ms1' || bet === 'ms 1' || bet === '1' ||
      bet.includes('ev kazanır') || bet.includes('ev sahibi kazanır') ||
      bet.includes('home win') || bet.includes('ev sahibi galibiyeti')) return toRes(homeScore > awayScore);
  if (bet === 'msx' || bet === 'ms x' || bet === 'x' ||
      bet.includes('beraberlik') || bet.includes('draw')) return toRes(homeScore === awayScore);
  if (bet === 'ms2' || bet === 'ms 2' || bet === '2' ||
      bet.includes('deplasman kazanır') || bet.includes('deplasman galibiyeti') ||
      bet.includes('away win') || bet.includes('konuk kazanır')) return toRes(homeScore < awayScore);

  // ─── Çifte Şans ──────────────────────────────────────────────
  if (bet === '1x' || bet.includes(' 1x ') || bet.endsWith(' 1x') || bet.startsWith('1x ') ||
      bet.includes('ev veya beraberlik') || bet.includes('ev sahibi veya beraberlik')) return toRes(homeScore >= awayScore);
  if (bet === 'x2' || bet.includes(' x2 ') || bet.endsWith(' x2') || bet.startsWith('x2 ') ||
      bet.includes('beraberlik veya deplasman')) return toRes(homeScore <= awayScore);
  if (bet === '12' || bet.includes('ev veya deplasman') || bet.includes('ev sahibi veya deplasman') || bet.includes('gol olur')) return toRes(homeScore !== awayScore);

  // ─── DNB (Beraberlikte İade) ──────────────────────────────────
  if (bet.includes('dnb ev') || bet.includes('dnb 1') || bet.includes('dnb home') ||
      bet.includes('beraberlikte iade ev') || bet.includes('beraberlikte iade 1')) {
    if (homeScore === awayScore) return 'void';
    return toRes(homeScore > awayScore);
  }
  if (bet.includes('dnb dep') || bet.includes('dnb deplasman') || bet.includes('dnb 2') || bet.includes('dnb away') ||
      bet.includes('beraberlikte iade dep') || bet.includes('beraberlikte iade 2')) {
    if (homeScore === awayScore) return 'void';
    return toRes(homeScore < awayScore);
  }

  // ─── Handikap ────────────────────────────────────────────────
  if (bet.includes('ev -1.5') || bet.includes('ev -1,5')) return toRes(homeScore - awayScore > 1.5);
  if (bet.includes('ev +1.5') || bet.includes('ev +1,5')) return toRes(homeScore + 1.5 > awayScore);
  if (bet.includes('dep -1.5') || bet.includes('deplasman -1.5') || bet.includes('dep -1,5')) return toRes(awayScore - homeScore > 1.5);
  if (bet.includes('dep +1.5') || bet.includes('deplasman +1.5') || bet.includes('dep +1,5')) return toRes(awayScore + 1.5 > homeScore);

  // ─── Kesin Skor ──────────────────────────────────────────────
  const scoreMatch = bet.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (scoreMatch) {
    const predHome = parseInt(scoreMatch[1]);
    const predAway = parseInt(scoreMatch[2]);
    return toRes(homeScore === predHome && awayScore === predAway);
  }

  console.log(`[MatchStatus] UNKNOWN bet type: "${betOriginal}" — marking as LOST`);
  return 'lost';
}

// Manuel maç sonucu girişi — admin'in skoru girmesiyle tetiklenir, API'ye gerek yok
export async function setManualMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  htHome?: number | null,
  htAway?: number | null
): Promise<{ evaluated: number }> {
  const match = await pool.query(
    `SELECT id, fixture_id, home_team, away_team FROM published_matches WHERE id = $1`,
    [matchId]
  );
  if (match.rows.length === 0) throw new Error('Maç bulunamadı');

  const { fixture_id, home_team, away_team } = match.rows[0];

  await pool.query(
    `UPDATE published_matches SET status = 'finished', final_score_home = $1, final_score_away = $2 WHERE id = $3`,
    [homeScore, awayScore, matchId]
  );

  console.log(`[ManualResult] ${home_team} ${homeScore}-${awayScore} ${away_team} | HT: ${htHome ?? '-'}-${htAway ?? '-'}`);

  const evaluated = await evaluateMatchPredictions(fixture_id, homeScore, awayScore, htHome, htAway);
  return { evaluated };
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
