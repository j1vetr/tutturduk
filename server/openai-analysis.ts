import OpenAI from "openai";

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
  apiPrediction?: {
    winner?: { name: string; comment: string };
    winOrDraw?: boolean;
    underOver?: string;
    goalsHome?: string;
    goalsAway?: string;
    advice?: string;
    percent?: { home: string; draw: string; away: string };
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
    over25?: number;
    under25?: number;
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
  consistentScores: string[];
}

export interface AIAnalysisResult {
  matchContext: {
    type: 'league' | 'cup' | 'derby' | 'friendly';
    significance: 'normal' | 'relegation' | 'title' | 'promotion' | 'final';
    homeLeagueLevel: number;
    awayLeagueLevel: number;
    isCupUpset: boolean;
    isDerby: boolean;
  };
  analysis: string;
  predictions: PredictionItem[];
  avoidBets: string[];
  expertTip: string;
  expectedGoalRange: string;
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
    ['Real Madrid', 'Barcelona'], ['Real Madrid', 'Atletico Madrid'],
    ['Manchester United', 'Manchester City'], ['Liverpool', 'Everton'],
    ['Arsenal', 'Tottenham'], ['AC Milan', 'Inter'], ['Juventus', 'Inter'],
    ['Bayern', 'Dortmund'], ['PSG', 'Marseille'], ['Ajax', 'Feyenoord'],
    ['Celtic', 'Rangers'], ['Boca', 'River'], ['Flamengo', 'Fluminense'],
  ];
  
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  
  return derbies.some(([t1, t2]) => 
    (homeLower.includes(t1.toLowerCase()) && awayLower.includes(t2.toLowerCase())) ||
    (homeLower.includes(t2.toLowerCase()) && awayLower.includes(t1.toLowerCase()))
  );
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
  const apiPred = matchData.apiPrediction;
  const comp = matchData.comparison;
  const odds = matchData.odds;
  
  const matchType = matchData.matchType || detectMatchType(matchData.league);
  const isDerby = detectDerby(matchData.homeTeam, matchData.awayTeam);
  const homeLeagueLevel = matchData.homeLeagueLevel || 1;
  const awayLeagueLevel = matchData.awayLeagueLevel || 1;

  const prompt = `Sen 25 yıllık deneyime sahip PROFESYONEL BAHİS UZMANISIN. Mantıksal tutarlılık en önemli önceliğin.

================================
🏟️ MAÇ BİLGİLERİ
================================
Lig/Turnuva: ${matchData.league}
Maç Tipi: ${matchType === 'cup' ? '🏆 KUPA MAÇI' : '⚽ LİG MAÇI'}
${isDerby ? '🔥 DERBİ MAÇI' : ''}
Ev Sahibi: ${matchData.homeTeam}${matchData.homeRank ? ` (Sıralama: ${matchData.homeRank}. - ${matchData.homePoints} puan)` : ''}
Deplasman: ${matchData.awayTeam}${matchData.awayRank ? ` (Sıralama: ${matchData.awayRank}. - ${matchData.awayPoints} puan)` : ''}

${homeLeagueLevel !== awayLeagueLevel ? `⚠️ DİKKAT: Farklı lig seviyeleri!
- ${matchData.homeTeam}: ${homeLeagueLevel}. Lig
- ${matchData.awayTeam}: ${awayLeagueLevel}. Lig
Alt lig takımı genelde defansif oynar, sürpriz riski yüksek!` : ''}

================================
📊 EV SAHİBİ İSTATİSTİKLERİ
================================
${matchData.homeTeam}:
Son 5 Maç:
  ${formatLastMatches(matchData.homeLastMatches)}
  
Form: ${formatForm(matchData.homeForm)}
Sezon: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Attığı: ${matchData.homeGoalsFor || 0} | Yediği: ${matchData.homeGoalsAgainst || 0}
${homeStats ? `Detay:
  - Temiz Kale: ${homeStats.cleanSheets || 0}
  - Gol Atamadığı Maç: ${homeStats.failedToScore || 0}
  - Evde Gol Ort.: ${homeStats.avgGoalsHome?.toFixed(2) || '-'}
  - Evde Yediği Ort.: ${homeStats.avgGoalsConcededHome?.toFixed(2) || '-'}` : ''}

================================
📊 DEPLASMAN İSTATİSTİKLERİ
================================
${matchData.awayTeam}:
Son 5 Maç:
  ${formatLastMatches(matchData.awayLastMatches)}
  
Form: ${formatForm(matchData.awayForm)}
Sezon: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Attığı: ${matchData.awayGoalsFor || 0} | Yediği: ${matchData.awayGoalsAgainst || 0}
${awayStats ? `Detay:
  - Temiz Kale: ${awayStats.cleanSheets || 0}
  - Gol Atamadığı Maç: ${awayStats.failedToScore || 0}
  - Deplasmanda Gol Ort.: ${awayStats.avgGoalsAway?.toFixed(2) || '-'}
  - Deplasmanda Yediği Ort.: ${awayStats.avgGoalsConcededAway?.toFixed(2) || '-'}` : ''}

================================
🤝 H2H (KAFA KAFAYA GEÇMİŞ)
================================
${h2hSummary}
${matchData.h2hResults?.length ? matchData.h2hResults.slice(0, 5).map(h => `  ${matchData.homeTeam} ${h.homeGoals} - ${h.awayGoals} ${matchData.awayTeam}`).join('\n') : ''}

================================
📈 MODEL KARŞILAŞTIRMALARI
================================
- Form: Ev ${comp?.form?.home || '-'}% vs Dep ${comp?.form?.away || '-'}%
- Atak: Ev ${comp?.att?.home || '-'}% vs Dep ${comp?.att?.away || '-'}%
- Defans: Ev ${comp?.def?.home || '-'}% vs Dep ${comp?.def?.away || '-'}%
- H2H Üstünlük: Ev ${comp?.h2h?.home || '-'}% vs Dep ${comp?.h2h?.away || '-'}%

${apiPred ? `================================
🎯 API TAHMİN VERİLERİ
================================
- Kazanan: ${apiPred.winner?.name || '-'} (${apiPred.winner?.comment || ''})
- Olasılıklar: Ev %${apiPred.percent?.home || '-'} | X %${apiPred.percent?.draw || '-'} | Dep %${apiPred.percent?.away || '-'}
- Alt/Üst: ${apiPred.underOver || '-'}
- Beklenen Skor: ${apiPred.goalsHome || '-'} - ${apiPred.goalsAway || '-'}
- Tavsiye: ${apiPred.advice || '-'}` : ''}

${odds ? `================================
💰 BAHİS ORANLARI
================================
- Ev Kazanır: ${odds.home?.toFixed(2) || '-'}
- Beraberlik: ${odds.draw?.toFixed(2) || '-'}
- Deplasman: ${odds.away?.toFixed(2) || '-'}
- 2.5 Üst: ${odds.over25?.toFixed(2) || '-'}
- 2.5 Alt: ${odds.under25?.toFixed(2) || '-'}` : ''}

${matchData.injuries?.home?.length || matchData.injuries?.away?.length ? `================================
🏥 SAKATLIKLAR
================================
${matchData.injuries?.home?.length ? `${matchData.homeTeam}: ${matchData.injuries.home.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}
${matchData.injuries?.away?.length ? `${matchData.awayTeam}: ${matchData.injuries.away.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}` : ''}

================================
⚠️ KRİTİK KURALLAR (ZORUNLU)
================================

1️⃣ SKOR-GOL TUTARLILIĞI (ÇOK ÖNEMLİ!)
   - 2.5 ÜST tahmini veriyorsan: SADECE 3+ gollü skorlar ver (2-1, 3-0, 2-2, 3-1 vb.)
   - 2.5 ALT tahmini veriyorsan: SADECE 0-2 gollü skorlar ver (1-0, 0-0, 1-1, 2-0 vb.)
   - 3.5 ÜST tahmini veriyorsan: SADECE 4+ gollü skorlar ver (3-1, 2-2, 4-0 vb.)
   - KG VAR diyorsan: Her iki takım da gol atmalı (1-1, 2-1, 1-2 vb.)
   - KG YOK diyorsan: En az bir takım gol atmamalı (1-0, 0-0, 2-0 vb.)

2️⃣ RİSK SEVİYELERİ
   - BEKLENEN (Düşük Risk): %60+ güven, 1.30-1.70 oran aralığı
   - ORTA RİSK: %40-60 güven, 1.70-2.50 oran aralığı
   - RİSKLİ (Yüksek Risk): %15-40 güven, 2.50+ oran aralığı

3️⃣ KUPA MAÇI KURALLARI
   - Alt lig takımı genelde defansif oynar
   - İlk yarıda az gol beklenir (İY 0.5 Alt değerli)
   - Sürpriz sonuç riski yüksek
   - Üst lig takımı için handikap riskli

4️⃣ DERBİ KURALLARI
   - İlk yarı genelde temkinli geçer
   - Duygusal atmosfer, beklenmedik kartlar
   - Çok gollü veya golsüz olabilir - ekstrem tahminler
   
================================
📤 JSON ÇIKTI FORMATI (ZORUNLU)
================================
{
  "matchContext": {
    "type": "${matchType}",
    "significance": "normal",
    "homeLeagueLevel": ${homeLeagueLevel},
    "awayLeagueLevel": ${awayLeagueLevel},
    "isCupUpset": false,
    "isDerby": ${isDerby}
  },
  "analysis": "5-6 cümlelik detaylı analiz. Takım formları, H2H, iç saha avantajı, lig seviyesi farkı gibi faktörleri değerlendir. Profesyonel bahisçi bakış açısıyla yaz.",
  "predictions": [
    {
      "type": "expected",
      "bet": "2.5 Üst veya 2.5 Alt gibi güvenli bahis",
      "odds": "~1.55",
      "confidence": 65,
      "reasoning": "2 cümlelik açıklama",
      "consistentScores": ["2-1", "1-2", "2-2"]
    },
    {
      "type": "medium",
      "bet": "Ev Kazanır, KG Var, 3.5 Üst gibi orta riskli bahis",
      "odds": "~2.00",
      "confidence": 48,
      "reasoning": "2 cümlelik açıklama",
      "consistentScores": ["2-1", "3-1"]
    },
    {
      "type": "risky",
      "bet": "İY 0 - MS 1, Tam Skor, Handikap gibi yüksek oranlı bahis",
      "odds": "~5.00",
      "confidence": 22,
      "reasoning": "2 cümlelik açıklama",
      "consistentScores": ["1-0"]
    }
  ],
  "avoidBets": ["Bu maçta kaçınılması gereken 1-2 bahis ve sebebi"],
  "expertTip": "1-2 cümlelik kısa strateji önerisi",
  "expectedGoalRange": "2-3 gol"
}

NOT: consistentScores her zaman bet ile uyumlu olmalı! 2.5 Üst diyorsan 3+ gollü skorlar, 2.5 Alt diyorsan 2 ve altı gollü skorlar ver.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen 25 yıllık deneyime sahip profesyonel bir bahis uzmanı ve futbol analistisin. En önemli özelliğin MANTIKSAL TUTARLILIK. Skor tahminlerin her zaman gol tahminlerinle uyumlu olmalı. Kesinlikle 2.5 Üst deyip 2 gollü skor vermezsin. Türkçe yazıyorsun. Sadece JSON formatında yanıt veriyorsun."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt vermedi");
    }

    const result = JSON.parse(content) as AIAnalysisResult;
    
    // Validate score consistency
    for (const pred of result.predictions) {
      if (pred.bet.includes('2.5 Üst') || pred.bet.includes('2,5 Üst')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const [h, a] = score.split('-').map(Number);
          return (h + a) >= 3;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['2-1', '1-2', '2-2'];
        }
      } else if (pred.bet.includes('2.5 Alt') || pred.bet.includes('2,5 Alt')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const [h, a] = score.split('-').map(Number);
          return (h + a) <= 2;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['1-0', '0-1', '1-1'];
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw error;
  }
}

export type { MatchData };
