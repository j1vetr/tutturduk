import { pool } from './db';
import { apiFootball } from './apiFootball';
import { filterMatches, hasValidStatistics, getStatisticsScore } from './matchFilter';

interface MatchWithScore {
  fixture: any;
  prediction: any;
  statisticsScore: number;
}

export async function autoPublishTomorrowMatches(targetCount: number = 25) {
  console.log('[AutoPublish] Starting automatic match publishing...');
  
  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`[AutoPublish] Fetching matches for ${tomorrowStr}...`);
    
    // Fetch all predictions for tomorrow (includes match data)
    const allPredictions = await apiFootball.getAllPredictions();
    
    if (!allPredictions || allPredictions.length === 0) {
      console.log('[AutoPublish] No predictions found');
      return { published: 0, total: 0 };
    }
    
    // Filter to tomorrow's matches only
    const tomorrowMatches = allPredictions.filter((pred: any) => {
      const matchDate = pred.fixture?.date?.split('T')[0];
      return matchDate === tomorrowStr;
    });
    
    console.log(`[AutoPublish] Found ${tomorrowMatches.length} matches for tomorrow`);
    
    // Apply basic filters (no youth, women, reserve leagues)
    const filteredMatches = filterMatches(tomorrowMatches);
    console.log(`[AutoPublish] After filtering: ${filteredMatches.length} matches`);
    
    // Score each match based on available statistics
    const scoredMatches: MatchWithScore[] = [];
    
    for (const pred of filteredMatches) {
      const statsScore = getStatisticsScore(pred);
      
      // Only consider matches with score >= 40 (has meaningful stats)
      if (statsScore >= 40) {
        scoredMatches.push({
          fixture: pred.fixture,
          prediction: pred,
          statisticsScore: statsScore
        });
      }
    }
    
    console.log(`[AutoPublish] ${scoredMatches.length} matches have sufficient statistics`);
    
    // Sort by statistics score (highest first) and take top matches
    scoredMatches.sort((a, b) => b.statisticsScore - a.statisticsScore);
    const matchesToPublish = scoredMatches.slice(0, targetCount);
    
    console.log(`[AutoPublish] Publishing top ${matchesToPublish.length} matches...`);
    
    let publishedCount = 0;
    
    for (const match of matchesToPublish) {
      try {
        // Check if already published
        const existing = await pool.query(
          'SELECT id FROM published_matches WHERE fixture_id = $1',
          [match.fixture.id]
        );
        
        if (existing.rows.length > 0) {
          console.log(`[AutoPublish] Match ${match.fixture.id} already published, skipping`);
          continue;
        }
        
        // Extract match data
        const homeTeam = match.prediction.teams?.home?.name || 'Unknown';
        const awayTeam = match.prediction.teams?.away?.name || 'Unknown';
        const homeLogo = match.prediction.teams?.home?.logo || '';
        const awayLogo = match.prediction.teams?.away?.logo || '';
        const leagueName = match.prediction.league?.name || '';
        const leagueLogo = match.prediction.league?.logo || '';
        
        const matchDate = match.fixture.date?.split('T')[0];
        const matchDateTime = new Date(match.fixture.date);
        const matchTime = matchDateTime.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Istanbul'
        });
        
        // Insert into published_matches
        await pool.query(
          `INSERT INTO published_matches 
           (fixture_id, home_team, away_team, home_logo, away_logo, league_name, league_logo, 
            match_date, match_time, timestamp, status, is_featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', FALSE)`,
          [
            match.fixture.id,
            homeTeam,
            awayTeam,
            homeLogo,
            awayLogo,
            leagueName,
            leagueLogo,
            matchDate,
            matchTime,
            match.fixture.timestamp
          ]
        );
        
        publishedCount++;
        console.log(`[AutoPublish] Published: ${homeTeam} vs ${awayTeam} (score: ${match.statisticsScore})`);
        
      } catch (error) {
        console.error(`[AutoPublish] Error publishing match ${match.fixture.id}:`, error);
      }
    }
    
    console.log(`[AutoPublish] Completed! Published ${publishedCount} of ${matchesToPublish.length} matches`);
    
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

// Schedule auto-publish to run daily at a specific time
let autoPublishInterval: NodeJS.Timeout | null = null;

export function startAutoPublishService(runAtHour: number = 20) {
  console.log(`[AutoPublish] Service scheduled to run daily at ${runAtHour}:00`);
  
  const checkAndRun = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Run at the specified hour, within the first 5 minutes
    if (currentHour === runAtHour && currentMinute < 5) {
      console.log('[AutoPublish] Scheduled run triggered');
      try {
        await autoPublishTomorrowMatches(25);
      } catch (error) {
        console.error('[AutoPublish] Scheduled run failed:', error);
      }
    }
  };
  
  // Check every 5 minutes
  autoPublishInterval = setInterval(checkAndRun, 5 * 60 * 1000);
  
  // Also run immediately on startup to check
  checkAndRun();
}

export function stopAutoPublishService() {
  if (autoPublishInterval) {
    clearInterval(autoPublishInterval);
    autoPublishInterval = null;
    console.log('[AutoPublish] Service stopped');
  }
}
