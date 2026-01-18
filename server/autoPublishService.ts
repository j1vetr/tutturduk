import { pool } from './db';
import { apiFootball, CURRENT_SEASON } from './apiFootball';
import { filterMatches, getStatisticsScore } from './matchFilter';
import { generateAndSavePredictions } from './openai-analysis';
import type { MatchData } from './openai-analysis';

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
async function publishMatchesForDate(dateStr: string, totalLimit: number = 70, matchesPerHour: number = 5) {
  console.log(`[AutoPublish] Publishing matches for ${dateStr} (limit: ${totalLimit}, per hour: ${matchesPerHour})...`);
  
  try {
    // Fetch ALL fixtures for the date
    let allMatches: any[] = [];
    
    try {
      const fixtures = await apiFootball.getFixtures({
        date: dateStr
      });
      
      if (fixtures && fixtures.length > 0) {
        allMatches = fixtures;
        console.log(`[AutoPublish] Found ${allMatches.length} total matches for ${dateStr}`);
      }
    } catch (error: any) {
      console.log(`[AutoPublish] Error fetching fixtures:`, error?.message || error);
      return { published: 0, total: 0, date: dateStr };
    }
    
    if (allMatches.length === 0) {
      console.log('[AutoPublish] No matches found');
      return { published: 0, total: 0, date: dateStr };
    }
    
    const formattedMatches = allMatches.map(f => ({
      fixture: f.fixture,
      league: f.league,
      teams: f.teams,
      goals: f.goals
    }));
    
    const filteredMatches = filterMatches(formattedMatches);
    console.log(`[AutoPublish] After filtering: ${filteredMatches.length} matches`);
    
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
    const minStatsScore = 20;
    
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
    
    console.log(`[AutoPublish] Total valid matches collected: ${scoredMatches.length}`);
    
    // Publish all collected matches
    let publishedCount = 0;
    
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
        
        // Get the newly inserted match ID and generate AI predictions
        const insertedMatch = await pool.query(
          'SELECT id FROM published_matches WHERE fixture_id = $1',
          [match.fixture.id]
        );
        
        if (insertedMatch.rows.length > 0) {
          const matchId = insertedMatch.rows[0].id;
          
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
          };
          
          try {
            await generateAndSavePredictions(
              matchId,
              match.fixture.id,
              homeTeam,
              awayTeam,
              homeLogo,
              awayLogo,
              leagueName,
              leagueLogo,
              matchDate,
              matchTime,
              matchData
            );
            console.log(`[AutoPublish] AI predictions saved for ${homeTeam} vs ${awayTeam}`);
          } catch (aiError: any) {
            console.error(`[AutoPublish] AI generation failed:`, aiError.message);
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`[AutoPublish] Error publishing match:`, error);
      }
    }
    
    console.log(`[AutoPublish] Completed! Published ${publishedCount} matches`);
    
    return { 
      published: publishedCount, 
      total: scoredMatches.length,
      date: dateStr 
    };
    
  } catch (error) {
    console.error('[AutoPublish] Error:', error);
    throw error;
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
    const minStatsScore = 20; // Lowered from 30 to include more matches
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
        
        // Get the newly inserted match ID
        const insertedMatch = await pool.query(
          'SELECT id FROM published_matches WHERE fixture_id = $1',
          [match.fixture.id]
        );
        
        if (insertedMatch.rows.length > 0) {
          const matchId = insertedMatch.rows[0].id;
          
          // Prepare match data for AI analysis (with API-Football odds)
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
          };
          
          // Generate AI analysis and save to best_bets
          console.log(`[AutoPublish] Generating AI predictions for ${homeTeam} vs ${awayTeam}...`);
          try {
            await generateAndSavePredictions(
              matchId,
              match.fixture.id,
              homeTeam,
              awayTeam,
              homeLogo,
              awayLogo,
              leagueName,
              leagueLogo,
              matchDate,
              matchTime,
              matchData
            );
            console.log(`[AutoPublish] AI predictions saved for ${homeTeam} vs ${awayTeam}`);
          } catch (aiError: any) {
            console.error(`[AutoPublish] AI generation failed for ${homeTeam} vs ${awayTeam}:`, aiError.message);
          }
          
          // Wait between AI calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`[AutoPublish] Error publishing match ${match.fixture.id}:`, error);
      }
    }
    
    console.log(`[AutoPublish] Completed! Published ${publishedCount} of ${matchesToPublish.length} matches with AI predictions`);
    
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
    const minStatsScore = 20;
    
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
      
      // Generate AI predictions
      const insertedMatch = await pool.query(
        'SELECT id FROM published_matches WHERE fixture_id = $1',
        [match.fixture.id]
      );
      
      if (insertedMatch.rows.length > 0) {
        const matchId = insertedMatch.rows[0].id;
        
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
        };
        
        try {
          await generateAndSavePredictions(
            matchId,
            match.fixture.id,
            homeTeam,
            awayTeam,
            homeLogo,
            awayLogo,
            leagueName,
            leagueLogo,
            matchDate,
            matchTime,
            matchData
          );
        } catch (aiError: any) {
          console.error(`[AutoPublish] AI generation failed:`, aiError.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`[AutoPublish] Error publishing match:`, error);
    }
  }
  
  console.log(`[AutoPublish] Completed! Published ${publishedCount} matches`);
  
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

export function startAutoPublishService(prefetchHour: number = 21, publishHour: number = 22) {
  console.log(`[AutoPublish] Service scheduled: prefetch at ${prefetchHour}:00, publish at ${publishHour}:00`);
  
  const checkAndRun = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Pre-fetch at 21:00
    if (currentHour === prefetchHour && currentMinute < 5) {
      console.log('[AutoPublish] Prefetch triggered for tomorrow');
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        await prefetchValidatedFixtures(tomorrowStr);
      } catch (error) {
        console.error('[AutoPublish] Prefetch failed:', error);
      }
    }
    
    // Publish at 22:00
    if (currentHour === publishHour && currentMinute < 5) {
      console.log('[AutoPublish] Publish triggered');
      try {
        await autoPublishTomorrowMatchesValidated(70, 5);
      } catch (error) {
        console.error('[AutoPublish] Publish failed:', error);
      }
    }
  };
  
  autoPublishInterval = setInterval(checkAndRun, 5 * 60 * 1000);
}

export function stopAutoPublishService() {
  if (autoPublishInterval) {
    clearInterval(autoPublishInterval);
    autoPublishInterval = null;
    console.log('[AutoPublish] Service stopped');
  }
}
