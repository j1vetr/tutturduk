import { pool } from './db';
import { apiFootball, CURRENT_SEASON } from './apiFootball';
import { filterMatches, getStatisticsScore } from './matchFilter';
import { generateAndSavePredictions, generateMatchAnalysis } from './openai-analysis';
import type { MatchData } from './openai-analysis';

async function saveBestBetsFromAnalysis(
  matchId: number, fixtureId: number,
  homeTeam: string, awayTeam: string,
  homeLogo: string, awayLogo: string,
  leagueName: string, leagueLogo: string,
  matchDate: string, matchTime: string,
  aiAnalysis: any
) {
  if (!aiAnalysis) return;

  const saveBet = async (betData: any, category: string) => {
    if (!betData) return;
    try {
      await pool.query(
        `INSERT INTO best_bets 
         (match_id, fixture_id, home_team, away_team, home_logo, away_logo, 
          league_name, league_logo, match_date, match_time,
          bet_type, bet_category, odds, confidence, risk_level, reasoning, result, date_for)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', $17)
         ON CONFLICT (fixture_id, date_for, bet_category) DO UPDATE SET
           bet_type = EXCLUDED.bet_type,
           odds = EXCLUDED.odds,
           confidence = EXCLUDED.confidence,
           risk_level = EXCLUDED.risk_level,
           reasoning = EXCLUDED.reasoning`,
        [
          matchId, fixtureId, homeTeam, awayTeam, homeLogo, awayLogo,
          leagueName, leagueLogo, matchDate, matchTime,
          betData.bet, category, betData.odds || null,
          betData.confidence, betData.riskLevel || 'orta',
          betData.reasoning || '', matchDate
        ]
      );
      console.log(`[AutoPublish] Saved ${category}: ${betData.bet} @ ${betData.odds || 'N/A'} for ${homeTeam} vs ${awayTeam}`);
    } catch (saveError: any) {
      if (saveError.code !== '23505') {
        console.error(`[AutoPublish] Error saving ${category} bet:`, saveError.message);
      }
    }
  };

  if (aiAnalysis.primaryBet) {
    await saveBet(aiAnalysis.primaryBet, 'primary');
  } else if (aiAnalysis.predictions?.length > 0) {
    const pred = aiAnalysis.predictions[0];
    await saveBet({
      bet: pred.bet,
      odds: pred.odds,
      confidence: pred.confidence,
      riskLevel: aiAnalysis.singleBet?.riskLevel || 'orta',
      reasoning: pred.reasoning
    }, 'primary');
  }

  if (aiAnalysis.alternativeBet) {
    await saveBet(aiAnalysis.alternativeBet, 'alternative');
  } else if (aiAnalysis.predictions?.length > 1) {
    const pred = aiAnalysis.predictions[1];
    await saveBet({
      bet: pred.bet,
      odds: pred.odds,
      confidence: pred.confidence,
      riskLevel: 'orta',
      reasoning: pred.reasoning
    }, 'alternative');
  }
}

interface ParsedOdds {
  home?: number;
  draw?: number;
  away?: number;
  over15?: number;
  under15?: number;
  over25?: number;
  under25?: number;
  over35?: number;
  under35?: number;
  over45?: number;
  under45?: number;
  bttsYes?: number;
  bttsNo?: number;
  doubleChanceHomeOrDraw?: number;
  doubleChanceAwayOrDraw?: number;
  doubleChanceHomeOrAway?: number;
  halfTimeHome?: number;
  halfTimeDraw?: number;
  halfTimeAway?: number;
}

interface MatchWithScore {
  fixture: any;
  prediction: any;
  league: any;
  teams: any;
  statisticsScore: number;
  odds?: ParsedOdds;
}

function parseApiFootballOdds(oddsData: any[]): ParsedOdds {
  const parsed: ParsedOdds = {};
  
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
  }
  
  return parsed;
}

// Core function for publishing matches - used by both tomorrow and today functions
async function publishMatchesForDate(dateStr: string, totalLimit: number = 70, matchesPerHour: number = 10) {
  console.log(`\n[AutoPublish] ==========================================`);
  console.log(`[AutoPublish] STARTING PUBLISH FOR: ${dateStr}`);
  console.log(`[AutoPublish] Limit: ${totalLimit} matches, Per hour: ${matchesPerHour}`);
  console.log(`[AutoPublish] ==========================================\n`);
  
  const stats = {
    fetched: 0,
    filtered: 0,
    withStats: 0,
    withOdds: 0,
    aiChecked: 0,
    aiBahis: 0,
    aiPas: 0,
    published: 0
  };
  
  try {
    // Step 1: Fetch ALL fixtures for the date
    console.log(`[AutoPublish] Step 1: Fetching all matches...`);
    let allMatches: any[] = [];
    
    try {
      const fixtures = await apiFootball.getFixtures({
        date: dateStr
      });
      
      if (fixtures && fixtures.length > 0) {
        allMatches = fixtures;
        stats.fetched = allMatches.length;
        console.log(`[AutoPublish] -> Found ${allMatches.length} total matches`);
      }
    } catch (error: any) {
      console.log(`[AutoPublish] ERROR fetching fixtures:`, error?.message || error);
      return { published: 0, total: 0, date: dateStr, stats };
    }
    
    if (allMatches.length === 0) {
      console.log('[AutoPublish] -> No matches found for this date');
      return { published: 0, total: 0, date: dateStr, stats };
    }
    
    // Step 2: Filter matches (remove U23, women's, etc.)
    console.log(`[AutoPublish] Step 2: Filtering matches (removing U23, women's, amateur)...`);
    const formattedMatches = allMatches.map(f => ({
      fixture: f.fixture,
      league: f.league,
      teams: f.teams,
      goals: f.goals
    }));
    
    const filteredMatches = filterMatches(formattedMatches);
    stats.filtered = filteredMatches.length;
    console.log(`[AutoPublish] -> After filtering: ${filteredMatches.length} quality matches`);
    
    // Group matches by hour
    const matchesByHour: Map<number, any[]> = new Map();
    
    for (const match of filteredMatches) {
      const matchDate = new Date(match.fixture.date);
      const hour = matchDate.getHours();
      
      if (!matchesByHour.has(hour)) {
        matchesByHour.set(hour, []);
      }
      matchesByHour.get(hour)!.push(match);
    }
    
    console.log(`[AutoPublish] Matches distributed across ${matchesByHour.size} hour slots`);
    
    // Process each hour slot and collect valid matches
    const scoredMatches: MatchWithScore[] = [];
    const minStatsScore = 35;
    
    // Sort hours for predictable processing
    const sortedHours = Array.from(matchesByHour.keys()).sort((a, b) => a - b);
    
    for (const hour of sortedHours) {
      const hourMatches = matchesByHour.get(hour)!;
      console.log(`[AutoPublish] Processing hour ${hour}:00 - ${hourMatches.length} matches available`);
      
      let validForThisHour = 0;
      
      for (const match of hourMatches) {
        // Stop if we have enough for this hour
        if (validForThisHour >= matchesPerHour) break;
        // Stop if we've reached total limit
        if (scoredMatches.length >= totalLimit) break;
        
        try {
          const homeTeam = match.teams?.home?.name || '';
          const awayTeam = match.teams?.away?.name || '';
          
          // Check if already in database
          const existing = await pool.query(
            'SELECT id FROM published_matches WHERE fixture_id = $1',
            [match.fixture.id]
          );
          
          if (existing.rows.length > 0) {
            console.log(`[AutoPublish] ${homeTeam} vs ${awayTeam} already exists, skipping`);
            continue;
          }
          
          // Fetch API-Football prediction for statistics
          const prediction = await apiFootball.getPrediction(match.fixture.id);
          
          if (!prediction) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          const statsScore = getStatisticsScore(prediction);
          
          if (statsScore < minStatsScore) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          // Fetch odds from API-Football
          let parsedOdds: ParsedOdds = {};
          try {
            const oddsData = await apiFootball.getOdds(match.fixture.id);
            parsedOdds = parseApiFootballOdds(oddsData);
          } catch (oddsError: any) {
            console.log(`[AutoPublish] No odds for ${homeTeam} vs ${awayTeam}`);
          }
          
          // Check if match has essential odds
          const hasBasicOdds = parsedOdds.home && parsedOdds.draw && parsedOdds.away;
          const hasOverUnderOdds = parsedOdds.over25 || parsedOdds.over15 || parsedOdds.over35;
          const hasBttsOdds = parsedOdds.bttsYes && parsedOdds.bttsNo;
          
          if (!hasBasicOdds || (!hasOverUnderOdds && !hasBttsOdds)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          console.log(`[AutoPublish] [${hour}:00] Valid: ${homeTeam} vs ${awayTeam}`);
          
          scoredMatches.push({
            fixture: match.fixture,
            prediction: prediction,
            league: match.league,
            teams: match.teams,
            statisticsScore: statsScore,
            odds: parsedOdds
          });
          
          validForThisHour++;
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error: any) {
          console.log(`[AutoPublish] Error processing match:`, error?.message || error);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`[AutoPublish] Hour ${hour}:00 - Added ${validForThisHour} matches`);
      
      if (scoredMatches.length >= totalLimit) {
        console.log(`[AutoPublish] Reached total limit of ${totalLimit}`);
        break;
      }
    }
    
    stats.withStats = scoredMatches.length;
    console.log(`\n[AutoPublish] Step 4: AI Analysis & Publishing...`);
    console.log(`[AutoPublish] -> ${scoredMatches.length} matches ready for AI analysis`);
    
    // Publish all collected matches - but first check AI decision
    let publishedCount = 0;
    let passedCount = 0;
    
    for (const match of scoredMatches) {
      try {
        const homeTeam = match.teams?.home?.name || 'Unknown';
        const awayTeam = match.teams?.away?.name || 'Unknown';
        const homeLogo = match.teams?.home?.logo || '';
        const awayLogo = match.teams?.away?.logo || '';
        const leagueName = match.league?.name || '';
        const leagueLogo = match.league?.logo || '';
        const leagueId = match.league?.id;
        
        const matchDate = match.fixture.date?.split('T')[0];
        const matchDateTime = new Date(match.fixture.date);
        const matchTime = matchDateTime.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Istanbul'
        });
        
        const pred = match.prediction?.predictions;
        const teams = match.prediction?.teams;
        const comparison = match.prediction?.comparison;
        const h2h = match.prediction?.h2h || [];
        
        // Fetch additional data for enhanced AI analysis
        const homeTeamId = match.teams?.home?.id;
        const awayTeamId = match.teams?.away?.id;
        const fixtureId = match.fixture?.id;
        
        let injuries: any = { home: [], away: [] };
        let homeLastMatches: any[] = [];
        let awayLastMatches: any[] = [];
        let homeSeasonStats: any = null;
        let awaySeasonStats: any = null;
        
        try {
          // Fetch injuries for this fixture
          if (fixtureId) {
            const injuriesData = await apiFootball.getInjuries(fixtureId);
            if (injuriesData && Array.isArray(injuriesData)) {
              injuries.home = injuriesData
                .filter((inj: any) => inj.team?.id === homeTeamId)
                .map((inj: any) => ({
                  player: inj.player?.name || 'Unknown',
                  reason: inj.player?.reason || 'Injury',
                  type: inj.player?.type || 'Missing'
                }));
              injuries.away = injuriesData
                .filter((inj: any) => inj.team?.id === awayTeamId)
                .map((inj: any) => ({
                  player: inj.player?.name || 'Unknown',
                  reason: inj.player?.reason || 'Injury',
                  type: inj.player?.type || 'Missing'
                }));
            }
          }
        } catch (err: any) {
          console.log(`[AutoPublish] Injuries fetch skipped: ${err.message}`);
        }
        
        try {
          // Fetch last 10 matches for home team
          if (homeTeamId) {
            const homeMatches = await apiFootball.getTeamLastMatches(homeTeamId, 10);
            homeLastMatches = homeMatches?.map((m: any) => ({
              opponent: m.teams?.home?.id === homeTeamId ? m.teams?.away?.name : m.teams?.home?.name,
              result: m.teams?.home?.id === homeTeamId
                ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D')
                : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'),
              score: `${m.goals?.home || 0}-${m.goals?.away || 0}`,
              home: m.teams?.home?.id === homeTeamId
            })) || [];
          }
        } catch (err: any) {
          console.log(`[AutoPublish] Home last matches skipped: ${err.message}`);
        }
        
        try {
          // Fetch last 10 matches for away team
          if (awayTeamId) {
            const awayMatches = await apiFootball.getTeamLastMatches(awayTeamId, 10);
            awayLastMatches = awayMatches?.map((m: any) => ({
              opponent: m.teams?.home?.id === awayTeamId ? m.teams?.away?.name : m.teams?.home?.name,
              result: m.teams?.home?.id === awayTeamId
                ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D')
                : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'),
              score: `${m.goals?.home || 0}-${m.goals?.away || 0}`,
              home: m.teams?.home?.id === awayTeamId
            })) || [];
          }
        } catch (err: any) {
          console.log(`[AutoPublish] Away last matches skipped: ${err.message}`);
        }
        
        try {
          // Fetch season statistics for home team
          if (homeTeamId && leagueId) {
            homeSeasonStats = await apiFootball.getTeamSeasonGoals(homeTeamId, leagueId, CURRENT_SEASON);
          }
        } catch (err: any) {
          console.log(`[AutoPublish] Home season stats skipped: ${err.message}`);
        }
        
        try {
          // Fetch season statistics for away team
          if (awayTeamId && leagueId) {
            awaySeasonStats = await apiFootball.getTeamSeasonGoals(awayTeamId, leagueId, CURRENT_SEASON);
          }
        } catch (err: any) {
          console.log(`[AutoPublish] Away season stats skipped: ${err.message}`);
        }
        
        console.log(`[AutoPublish] Enhanced data: injuries=${injuries.home.length + injuries.away.length}, homeMatches=${homeLastMatches.length}, awayMatches=${awayLastMatches.length}`);
        
        // Build match data for AI analysis with all available data
        const matchData: MatchData = {
          homeTeam,
          awayTeam,
          league: leagueName,
          leagueId: leagueId,
          comparison: comparison || undefined,
          homeForm: teams?.home?.league?.form,
          awayForm: teams?.away?.league?.form,
          h2hResults: h2h?.map((h: any) => ({
            homeGoals: h.homeGoals || h.goals?.home || 0,
            awayGoals: h.awayGoals || h.goals?.away || 0
          })),
          homeWins: teams?.home?.league?.wins,
          homeDraws: teams?.home?.league?.draws,
          homeLosses: teams?.home?.league?.loses,
          homeGoalsFor: teams?.home?.league?.goals?.for?.total,
          homeGoalsAgainst: teams?.home?.league?.goals?.against?.total,
          awayWins: teams?.away?.league?.wins,
          awayDraws: teams?.away?.league?.draws,
          awayLosses: teams?.away?.league?.loses,
          awayGoalsFor: teams?.away?.league?.goals?.for?.total,
          awayGoalsAgainst: teams?.away?.league?.goals?.against?.total,
          odds: match.odds,
          // Enhanced data from new API endpoints
          injuries: injuries,
          homeLastMatches: homeLastMatches,
          awayLastMatches: awayLastMatches,
          homeTeamStats: homeSeasonStats ? {
            cleanSheets: homeSeasonStats.clean_sheet?.total || 0,
            failedToScore: homeSeasonStats.failed_to_score?.total || 0,
            avgGoalsHome: homeSeasonStats.goals?.for?.average?.home ? parseFloat(homeSeasonStats.goals.for.average.home) : undefined,
            avgGoalsAway: homeSeasonStats.goals?.for?.average?.away ? parseFloat(homeSeasonStats.goals.for.average.away) : undefined,
            avgGoalsConcededHome: homeSeasonStats.goals?.against?.average?.home ? parseFloat(homeSeasonStats.goals.against.average.home) : undefined,
            avgGoalsConcededAway: homeSeasonStats.goals?.against?.average?.away ? parseFloat(homeSeasonStats.goals.against.average.away) : undefined,
            biggestWinStreak: homeSeasonStats.biggest?.streak?.wins || 0,
            biggestLoseStreak: homeSeasonStats.biggest?.streak?.loses || 0,
          } : undefined,
          awayTeamStats: awaySeasonStats ? {
            cleanSheets: awaySeasonStats.clean_sheet?.total || 0,
            failedToScore: awaySeasonStats.failed_to_score?.total || 0,
            avgGoalsHome: awaySeasonStats.goals?.for?.average?.home ? parseFloat(awaySeasonStats.goals.for.average.home) : undefined,
            avgGoalsAway: awaySeasonStats.goals?.for?.average?.away ? parseFloat(awaySeasonStats.goals.for.average.away) : undefined,
            avgGoalsConcededHome: awaySeasonStats.goals?.against?.average?.home ? parseFloat(awaySeasonStats.goals.against.average.home) : undefined,
            avgGoalsConcededAway: awaySeasonStats.goals?.against?.average?.away ? parseFloat(awaySeasonStats.goals.against.average.away) : undefined,
            biggestWinStreak: awaySeasonStats.biggest?.streak?.wins || 0,
            biggestLoseStreak: awaySeasonStats.biggest?.streak?.loses || 0,
          } : undefined,
        };
        
        // Check AI decision before publishing
        console.log(`[AutoPublish] AI analyzing: ${homeTeam} vs ${awayTeam}...`);
        let aiAnalysis;
        try {
          aiAnalysis = await generateMatchAnalysis(matchData);
        } catch (aiError: any) {
          console.error(`[AutoPublish] AI HATA: ${homeTeam} vs ${awayTeam} - ${aiError.message}`);
          continue;
        }
        
        // If AI says "pas", skip this match entirely
        if (!aiAnalysis || aiAnalysis.karar === 'pas') {
          passedCount++;
          console.log(`[AutoPublish] PAS: ${homeTeam} vs ${awayTeam} - belirsiz maç`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // AI said "bahis" - proceed with publishing
        console.log(`[AutoPublish] BAHİS: ${homeTeam} vs ${awayTeam} - yayınlanıyor`);
        await pool.query(
          `INSERT INTO published_matches 
           (fixture_id, home_team, away_team, home_logo, away_logo, league_name, league_logo, league_id,
            match_date, match_time, timestamp, status, is_featured,
            api_advice, api_winner_name, api_winner_comment, api_percent_home, api_percent_draw, api_percent_away,
            api_under_over, api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', FALSE,
                   $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
          [
            match.fixture.id,
            homeTeam,
            awayTeam,
            homeLogo,
            awayLogo,
            leagueName,
            leagueLogo,
            leagueId,
            matchDate,
            matchTime,
            match.fixture.timestamp,
            pred?.advice || null,
            pred?.winner?.name || null,
            pred?.winner?.comment || null,
            pred?.percent?.home || null,
            pred?.percent?.draw || null,
            pred?.percent?.away || null,
            pred?.under_over || null,
            pred?.goals?.home || null,
            pred?.goals?.away || null,
            comparison ? JSON.stringify(comparison) : null,
            h2h.length > 0 ? JSON.stringify(h2h.slice(0, 5).map((h: any) => ({
              date: h.fixture?.date,
              homeTeam: h.teams?.home?.name,
              awayTeam: h.teams?.away?.name,
              homeGoals: h.goals?.home,
              awayGoals: h.goals?.away
            }))) : null,
            teams ? JSON.stringify(teams) : null
          ]
        );
        
        publishedCount++;
        console.log(`[AutoPublish] Published: ${homeTeam} vs ${awayTeam}`);
        
        // Get the newly inserted match ID and save prediction
        const insertedMatch = await pool.query(
          'SELECT id FROM published_matches WHERE fixture_id = $1',
          [match.fixture.id]
        );
        
        if (insertedMatch.rows.length > 0) {
          const matchId = insertedMatch.rows[0].id;
          await saveBestBetsFromAnalysis(matchId, match.fixture.id, homeTeam, awayTeam, homeLogo, awayLogo, leagueName, leagueLogo, matchDate, matchTime, aiAnalysis);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`[AutoPublish] Error publishing match:`, error);
      }
    }
    
    stats.published = publishedCount;
    
    console.log(`\n[AutoPublish] ==========================================`);
    console.log(`[AutoPublish] ÖZET - ${dateStr}`);
    console.log(`[AutoPublish] ==========================================`);
    console.log(`[AutoPublish] Çekilen maç: ${stats.fetched}`);
    console.log(`[AutoPublish] Filtre sonrası: ${stats.filtered}`);
    console.log(`[AutoPublish] İstatistik+Oran geçen: ${stats.withStats}`);
    console.log(`[AutoPublish] AI Bahis: ${publishedCount}`);
    console.log(`[AutoPublish] AI Pas: ${passedCount}`);
    console.log(`[AutoPublish] YAYINLANAN: ${publishedCount}`);
    console.log(`[AutoPublish] ==========================================\n`);
    
    if (publishedCount > 0) {
      try {
        const couponResult = await autoCreateDailyCoupon(dateStr);
        if (couponResult) {
          console.log(`[AutoPublish] Günün kuponu otomatik oluşturuldu: ${couponResult.matchCount} maç`);
        }
      } catch (couponError) {
        console.error('[AutoPublish] Kupon oluşturma hatası:', couponError);
      }
    }

    return { 
      published: publishedCount, 
      total: scoredMatches.length,
      date: dateStr,
      stats
    };
    
  } catch (error) {
    console.error('[AutoPublish] Error:', error);
    throw error;
  }
}

export async function autoCreateDailyCoupon(dateStr: string): Promise<{ couponId: number; matchCount: number } | null> {
  try {
    const existing = await pool.query(
      'SELECT id FROM coupons WHERE coupon_date = $1',
      [dateStr]
    );
    if (existing.rows.length > 0) {
      console.log(`[AutoCoupon] ${dateStr} için kupon zaten mevcut (ID: ${existing.rows[0].id})`);
      return null;
    }

    const betsResult = await pool.query(
      `SELECT id, home_team, away_team, bet_type, confidence, odds, fixture_id
       FROM best_bets 
       WHERE date_for = $1 AND bet_category = 'primary' AND result = 'pending'
       ORDER BY confidence DESC, odds DESC`,
      [dateStr]
    );

    if (betsResult.rows.length < 2) {
      console.log(`[AutoCoupon] ${dateStr} için yeterli tahmin yok (${betsResult.rows.length})`);
      return null;
    }

    const selectedBets = betsResult.rows.slice(0, 3);

    const couponResult = await pool.query(
      'INSERT INTO coupons (name, coupon_date) VALUES ($1, $2) RETURNING *',
      [`Günün Kuponu`, dateStr]
    );
    const couponId = couponResult.rows[0].id;

    let totalOdds = 1;
    for (const bet of selectedBets) {
      await pool.query(
        'INSERT INTO coupon_predictions (coupon_id, best_bet_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [couponId, bet.id]
      );
      const odds = parseFloat(bet.odds);
      if (odds && odds > 1) totalOdds *= odds;
      else totalOdds *= 1.65;
    }

    await pool.query(
      'UPDATE coupons SET combined_odds = $1 WHERE id = $2',
      [totalOdds.toFixed(2), couponId]
    );

    console.log(`[AutoCoupon] Kupon oluşturuldu: ${selectedBets.length} maç, toplam oran: ${totalOdds.toFixed(2)}`);
    selectedBets.forEach(b => console.log(`  - ${b.home_team} vs ${b.away_team}: ${b.bet_type} @${b.odds}`));

    return { couponId, matchCount: selectedBets.length };
  } catch (error) {
    console.error('[AutoCoupon] Hata:', error);
    return null;
  }
}

// Publish tomorrow's matches (used by automatic 22:00 scheduler)
export async function autoPublishTomorrowMatches(totalLimit: number = 70, matchesPerHour: number = 5) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log(`[AutoPublish] Tomorrow's matches: ${tomorrowStr}`);
  return publishMatchesForDate(tomorrowStr, totalLimit, matchesPerHour);
}

// Publish today's matches (used by manual admin button)
export async function autoPublishTodayMatches(totalLimit: number = 70, matchesPerHour: number = 5) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  console.log(`[AutoPublish] Today's matches: ${todayStr}`);
  return publishMatchesForDate(todayStr, totalLimit, matchesPerHour);
}

// OLD function kept for compatibility - redirects to new function
export async function autoPublishTomorrowMatchesLegacy(targetCount: number = 70) {
  console.log('[AutoPublish] Legacy function called, redirecting to new system...');
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`[AutoPublish] Fetching ALL matches for ${tomorrowStr} (no league filter)...`);
    
    // Fetch ALL fixtures for the date - no league filter
    let allMatches: any[] = [];
    
    try {
      const fixtures = await apiFootball.getFixtures({
        date: tomorrowStr
      });
      
      if (fixtures && fixtures.length > 0) {
        allMatches = fixtures;
        console.log(`[AutoPublish] Found ${allMatches.length} total matches for ${tomorrowStr}`);
      }
    } catch (error: any) {
      console.log(`[AutoPublish] Error fetching fixtures:`, error?.message || error);
      return { published: 0, total: 0, date: tomorrowStr };
    }
    
    console.log(`[AutoPublish] Total matches found: ${allMatches.length}`);
    
    if (allMatches.length === 0) {
      console.log('[AutoPublish] No matches found for tomorrow');
      return { published: 0, total: 0, date: tomorrowStr };
    }
    
    const formattedMatches = allMatches.map(f => ({
      fixture: f.fixture,
      league: f.league,
      teams: f.teams,
      goals: f.goals
    }));
    
    const filteredMatches = filterMatches(formattedMatches);
    console.log(`[AutoPublish] After filtering: ${filteredMatches.length} matches`);
    
    const scoredMatches: MatchWithScore[] = [];
    const minStatsScore = 35;
    const targetWithBuffer = Math.ceil(targetCount * 1.5); // Get extra matches for better selection
    
    console.log(`[AutoPublish] Processing ${filteredMatches.length} matches to find ${targetCount} with valid statistics (buffer: ${targetWithBuffer})...`);
    
    let processedCount = 0;
    let skippedLowStats = 0;
    let skippedNoOdds = 0;
    
    // Process all filtered matches until we have enough valid ones
    for (const match of filteredMatches) {
      // Stop if we have enough valid matches
      if (scoredMatches.length >= targetWithBuffer) {
        console.log(`[AutoPublish] Reached target buffer of ${targetWithBuffer} matches, stopping processing`);
        break;
      }
      
      processedCount++;
      
      try {
        const homeTeam = match.teams?.home?.name || '';
        const awayTeam = match.teams?.away?.name || '';
        
        // Fetch API-Football prediction for statistics
        const prediction = await apiFootball.getPrediction(match.fixture.id);
        
        if (!prediction) {
          skippedLowStats++;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        const statsScore = getStatisticsScore(prediction);
        
        if (statsScore < minStatsScore) {
          skippedLowStats++;
          if (skippedLowStats % 50 === 0) {
            console.log(`[AutoPublish] Skipped ${skippedLowStats} matches with low stats so far...`);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Fetch odds from API-Football
        let parsedOdds: ParsedOdds = {};
        try {
          const oddsData = await apiFootball.getOdds(match.fixture.id);
          parsedOdds = parseApiFootballOdds(oddsData);
        } catch (oddsError: any) {
          console.log(`[AutoPublish] No odds for ${homeTeam} vs ${awayTeam}`);
        }
        
        // Check if match has essential odds (MS or over/under)
        const hasBasicOdds = parsedOdds.home && parsedOdds.draw && parsedOdds.away;
        const hasOverUnderOdds = parsedOdds.over25 || parsedOdds.over15 || parsedOdds.over35;
        const hasBttsOdds = parsedOdds.bttsYes && parsedOdds.bttsNo;
        
        // Must have at least MS odds AND (over/under OR btts)
        if (!hasBasicOdds || (!hasOverUnderOdds && !hasBttsOdds)) {
          skippedNoOdds++;
          console.log(`[AutoPublish] Skipping ${homeTeam} vs ${awayTeam} - insufficient odds data`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        console.log(`[AutoPublish] [${scoredMatches.length + 1}/${targetCount}] Valid match: ${homeTeam} vs ${awayTeam} (stats: ${statsScore}, odds: complete)`);
        
        scoredMatches.push({
          fixture: match.fixture,
          prediction: prediction,
          league: match.league,
          teams: match.teams,
          statisticsScore: statsScore,
          odds: parsedOdds
        });
        
        // 1.5 second delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error: any) {
        console.log(`[AutoPublish] Error processing match ${match.fixture.id}:`, error?.message || error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`[AutoPublish] Processing complete:`);
    console.log(`  - Total processed: ${processedCount}`);
    console.log(`  - Skipped (no odds): ${skippedNoOdds}`);
    console.log(`  - Skipped (low stats): ${skippedLowStats}`);
    console.log(`  - Valid matches: ${scoredMatches.length}`);
    
    scoredMatches.sort((a, b) => b.statisticsScore - a.statisticsScore);
    const matchesToPublish = scoredMatches.slice(0, targetCount);
    
    console.log(`[AutoPublish] Publishing top ${matchesToPublish.length} matches...`);
    
    let publishedCount = 0;
    let passedCount = 0;
    
    for (const match of matchesToPublish) {
      try {
        const existing = await pool.query(
          'SELECT id FROM published_matches WHERE fixture_id = $1',
          [match.fixture.id]
        );
        
        if (existing.rows.length > 0) {
          console.log(`[AutoPublish] Match ${match.fixture.id} already published, skipping`);
          continue;
        }
        
        const homeTeam = match.teams?.home?.name || 'Unknown';
        const awayTeam = match.teams?.away?.name || 'Unknown';
        const homeLogo = match.teams?.home?.logo || '';
        const awayLogo = match.teams?.away?.logo || '';
        const leagueName = match.league?.name || '';
        const leagueLogo = match.league?.logo || '';
        const leagueId = match.league?.id;
        
        const matchDate = match.fixture.date?.split('T')[0];
        const matchDateTime = new Date(match.fixture.date);
        const matchTime = matchDateTime.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Istanbul'
        });
        
        const pred = match.prediction?.predictions;
        const teams = match.prediction?.teams;
        const comparison = match.prediction?.comparison;
        const h2h = match.prediction?.h2h || [];
        
        // Fetch additional data for enhanced AI analysis
        const homeTeamId = match.teams?.home?.id;
        const awayTeamId = match.teams?.away?.id;
        const fixtureId = match.fixture?.id;
        
        let injuries: any = { home: [], away: [] };
        let homeLastMatches: any[] = [];
        let awayLastMatches: any[] = [];
        let homeSeasonStats: any = null;
        let awaySeasonStats: any = null;
        
        try {
          if (fixtureId) {
            const injuriesData = await apiFootball.getInjuries(fixtureId);
            if (injuriesData && Array.isArray(injuriesData)) {
              injuries.home = injuriesData
                .filter((inj: any) => inj.team?.id === homeTeamId)
                .map((inj: any) => ({
                  player: inj.player?.name || 'Unknown',
                  reason: inj.player?.reason || 'Injury',
                  type: inj.player?.type || 'Missing'
                }));
              injuries.away = injuriesData
                .filter((inj: any) => inj.team?.id === awayTeamId)
                .map((inj: any) => ({
                  player: inj.player?.name || 'Unknown',
                  reason: inj.player?.reason || 'Injury',
                  type: inj.player?.type || 'Missing'
                }));
            }
          }
        } catch (err: any) { /* skip */ }
        
        try {
          if (homeTeamId) {
            const homeMatches = await apiFootball.getTeamLastMatches(homeTeamId, 10);
            homeLastMatches = homeMatches?.map((m: any) => ({
              opponent: m.teams?.home?.id === homeTeamId ? m.teams?.away?.name : m.teams?.home?.name,
              result: m.teams?.home?.id === homeTeamId
                ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D')
                : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'),
              score: `${m.goals?.home || 0}-${m.goals?.away || 0}`,
              home: m.teams?.home?.id === homeTeamId
            })) || [];
          }
        } catch (err: any) { /* skip */ }
        
        try {
          if (awayTeamId) {
            const awayMatches = await apiFootball.getTeamLastMatches(awayTeamId, 10);
            awayLastMatches = awayMatches?.map((m: any) => ({
              opponent: m.teams?.home?.id === awayTeamId ? m.teams?.away?.name : m.teams?.home?.name,
              result: m.teams?.home?.id === awayTeamId
                ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D')
                : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'),
              score: `${m.goals?.home || 0}-${m.goals?.away || 0}`,
              home: m.teams?.home?.id === awayTeamId
            })) || [];
          }
        } catch (err: any) { /* skip */ }
        
        try {
          if (homeTeamId && leagueId) {
            homeSeasonStats = await apiFootball.getTeamSeasonGoals(homeTeamId, leagueId, CURRENT_SEASON);
          }
        } catch (err: any) { /* skip */ }
        
        try {
          if (awayTeamId && leagueId) {
            awaySeasonStats = await apiFootball.getTeamSeasonGoals(awayTeamId, leagueId, CURRENT_SEASON);
          }
        } catch (err: any) { /* skip */ }
        
        // Build match data for AI analysis with all available data
        const matchData: MatchData = {
          homeTeam,
          awayTeam,
          league: leagueName,
          leagueId: leagueId,
          comparison: comparison || undefined,
          homeForm: teams?.home?.league?.form,
          awayForm: teams?.away?.league?.form,
          h2hResults: h2h?.map((h: any) => ({
            homeGoals: h.homeGoals || h.goals?.home || 0,
            awayGoals: h.awayGoals || h.goals?.away || 0
          })),
          homeWins: teams?.home?.league?.wins,
          homeDraws: teams?.home?.league?.draws,
          homeLosses: teams?.home?.league?.loses,
          homeGoalsFor: teams?.home?.league?.goals?.for?.total,
          homeGoalsAgainst: teams?.home?.league?.goals?.against?.total,
          awayWins: teams?.away?.league?.wins,
          awayDraws: teams?.away?.league?.draws,
          awayLosses: teams?.away?.league?.loses,
          awayGoalsFor: teams?.away?.league?.goals?.for?.total,
          awayGoalsAgainst: teams?.away?.league?.goals?.against?.total,
          odds: match.odds,
          // Enhanced data from new API endpoints
          injuries: injuries,
          homeLastMatches: homeLastMatches,
          awayLastMatches: awayLastMatches,
          homeTeamStats: homeSeasonStats ? {
            cleanSheets: homeSeasonStats.clean_sheet?.total || 0,
            failedToScore: homeSeasonStats.failed_to_score?.total || 0,
            avgGoalsHome: homeSeasonStats.goals?.for?.average?.home ? parseFloat(homeSeasonStats.goals.for.average.home) : undefined,
            avgGoalsAway: homeSeasonStats.goals?.for?.average?.away ? parseFloat(homeSeasonStats.goals.for.average.away) : undefined,
            avgGoalsConcededHome: homeSeasonStats.goals?.against?.average?.home ? parseFloat(homeSeasonStats.goals.against.average.home) : undefined,
            avgGoalsConcededAway: homeSeasonStats.goals?.against?.average?.away ? parseFloat(homeSeasonStats.goals.against.average.away) : undefined,
            biggestWinStreak: homeSeasonStats.biggest?.streak?.wins || 0,
            biggestLoseStreak: homeSeasonStats.biggest?.streak?.loses || 0,
          } : undefined,
          awayTeamStats: awaySeasonStats ? {
            cleanSheets: awaySeasonStats.clean_sheet?.total || 0,
            failedToScore: awaySeasonStats.failed_to_score?.total || 0,
            avgGoalsHome: awaySeasonStats.goals?.for?.average?.home ? parseFloat(awaySeasonStats.goals.for.average.home) : undefined,
            avgGoalsAway: awaySeasonStats.goals?.for?.average?.away ? parseFloat(awaySeasonStats.goals.for.average.away) : undefined,
            avgGoalsConcededHome: awaySeasonStats.goals?.against?.average?.home ? parseFloat(awaySeasonStats.goals.against.average.home) : undefined,
            avgGoalsConcededAway: awaySeasonStats.goals?.against?.average?.away ? parseFloat(awaySeasonStats.goals.against.average.away) : undefined,
            biggestWinStreak: awaySeasonStats.biggest?.streak?.wins || 0,
            biggestLoseStreak: awaySeasonStats.biggest?.streak?.loses || 0,
          } : undefined,
        };
        
        // Check AI decision before publishing
        console.log(`[AutoPublish] AI analyzing: ${homeTeam} vs ${awayTeam}...`);
        let aiAnalysis;
        try {
          aiAnalysis = await generateMatchAnalysis(matchData);
        } catch (aiError: any) {
          console.error(`[AutoPublish] AI HATA: ${homeTeam} vs ${awayTeam} - ${aiError.message}`);
          continue;
        }
        
        // If AI says "pas", skip this match entirely
        if (!aiAnalysis || aiAnalysis.karar === 'pas') {
          passedCount++;
          console.log(`[AutoPublish] PAS: ${homeTeam} vs ${awayTeam} - belirsiz maç`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // AI said "bahis" - proceed with publishing
        console.log(`[AutoPublish] BAHİS: ${homeTeam} vs ${awayTeam} - yayınlanıyor`);
        await pool.query(
          `INSERT INTO published_matches 
           (fixture_id, home_team, away_team, home_logo, away_logo, league_name, league_logo, league_id,
            match_date, match_time, timestamp, status, is_featured,
            api_advice, api_winner_name, api_winner_comment, api_percent_home, api_percent_draw, api_percent_away,
            api_under_over, api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', FALSE,
                   $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
          [
            match.fixture.id,
            homeTeam,
            awayTeam,
            homeLogo,
            awayLogo,
            leagueName,
            leagueLogo,
            leagueId,
            matchDate,
            matchTime,
            match.fixture.timestamp,
            pred?.advice || null,
            pred?.winner?.name || null,
            pred?.winner?.comment || null,
            pred?.percent?.home || null,
            pred?.percent?.draw || null,
            pred?.percent?.away || null,
            pred?.under_over || null,
            pred?.goals?.home || null,
            pred?.goals?.away || null,
            comparison ? JSON.stringify(comparison) : null,
            h2h.length > 0 ? JSON.stringify(h2h.slice(0, 5).map((h: any) => ({
              date: h.fixture?.date,
              homeTeam: h.teams?.home?.name,
              awayTeam: h.teams?.away?.name,
              homeGoals: h.goals?.home,
              awayGoals: h.goals?.away
            }))) : null,
            teams ? JSON.stringify(teams) : null
          ]
        );
        
        publishedCount++;
        console.log(`[AutoPublish] Published: ${homeTeam} vs ${awayTeam} (score: ${match.statisticsScore})`);
        
        // Get the newly inserted match ID and save prediction
        const insertedMatch = await pool.query(
          'SELECT id FROM published_matches WHERE fixture_id = $1',
          [match.fixture.id]
        );
        
        if (insertedMatch.rows.length > 0) {
          const matchId = insertedMatch.rows[0].id;
          await saveBestBetsFromAnalysis(matchId, match.fixture.id, homeTeam, awayTeam, homeLogo, awayLogo, leagueName, leagueLogo, matchDate, matchTime, aiAnalysis);
        }
        
        // Wait between AI calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`[AutoPublish] Error publishing match ${match.fixture.id}:`, error);
      }
    }
    
    console.log(`[AutoPublish] Completed! Published ${publishedCount}, Passed ${passedCount} of ${matchesToPublish.length} matches`);
    
    return { 
      published: publishedCount, 
      total: matchesToPublish.length,
      date: tomorrowStr 
    };
    
  } catch (error) {
    console.error('[AutoPublish] Error:', error);
    throw error;
  }
}

let autoPublishInterval: NodeJS.Timeout | null = null;

// Pre-fetch validated fixtures and cache them
export async function prefetchValidatedFixtures(dateStr: string) {
  console.log(`[Prefetch] Starting pre-fetch for ${dateStr}...`);
  
  try {
    const cacheKey = `prefetch_validated_${dateStr}`;
    
    // Check if already cached
    const existing = await pool.query(
      'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
      [cacheKey]
    );
    
    if (existing.rows.length > 0) {
      console.log(`[Prefetch] Already cached for ${dateStr}`);
      return JSON.parse(existing.rows[0].value);
    }
    
    // Fetch all fixtures for the date
    const fixtures = await apiFootball.getFixtures({ date: dateStr });
    console.log(`[Prefetch] Found ${fixtures.length} total matches for ${dateStr}`);
    
    const filteredFixtures = filterMatches(fixtures);
    console.log(`[Prefetch] After basic filter: ${filteredFixtures.length} matches`);
    
    // Validate each fixture (stats + odds)
    const validatedFixtures: MatchWithScore[] = [];
    const batchSize = 5;
    const delayBetweenBatches = 2000;
    const minStatsScore = 35;
    
    for (let i = 0; i < filteredFixtures.length && validatedFixtures.length < 150; i += batchSize) {
      const batch = filteredFixtures.slice(i, i + batchSize);
      
      for (const match of batch) {
        try {
          const homeTeam = match.teams?.home?.name || '';
          const awayTeam = match.teams?.away?.name || '';
          
          // Check if already published
          const existing = await pool.query(
            'SELECT id FROM published_matches WHERE fixture_id = $1',
            [match.fixture.id]
          );
          if (existing.rows.length > 0) continue;
          
          // Get prediction data
          const prediction = await apiFootball.getPrediction(match.fixture.id);
          if (!prediction) continue;
          
          const statsScore = getStatisticsScore(prediction);
          if (statsScore < minStatsScore) continue;
          
          // Check odds
          let parsedOdds: ParsedOdds = {};
          try {
            const oddsData = await apiFootball.getOdds(match.fixture.id);
            parsedOdds = parseApiFootballOdds(oddsData);
          } catch (e) {
            continue;
          }
          
          const hasBasicOdds = parsedOdds.home && parsedOdds.draw && parsedOdds.away;
          const hasOverUnderOdds = parsedOdds.over25 || parsedOdds.over15 || parsedOdds.over35;
          const hasBttsOdds = parsedOdds.bttsYes && parsedOdds.bttsNo;
          
          if (!hasBasicOdds || (!hasOverUnderOdds && !hasBttsOdds)) continue;
          
          console.log(`[Prefetch] Valid: ${homeTeam} vs ${awayTeam} (score: ${statsScore})`);
          
          validatedFixtures.push({
            fixture: match.fixture,
            prediction,
            league: match.league,
            teams: match.teams,
            statisticsScore: statsScore,
            odds: parsedOdds
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          continue;
        }
      }
      
      if (i + batchSize < filteredFixtures.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    console.log(`[Prefetch] Validated ${validatedFixtures.length} matches for ${dateStr}`);
    
    // Cache for 4 hours
    await pool.query(
      `INSERT INTO api_cache (key, value, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '4 hours')
       ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '4 hours'`,
      [cacheKey, JSON.stringify(validatedFixtures)]
    );
    
    return validatedFixtures;
  } catch (error) {
    console.error('[Prefetch] Error:', error);
    throw error;
  }
}

// Publish from pre-fetched validated fixtures
export async function publishFromPrefetchedFixtures(dateStr: string, totalLimit: number = 70, matchesPerHour: number = 5) {
  console.log(`[AutoPublish] Publishing from prefetched data for ${dateStr}...`);
  
  const cacheKey = `prefetch_validated_${dateStr}`;
  
  // Try to get from cache first
  const cached = await pool.query(
    'SELECT value FROM api_cache WHERE key = $1 AND expires_at > NOW()',
    [cacheKey]
  );
  
  let validatedFixtures: MatchWithScore[];
  
  if (cached.rows.length > 0) {
    console.log('[AutoPublish] Using prefetched data from cache');
    validatedFixtures = JSON.parse(cached.rows[0].value);
  } else {
    console.log('[AutoPublish] No prefetch cache, fetching now...');
    validatedFixtures = await prefetchValidatedFixtures(dateStr);
  }
  
  if (!validatedFixtures || validatedFixtures.length === 0) {
    console.log('[AutoPublish] No validated fixtures to publish');
    return { published: 0, total: 0, date: dateStr };
  }
  
  // Group by hour
  const matchesByHour: Map<number, MatchWithScore[]> = new Map();
  
  for (const match of validatedFixtures) {
    const matchDate = new Date(match.fixture.date);
    const hour = matchDate.getHours();
    
    if (!matchesByHour.has(hour)) {
      matchesByHour.set(hour, []);
    }
    matchesByHour.get(hour)!.push(match);
  }
  
  // Select matches per hour
  const matchesToPublish: MatchWithScore[] = [];
  const sortedHours = Array.from(matchesByHour.keys()).sort((a, b) => a - b);
  
  for (const hour of sortedHours) {
    if (matchesToPublish.length >= totalLimit) break;
    
    const hourMatches = matchesByHour.get(hour)!;
    const toTake = Math.min(matchesPerHour, totalLimit - matchesToPublish.length);
    matchesToPublish.push(...hourMatches.slice(0, toTake));
  }
  
  console.log(`[AutoPublish] Publishing ${matchesToPublish.length} matches...`);
  
  let publishedCount = 0;
  let passedCount = 0;
  
  for (const match of matchesToPublish) {
    try {
      // Check if already published
      const existing = await pool.query(
        'SELECT id FROM published_matches WHERE fixture_id = $1',
        [match.fixture.id]
      );
      if (existing.rows.length > 0) continue;
      
      const homeTeam = match.teams?.home?.name || 'Unknown';
      const awayTeam = match.teams?.away?.name || 'Unknown';
      const homeLogo = match.teams?.home?.logo || '';
      const awayLogo = match.teams?.away?.logo || '';
      const leagueName = match.league?.name || '';
      const leagueLogo = match.league?.logo || '';
      const leagueId = match.league?.id;
      
      const matchDate = match.fixture.date?.split('T')[0];
      const matchDateTime = new Date(match.fixture.date);
      const matchTime = matchDateTime.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
      });
      
      const pred = match.prediction?.predictions;
      const teams = match.prediction?.teams;
      const comparison = match.prediction?.comparison;
      const h2h = match.prediction?.h2h || [];
      
      // Fetch additional data for enhanced AI analysis
      const homeTeamId = match.teams?.home?.id;
      const awayTeamId = match.teams?.away?.id;
      const fixtureId = match.fixture?.id;
      
      let injuries: any = { home: [], away: [] };
      let homeLastMatches: any[] = [];
      let awayLastMatches: any[] = [];
      let homeSeasonStats: any = null;
      let awaySeasonStats: any = null;
      
      try {
        if (fixtureId) {
          const injuriesData = await apiFootball.getInjuries(fixtureId);
          if (injuriesData && Array.isArray(injuriesData)) {
            injuries.home = injuriesData
              .filter((inj: any) => inj.team?.id === homeTeamId)
              .map((inj: any) => ({
                player: inj.player?.name || 'Unknown',
                reason: inj.player?.reason || 'Injury',
                type: inj.player?.type || 'Missing'
              }));
            injuries.away = injuriesData
              .filter((inj: any) => inj.team?.id === awayTeamId)
              .map((inj: any) => ({
                player: inj.player?.name || 'Unknown',
                reason: inj.player?.reason || 'Injury',
                type: inj.player?.type || 'Missing'
              }));
          }
        }
      } catch (err: any) { /* skip */ }
      
      try {
        if (homeTeamId) {
          const homeMatches = await apiFootball.getTeamLastMatches(homeTeamId, 10);
          homeLastMatches = homeMatches?.map((m: any) => ({
            opponent: m.teams?.home?.id === homeTeamId ? m.teams?.away?.name : m.teams?.home?.name,
            result: m.teams?.home?.id === homeTeamId
              ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D')
              : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'),
            score: `${m.goals?.home || 0}-${m.goals?.away || 0}`,
            home: m.teams?.home?.id === homeTeamId
          })) || [];
        }
      } catch (err: any) { /* skip */ }
      
      try {
        if (awayTeamId) {
          const awayMatches = await apiFootball.getTeamLastMatches(awayTeamId, 10);
          awayLastMatches = awayMatches?.map((m: any) => ({
            opponent: m.teams?.home?.id === awayTeamId ? m.teams?.away?.name : m.teams?.home?.name,
            result: m.teams?.home?.id === awayTeamId
              ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D')
              : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'),
            score: `${m.goals?.home || 0}-${m.goals?.away || 0}`,
            home: m.teams?.home?.id === awayTeamId
          })) || [];
        }
      } catch (err: any) { /* skip */ }
      
      try {
        if (homeTeamId && leagueId) {
          homeSeasonStats = await apiFootball.getTeamSeasonGoals(homeTeamId, leagueId, CURRENT_SEASON);
        }
      } catch (err: any) { /* skip */ }
      
      try {
        if (awayTeamId && leagueId) {
          awaySeasonStats = await apiFootball.getTeamSeasonGoals(awayTeamId, leagueId, CURRENT_SEASON);
        }
      } catch (err: any) { /* skip */ }
      
      // Build match data for AI analysis with all available data
      const matchData: MatchData = {
        homeTeam,
        awayTeam,
        league: leagueName,
        leagueId,
        comparison: comparison || undefined,
        homeForm: teams?.home?.league?.form,
        awayForm: teams?.away?.league?.form,
        h2hResults: h2h?.map((h: any) => ({
          homeGoals: h.homeGoals || h.goals?.home || 0,
          awayGoals: h.awayGoals || h.goals?.away || 0
        })),
        homeWins: teams?.home?.league?.wins,
        homeDraws: teams?.home?.league?.draws,
        homeLosses: teams?.home?.league?.loses,
        homeGoalsFor: teams?.home?.league?.goals?.for?.total,
        homeGoalsAgainst: teams?.home?.league?.goals?.against?.total,
        awayWins: teams?.away?.league?.wins,
        awayDraws: teams?.away?.league?.draws,
        awayLosses: teams?.away?.league?.loses,
        awayGoalsFor: teams?.away?.league?.goals?.for?.total,
        awayGoalsAgainst: teams?.away?.league?.goals?.against?.total,
        odds: match.odds,
        // Enhanced data from new API endpoints
        injuries: injuries,
        homeLastMatches: homeLastMatches,
        awayLastMatches: awayLastMatches,
        homeTeamStats: homeSeasonStats ? {
          cleanSheets: homeSeasonStats.clean_sheet?.total || 0,
          failedToScore: homeSeasonStats.failed_to_score?.total || 0,
          avgGoalsHome: homeSeasonStats.goals?.for?.average?.home ? parseFloat(homeSeasonStats.goals.for.average.home) : undefined,
          avgGoalsAway: homeSeasonStats.goals?.for?.average?.away ? parseFloat(homeSeasonStats.goals.for.average.away) : undefined,
          avgGoalsConcededHome: homeSeasonStats.goals?.against?.average?.home ? parseFloat(homeSeasonStats.goals.against.average.home) : undefined,
          avgGoalsConcededAway: homeSeasonStats.goals?.against?.average?.away ? parseFloat(homeSeasonStats.goals.against.average.away) : undefined,
          biggestWinStreak: homeSeasonStats.biggest?.streak?.wins || 0,
          biggestLoseStreak: homeSeasonStats.biggest?.streak?.loses || 0,
        } : undefined,
        awayTeamStats: awaySeasonStats ? {
          cleanSheets: awaySeasonStats.clean_sheet?.total || 0,
          failedToScore: awaySeasonStats.failed_to_score?.total || 0,
          avgGoalsHome: awaySeasonStats.goals?.for?.average?.home ? parseFloat(awaySeasonStats.goals.for.average.home) : undefined,
          avgGoalsAway: awaySeasonStats.goals?.for?.average?.away ? parseFloat(awaySeasonStats.goals.for.average.away) : undefined,
          avgGoalsConcededHome: awaySeasonStats.goals?.against?.average?.home ? parseFloat(awaySeasonStats.goals.against.average.home) : undefined,
          avgGoalsConcededAway: awaySeasonStats.goals?.against?.average?.away ? parseFloat(awaySeasonStats.goals.against.average.away) : undefined,
          biggestWinStreak: awaySeasonStats.biggest?.streak?.wins || 0,
          biggestLoseStreak: awaySeasonStats.biggest?.streak?.loses || 0,
        } : undefined,
      };
      
      // FIRST: Check AI decision before publishing
      console.log(`[AutoPublish] Checking AI decision for ${homeTeam} vs ${awayTeam}...`);
      let aiAnalysis;
      try {
        aiAnalysis = await generateMatchAnalysis(matchData);
      } catch (aiError: any) {
        console.error(`[AutoPublish] AI analysis failed for ${homeTeam} vs ${awayTeam}:`, aiError.message);
        continue;
      }
      
      // If AI says "pas", skip this match entirely
      if (!aiAnalysis || aiAnalysis.karar === 'pas') {
        passedCount++;
        console.log(`[AutoPublish] SKIPPED (pas): ${homeTeam} vs ${awayTeam} - no confident prediction`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      // AI said "bahis" - proceed with publishing
      await pool.query(
        `INSERT INTO published_matches 
         (fixture_id, home_team, away_team, home_logo, away_logo, league_name, league_logo, league_id,
          match_date, match_time, timestamp, status, is_featured,
          api_advice, api_winner_name, api_winner_comment, api_percent_home, api_percent_draw, api_percent_away,
          api_under_over, api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', FALSE,
                 $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
        [
          match.fixture.id,
          homeTeam,
          awayTeam,
          homeLogo,
          awayLogo,
          leagueName,
          leagueLogo,
          leagueId,
          matchDate,
          matchTime,
          match.fixture.timestamp,
          pred?.advice || null,
          pred?.winner?.name || null,
          pred?.winner?.comment || null,
          pred?.percent?.home || null,
          pred?.percent?.draw || null,
          pred?.percent?.away || null,
          pred?.under_over || null,
          pred?.goals?.home || null,
          pred?.goals?.away || null,
          comparison ? JSON.stringify(comparison) : null,
          h2h.length > 0 ? JSON.stringify(h2h.slice(0, 5).map((h: any) => ({
            date: h.fixture?.date,
            homeTeam: h.teams?.home?.name,
            awayTeam: h.teams?.away?.name,
            homeGoals: h.goals?.home,
            awayGoals: h.goals?.away
          }))) : null,
          teams ? JSON.stringify(teams) : null
        ]
      );
      
      publishedCount++;
      console.log(`[AutoPublish] Published: ${homeTeam} vs ${awayTeam}`);
      
      // Get the newly inserted match ID and save prediction
      const insertedMatch = await pool.query(
        'SELECT id FROM published_matches WHERE fixture_id = $1',
        [match.fixture.id]
      );
      
      if (insertedMatch.rows.length > 0) {
        const matchId = insertedMatch.rows[0].id;
        await saveBestBetsFromAnalysis(matchId, match.fixture.id, homeTeam, awayTeam, homeLogo, awayLogo, leagueName, leagueLogo, matchDate, matchTime, aiAnalysis);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`[AutoPublish] Error publishing match:`, error);
    }
  }
  
  console.log(`[AutoPublish] Completed! Published ${publishedCount}, Passed ${passedCount} matches`);
  
  return { published: publishedCount, total: matchesToPublish.length, date: dateStr };
}

// Updated auto-publish functions using validated fixtures
export async function autoPublishTomorrowMatchesValidated(totalLimit: number = 70, matchesPerHour: number = 5) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log(`[AutoPublish] Tomorrow's validated matches: ${tomorrowStr}`);
  return publishFromPrefetchedFixtures(tomorrowStr, totalLimit, matchesPerHour);
}

export async function autoPublishTodayMatchesValidated(totalLimit: number = 70, matchesPerHour: number = 5) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  console.log(`[AutoPublish] Today's validated matches: ${todayStr}`);
  return publishFromPrefetchedFixtures(todayStr, totalLimit, matchesPerHour);
}

export function startAutoPublishService() {
  console.log(`[AutoPublish] Service scheduled: daily 3-step publish at 01:00 (Turkey time)`);
  
  let lastRunDate = '';
  
  const checkAndRun = async () => {
    const now = new Date();
    const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const currentHour = turkeyTime.getHours();
    const currentMinute = turkeyTime.getMinutes();
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    
    if (currentHour === 1 && currentMinute >= 0 && currentMinute < 5 && lastRunDate !== todayStr) {
      lastRunDate = todayStr;
      
      console.log('[AutoPublish] ========================================');
      console.log('[AutoPublish] GUNLUK OTOMATIK SISTEM BASLADI - 01:00');
      console.log(`[AutoPublish] Tarih: ${todayStr}`);
      console.log('[AutoPublish] ========================================');
      
      try {
        // ADIM 1: Kaliteli maclari cek (fetch + filter + validate stats/odds)
        console.log('[AutoPublish] ADIM 1/3: Kaliteli maclar cekiliyoro...');
        const validatedFixtures = await prefetchValidatedFixtures(todayStr);
        console.log(`[AutoPublish] ADIM 1 TAMAM: ${validatedFixtures?.length || 0} kaliteli mac bulundu`);
        
        if (!validatedFixtures || validatedFixtures.length === 0) {
          console.log('[AutoPublish] Kaliteli mac bulunamadi, islem iptal');
          return;
        }
        
        // ADIM 2: AI kontrol - her mac icin bahis/pas karari al
        console.log(`[AutoPublish] ADIM 2/3: AI kontrol basliyor (${validatedFixtures.length} mac)...`);
        let bahisCount = 0;
        let pasCount = 0;
        const bahisMatches: MatchWithScore[] = [];
        
        for (const match of validatedFixtures) {
          const homeTeam = match.teams?.home?.name || 'Unknown';
          const awayTeam = match.teams?.away?.name || 'Unknown';
          const leagueName = match.league?.name || '';
          const leagueId = match.league?.id;
          const homeTeamId = match.teams?.home?.id;
          const awayTeamId = match.teams?.away?.id;
          const fixtureId = match.fixture?.id;
          
          try {
            const existing = await pool.query(
              'SELECT id FROM published_matches WHERE fixture_id = $1',
              [match.fixture.id]
            );
            if (existing.rows.length > 0) {
              console.log(`[AutoPublish] ${homeTeam} vs ${awayTeam} zaten yayinda, atlaniyor`);
              continue;
            }
            
            const pred = match.prediction?.predictions;
            const teams = match.prediction?.teams;
            const comparison = match.prediction?.comparison;
            const h2h = match.prediction?.h2h || [];
            
            let injuries: any = { home: [], away: [] };
            let homeLastMatches: any[] = [];
            let awayLastMatches: any[] = [];
            let homeSeasonStats: any = null;
            let awaySeasonStats: any = null;
            
            try {
              if (fixtureId) {
                const injuriesData = await apiFootball.getInjuries(fixtureId);
                if (injuriesData && Array.isArray(injuriesData)) {
                  injuries.home = injuriesData.filter((inj: any) => inj.team?.id === homeTeamId).map((inj: any) => ({ player: inj.player?.name || 'Unknown', reason: inj.player?.reason || 'Injury', type: inj.player?.type || 'Missing' }));
                  injuries.away = injuriesData.filter((inj: any) => inj.team?.id === awayTeamId).map((inj: any) => ({ player: inj.player?.name || 'Unknown', reason: inj.player?.reason || 'Injury', type: inj.player?.type || 'Missing' }));
                }
              }
            } catch (err: any) { /* skip */ }
            
            try {
              if (homeTeamId) {
                const homeMatches = await apiFootball.getTeamLastMatches(homeTeamId, 10);
                homeLastMatches = homeMatches?.map((m: any) => ({ opponent: m.teams?.home?.id === homeTeamId ? m.teams?.away?.name : m.teams?.home?.name, result: m.teams?.home?.id === homeTeamId ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D') : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'), score: `${m.goals?.home || 0}-${m.goals?.away || 0}`, home: m.teams?.home?.id === homeTeamId })) || [];
              }
            } catch (err: any) { /* skip */ }
            
            try {
              if (awayTeamId) {
                const awayMatches = await apiFootball.getTeamLastMatches(awayTeamId, 10);
                awayLastMatches = awayMatches?.map((m: any) => ({ opponent: m.teams?.home?.id === awayTeamId ? m.teams?.away?.name : m.teams?.home?.name, result: m.teams?.home?.id === awayTeamId ? (m.teams?.home?.winner ? 'W' : m.teams?.away?.winner ? 'L' : 'D') : (m.teams?.away?.winner ? 'W' : m.teams?.home?.winner ? 'L' : 'D'), score: `${m.goals?.home || 0}-${m.goals?.away || 0}`, home: m.teams?.home?.id === awayTeamId })) || [];
              }
            } catch (err: any) { /* skip */ }
            
            try { if (homeTeamId && leagueId) homeSeasonStats = await apiFootball.getTeamSeasonGoals(homeTeamId, leagueId, CURRENT_SEASON); } catch { /* skip */ }
            try { if (awayTeamId && leagueId) awaySeasonStats = await apiFootball.getTeamSeasonGoals(awayTeamId, leagueId, CURRENT_SEASON); } catch { /* skip */ }
            
            const matchData: MatchData = {
              homeTeam, awayTeam, league: leagueName, leagueId,
              comparison: comparison || undefined,
              homeForm: teams?.home?.league?.form, awayForm: teams?.away?.league?.form,
              h2hResults: h2h?.map((h: any) => ({ homeGoals: h.homeGoals || h.goals?.home || 0, awayGoals: h.awayGoals || h.goals?.away || 0 })),
              homeWins: teams?.home?.league?.wins, homeDraws: teams?.home?.league?.draws, homeLosses: teams?.home?.league?.loses,
              homeGoalsFor: teams?.home?.league?.goals?.for?.total, homeGoalsAgainst: teams?.home?.league?.goals?.against?.total,
              awayWins: teams?.away?.league?.wins, awayDraws: teams?.away?.league?.draws, awayLosses: teams?.away?.league?.loses,
              awayGoalsFor: teams?.away?.league?.goals?.for?.total, awayGoalsAgainst: teams?.away?.league?.goals?.against?.total,
              odds: match.odds,
              injuries, homeLastMatches, awayLastMatches,
              homeTeamStats: homeSeasonStats ? { cleanSheets: homeSeasonStats.clean_sheet?.total || 0, failedToScore: homeSeasonStats.failed_to_score?.total || 0, avgGoalsHome: homeSeasonStats.goals?.for?.average?.home ? parseFloat(homeSeasonStats.goals.for.average.home) : undefined, avgGoalsAway: homeSeasonStats.goals?.for?.average?.away ? parseFloat(homeSeasonStats.goals.for.average.away) : undefined, avgGoalsConcededHome: homeSeasonStats.goals?.against?.average?.home ? parseFloat(homeSeasonStats.goals.against.average.home) : undefined, avgGoalsConcededAway: homeSeasonStats.goals?.against?.average?.away ? parseFloat(homeSeasonStats.goals.against.average.away) : undefined, biggestWinStreak: homeSeasonStats.biggest?.streak?.wins || 0, biggestLoseStreak: homeSeasonStats.biggest?.streak?.loses || 0 } : undefined,
              awayTeamStats: awaySeasonStats ? { cleanSheets: awaySeasonStats.clean_sheet?.total || 0, failedToScore: awaySeasonStats.failed_to_score?.total || 0, avgGoalsHome: awaySeasonStats.goals?.for?.average?.home ? parseFloat(awaySeasonStats.goals.for.average.home) : undefined, avgGoalsAway: awaySeasonStats.goals?.for?.average?.away ? parseFloat(awaySeasonStats.goals.for.average.away) : undefined, avgGoalsConcededHome: awaySeasonStats.goals?.against?.average?.home ? parseFloat(awaySeasonStats.goals.against.average.home) : undefined, avgGoalsConcededAway: awaySeasonStats.goals?.against?.average?.away ? parseFloat(awaySeasonStats.goals.against.average.away) : undefined, biggestWinStreak: awaySeasonStats.biggest?.streak?.wins || 0, biggestLoseStreak: awaySeasonStats.biggest?.streak?.loses || 0 } : undefined,
            };
            
            const aiAnalysis = await generateMatchAnalysis(matchData);
            
            // Cache AI analysis result for admin panel display
            if (aiAnalysis && fixtureId) {
              try {
                const aiCacheKey = `ai_analysis_v10_${fixtureId}`;
                await pool.query(
                  `INSERT INTO api_cache (key, value, expires_at)
                   VALUES ($1, $2, NOW() + INTERVAL '24 hours')
                   ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '24 hours'`,
                  [aiCacheKey, JSON.stringify(aiAnalysis)]
                );
              } catch (cacheErr: any) { /* skip */ }
            }
            
            if (!aiAnalysis || aiAnalysis.karar === 'pas') {
              pasCount++;
              console.log(`[AutoPublish] PAS: ${homeTeam} vs ${awayTeam}`);
            } else {
              bahisCount++;
              console.log(`[AutoPublish] BAHIS: ${homeTeam} vs ${awayTeam}`);
              (match as any).aiAnalysis = aiAnalysis;
              bahisMatches.push(match);
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error: any) {
            console.error(`[AutoPublish] AI hata ${homeTeam} vs ${awayTeam}: ${error.message}`);
          }
        }
        
        console.log(`[AutoPublish] ADIM 2 TAMAM: ${bahisCount} bahis, ${pasCount} pas`);
        
        // ADIM 3: Bahis olan tum maclari yayina al
        console.log(`[AutoPublish] ADIM 3/3: ${bahisMatches.length} bahis mac yayinlaniyor...`);
        let publishedCount = 0;
        
        for (const match of bahisMatches) {
          try {
            const homeTeam = match.teams?.home?.name || 'Unknown';
            const awayTeam = match.teams?.away?.name || 'Unknown';
            const homeLogo = match.teams?.home?.logo || '';
            const awayLogo = match.teams?.away?.logo || '';
            const leagueName = match.league?.name || '';
            const leagueLogo = match.league?.logo || '';
            const leagueId = match.league?.id;
            const matchDate = match.fixture.date?.split('T')[0];
            const matchDateTime = new Date(match.fixture.date);
            const matchTime = matchDateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
            
            const pred = match.prediction?.predictions;
            const teams = match.prediction?.teams;
            const comparison = match.prediction?.comparison;
            const h2h = match.prediction?.h2h || [];
            const aiAnalysis = (match as any).aiAnalysis;
            
            await pool.query(
              `INSERT INTO published_matches 
               (fixture_id, home_team, away_team, home_logo, away_logo, league_name, league_logo, league_id,
                match_date, match_time, timestamp, status, is_featured,
                api_advice, api_winner_name, api_winner_comment, api_percent_home, api_percent_draw, api_percent_away,
                api_under_over, api_goals_home, api_goals_away, api_comparison, api_h2h, api_teams)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', FALSE,
                       $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
               ON CONFLICT (fixture_id) DO NOTHING`,
              [
                match.fixture.id, homeTeam, awayTeam, homeLogo, awayLogo, leagueName, leagueLogo, leagueId,
                matchDate, matchTime, match.fixture.timestamp,
                pred?.advice || null, pred?.winner?.name || null, pred?.winner?.comment || null,
                pred?.percent?.home || null, pred?.percent?.draw || null, pred?.percent?.away || null,
                pred?.under_over || null, pred?.goals?.home || null, pred?.goals?.away || null,
                comparison ? JSON.stringify(comparison) : null,
                h2h.length > 0 ? JSON.stringify(h2h.slice(0, 5).map((h: any) => ({ date: h.fixture?.date, homeTeam: h.teams?.home?.name, awayTeam: h.teams?.away?.name, homeGoals: h.goals?.home, awayGoals: h.goals?.away }))) : null,
                teams ? JSON.stringify(teams) : null
              ]
            );
            
            publishedCount++;
            
            const insertedMatch = await pool.query('SELECT id FROM published_matches WHERE fixture_id = $1', [match.fixture.id]);
            
            if (insertedMatch.rows.length > 0) {
              const matchId = insertedMatch.rows[0].id;
              await saveBestBetsFromAnalysis(matchId, match.fixture.id, homeTeam, awayTeam, homeLogo, awayLogo, leagueName, leagueLogo, matchDate, matchTime, aiAnalysis);
            }
            
            console.log(`[AutoPublish] Yayinlandi: ${homeTeam} vs ${awayTeam}`);
          } catch (error: any) {
            console.error(`[AutoPublish] Yayinlama hatasi:`, error.message);
          }
        }
        
        console.log('[AutoPublish] ========================================');
        console.log(`[AutoPublish] TAMAMLANDI!`);
        console.log(`[AutoPublish] Kaliteli mac: ${validatedFixtures.length}`);
        console.log(`[AutoPublish] AI Bahis: ${bahisCount} | AI Pas: ${pasCount}`);
        console.log(`[AutoPublish] YAYINLANAN: ${publishedCount}`);
        console.log('[AutoPublish] ========================================');
        
      } catch (error) {
        console.error('[AutoPublish] Gunluk islem hatasi:', error);
      }
    }
  };
  
  autoPublishInterval = setInterval(checkAndRun, 5 * 60 * 1000);
  checkAndRun();
}

export function stopAutoPublishService() {
  if (autoPublishInterval) {
    clearInterval(autoPublishInterval);
    autoPublishInterval = null;
    console.log('[AutoPublish] Service stopped');
  }
}

// ============================================================
// GECE TEMİZLİK SERVİSİ — Her gün 21:00 (Türkiye saati)
// Kaybedilen bahislerin %40'ını rastgele siler
// ============================================================

export async function cleanupLostBets(deleteRatio: number = 0.4): Promise<{ deleted: number; total: number }> {
  console.log('[Cleanup] Kaybedilen bahis temizliği başlıyor...');

  const allLost = await pool.query(
    `SELECT id FROM best_bets WHERE result = 'lost' ORDER BY id`
  );

  const total = allLost.rows.length;
  if (total === 0) {
    console.log('[Cleanup] Silinecek kaybedilen bahis yok.');
    return { deleted: 0, total: 0 };
  }

  // Rastgele karıştır ve %40'ını seç
  const shuffled = allLost.rows
    .map((r: any) => ({ id: r.id, sort: Math.random() }))
    .sort((a: any, b: any) => a.sort - b.sort);

  const deleteCount = Math.floor(total * deleteRatio);
  const toDelete = shuffled.slice(0, deleteCount).map((r: any) => r.id);

  if (toDelete.length === 0) {
    console.log('[Cleanup] Silinecek kayıt hesaplanamadı.');
    return { deleted: 0, total };
  }

  await pool.query(
    `DELETE FROM best_bets WHERE id = ANY($1)`,
    [toDelete]
  );

  console.log(`[Cleanup] TAMAMLANDI: ${total} kayıptan ${deleteCount} tanesi silindi (%${Math.round(deleteRatio * 100)})`);
  return { deleted: deleteCount, total };
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startCleanupService() {
  console.log('[Cleanup] Servis başlatıldı: her gün 21:00 Türkiye saatinde çalışır');

  let lastCleanupDate = '';

  const checkAndClean = async () => {
    const now = new Date();
    const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const currentHour = turkeyTime.getHours();
    const currentMinute = turkeyTime.getMinutes();
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

    if (currentHour === 21 && currentMinute >= 0 && currentMinute < 5 && lastCleanupDate !== todayStr) {
      lastCleanupDate = todayStr;
      console.log('[Cleanup] ========================================');
      console.log('[Cleanup] GÜNLÜK TEMİZLİK BAŞLADI — 21:00');
      console.log(`[Cleanup] Tarih: ${todayStr}`);
      console.log('[Cleanup] ========================================');
      try {
        await cleanupLostBets(0.4);
      } catch (err: any) {
        console.error('[Cleanup] Hata:', err.message);
      }
    }
  };

  cleanupInterval = setInterval(checkAndClean, 5 * 60 * 1000);
  checkAndClean();
}

export function stopCleanupService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[Cleanup] Servis durduruldu');
  }
}
