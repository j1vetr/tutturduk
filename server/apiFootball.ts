const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY || '';

interface ApiResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: any[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

interface League {
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
  };
  country: {
    name: string;
    code: string;
    flag: string;
  };
  seasons: Array<{
    year: number;
    current: boolean;
  }>;
}

interface Team {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    founded: number;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
    surface: string;
    image: string;
  };
}

interface Fixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

interface Standing {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

interface Prediction {
  predictions: {
    winner: {
      id: number;
      name: string;
      comment: string;
    };
    win_or_draw: boolean;
    under_over: string;
    goals: { home: string; away: string };
    advice: string;
    percent: { home: string; draw: string; away: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      last_5: { form: string; att: string; def: string; goals: { for: { total: number }; against: { total: number } } };
    };
    away: {
      id: number;
      name: string;
      logo: string;
      last_5: { form: string; att: string; def: string; goals: { for: { total: number }; against: { total: number } } };
    };
  };
  comparison: {
    form: { home: string; away: string };
    att: { home: string; away: string };
    def: { home: string; away: string };
    poisson_distribution: { home: string; away: string };
    h2h: { home: string; away: string };
    goals: { home: string; away: string };
    total: { home: string; away: string };
  };
  h2h: Fixture[];
}

interface HeadToHead {
  fixture: Fixture['fixture'];
  league: Fixture['league'];
  teams: Fixture['teams'];
  goals: Fixture['goals'];
  score: Fixture['score'];
}

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log(`[API-Football] Requesting: ${endpoint}`, params);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('[API-Football] API Errors:', data.errors);
    throw new Error(`API Error: ${JSON.stringify(data.errors)}`);
  }

  console.log(`[API-Football] Response: ${data.results} results`);
  return data;
}

export const apiFootball = {
  async getLeagues(season?: number): Promise<League[]> {
    const params: Record<string, string> = {};
    if (season) params.season = season.toString();
    const response = await apiRequest<League>('/leagues', params);
    return response.response;
  },

  async getLeagueById(id: number): Promise<League | null> {
    const response = await apiRequest<League>('/leagues', { id: id.toString() });
    return response.response[0] || null;
  },

  async getTeamsByLeague(leagueId: number, season: number): Promise<Team[]> {
    const response = await apiRequest<Team>('/teams', { 
      league: leagueId.toString(), 
      season: season.toString() 
    });
    return response.response;
  },

  async getFixtures(params: {
    league?: number;
    season?: number;
    date?: string;
    from?: string;
    to?: string;
    next?: number;
    status?: string;
  }): Promise<Fixture[]> {
    const queryParams: Record<string, string> = {};
    if (params.league) queryParams.league = params.league.toString();
    if (params.season) queryParams.season = params.season.toString();
    if (params.date) queryParams.date = params.date;
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (params.next) queryParams.next = params.next.toString();
    if (params.status) queryParams.status = params.status;
    
    const response = await apiRequest<Fixture>('/fixtures', queryParams);
    return response.response;
  },

  async getFixtureById(id: number): Promise<Fixture | null> {
    const response = await apiRequest<Fixture>('/fixtures', { id: id.toString() });
    return response.response[0] || null;
  },

  async getStandings(leagueId: number, season: number): Promise<Standing[][]> {
    const response = await apiRequest<{ league: { standings: Standing[][] } }>('/standings', {
      league: leagueId.toString(),
      season: season.toString()
    });
    return response.response[0]?.league?.standings || [];
  },

  async getPrediction(fixtureId: number): Promise<Prediction | null> {
    const response = await apiRequest<Prediction>('/predictions', { fixture: fixtureId.toString() });
    return response.response[0] || null;
  },

  async getHeadToHead(team1Id: number, team2Id: number, last?: number): Promise<HeadToHead[]> {
    const params: Record<string, string> = { h2h: `${team1Id}-${team2Id}` };
    if (last) params.last = last.toString();
    const response = await apiRequest<HeadToHead>('/fixtures/headtohead', params);
    return response.response;
  },

  async getTeamStatistics(teamId: number, leagueId: number, season: number) {
    const response = await apiRequest<any>('/teams/statistics', {
      team: teamId.toString(),
      league: leagueId.toString(),
      season: season.toString()
    });
    return response.response;
  },

  async getLineups(fixtureId: number) {
    const response = await apiRequest<any>('/fixtures/lineups', { fixture: fixtureId.toString() });
    return response.response;
  },

  async getOdds(fixtureId: number) {
    const response = await apiRequest<any>('/odds', { fixture: fixtureId.toString() });
    return response.response;
  }
};

export const SUPPORTED_LEAGUES = [
  // Türkiye
  { id: 203, name: 'Süper Lig', country: 'Turkey', flag: '🇹🇷' },
  { id: 206, name: 'TFF 1. Lig', country: 'Turkey', flag: '🇹🇷' },
  { id: 208, name: 'Türkiye Kupası', country: 'Turkey', flag: '🇹🇷' },
  
  // İngiltere
  { id: 39, name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 40, name: 'Championship', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 45, name: 'FA Cup', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 48, name: 'EFL Cup', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  
  // İskoçya & Galler
  { id: 179, name: 'Scottish Premiership', country: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { id: 110, name: 'Welsh Premier League', country: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  
  // İspanya
  { id: 140, name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  { id: 141, name: 'La Liga 2', country: 'Spain', flag: '🇪🇸' },
  { id: 143, name: 'Copa del Rey', country: 'Spain', flag: '🇪🇸' },
  
  // Almanya
  { id: 78, name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { id: 79, name: '2. Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { id: 81, name: 'DFB Pokal', country: 'Germany', flag: '🇩🇪' },
  
  // İtalya
  { id: 135, name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  { id: 136, name: 'Serie B', country: 'Italy', flag: '🇮🇹' },
  { id: 137, name: 'Coppa Italia', country: 'Italy', flag: '🇮🇹' },
  
  // Fransa
  { id: 61, name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  { id: 62, name: 'Ligue 2', country: 'France', flag: '🇫🇷' },
  { id: 66, name: 'Coupe de France', country: 'France', flag: '🇫🇷' },
  
  // Hollanda
  { id: 88, name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱' },
  { id: 89, name: 'Eerste Divisie', country: 'Netherlands', flag: '🇳🇱' },
  
  // Portekiz
  { id: 94, name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹' },
  { id: 96, name: 'Taça de Portugal', country: 'Portugal', flag: '🇵🇹' },
  
  // Belçika
  { id: 144, name: 'Pro League', country: 'Belgium', flag: '🇧🇪' },
  
  // Avusturya & İsviçre
  { id: 218, name: 'Bundesliga', country: 'Austria', flag: '🇦🇹' },
  { id: 207, name: 'Super League', country: 'Switzerland', flag: '🇨🇭' },
  
  // Yunanistan
  { id: 197, name: 'Super League', country: 'Greece', flag: '🇬🇷' },
  
  // Rusya & Ukrayna
  { id: 235, name: 'Premier League', country: 'Russia', flag: '🇷🇺' },
  { id: 333, name: 'Premier League', country: 'Ukraine', flag: '🇺🇦' },
  
  // Amerika
  { id: 253, name: 'MLS', country: 'USA', flag: '🇺🇸' },
  { id: 262, name: 'Liga MX', country: 'Mexico', flag: '🇲🇽' },
  { id: 71, name: 'Serie A', country: 'Brazil', flag: '🇧🇷' },
  { id: 128, name: 'Primera División', country: 'Argentina', flag: '🇦🇷' },
  
  // UEFA Turnuvaları
  { id: 2, name: 'UEFA Champions League', country: 'World', flag: '🇪🇺' },
  { id: 3, name: 'UEFA Europa League', country: 'World', flag: '🇪🇺' },
  { id: 848, name: 'UEFA Conference League', country: 'World', flag: '🇪🇺' },
];

// Season is determined by the year the season started (e.g., 2025-2026 season = 2025)
// Most leagues run from August to May, so after July use current year, before July use previous year
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth(); // 0-indexed (0 = January, 7 = August)
export const CURRENT_SEASON = currentMonth >= 7 ? currentYear : currentYear - 1;

export type { League, Team, Fixture, Standing, Prediction, HeadToHead };
