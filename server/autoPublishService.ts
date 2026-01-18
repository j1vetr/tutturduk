import { pool } from './db';
import { apiFootball, SUPPORTED_LEAGUES, CURRENT_SEASON } from './apiFootball';
import { filterMatches, getStatisticsScore } from './matchFilter';
import { generateAndSavePredictions } from './openai-analysis';
import { nosyApi } from './nosyApi';
import type { MatchData } from './openai-analysis';

interface NosyOdds {
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
  nosyOdds?: NosyOdds;
}

export async function autoPublishTomorrowMatches(targetCount: number = 40) {
  console.log('[AutoPublish] Starting automatic match publishing (max: ' + targetCount + ')...');
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`[AutoPublish] Fetching matches for ${tomorrowStr}...`);
    
    const allMatches: any[] = [];
    
    console.log(`[AutoPublish] Fetching from ${SUPPORTED_LEAGUES.length} leagues (this may take several minutes)...`);
    
    for (let i = 0; i < SUPPORTED_LEAGUES.length; i++) {
      const league = SUPPORTED_LEAGUES[i];
      try {
        console.log(`[AutoPublish] [${i + 1}/${SUPPORTED_LEAGUES.length}] Checking ${league.name}...`);
        
        const fixtures = await apiFootball.getFixtures({
          league: league.id,
          season: CURRENT_SEASON,
          date: tomorrowStr
        });
        
        if (fixtures && fixtures.length > 0) {
          console.log(`[AutoPublish] Found ${fixtures.length} matches in ${league.name}`);
          allMatches.push(...fixtures);
        }
        
        // 2 second delay between league requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.log(`[AutoPublish] Error fetching ${league.name}:`, error?.message || error);
        // Wait extra on error
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
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
    
    console.log(`[AutoPublish] Fetching predictions and NosyAPI odds for matches...`);
    
    for (const match of filteredMatches.slice(0, 60)) {
      try {
        const homeTeam = match.teams?.home?.name || '';
        const awayTeam = match.teams?.away?.name || '';
        const matchDate = match.fixture.date?.split('T')[0];
        
        // Fetch NosyAPI odds
        const nosyResult = await nosyApi.getOddsForFixture(homeTeam, awayTeam, matchDate);
        
        if (!nosyResult.found || !nosyResult.odds) {
          console.log(`[AutoPublish] No NosyAPI odds for ${homeTeam} vs ${awayTeam}, skipping`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // Map NosyAPI odds to our format
        const nosyOdds: NosyOdds = {
          home: nosyResult.odds.msOdds?.home,
          draw: nosyResult.odds.msOdds?.draw,
          away: nosyResult.odds.msOdds?.away,
          over15: nosyResult.odds.overUnder?.over15,
          under15: nosyResult.odds.overUnder?.under15,
          over25: nosyResult.odds.overUnder?.over25,
          under25: nosyResult.odds.overUnder?.under25,
          over35: nosyResult.odds.overUnder?.over35,
          under35: nosyResult.odds.overUnder?.under35,
          over45: nosyResult.odds.overUnder?.over45,
          under45: nosyResult.odds.overUnder?.under45,
          bttsYes: nosyResult.odds.btts?.yes,
          bttsNo: nosyResult.odds.btts?.no,
          doubleChanceHomeOrDraw: nosyResult.odds.doubleChance?.homeOrDraw,
          doubleChanceAwayOrDraw: nosyResult.odds.doubleChance?.awayOrDraw,
          doubleChanceHomeOrAway: nosyResult.odds.doubleChance?.homeOrAway,
          halfTimeHome: nosyResult.odds.halfTime?.home,
          halfTimeDraw: nosyResult.odds.halfTime?.draw,
          halfTimeAway: nosyResult.odds.halfTime?.away,
        };
        
        console.log(`[AutoPublish] Found NosyAPI odds for ${homeTeam} vs ${awayTeam}`);
        
        // Fetch API-Football prediction for statistics
        const prediction = await apiFootball.getPrediction(match.fixture.id);
        
        if (prediction) {
          const statsScore = getStatisticsScore(prediction);
          
          if (statsScore >= 30) {
            scoredMatches.push({
              fixture: match.fixture,
              prediction: prediction,
              league: match.league,
              teams: match.teams,
              statisticsScore: statsScore,
              nosyOdds: nosyOdds
            });
          }
        }
        
        // 2 second delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.log(`[AutoPublish] Error processing match ${match.fixture.id}:`, error?.message || error);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`[AutoPublish] ${scoredMatches.length} matches have NosyAPI odds + sufficient statistics`);
    
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
          
          // Prepare match data for AI analysis (with NosyAPI odds)
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
            odds: match.nosyOdds,
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
