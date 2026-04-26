import OpenAI from "openai";
import crypto from "crypto";
import { pool } from "./db";
import {
  MIN_ODDS,
  MIN_VALUE_PERCENT,
  MIN_CONFIDENCE,
  RISK_LOW_CONFIDENCE,
  LOW_ODDS_THRESHOLD,
  LOW_ODDS_MIN_EDGE,
  LOW_ODDS_MIN_CONFIDENCE,
  HOME_ADVANTAGE_FACTOR,
  LEAGUE_AVG_GOALS,
  isLowScoringLeague,
  arePositivelyCorrelated,
} from "./predictionConfig";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── İZİN VERİLEN MARKETLER (FAZ 3.1) ────────────────────────
// AI sadece bu marketler arasından seçim yapabilir.
const ALLOWED_MARKETS = [
  '1.5 Üst', '2.5 Üst', '2.5 Alt',
  'KG Var', 'KG Yok',
  'MS1', 'MS2',
  '1X', 'X2', '12',
  'DNB Ev', 'DNB Dep',
] as const;

// ─── CACHE KEY (FAZ 1.5) ─────────────────────────────────────
// Otomatik hash: prompt veya schema değişirse cache invalid olur.
const CACHE_KEY_VERSION = (() => {
  const fingerprint = JSON.stringify({
    markets: ALLOWED_MARKETS,
    minOdds: MIN_ODDS,
    minValue: MIN_VALUE_PERCENT,
    minConfidence: MIN_CONFIDENCE,
    schema: 'v2-adaptive-markets',
  });
  return crypto.createHash('md5').update(fingerprint).digest('hex').slice(0, 8);
})();

export function aiCacheKey(fixtureId: number | string): string {
  return `ai_analysis_${CACHE_KEY_VERSION}_${fixtureId}`;
}

interface MatchData {
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueId?: number;
  matchType?: 'league' | 'cup' | 'friendly';
  homeLeagueLevel?: number;
  awayLeagueLevel?: number;
  homeForm?: string;
  awayForm?: string;
  homeGoalsFor?: number;
  homeGoalsAgainst?: number;
  awayGoalsFor?: number;
  awayGoalsAgainst?: number;
  homeWins?: number;
  homeDraws?: number;
  homeLosses?: number;
  awayWins?: number;
  awayDraws?: number;
  awayLosses?: number;
  h2hResults?: { homeGoals: number; awayGoals: number }[];
  homeRank?: number;
  awayRank?: number;
  homePoints?: number;
  awayPoints?: number;
  comparison?: {
    form?: { home: string; away: string };
    att?: { home: string; away: string };
    def?: { home: string; away: string };
    poisson_distribution?: { home: string; away: string };
    h2h?: { home: string; away: string };
    goals?: { home: string; away: string };
    total?: { home: string; away: string };
  };
  homeTeamStats?: {
    cleanSheets?: number;
    failedToScore?: number;
    avgGoalsHome?: number;
    avgGoalsAway?: number;
    avgGoalsConcededHome?: number;
    avgGoalsConcededAway?: number;
    biggestWinStreak?: number;
    biggestLoseStreak?: number;
  };
  awayTeamStats?: {
    cleanSheets?: number;
    failedToScore?: number;
    avgGoalsHome?: number;
    avgGoalsAway?: number;
    avgGoalsConcededHome?: number;
    avgGoalsConcededAway?: number;
    biggestWinStreak?: number;
    biggestLoseStreak?: number;
  };
  injuries?: {
    home?: { player: string; reason: string; type: string }[];
    away?: { player: string; reason: string; type: string }[];
  };
  odds?: {
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
    htOver05?: number;
    htUnder05?: number;
    htOver15?: number;
    htUnder15?: number;
    dnbHome?: number;
    dnbAway?: number;
  };
  homeLastMatches?: { opponent: string; result: string; score: string; home: boolean }[];
  awayLastMatches?: { opponent: string; result: string; score: string; home: boolean }[];
}

export interface PredictionItem {
  type: 'expected' | 'medium' | 'risky';
  bet: string;
  odds: string;
  confidence: number;
  reasoning: string;
  isValueBet?: boolean;
  valuePercentage?: number;
}

export interface SingleBetResult {
  bet: string;
  odds: number;
  confidence: number;
  reasoning: string;
  isValueBet: boolean;
  valuePercentage: number;
  estimatedProbability: number;
  riskLevel: 'düşük' | 'orta' | 'yüksek';
}

export interface BetResult {
  bet: string;
  odds: number;
  confidence: number;
  estimatedProbability: number;
  valuePercentage: number;
  riskLevel: 'düşük' | 'orta' | 'yüksek';
  reasoning: string;
}

export interface AIAnalysisResult {
  karar: 'bahis' | 'pas';
  matchContext?: {
    type: 'league' | 'cup' | 'derby' | 'friendly';
    significance: 'normal' | 'relegation' | 'title' | 'promotion' | 'final';
    homeLeagueLevel: number;
    awayLeagueLevel: number;
    isCupUpset: boolean;
    isDerby: boolean;
  };
  analysis: string;
  primaryBet?: BetResult | null;
  alternativeBet?: BetResult | null;
  predictions: PredictionItem[];
  singleBet?: SingleBetResult | null;
  expertTip?: string;
  expectedGoalRange?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────
function formatForm(form?: string): string {
  if (!form) return 'Veri yok';
  return form.split('').slice(-5).join(' ');
}

function formatLastMatches(matches?: { opponent: string; result: string; score: string; home: boolean }[]): string {
  if (!matches || matches.length === 0) return 'Veri yok';
  // FAZ 2.3: 10 → 5 maç (token tasarrufu)
  return matches.slice(0, 5).map(m =>
    `${m.home ? 'İ' : 'D'} ${m.opponent}: ${m.score} (${m.result === 'W' ? 'G' : m.result === 'D' ? 'B' : 'M'})`
  ).join(' | ');
}

function detectMatchType(league: string): 'league' | 'cup' | 'friendly' {
  const cupKeywords = ['kupa', 'cup', 'copa', 'coupe', 'pokal', 'coppa'];
  const friendlyKeywords = ['friendly', 'hazırlık', 'club friendlies'];
  const lower = league.toLowerCase();
  if (friendlyKeywords.some(k => lower.includes(k))) return 'friendly';
  if (cupKeywords.some(k => lower.includes(k))) return 'cup';
  return 'league';
}

function detectDerby(homeTeam: string, awayTeam: string): boolean {
  const derbies = [
    ['Galatasaray', 'Fenerbahçe'], ['Galatasaray', 'Beşiktaş'], ['Fenerbahçe', 'Beşiktaş'],
    ['Trabzonspor', 'Galatasaray'], ['Trabzonspor', 'Fenerbahçe'], ['Trabzonspor', 'Beşiktaş'],
    ['Real Madrid', 'Barcelona'], ['Real Madrid', 'Atletico Madrid'],
    ['Manchester United', 'Manchester City'], ['Liverpool', 'Everton'], ['Liverpool', 'Manchester United'],
    ['Arsenal', 'Tottenham'], ['Chelsea', 'Arsenal'], ['Chelsea', 'Tottenham'],
    ['AC Milan', 'Inter'], ['Juventus', 'Inter'], ['Juventus', 'AC Milan'], ['Roma', 'Lazio'],
    ['Bayern', 'Dortmund'], ['PSG', 'Marseille'], ['Ajax', 'Feyenoord'],
    ['Celtic', 'Rangers'], ['Boca', 'River'], ['Flamengo', 'Fluminense'],
    ['Porto', 'Benfica'], ['Porto', 'Sporting'], ['Benfica', 'Sporting'],
  ];
  const h = homeTeam.toLowerCase();
  const a = awayTeam.toLowerCase();
  return derbies.some(([t1, t2]) =>
    (h.includes(t1.toLowerCase()) && a.includes(t2.toLowerCase())) ||
    (h.includes(t2.toLowerCase()) && a.includes(t1.toLowerCase()))
  );
}

// ─── POISSON xG (FAZ 4.2) ────────────────────────────────────
// Düzgün Poisson: lig ortalama gol oranı + ev avantajı + savunma sıkılığı.
function calculateExpectedGoals(matchData: MatchData): { home: number; away: number; total: number; lambda: { home: number; away: number } } {
  const homeStats = matchData.homeTeamStats;
  const awayStats = matchData.awayTeamStats;

  // Lig ortalama gol/maç (her takım için yarısı)
  const leagueAvgPerTeam = LEAGUE_AVG_GOALS / 2;

  // Takım hücum/savunma "strength" oranları (1.0 = lig ortalaması)
  const homeAttackRate = homeStats?.avgGoalsHome ?? leagueAvgPerTeam;
  const homeDefenseRate = homeStats?.avgGoalsConcededHome ?? leagueAvgPerTeam;
  const awayAttackRate = awayStats?.avgGoalsAway ?? leagueAvgPerTeam;
  const awayDefenseRate = awayStats?.avgGoalsConcededAway ?? leagueAvgPerTeam;

  const homeAttackStrength = homeAttackRate / leagueAvgPerTeam;
  const homeDefenseStrength = homeDefenseRate / leagueAvgPerTeam;
  const awayAttackStrength = awayAttackRate / leagueAvgPerTeam;
  const awayDefenseStrength = awayDefenseRate / leagueAvgPerTeam;

  // Dixon-Coles benzeri: λ_home = avg × homeAttack × awayDefense × homeAdvantage
  const lambdaHome = leagueAvgPerTeam * homeAttackStrength * awayDefenseStrength * HOME_ADVANTAGE_FACTOR;
  const lambdaAway = leagueAvgPerTeam * awayAttackStrength * homeDefenseStrength;

  return {
    home: Math.round(lambdaHome * 10) / 10,
    away: Math.round(lambdaAway * 10) / 10,
    total: Math.round((lambdaHome + lambdaAway) * 10) / 10,
    lambda: { home: lambdaHome, away: lambdaAway },
  };
}

// Poisson olasılık yardımcısı: P(X = k | λ)
function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

// 0-9 gole kadar Poisson skor matrisinden market olasılıkları
function computeMarketProbabilities(lambda: { home: number; away: number }): Record<string, number> {
  const maxGoals = 9;
  let pHome = 0, pDraw = 0, pAway = 0;
  let pBttsYes = 0;
  let pOver = { 0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0 };

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonPmf(h, lambda.home) * poissonPmf(a, lambda.away);
      if (h > a) pHome += p;
      else if (h < a) pAway += p;
      else pDraw += p;
      if (h > 0 && a > 0) pBttsYes += p;
      const total = h + a;
      if (total > 0.5) pOver[0.5] += p;
      if (total > 1.5) pOver[1.5] += p;
      if (total > 2.5) pOver[2.5] += p;
      if (total > 3.5) pOver[3.5] += p;
    }
  }

  return {
    msHome: pHome,
    msDraw: pDraw,
    msAway: pAway,
    bttsYes: pBttsYes,
    bttsNo: 1 - pBttsYes,
    over15: pOver[1.5],
    under15: 1 - pOver[1.5],
    over25: pOver[2.5],
    under25: 1 - pOver[2.5],
    over35: pOver[3.5],
    dc1X: pHome + pDraw,
    dcX2: pAway + pDraw,
    dc12: pHome + pAway,
    dnbHome: pDraw > 0.999 ? 0 : pHome / (pHome + pAway),
    dnbAway: pDraw > 0.999 ? 0 : pAway / (pHome + pAway),
  };
}

// ─── ANA ANALİZ FONKSİYONU ───────────────────────────────────
export async function generateMatchAnalysis(matchData: MatchData): Promise<AIAnalysisResult> {
  const h2hCount = matchData.h2hResults?.length || 0;
  const h2hTotal = matchData.h2hResults?.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0) || 0;
  const h2hAvg = h2hCount > 0 ? (h2hTotal / h2hCount).toFixed(1) : '0';

  const odds = matchData.odds;
  const matchType = matchData.matchType || detectMatchType(matchData.league);
  const isDerby = detectDerby(matchData.homeTeam, matchData.awayTeam);
  const homeLeagueLevel = matchData.homeLeagueLevel || 1;
  const awayLeagueLevel = matchData.awayLeagueLevel || 1;

  const xg = calculateExpectedGoals(matchData);
  const marketProbs = computeMarketProbabilities(xg.lambda);

  // FAZ 3.4: Lig bazlı goal-line tercihi
  const lowScoring = isLowScoringLeague(matchData.leagueId, matchData.league);
  const goalLineHint = lowScoring
    ? '⚠️ DÜŞÜK GOL ORTALAMALI LİG: 2.5 Üst yerine 1.5 Üst veya 2.5 Alt tercih et.'
    : '';

  // ─── SİSTEM PROMPT (FAZ 2.3 diet, FAZ 3.1/3.2/3.3, FAZ 4.4) ───
  const systemPrompt = `Sen tutturduk.com için profesyonel value betting uzmanısın.

🎯 GÖREVİN:
Verilen maç için 11 marketten primary (ana) ve alternative (alternatif) bahis seç.
İzin verilen marketler: 1.5 Üst, 2.5 Üst, 2.5 Alt, KG Var, KG Yok, MS1, MS2, 1X, X2, 12, DNB Ev, DNB Dep.
Bunların DIŞINDA bahis önerme.

📐 OLASILIK vs GÜVEN (AYRI):
- estimatedProbability (0-100): "Bu bahis kaç maçtan birinde tutar?" Saf oran tahmini.
- confidence (0-100): "Bu tahminime ne kadar güveniyorum?" Veri kalitesi + senin emin olma derecen.
İkisi farklı şeyler. Karışık form, az veri, sürpriz risk → confidence düşer ama probability yüksek olabilir.

📊 DEĞER HESABI (Kelly):
value = (estimatedProbability/100 × odds) - 1
Pozitif değer = kâr beklentisi var.

🚦 KESİN EŞİKLER:
- Min oran: ${MIN_ODDS.toFixed(2)} (${LOW_ODDS_THRESHOLD} altı = "düşük oran rejimi", aşağı bak)
- Min değer: %${(MIN_VALUE_PERCENT * 100).toFixed(0)} (value ≥ ${MIN_VALUE_PERCENT})
- Min güven: ${MIN_CONFIDENCE}
- Düşük oran rejimi (oran < ${LOW_ODDS_THRESHOLD}): değer ≥ %${(LOW_ODDS_MIN_EDGE * 100).toFixed(0)} VE güven ≥ ${LOW_ODDS_MIN_CONFIDENCE} olmalı.

🔗 KORELASYON KURALI:
Primary ile alternative POZİTİF KORELE OLMAMALI.
Yasak çiftler: 2.5 Üst+KG Var, 2.5 Üst+1.5 Üst, 2.5 Alt+KG Yok, MS1+1X, MS1+DNB Ev, MS2+X2, MS2+DNB Dep.
İyi çiftler: 2.5 Üst+MS1, KG Var+1X, 2.5 Alt+MS1, 1.5 Üst+12, KG Yok+DNB Ev.

🎚️ RİSK SEVİYESİ:
- Güven ≥${RISK_LOW_CONFIDENCE}: düşük
- Güven ${MIN_CONFIDENCE}-${RISK_LOW_CONFIDENCE - 1}: orta
- Güven <${MIN_CONFIDENCE}: KABUL EDİLMEZ → o bahis null

📤 KARAR:
- En az 1 bahis tüm eşikleri geçerse → karar: "bahis"
- Hiçbiri geçmezse → karar: "pas" (zorla bahis açma)
- Kupa/derbi/farklı lig → eşiği 5 puan yükselt
- Şüphe = pas. Net görüş yoksa "pas" döndür.

Türkçe yanıt ver. SADECE JSON döndür.`;

  // ─── KULLANICI PROMPT (slim) ─────────────────────────────────
  const homeStats = matchData.homeTeamStats;
  const awayStats = matchData.awayTeamStats;
  const comp = matchData.comparison;

  const oddsBlock = odds ? `MS: 1=${odds.home?.toFixed(2) || '-'} X=${odds.draw?.toFixed(2) || '-'} 2=${odds.away?.toFixed(2) || '-'}
ÜST: 1.5=${odds.over15?.toFixed(2) || '-'} 2.5=${odds.over25?.toFixed(2) || '-'} | ALT: 2.5=${odds.under25?.toFixed(2) || '-'}
KG: Var=${odds.bttsYes?.toFixed(2) || '-'} Yok=${odds.bttsNo?.toFixed(2) || '-'}
ÇŞ: 1X=${odds.doubleChanceHomeOrDraw?.toFixed(2) || '-'} X2=${odds.doubleChanceAwayOrDraw?.toFixed(2) || '-'} 12=${odds.doubleChanceHomeOrAway?.toFixed(2) || '-'}
DNB: Ev=${odds.dnbHome?.toFixed(2) || '-'} Dep=${odds.dnbAway?.toFixed(2) || '-'}` : 'Oran yok';

  const injuriesLine = (matchData.injuries?.home?.length || matchData.injuries?.away?.length)
    ? `Sakat: ${matchData.homeTeam}=${matchData.injuries?.home?.length || 0}, ${matchData.awayTeam}=${matchData.injuries?.away?.length || 0}`
    : '';

  const prompt = `MAÇ: ${matchData.homeTeam} vs ${matchData.awayTeam}
LİG: ${matchData.league} ${matchType === 'cup' ? '(KUPA)' : ''} ${isDerby ? '(DERBİ)' : ''}
${goalLineHint}

${matchData.homeTeam} (Ev):
- Sezon: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Att/Yed: ${matchData.homeGoalsFor || 0}/${matchData.homeGoalsAgainst || 0}
- Form: ${formatForm(matchData.homeForm)}
- Son 5: ${formatLastMatches(matchData.homeLastMatches)}
${homeStats ? `- Evde gol ort: ${homeStats.avgGoalsHome?.toFixed(2) || '-'} | Evde yediği ort: ${homeStats.avgGoalsConcededHome?.toFixed(2) || '-'} | Temiz kale: ${homeStats.cleanSheets || 0}` : ''}

${matchData.awayTeam} (Dep):
- Sezon: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Att/Yed: ${matchData.awayGoalsFor || 0}/${matchData.awayGoalsAgainst || 0}
- Form: ${formatForm(matchData.awayForm)}
- Son 5: ${formatLastMatches(matchData.awayLastMatches)}
${awayStats ? `- Depde gol ort: ${awayStats.avgGoalsAway?.toFixed(2) || '-'} | Depde yediği ort: ${awayStats.avgGoalsConcededAway?.toFixed(2) || '-'} | Temiz kale: ${awayStats.cleanSheets || 0}` : ''}

H2H (son ${h2hCount}): toplam ${h2hTotal} gol, ort ${h2hAvg}
${comp ? `Karşılaştırma: Form ${comp.form?.home || '-'}/${comp.form?.away || '-'} | Hücum ${comp.att?.home || '-'}/${comp.att?.away || '-'} | Savunma ${comp.def?.home || '-'}/${comp.def?.away || '-'}` : ''}

POISSON xG (lig ort + ev avantajı):
- ${matchData.homeTeam}: ${xg.home} | ${matchData.awayTeam}: ${xg.away} | Toplam: ${xg.total}
- Model olasılıkları: MS1 %${(marketProbs.msHome * 100).toFixed(0)} | MSX %${(marketProbs.msDraw * 100).toFixed(0)} | MS2 %${(marketProbs.msAway * 100).toFixed(0)}
- 2.5 Üst %${(marketProbs.over25 * 100).toFixed(0)} | KG Var %${(marketProbs.bttsYes * 100).toFixed(0)} | 1.5 Üst %${(marketProbs.over15 * 100).toFixed(0)}

ORANLAR:
${oddsBlock}
${injuriesLine}

JSON ÇIKTI:
{
  "karar": "bahis" | "pas",
  "analysis": "3-4 cümle özet (form, gol beklentisi, taktik durum)",
  "primaryBet": {
    "bet": "marketAdı (tam olarak: 1.5 Üst|2.5 Üst|2.5 Alt|KG Var|KG Yok|MS1|MS2|1X|X2|12|DNB Ev|DNB Dep)",
    "odds": <oran>,
    "estimatedProbability": <0-100>,
    "confidence": <0-100>,
    "reasoning": "2-3 cümle gerekçe"
  } | null,
  "alternativeBet": { ... } | null,
  "expectedGoalRange": "X-Y"
}

KURALLAR:
- Bahis adı tam olarak yukarıdaki listeden olmalı.
- Primary ile alternative pozitif korele OLMAMALI.
- Hiçbir bahis eşikleri geçemiyorsa → karar: "pas", primaryBet: null, alternativeBet: null.
- Düşük oran (< ${LOW_ODDS_THRESHOLD}) için ekstra sıkı: değer ≥ %${(LOW_ODDS_MIN_EDGE * 100).toFixed(0)} VE güven ≥ ${LOW_ODDS_MIN_CONFIDENCE}.
${matchType === 'cup' || isDerby || homeLeagueLevel !== awayLeagueLevel ? '- Bu maç KUPA/DERBİ/farklı seviye → güven eşiği +5.' : ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1100,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI yanıt vermedi");

    const result = JSON.parse(content) as AIAnalysisResult;
    if (!result.predictions) result.predictions = [];

    // ─── BAHİS DOĞRULAMA (FAZ 1.2, 3.1, 3.3, 4.4) ────────────
    const isHighStakes = matchType === 'cup' || isDerby || homeLeagueLevel !== awayLeagueLevel;
    const minConfEffective = isHighStakes ? MIN_CONFIDENCE + 5 : MIN_CONFIDENCE;
    const lowOddsMinConfEffective = isHighStakes ? LOW_ODDS_MIN_CONFIDENCE + 5 : LOW_ODDS_MIN_CONFIDENCE;

    const validateBet = (bet: BetResult | null | undefined, label: string): BetResult | null => {
      if (!bet || !bet.bet) return null;

      // Market whitelist
      const isAllowed = ALLOWED_MARKETS.some(m => bet.bet.toLowerCase().includes(m.toLowerCase()));
      if (!isAllowed) {
        console.log(`[AI] REJECTED ${label}: "${bet.bet}" izin verilen markette değil`);
        return null;
      }

      // Probability/confidence sanity
      if (typeof bet.estimatedProbability !== 'number' || isNaN(bet.estimatedProbability)) {
        bet.estimatedProbability = 50;
      }
      bet.estimatedProbability = Math.max(0, Math.min(100, bet.estimatedProbability));

      if (typeof bet.confidence !== 'number' || isNaN(bet.confidence)) {
        bet.confidence = bet.estimatedProbability;
      }
      bet.confidence = Math.max(0, Math.min(100, bet.confidence));

      // Min odds
      if (typeof bet.odds !== 'number' || isNaN(bet.odds) || bet.odds < MIN_ODDS) {
        console.log(`[AI] REJECTED ${label}: oran ${bet.odds} < ${MIN_ODDS}`);
        return null;
      }

      // Recompute value
      const value = ((bet.estimatedProbability / 100) * bet.odds) - 1;
      bet.valuePercentage = Math.round(value * 100) / 100;

      // Düşük oran (1.40-1.49) için sıkı edge (FAZ 3.3)
      if (bet.odds < LOW_ODDS_THRESHOLD) {
        if (value < LOW_ODDS_MIN_EDGE) {
          console.log(`[AI] REJECTED ${label}: düşük oran (${bet.odds}) için değer yetersiz (${(value * 100).toFixed(1)}% < ${(LOW_ODDS_MIN_EDGE * 100).toFixed(0)}%)`);
          return null;
        }
        if (bet.confidence < lowOddsMinConfEffective) {
          console.log(`[AI] REJECTED ${label}: düşük oran için güven yetersiz (${bet.confidence} < ${lowOddsMinConfEffective})`);
          return null;
        }
      } else {
        // Standart eşik
        if (value < MIN_VALUE_PERCENT) {
          console.log(`[AI] REJECTED ${label}: değer ${(value * 100).toFixed(1)}% < ${(MIN_VALUE_PERCENT * 100).toFixed(0)}%`);
          return null;
        }
        if (bet.confidence < minConfEffective) {
          console.log(`[AI] REJECTED ${label}: güven ${bet.confidence} < ${minConfEffective}`);
          return null;
        }
      }

      // Risk seviyesi (FAZ 1.2)
      if (bet.confidence >= RISK_LOW_CONFIDENCE) bet.riskLevel = 'düşük';
      else if (bet.confidence >= MIN_CONFIDENCE) bet.riskLevel = 'orta';
      else bet.riskLevel = 'yüksek';

      if (!bet.reasoning) bet.reasoning = '';
      return bet;
    };

    result.primaryBet = validateBet(result.primaryBet, 'primary');
    result.alternativeBet = validateBet(result.alternativeBet, 'alternative');

    // Korelasyon kuralı (FAZ 3.2)
    if (result.primaryBet && result.alternativeBet) {
      if (arePositivelyCorrelated(result.primaryBet.bet, result.alternativeBet.bet)) {
        console.log(`[AI] CORRELATION DROP: "${result.primaryBet.bet}" ↔ "${result.alternativeBet.bet}" pozitif korele → alternative atıldı`);
        result.alternativeBet = null;
      }
    }

    // Karar
    const hasPrimary = result.primaryBet !== null && result.primaryBet !== undefined;
    const hasAlternative = result.alternativeBet !== null && result.alternativeBet !== undefined;

    if (!hasPrimary && !hasAlternative) {
      console.log(`[AI] PAS — geçerli bahis yok: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
      result.karar = 'pas';
      result.predictions = [];
      return result;
    }

    result.karar = 'bahis';
    result.predictions = [];

    if (result.primaryBet) {
      result.predictions.push({
        type: 'expected',
        bet: result.primaryBet.bet,
        odds: result.primaryBet.odds.toString(),
        confidence: result.primaryBet.confidence,
        reasoning: result.primaryBet.reasoning,
        isValueBet: true,
        valuePercentage: result.primaryBet.valuePercentage,
      });
      console.log(`[AI] PRIMARY: ${result.primaryBet.bet} @${result.primaryBet.odds} | val ${(result.primaryBet.valuePercentage * 100).toFixed(1)}% | conf ${result.primaryBet.confidence} | ${result.primaryBet.riskLevel}`);
    }
    if (result.alternativeBet) {
      result.predictions.push({
        type: 'medium',
        bet: result.alternativeBet.bet,
        odds: result.alternativeBet.odds.toString(),
        confidence: result.alternativeBet.confidence,
        reasoning: result.alternativeBet.reasoning,
        isValueBet: true,
        valuePercentage: result.alternativeBet.valuePercentage,
      });
      console.log(`[AI] ALT: ${result.alternativeBet.bet} @${result.alternativeBet.odds} | val ${(result.alternativeBet.valuePercentage * 100).toFixed(1)}% | conf ${result.alternativeBet.confidence} | ${result.alternativeBet.riskLevel}`);
    }

    // singleBet backwards-compat
    if (result.primaryBet) {
      result.singleBet = {
        bet: result.primaryBet.bet,
        odds: result.primaryBet.odds,
        confidence: result.primaryBet.confidence,
        reasoning: result.primaryBet.reasoning,
        isValueBet: true,
        valuePercentage: result.primaryBet.valuePercentage,
        estimatedProbability: result.primaryBet.estimatedProbability,
        riskLevel: result.primaryBet.riskLevel,
      };
    }

    return result;
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw error;
  }
}

// ─── KAYDET + DB (cache key güncellendi - FAZ 1.5) ───────────
export async function generateAndSavePredictions(
  matchId: number,
  fixtureId: number,
  homeTeam: string,
  awayTeam: string,
  homeLogo: string | null,
  awayLogo: string | null,
  leagueName: string | null,
  leagueLogo: string | null,
  matchDate: string,
  matchTime: string,
  matchData: MatchData
): Promise<AIAnalysisResult | null> {
  try {
    console.log(`[AI+BestBets] Generating analysis for ${homeTeam} vs ${awayTeam}...`);
    const analysis = await generateMatchAnalysis(matchData);

    if (!analysis || analysis.karar === 'pas') {
      console.log(`[AI+BestBets] PASS for ${homeTeam} vs ${awayTeam}`);
      return analysis || null;
    }

    const insertBet = async (bet: BetResult, category: 'primary' | 'alternative') => {
      try {
        await pool.query(
          `INSERT INTO best_bets
           (match_id, fixture_id, home_team, away_team, home_logo, away_logo,
            league_name, league_logo, match_date, match_time,
            bet_type, bet_category, odds, confidence, risk_level, reasoning, result, date_for)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',$17)
           ON CONFLICT (fixture_id, date_for, bet_category) DO UPDATE SET
             bet_type = EXCLUDED.bet_type,
             odds = EXCLUDED.odds,
             confidence = EXCLUDED.confidence,
             risk_level = EXCLUDED.risk_level,
             reasoning = EXCLUDED.reasoning`,
          [matchId, fixtureId, homeTeam, awayTeam, homeLogo, awayLogo,
            leagueName, leagueLogo, matchDate, matchTime,
            bet.bet, category, bet.odds, bet.confidence, bet.riskLevel, bet.reasoning, matchDate]
        );
        console.log(`[AI+BestBets] Saved ${category}: ${bet.bet} @${bet.odds}`);
      } catch (err: any) {
        if (err.code !== '23505') console.error(`[AI+BestBets] Save error (${category}):`, err.message);
      }
    };

    if (analysis.primaryBet) await insertBet(analysis.primaryBet, 'primary');
    if (analysis.alternativeBet) await insertBet(analysis.alternativeBet, 'alternative');

    try {
      await pool.query(
        `INSERT INTO api_cache (key, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')
         ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = NOW() + INTERVAL '24 hours'`,
        [aiCacheKey(fixtureId), JSON.stringify(analysis)]
      );
    } catch (err: any) {
      console.error(`[AI+BestBets] Cache error:`, err.message);
    }

    return analysis;
  } catch (error: any) {
    console.error(`[AI+BestBets] Error for ${homeTeam} vs ${awayTeam}:`, error.message);
    return null;
  }
}

// ─── PARALEL BATCH (FAZ 2.1) ─────────────────────────────────
// Birden fazla maçı eşzamanlı işler. Her chunk için Promise.all,
// chunk arası kısa buffer (rate limit için).
export async function generateBatchAnalysis(
  matches: { fixtureId: number; matchData: MatchData; cacheable?: boolean }[],
  options: { concurrency?: number; delayMs?: number } = {}
): Promise<Map<number, AIAnalysisResult | null>> {
  const concurrency = options.concurrency ?? 5;
  const delayMs = options.delayMs ?? 1500;
  const results = new Map<number, AIAnalysisResult | null>();

  for (let i = 0; i < matches.length; i += concurrency) {
    const chunk = matches.slice(i, i + concurrency);
    console.log(`[AIBatch] Chunk ${Math.floor(i / concurrency) + 1}/${Math.ceil(matches.length / concurrency)} (${chunk.length} maç)`);

    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        try {
          const analysis = await generateMatchAnalysis(item.matchData);
          if (item.cacheable !== false && analysis) {
            try {
              await pool.query(
                `INSERT INTO api_cache (key, data, expires_at)
                 VALUES ($1, $2, NOW() + INTERVAL '24 hours')
                 ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = NOW() + INTERVAL '24 hours'`,
                [aiCacheKey(item.fixtureId), JSON.stringify(analysis)]
              );
            } catch { /* cache errors ignored */ }
          }
          return { fixtureId: item.fixtureId, analysis };
        } catch (err: any) {
          console.error(`[AIBatch] Hata fixture ${item.fixtureId}:`, err.message);
          return { fixtureId: item.fixtureId, analysis: null };
        }
      })
    );

    for (const r of chunkResults) results.set(r.fixtureId, r.analysis);

    if (i + concurrency < matches.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}

export async function generatePredictionsForAllPendingMatches(): Promise<{ processed: number; success: number; failed: number }> {
  console.log('[AI+BestBets] Batch prediction generation starting...');

  const result = await pool.query(
    `SELECT pm.* FROM published_matches pm
     WHERE pm.status = 'pending'
     AND NOT EXISTS (SELECT 1 FROM best_bets bb WHERE bb.fixture_id = pm.fixture_id)
     ORDER BY pm.match_date, pm.match_time
     LIMIT 50`
  );

  const matches = result.rows;
  console.log(`[AI+BestBets] Bulunan maç: ${matches.length}`);

  let processed = 0;
  let success = 0;
  let failed = 0;

  for (const match of matches) {
    processed++;
    console.log(`[AI+BestBets] ${processed}/${matches.length}: ${match.home_team} vs ${match.away_team}`);

    const matchData: MatchData = {
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      league: match.league_name || '',
      leagueId: match.league_id,
      comparison: match.api_comparison ? (typeof match.api_comparison === 'string' ? JSON.parse(match.api_comparison) : match.api_comparison) : undefined,
      h2hResults: match.api_h2h ? (typeof match.api_h2h === 'string' ? JSON.parse(match.api_h2h) : match.api_h2h)?.map((h: any) => ({
        homeGoals: h.homeGoals || 0,
        awayGoals: h.awayGoals || 0,
      })) : undefined,
    };

    if (match.api_teams) {
      const teams = typeof match.api_teams === 'string' ? JSON.parse(match.api_teams) : match.api_teams;
      if (teams.home?.league) {
        matchData.homeWins = teams.home.league.wins;
        matchData.homeDraws = teams.home.league.draws;
        matchData.homeLosses = teams.home.league.loses;
        matchData.homeGoalsFor = teams.home.league.goals?.for?.total;
        matchData.homeGoalsAgainst = teams.home.league.goals?.against?.total;
        matchData.homeForm = teams.home.league.form;
      }
      if (teams.away?.league) {
        matchData.awayWins = teams.away.league.wins;
        matchData.awayDraws = teams.away.league.draws;
        matchData.awayLosses = teams.away.league.loses;
        matchData.awayGoalsFor = teams.away.league.goals?.for?.total;
        matchData.awayGoalsAgainst = teams.away.league.goals?.against?.total;
        matchData.awayForm = teams.away.league.form;
      }
    }

    try {
      const analysis = await generateAndSavePredictions(
        match.id, match.fixture_id, match.home_team, match.away_team,
        match.home_logo, match.away_logo, match.league_name, match.league_logo,
        match.match_date, match.match_time, matchData
      );
      if (analysis) success++; else failed++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (error: any) {
      console.error(`[AI+BestBets] Hata: ${error.message}`);
      failed++;
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`[AI+BestBets] Tamam: ${success} başarılı, ${failed} hatalı, ${processed} işlendi`);
  return { processed, success, failed };
}

export type { MatchData };
