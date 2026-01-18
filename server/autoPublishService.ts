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

export async function autoPublishTomorrowMatches(targetCount: number = 40) {
  console.log('[AutoPublish] Starting automatic match publishing (max: ' + targetCount + ')...');
  
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
        
        // Log progress
        const hasOdds = parsedOdds.home || parsedOdds.over25;
        if (!hasOdds) {
          skippedNoOdds++;
        }
        
        console.log(`[AutoPublish] [${scoredMatches.length + 1}/${targetCount}] Valid match: ${homeTeam} vs ${awayTeam} (stats: ${statsScore}, odds: ${hasOdds ? 'yes' : 'no'})`);
        
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

export function startAutoPublishService(runAtHour: number = 20) {
  console.log(`[AutoPublish] Service scheduled to run daily at ${runAtHour}:00`);
  
  const checkAndRun = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour === runAtHour && currentMinute < 5) {
      console.log('[AutoPublish] Scheduled run triggered');
      try {
        await autoPublishTomorrowMatches(40);
      } catch (error) {
        console.error('[AutoPublish] Scheduled run failed:', error);
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
