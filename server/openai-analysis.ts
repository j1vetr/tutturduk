import OpenAI from "openai";
import { pool } from "./db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    goalsMinutes?: {
      '0-15'?: number;
      '16-30'?: number;
      '31-45'?: number;
      '46-60'?: number;
      '61-75'?: number;
      '76-90'?: number;
    };
    penaltyScored?: number;
    penaltyMissed?: number;
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
    goalsMinutes?: {
      '0-15'?: number;
      '16-30'?: number;
      '31-45'?: number;
      '46-60'?: number;
      '61-75'?: number;
      '76-90'?: number;
    };
    penaltyScored?: number;
    penaltyMissed?: number;
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
  predictions: PredictionItem[];
  singleBet?: SingleBetResult | null;
  avoidBets?: Record<string, string>;
  expertTip?: string;
  expectedGoalRange?: string;
}

function formatForm(form?: string): string {
  if (!form) return 'Veri yok';
  return form.split('').join(' ');
}

function formatGoalMinutes(minutes?: { [key: string]: number }): string {
  if (!minutes) return 'Veri yok';
  const entries = Object.entries(minutes).filter(([_, v]) => v > 0);
  if (entries.length === 0) return 'Veri yok';
  return entries.map(([k, v]) => `${k}: ${v} gol`).join(', ');
}

function formatLastMatches(matches?: { opponent: string; result: string; score: string; home: boolean }[]): string {
  if (!matches || matches.length === 0) return 'Veri yok';
  return matches.slice(0, 5).map(m => 
    `${m.home ? 'İç saha' : 'Deplasman'} vs ${m.opponent}: ${m.score} (${m.result === 'W' ? 'G' : m.result === 'D' ? 'B' : 'M'})`
  ).join('\n  ');
}

function detectMatchType(league: string): string {
  const cupKeywords = ['Kupa', 'Cup', 'Copa', 'Coupe', 'Pokal', 'FA Cup', 'League Cup', 'Coppa'];
  const isCup = cupKeywords.some(k => league.toLowerCase().includes(k.toLowerCase()));
  return isCup ? 'cup' : 'league';
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
  
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  
  return derbies.some(([t1, t2]) => 
    (homeLower.includes(t1.toLowerCase()) && awayLower.includes(t2.toLowerCase())) ||
    (homeLower.includes(t2.toLowerCase()) && awayLower.includes(t1.toLowerCase()))
  );
}

function calculateExpectedGoals(matchData: MatchData): { home: number; away: number; total: number } {
  const homeStats = matchData.homeTeamStats;
  const awayStats = matchData.awayTeamStats;
  
  const homeAttack = homeStats?.avgGoalsHome || (matchData.homeGoalsFor ? matchData.homeGoalsFor / Math.max(1, (matchData.homeWins || 0) + (matchData.homeDraws || 0) + (matchData.homeLosses || 0)) : 1.5);
  const awayDefense = awayStats?.avgGoalsConcededAway || 1.2;
  const awayAttack = awayStats?.avgGoalsAway || (matchData.awayGoalsFor ? matchData.awayGoalsFor / Math.max(1, (matchData.awayWins || 0) + (matchData.awayDraws || 0) + (matchData.awayLosses || 0)) : 1.0);
  const homeDefense = homeStats?.avgGoalsConcededHome || 1.0;
  
  const expectedHome = (homeAttack + awayDefense) / 2;
  const expectedAway = (awayAttack + homeDefense) / 2;
  
  return {
    home: Math.round(expectedHome * 10) / 10,
    away: Math.round(expectedAway * 10) / 10,
    total: Math.round((expectedHome + expectedAway) * 10) / 10
  };
}

function analyzeTrends(matchData: MatchData): string[] {
  const trends: string[] = [];
  const homeStats = matchData.homeTeamStats;
  const awayStats = matchData.awayTeamStats;
  
  if (homeStats?.cleanSheets && homeStats.cleanSheets >= 3) {
    trends.push(`${matchData.homeTeam} son dönemde ${homeStats.cleanSheets} temiz kale tuttu - savunma güçlü`);
  }
  if (awayStats?.cleanSheets && awayStats.cleanSheets >= 3) {
    trends.push(`${matchData.awayTeam} son dönemde ${awayStats.cleanSheets} temiz kale tuttu - savunma güçlü`);
  }
  if (homeStats?.failedToScore && homeStats.failedToScore >= 3) {
    trends.push(`${matchData.homeTeam} son dönemde ${homeStats.failedToScore} maçta gol atamadı - hücum zayıf`);
  }
  if (awayStats?.failedToScore && awayStats.failedToScore >= 3) {
    trends.push(`${matchData.awayTeam} son dönemde ${awayStats.failedToScore} maçta gol atamadı - hücum zayıf`);
  }
  
  const h2hCount = matchData.h2hResults?.length || 0;
  if (h2hCount >= 3) {
    const h2hTotal = matchData.h2hResults!.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0);
    const h2hAvg = h2hTotal / h2hCount;
    if (h2hAvg >= 3) {
      trends.push(`H2H ortalaması ${h2hAvg.toFixed(1)} gol - gollü maç geçmişi`);
    } else if (h2hAvg <= 2) {
      trends.push(`H2H ortalaması ${h2hAvg.toFixed(1)} gol - az gollü maç geçmişi`);
    }
  }
  
  return trends;
}

export async function generateMatchAnalysis(matchData: MatchData): Promise<AIAnalysisResult> {
  const h2hTotal = matchData.h2hResults?.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0) || 0;
  const h2hCount = matchData.h2hResults?.length || 0;
  const h2hAvg = h2hCount > 0 ? (h2hTotal / h2hCount).toFixed(1) : '0';
  
  const h2hSummary = h2hCount > 0 
    ? `Son ${h2hCount} karşılaşmada toplam ${h2hTotal} gol atıldı. Maç başına gol ortalaması: ${h2hAvg}`
    : 'Bu iki takım daha önce hiç karşılaşmamış - İLK KEZ KARŞI KARŞIYA GELİYORLAR.';

  const homeStats = matchData.homeTeamStats;
  const awayStats = matchData.awayTeamStats;
  const comp = matchData.comparison;
  const odds = matchData.odds;
  
  const matchType = matchData.matchType || detectMatchType(matchData.league);
  const isDerby = detectDerby(matchData.homeTeam, matchData.awayTeam);
  const homeLeagueLevel = matchData.homeLeagueLevel || 1;
  const awayLeagueLevel = matchData.awayLeagueLevel || 1;
  
  const expectedGoals = calculateExpectedGoals(matchData);
  const trends = analyzeTrends(matchData);

  // Professional Value Betting System Prompt v2
  const systemPrompt = `Sen profesyonel bir bahis tahmincisi ve value betting uzmanısın.
Tahminlerin kendinden emin ve kararlı olmalı - koşullar sağlandığında net kararlar ver.

🚫 KESİN KURALLAR:

1️⃣ MİNİMUM ORAN
- 1.50 altı oran YASAKTIR, kesinlikle önerilmez
- 1.5 Üst marketi SADECE oran ≥1.50 ise kullanılabilir
- Düşük oranlı bahisleri yuvarlama veya zorla önerme

2️⃣ TAHMİN MANTIĞI
- Her maç için SADECE 1 en iyi bahis öner
- Güçlü tahmin yoksa "karar": "pas" döndür
- Belirsiz veya volatil maçlarda zoraki tahmin YAPMA

3️⃣ VALUE BETTING
Değer = (TahminiOlasılık / 100 × Oran) - 1
- Değer ≤ 0 ise tahmin YAPMA
- Olasılıklar gerçekçi ve tutarlı olmalı
- Aşırı veya şişirilmiş olasılıklardan kaçın

4️⃣ MARKET ÖNCELİK SIRASI
1. 2.5 Üst / 2.5 Alt (eşit öncelik)
2. KG Var (Karşılıklı Gol)
3. Çifte Şans (1X, X2)
4. DNB (Beraberlikte İade)
5. 1.5 Üst (SADECE oran ≥1.50 ise)
6. MS (Maç Sonucu) - sadece çok net senaryolarda
7. İY (İlk Yarı) - son çare olarak

5️⃣ GÜVEN & RİSK
- Güven ≥70 → düşük risk
- Güven 60-69 → orta risk
- Güven <60 → yüksek risk

Türkçe, profesyonel dilde yanıt ver. SADECE JSON formatında çıktı üret.`;

  const prompt = `
================================
🏟️ MAÇ BİLGİLERİ
================================
Lig/Turnuva: ${matchData.league}
Maç Tipi: ${matchType === 'cup' ? '🏆 KUPA MAÇI - Dikkat: Sürpriz riski yüksek!' : '⚽ LİG MAÇI'}
${isDerby ? '🔥 DERBİ MAÇI - İlk yarı genelde temkinli, duygusal atmosfer!' : ''}
Ev Sahibi: ${matchData.homeTeam}${matchData.homeRank ? ` (Sıralama: ${matchData.homeRank}. - ${matchData.homePoints} puan)` : ''}
Deplasman: ${matchData.awayTeam}${matchData.awayRank ? ` (Sıralama: ${matchData.awayRank}. - ${matchData.awayPoints} puan)` : ''}

${homeLeagueLevel !== awayLeagueLevel ? `⚠️ FARKLI LİG SEVİYELERİ:
- ${matchData.homeTeam}: ${homeLeagueLevel}. Lig
- ${matchData.awayTeam}: ${awayLeagueLevel}. Lig
Alt lig takımı genelde defansif oynar, sürpriz riski yüksek!` : ''}

================================
📊 EV SAHİBİ: ${matchData.homeTeam}
================================
Son 5 Maç:
  ${formatLastMatches(matchData.homeLastMatches)}
  
Form: ${formatForm(matchData.homeForm)}
Sezon: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Attığı: ${matchData.homeGoalsFor || 0} | Yediği: ${matchData.homeGoalsAgainst || 0}
${homeStats ? `Detaylı İstatistikler:
  - Temiz Kale: ${homeStats.cleanSheets || 0} maç
  - Gol Atamadığı Maç: ${homeStats.failedToScore || 0}
  - Evde Gol Ortalaması: ${homeStats.avgGoalsHome?.toFixed(2) || '-'}
  - Evde Yediği Ortalama: ${homeStats.avgGoalsConcededHome?.toFixed(2) || '-'}
  - En Uzun Galibiyet Serisi: ${homeStats.biggestWinStreak || '-'}
  - En Uzun Mağlubiyet Serisi: ${homeStats.biggestLoseStreak || '-'}
  - Penaltı: ${homeStats.penaltyScored || 0} attı, ${homeStats.penaltyMissed || 0} kaçırdı
  - Gol Dakikaları: ${formatGoalMinutes(homeStats.goalsMinutes)}` : ''}

================================
📊 DEPLASMAN: ${matchData.awayTeam}
================================
Son 5 Maç:
  ${formatLastMatches(matchData.awayLastMatches)}
  
Form: ${formatForm(matchData.awayForm)}
Sezon: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Attığı: ${matchData.awayGoalsFor || 0} | Yediği: ${matchData.awayGoalsAgainst || 0}
${awayStats ? `Detaylı İstatistikler:
  - Temiz Kale: ${awayStats.cleanSheets || 0} maç
  - Gol Atamadığı Maç: ${awayStats.failedToScore || 0}
  - Deplasmanda Gol Ortalaması: ${awayStats.avgGoalsAway?.toFixed(2) || '-'}
  - Deplasmanda Yediği Ortalama: ${awayStats.avgGoalsConcededAway?.toFixed(2) || '-'}
  - En Uzun Galibiyet Serisi: ${awayStats.biggestWinStreak || '-'}
  - En Uzun Mağlubiyet Serisi: ${awayStats.biggestLoseStreak || '-'}
  - Penaltı: ${awayStats.penaltyScored || 0} attı, ${awayStats.penaltyMissed || 0} kaçırdı
  - Gol Dakikaları: ${formatGoalMinutes(awayStats.goalsMinutes)}` : ''}

================================
🤝 KAFA KAFAYA GEÇMİŞ
================================
${h2hSummary}
${matchData.h2hResults?.length ? matchData.h2hResults.slice(0, 5).map(h => `  ${matchData.homeTeam} ${h.homeGoals} - ${h.awayGoals} ${matchData.awayTeam}`).join('\n') : ''}

================================
📈 KARŞILAŞTIRMALI ANALİZ
================================
- Form Üstünlüğü: Ev ${comp?.form?.home || '-'}% vs Dep ${comp?.form?.away || '-'}%
- Hücum Gücü: Ev ${comp?.att?.home || '-'}% vs Dep ${comp?.att?.away || '-'}%
- Savunma Gücü: Ev ${comp?.def?.home || '-'}% vs Dep ${comp?.def?.away || '-'}%
- H2H Üstünlük: Ev ${comp?.h2h?.home || '-'}% vs Dep ${comp?.h2h?.away || '-'}%

================================
🔢 HESAPLANAN BEKLENEN GOLLER
================================
- ${matchData.homeTeam} Beklenen: ${expectedGoals.home} gol
- ${matchData.awayTeam} Beklenen: ${expectedGoals.away} gol
- Toplam Beklenen: ${expectedGoals.total} gol

${trends.length > 0 ? `================================
📌 TESPİT EDİLEN TRENDLER
================================
${trends.map(t => `- ${t}`).join('\n')}` : ''}

${odds ? `================================
💰 BAHİS ORANLARI
================================
MAÇ SONUCU:
- MS1 (Ev): ${odds.home?.toFixed(2) || '-'} | MSX (Beraberlik): ${odds.draw?.toFixed(2) || '-'} | MS2 (Deplasman): ${odds.away?.toFixed(2) || '-'}

ALT/ÜST:
- 1.5 Üst: ${odds.over15?.toFixed(2) || '-'} | 2.5 Alt: ${odds.under25?.toFixed(2) || '-'} | 2.5 Üst: ${odds.over25?.toFixed(2) || '-'} | 3.5 Alt: ${odds.under35?.toFixed(2) || '-'} | 3.5 Üst: ${odds.over35?.toFixed(2) || '-'}

KARŞILIKLI GOL:
- KG Var: ${odds.bttsYes?.toFixed(2) || '-'} | KG Yok: ${odds.bttsNo?.toFixed(2) || '-'}

ÇİFTE ŞANS:
- 1X: ${odds.doubleChanceHomeOrDraw?.toFixed(2) || '-'} | 12: ${odds.doubleChanceHomeOrAway?.toFixed(2) || '-'} | X2: ${odds.doubleChanceAwayOrDraw?.toFixed(2) || '-'}

İLK YARI:
- İY MS1: ${odds.halfTimeHome?.toFixed(2) || '-'} | İY X: ${odds.halfTimeDraw?.toFixed(2) || '-'} | İY MS2: ${odds.halfTimeAway?.toFixed(2) || '-'}
- İY 0.5 Üst: ${odds.htOver05?.toFixed(2) || '-'} | İY 0.5 Alt: ${odds.htUnder05?.toFixed(2) || '-'} | İY 1.5 Alt: ${odds.htUnder15?.toFixed(2) || '-'}

DNB (Beraberlik Yok):
- DNB Ev: ${odds.dnbHome?.toFixed(2) || '-'} | DNB Deplasman: ${odds.dnbAway?.toFixed(2) || '-'}` : ''}

${matchData.injuries?.home?.length || matchData.injuries?.away?.length ? `================================
🏥 SAKATLIKLAR
================================
${matchData.injuries?.home?.length ? `${matchData.homeTeam}: ${matchData.injuries.home.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}
${matchData.injuries?.away?.length ? `${matchData.awayTeam}: ${matchData.injuries.away.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}` : ''}

================================
📤 JSON ÇIKTI FORMATI (ZORUNLU)
================================

GEÇERLİ TAHMİN VARSA:
{
  "karar": "bahis",
  "matchContext": {
    "type": "${matchType}",
    "significance": "normal|relegation|title|promotion|final",
    "homeLeagueLevel": ${homeLeagueLevel},
    "awayLeagueLevel": ${awayLeagueLevel},
    "isCupUpset": false,
    "isDerby": ${isDerby}
  },
  "analysis": "5-8 cümlelik maç analizi. Form, taktik ve tahmin gerekçesi.",
  
  "singleBet": {
    "bet": "2.5 Üst",
    "odds": 1.72,
    "estimatedProbability": 58,
    "valuePercentage": 0.5,
    "confidence": 64,
    "riskLevel": "orta",
    "reasoning": "4-5 cümlelik detaylı yorum. Gerçek bir spor yorumcusu gibi samimi ve akıcı yaz. Maçın havası, takım formları, istatistikler ve bu tahminin neden en iyi seçenek olduğunu açıkla."
  },
  
  "avoidBets": {
    "1.5 Üst": "Oran minimum eşiğin altında",
    "MS1": "Ev avantajına rağmen değer düşük"
  },
  
  "expectedGoalRange": "2-3"
}

GEÇERLİ TAHMİN YOKSA:
{
  "karar": "pas",
  "singleBet": null,
  "analysis": "Bu maç için güvenilir bir tahmin yapılamıyor. [Kısa sebep açıkla]"
}

⚠️ KRİTİK KURALLAR:
- karar: "bahis" veya "pas" olmalı
- singleBet.odds minimum 1.50!
- valuePercentage = ((estimatedProbability/100) × odds) - 1
- Değer ≤ 0 ise "pas" döndür
- Güven ≥70 → düşük risk, 60-69 → orta risk, <60 → yüksek risk
- avoidBets obje formatında: {"bahis": "sebep"}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.35,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt vermedi");
    }

    const result = JSON.parse(content) as AIAnalysisResult;
    
    // Initialize predictions array if not present
    if (!result.predictions) {
      result.predictions = [];
    }
    
    // Handle "pas" decision - no valid prediction
    if (result.karar === 'pas' || (result as any).decision === 'pass') {
      console.log(`[AI] Decision: PASS - No confident prediction for this match`);
      result.karar = 'pas';
      result.singleBet = null;
      result.predictions = [];
      return result;
    }
    
    // Process single bet for new format
    if (result.singleBet) {
      const bet = result.singleBet;
      
      // Clamp estimatedProbability to valid range (0-100)
      if (typeof bet.estimatedProbability !== 'number' || isNaN(bet.estimatedProbability)) {
        bet.estimatedProbability = 50;
      }
      bet.estimatedProbability = Math.max(0, Math.min(100, bet.estimatedProbability));
      
      // Validate minimum odds (1.50) - STRICT ENFORCEMENT
      if (typeof bet.odds !== 'number' || isNaN(bet.odds) || bet.odds < 1.50) {
        console.log(`[AI] REJECTED: Bet odds ${bet.odds} below minimum 1.50 threshold`);
        result.karar = 'pas';
        result.singleBet = null;
        result.predictions = [];
        return result;
      }
      
      // Recalculate value percentage with validated inputs
      const calculatedValue = ((bet.estimatedProbability / 100) * bet.odds) - 1;
      bet.valuePercentage = Math.round(calculatedValue * 100) / 100;
      
      // If value is not positive, reject the bet
      if (calculatedValue <= 0) {
        console.log(`[AI] REJECTED: No value (${bet.valuePercentage}) for ${bet.bet}`);
        result.karar = 'pas';
        result.singleBet = null;
        result.predictions = [];
        return result;
      }
      
      // Assign risk level based on confidence (new thresholds)
      if (typeof bet.confidence !== 'number' || isNaN(bet.confidence)) {
        bet.confidence = bet.estimatedProbability;
      }
      bet.confidence = Math.max(0, Math.min(100, bet.confidence));
      
      if (bet.confidence >= 70) {
        bet.riskLevel = 'düşük';
      } else if (bet.confidence >= 60) {
        bet.riskLevel = 'orta';
      } else {
        bet.riskLevel = 'yüksek';
      }
      
      // Set karar to bahis for valid predictions
      result.karar = 'bahis';
      
      // Convert singleBet to predictions array for backwards compatibility
      result.predictions = [{
        type: 'expected',
        bet: bet.bet,
        odds: bet.odds.toString(),
        confidence: bet.confidence,
        reasoning: bet.reasoning || '',
        isValueBet: true,
        valuePercentage: bet.valuePercentage
      }];
      
      console.log(`[AI] Decision: BET | ${bet.bet} @ ${bet.odds} | Value: ${(bet.valuePercentage * 100).toFixed(1)}% | Risk: ${bet.riskLevel}`);
    } else {
      // No singleBet provided, treat as pass
      result.karar = 'pas';
      result.predictions = [];
    }
    
    return result;
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw error;
  }
}

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
    
    // Handle "pas" decision - AI decided not to bet on this match
    if (!analysis || analysis.karar === 'pas') {
      console.log(`[AI+BestBets] PASS decision for ${homeTeam} vs ${awayTeam} - no confident prediction`);
      return analysis || null;
    }
    
    if (!analysis.predictions || analysis.predictions.length === 0) {
      console.log(`[AI+BestBets] No predictions in result for ${homeTeam} vs ${awayTeam}`);
      return null;
    }
    
    const riskToLevel: Record<string, string> = {
      'expected': 'düşük',
      'medium': 'orta',
      'risky': 'yüksek'
    };
    
    for (const pred of analysis.predictions) {
      try {
        await pool.query(
          `INSERT INTO best_bets 
           (match_id, fixture_id, home_team, away_team, home_logo, away_logo, 
            league_name, league_logo, match_date, match_time,
            bet_type, bet_description, confidence, risk_level, reasoning, result, date_for)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', $16)
           ON CONFLICT (fixture_id, date_for) DO NOTHING`,
          [
            matchId,
            fixtureId,
            homeTeam,
            awayTeam,
            homeLogo,
            awayLogo,
            leagueName,
            leagueLogo,
            matchDate,
            matchTime,
            pred.bet,
            '',
            pred.confidence,
            riskToLevel[pred.type] || 'orta',
            pred.reasoning,
            matchDate
          ]
        );
        
        console.log(`[AI+BestBets] Saved prediction: ${pred.bet} (${pred.type}) for fixture ${fixtureId}`);
      } catch (err: any) {
        if (err.code !== '23505') {
          console.error(`[AI+BestBets] Error saving prediction:`, err.message);
        }
      }
    }
    
    const cacheKey = `ai_analysis_v8_${fixtureId}`;
    try {
      await pool.query(
        `INSERT INTO api_cache (key, value, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')
         ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '24 hours'`,
        [cacheKey, JSON.stringify(analysis)]
      );
      console.log(`[AI+BestBets] Cached analysis for fixture ${fixtureId}`);
    } catch (err: any) {
      console.error(`[AI+BestBets] Error caching analysis:`, err.message);
    }
    
    console.log(`[AI+BestBets] Completed for ${homeTeam} vs ${awayTeam}: ${analysis.predictions.length} predictions saved`);
    return analysis;
    
  } catch (error: any) {
    console.error(`[AI+BestBets] Error generating analysis for ${homeTeam} vs ${awayTeam}:`, error.message);
    return null;
  }
}

export async function generatePredictionsForAllPendingMatches(): Promise<{ processed: number; success: number; failed: number }> {
  console.log('[AI+BestBets] Starting batch prediction generation for all pending matches...');
  
  const result = await pool.query(
    `SELECT pm.* FROM published_matches pm
     WHERE pm.status = 'pending' 
     AND NOT EXISTS (SELECT 1 FROM best_bets bb WHERE bb.fixture_id = pm.fixture_id)
     ORDER BY pm.match_date, pm.match_time
     LIMIT 50`
  );
  
  const matches = result.rows;
  console.log(`[AI+BestBets] Found ${matches.length} matches without predictions`);
  
  let processed = 0;
  let success = 0;
  let failed = 0;
  
  for (const match of matches) {
    processed++;
    console.log(`[AI+BestBets] Processing ${processed}/${matches.length}: ${match.home_team} vs ${match.away_team}`);
    
    const matchData: MatchData = {
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      league: match.league_name || '',
      leagueId: match.league_id,
      comparison: match.api_comparison ? (typeof match.api_comparison === 'string' ? JSON.parse(match.api_comparison) : match.api_comparison) : undefined,
      homeForm: match.api_teams?.home?.league?.form,
      awayForm: match.api_teams?.away?.league?.form,
      h2hResults: match.api_h2h ? (typeof match.api_h2h === 'string' ? JSON.parse(match.api_h2h) : match.api_h2h)?.map((h: any) => ({
        homeGoals: h.homeGoals || 0,
        awayGoals: h.awayGoals || 0
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
        match.id,
        match.fixture_id,
        match.home_team,
        match.away_team,
        match.home_logo,
        match.away_logo,
        match.league_name,
        match.league_logo,
        match.match_date,
        match.match_time,
        matchData
      );
      
      if (analysis) {
        success++;
      } else {
        failed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      console.error(`[AI+BestBets] Failed for ${match.home_team} vs ${match.away_team}:`, error.message);
      failed++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`[AI+BestBets] Batch complete: ${success} success, ${failed} failed out of ${processed} processed`);
  return { processed, success, failed };
}

export type { MatchData };
