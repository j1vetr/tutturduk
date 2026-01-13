const EXCLUDED_KEYWORDS = [
  'U23', 'U21', 'U20', 'U19', 'U18', 'U17', 'U16', 'U15',
  'Under 23', 'Under 21', 'Under 20', 'Under 19', 'Under 18',
  'Women', 'Kadın', 'Feminin', 'Femenino', 'Frauen',
  'Reserve', 'Reserves', 'Rezerv',
  'Youth', 'Gençler', 'Juvenil',
  'Amateur', 'Amatör',
  'B Team', 'II', 'B ',
  'Primavera',
];

const EXCLUDED_LEAGUE_IDS = [
  695, 696, 697, 698, 699,
  721, 722, 723, 724,
  826, 827, 828, 829,
];

export interface FilterableMatch {
  league?: {
    id?: number;
    name?: string;
  };
  teams?: {
    home?: { name?: string };
    away?: { name?: string };
  };
}

export function isValidMatch(match: FilterableMatch): boolean {
  const leagueName = match.league?.name || '';
  const leagueId = match.league?.id;
  const homeTeam = match.teams?.home?.name || '';
  const awayTeam = match.teams?.away?.name || '';
  
  if (leagueId && EXCLUDED_LEAGUE_IDS.includes(leagueId)) {
    return false;
  }
  
  const allText = `${leagueName} ${homeTeam} ${awayTeam}`.toUpperCase();
  
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (allText.includes(keyword.toUpperCase())) {
      return false;
    }
  }
  
  return true;
}

export function filterMatches<T extends FilterableMatch>(matches: T[]): T[] {
  const filtered = matches.filter(isValidMatch);
  console.log(`[MatchFilter] ${matches.length} maçtan ${filtered.length} tanesi filtrelendi (${matches.length - filtered.length} hariç tutuldu)`);
  return filtered;
}

export interface PredictionData {
  predictions?: {
    winner?: { name?: string };
    advice?: string;
  };
  teams?: {
    home?: {
      last_5?: { form?: string };
      league?: { form?: string };
    };
    away?: {
      last_5?: { form?: string };
      league?: { form?: string };
    };
  };
  comparison?: {
    form?: { home?: string; away?: string };
  };
}

export function hasValidStatistics(prediction: PredictionData | null): boolean {
  if (!prediction) return false;
  
  const homeForm = prediction.teams?.home?.last_5?.form || prediction.teams?.home?.league?.form;
  const awayForm = prediction.teams?.away?.last_5?.form || prediction.teams?.away?.league?.form;
  const hasComparison = prediction.comparison?.form?.home && prediction.comparison?.form?.away;
  
  return !!(homeForm && awayForm) || !!hasComparison;
}

export function getStatisticsScore(prediction: PredictionData | null): number {
  if (!prediction) return 0;
  
  let score = 0;
  
  if (prediction.teams?.home?.last_5?.form) score += 20;
  if (prediction.teams?.away?.last_5?.form) score += 20;
  if (prediction.comparison?.form?.home) score += 15;
  if (prediction.comparison?.form?.away) score += 15;
  if (prediction.predictions?.advice) score += 15;
  if (prediction.predictions?.winner?.name) score += 15;
  
  return score;
}
