const NOSY_API_KEY = process.env.NOSYAPI_KEY;
const BASE_URL = 'https://www.nosyapi.com/apiv2/service';

interface NosyApiResponse<T> {
  status: string;
  message: string;
  messageTR: string;
  systemTime: number;
  endpoint: string;
  rowCount: number;
  creditUsed: number;
  data: T;
}

interface BettableMatch {
  matchId: number;
  matchCode: number;
  matchDate: string;
  matchTime: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueCode: string;
  country: string;
  mbs: number;
  odds: MatchOdds;
}

interface MatchOdds {
  msOdds?: {
    home: number;
    draw: number;
    away: number;
  };
  overUnder?: {
    over15?: number;
    under15?: number;
    over25?: number;
    under25?: number;
    over35?: number;
    under35?: number;
    over45?: number;
    under45?: number;
  };
  btts?: {
    yes?: number;
    no?: number;
  };
  doubleChance?: {
    homeOrDraw?: number;
    awayOrDraw?: number;
    homeOrAway?: number;
  };
  halfTime?: {
    home?: number;
    draw?: number;
    away?: number;
  };
}

interface RawMatchData {
  N: string;
  C: number;
  D: string;
  DAY: string;
  T: string;
  LN: string;
  TYPE: string;
  HN: string;
  AN: string;
  LEESSION: string;
  MBS: number;
  OCG?: {
    [key: string]: {
      ID: number;
      N: string;
      MBS: number;
      OC?: {
        [key: string]: {
          ID: number;
          N: string;
          O: string;
          MBS: number;
        };
      };
    };
  };
}

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<NosyApiResponse<T> | null> {
  if (!NOSY_API_KEY) {
    console.error('[NosyAPI] API key not configured');
    return null;
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.append('apiKey', NOSY_API_KEY);
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  try {
    console.log(`[NosyAPI] Fetching: ${endpoint}`);
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[NosyAPI] HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'success') {
      console.error(`[NosyAPI] API error: ${data.message}`);
      return null;
    }

    return data as NosyApiResponse<T>;
  } catch (error) {
    console.error('[NosyAPI] Request failed:', error);
    return null;
  }
}

function parseOdds(rawMatch: RawMatchData): MatchOdds {
  const odds: MatchOdds = {};
  
  if (!rawMatch.OCG) return odds;

  for (const [groupId, group] of Object.entries(rawMatch.OCG)) {
    const groupName = group.N?.toLowerCase() || '';
    
    if (!group.OC) continue;

    if (groupName.includes('maç sonucu') || groupId === '1') {
      odds.msOdds = { home: 0, draw: 0, away: 0 };
      for (const [_, outcome] of Object.entries(group.OC)) {
        const outcomeName = outcome.N?.toLowerCase() || '';
        const value = parseFloat(outcome.O) || 0;
        if (outcomeName === '1' || outcomeName.includes('ev')) {
          odds.msOdds.home = value;
        } else if (outcomeName === '0' || outcomeName.includes('berab')) {
          odds.msOdds.draw = value;
        } else if (outcomeName === '2' || outcomeName.includes('dep')) {
          odds.msOdds.away = value;
        }
      }
    }

    if (groupName.includes('alt/üst') || groupName.includes('altüst') || groupId === '5') {
      odds.overUnder = {};
      for (const [_, outcome] of Object.entries(group.OC)) {
        const outcomeName = outcome.N?.toLowerCase() || '';
        const value = parseFloat(outcome.O) || 0;
        
        if (outcomeName.includes('1,5 üst') || outcomeName.includes('1.5 üst')) {
          odds.overUnder.over15 = value;
        } else if (outcomeName.includes('1,5 alt') || outcomeName.includes('1.5 alt')) {
          odds.overUnder.under15 = value;
        } else if (outcomeName.includes('2,5 üst') || outcomeName.includes('2.5 üst')) {
          odds.overUnder.over25 = value;
        } else if (outcomeName.includes('2,5 alt') || outcomeName.includes('2.5 alt')) {
          odds.overUnder.under25 = value;
        } else if (outcomeName.includes('3,5 üst') || outcomeName.includes('3.5 üst')) {
          odds.overUnder.over35 = value;
        } else if (outcomeName.includes('3,5 alt') || outcomeName.includes('3.5 alt')) {
          odds.overUnder.under35 = value;
        } else if (outcomeName.includes('4,5 üst') || outcomeName.includes('4.5 üst')) {
          odds.overUnder.over45 = value;
        } else if (outcomeName.includes('4,5 alt') || outcomeName.includes('4.5 alt')) {
          odds.overUnder.under45 = value;
        }
      }
    }

    if (groupName.includes('karşılıklı gol') || groupId === '13') {
      odds.btts = {};
      for (const [_, outcome] of Object.entries(group.OC)) {
        const outcomeName = outcome.N?.toLowerCase() || '';
        const value = parseFloat(outcome.O) || 0;
        
        if (outcomeName === 'var' || outcomeName.includes('evet')) {
          odds.btts.yes = value;
        } else if (outcomeName === 'yok' || outcomeName.includes('hayır')) {
          odds.btts.no = value;
        }
      }
    }

    if (groupName.includes('çifte şans') || groupId === '2') {
      odds.doubleChance = {};
      for (const [_, outcome] of Object.entries(group.OC)) {
        const outcomeName = outcome.N?.toLowerCase() || '';
        const value = parseFloat(outcome.O) || 0;
        
        if (outcomeName.includes('1-x') || outcomeName.includes('1-0')) {
          odds.doubleChance.homeOrDraw = value;
        } else if (outcomeName.includes('x-2') || outcomeName.includes('0-2')) {
          odds.doubleChance.awayOrDraw = value;
        } else if (outcomeName.includes('1-2')) {
          odds.doubleChance.homeOrAway = value;
        }
      }
    }

    if (groupName.includes('ilk yarı') || groupId === '3') {
      odds.halfTime = {};
      for (const [_, outcome] of Object.entries(group.OC)) {
        const outcomeName = outcome.N?.toLowerCase() || '';
        const value = parseFloat(outcome.O) || 0;
        
        if (outcomeName === '1') {
          odds.halfTime.home = value;
        } else if (outcomeName === '0' || outcomeName === 'x') {
          odds.halfTime.draw = value;
        } else if (outcomeName === '2') {
          odds.halfTime.away = value;
        }
      }
    }
  }

  return odds;
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/fc|sk|fk|sc|ac|as|ss/gi, '')
    .replace(/[^\w\sığüşöçİĞÜŞÖÇ]/gi, '')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeTeamName(str1);
  const s2 = normalizeTeamName(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  
  let matchCount = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchCount++;
        break;
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? matchCount / maxWords : 0;
}

export const nosyApi = {
  async getAllMatches(type: number = 1): Promise<BettableMatch[]> {
    const response = await apiRequest<RawMatchData[]>('bettable-matches/all', { type: type.toString() });
    
    if (!response || !response.data) {
      return [];
    }

    return response.data.map(match => ({
      matchId: match.C,
      matchCode: match.C,
      matchDate: match.D,
      matchTime: match.T,
      homeTeam: match.HN,
      awayTeam: match.AN,
      league: match.LN,
      leagueCode: match.LEESSION,
      country: match.N,
      mbs: match.MBS,
      odds: parseOdds(match)
    }));
  },

  async findMatchOdds(homeTeam: string, awayTeam: string, matchDate?: string): Promise<MatchOdds | null> {
    const matches = await this.getAllMatches();
    
    if (matches.length === 0) {
      console.log('[NosyAPI] No matches found');
      return null;
    }

    let bestMatch: BettableMatch | null = null;
    let bestScore = 0;

    for (const match of matches) {
      const homeScore = calculateSimilarity(homeTeam, match.homeTeam);
      const awayScore = calculateSimilarity(awayTeam, match.awayTeam);
      const totalScore = (homeScore + awayScore) / 2;

      if (matchDate && match.matchDate) {
        const inputDate = new Date(matchDate).toISOString().split('T')[0];
        const matchDateStr = match.matchDate;
        if (inputDate !== matchDateStr) {
          continue;
        }
      }

      if (totalScore > bestScore && totalScore >= 0.5) {
        bestScore = totalScore;
        bestMatch = match;
      }
    }

    if (bestMatch) {
      console.log(`[NosyAPI] Matched: "${homeTeam} vs ${awayTeam}" -> "${bestMatch.homeTeam} vs ${bestMatch.awayTeam}" (score: ${bestScore.toFixed(2)})`);
      return bestMatch.odds;
    }

    console.log(`[NosyAPI] No match found for: ${homeTeam} vs ${awayTeam}`);
    return null;
  },

  async getOddsForFixture(homeTeam: string, awayTeam: string, matchDate?: string): Promise<{
    found: boolean;
    source: string;
    odds: MatchOdds | null;
    matchedTeams?: { home: string; away: string };
  }> {
    const matches = await this.getAllMatches();
    
    if (matches.length === 0) {
      return { found: false, source: 'nosyapi', odds: null };
    }

    let bestMatch: BettableMatch | null = null;
    let bestScore = 0;

    for (const match of matches) {
      const homeScore = calculateSimilarity(homeTeam, match.homeTeam);
      const awayScore = calculateSimilarity(awayTeam, match.awayTeam);
      const totalScore = (homeScore + awayScore) / 2;

      if (matchDate && match.matchDate) {
        const inputDate = new Date(matchDate).toISOString().split('T')[0];
        if (inputDate !== match.matchDate) {
          continue;
        }
      }

      if (totalScore > bestScore && totalScore >= 0.5) {
        bestScore = totalScore;
        bestMatch = match;
      }
    }

    if (bestMatch) {
      return {
        found: true,
        source: 'nosyapi',
        odds: bestMatch.odds,
        matchedTeams: {
          home: bestMatch.homeTeam,
          away: bestMatch.awayTeam
        }
      };
    }

    return { found: false, source: 'nosyapi', odds: null };
  }
};

export type { BettableMatch, MatchOdds };
