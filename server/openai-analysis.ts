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

  const systemPrompt = `Sen %72 başarı oranına sahip, IDDAA ve spor bahisleri konusunda 25 yıllık tecrübeli profesyonel bir analistsin.

ÖNEMLİ: Sen KENDİ TAHMİNİNİ yapıyorsun. Sana verilen istatistikleri analiz ederek bağımsız kararlar veriyorsun.

DÜŞÜNCE ZİNCİRİ YAKLAŞIMI:
Tahmin yapmadan önce şu adımları sırayla düşün:
1. FORM ANALİZİ: Her iki takımın son 5 maç performansı nasıl?
2. EV SAHİBİ AVANTAJI: Ev sahibi evinde ne kadar güçlü?
3. GOL EĞİLİMİ: Takımlar gol atıyor mu, yiyor mu?
4. H2H GEÇMİŞİ: Geçmiş karşılaşmalar ne söylüyor?
5. SONUÇ: Tüm faktörleri birleştirerek karar ver.

GÜVENİLİRLİK KALİBRASYONU:
- Form uyumu varsa: +8%
- H2H desteği varsa: +6%
- Ev avantajı güçlüyse: +5%
- Oranlar düşükse (1.30-1.50): +5%
- Derbi/Kupa maçı: -10% (belirsizlik artar)
- İlk karşılaşma: -8%

Türkçe yanıt ver. Sadece JSON formatında yanıt ver.`;

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
💰 BAHİS ORANLARI (Referans)
================================
- Ev Kazanır: ${odds.home?.toFixed(2) || '-'}
- Beraberlik: ${odds.draw?.toFixed(2) || '-'}
- Deplasman: ${odds.away?.toFixed(2) || '-'}
- 2.5 Üst: ${odds.over25?.toFixed(2) || '-'}
- 2.5 Alt: ${odds.under25?.toFixed(2) || '-'}` : ''}

${matchData.injuries?.home?.length || matchData.injuries?.away?.length ? `================================
🏥 SAKATLIK/CEZA BİLGİLERİ
================================
${matchData.injuries?.home?.length ? `${matchData.homeTeam}: ${matchData.injuries.home.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}
${matchData.injuries?.away?.length ? `${matchData.awayTeam}: ${matchData.injuries.away.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}` : ''}

================================
⚠️ KRİTİK KURALLAR (ZORUNLU)
================================

1️⃣ SKOR-GOL TUTARLILIĞI (ÇOK ÖNEMLİ!)
   - 2.5 ÜST → SADECE 3+ gollü skorlar: 2-1, 3-0, 2-2, 3-1, 1-3
   - 2.5 ALT → SADECE 0-2 gollü skorlar: 1-0, 0-0, 1-1, 2-0, 0-1
   - 3.5 ÜST → SADECE 4+ gollü skorlar: 3-1, 2-2, 4-0, 2-3
   - KG VAR → Her iki takım gol atmalı: 1-1, 2-1, 1-2, 2-2
   - KG YOK → En az bir takım gol atmamalı: 1-0, 0-0, 2-0, 3-0

2️⃣ RİSK SEVİYELERİ & GÜVENİLİRLİK
   - BEKLENEN (expected): %55-70 güven, 1.30-1.70 oran
   - ORTA RİSK (medium): %40-55 güven, 1.70-2.50 oran
   - RİSKLİ (risky): %20-40 güven, 2.50+ oran

3️⃣ DİNAMİK BAHİS ÖNERİLERİ
   - Temiz kale oranı yüksekse → KG YOK veya 2.5 Alt düşün
   - Gol atamayan takım varsa → Rakip "Gol Atar" düşün
   - H2H gollüyse → 2.5 Üst veya KG Var düşün
   - Derbi ise → İY 0.5 Alt veya Beraberlik düşün

================================
📤 JSON ÇIKTI FORMATI (ZORUNLU)
================================
{
  "matchContext": {
    "type": "${matchType}",
    "significance": "normal|relegation|title|promotion|final",
    "homeLeagueLevel": ${homeLeagueLevel},
    "awayLeagueLevel": ${awayLeagueLevel},
    "isCupUpset": false,
    "isDerby": ${isDerby}
  },
  "analysis": "6-8 cümlelik kapsamlı analiz. Düşünce zinciri yaklaşımıyla: form, ev avantajı, gol eğilimi, H2H ve sonuç. Profesyonel bahisçi gibi yaz.",
  "predictions": [
    {
      "type": "expected",
      "bet": "En güvenilir bahis (2.5 Alt/Üst, KG Var/Yok, MS1/X/2)",
      "odds": "~1.55",
      "confidence": 62,
      "reasoning": "3 cümlelik gerekçe",
      "consistentScores": ["...", "...", "..."]
    },
    {
      "type": "medium",
      "bet": "Orta riskli bahis (Handikap, 3.5 Üst, Çifte Şans)",
      "odds": "~2.10",
      "confidence": 48,
      "reasoning": "3 cümlelik gerekçe",
      "consistentScores": ["...", "..."]
    },
    {
      "type": "risky",
      "bet": "Yüksek oranlı bahis (Tam Skor, İY-MS, 4.5 Üst)",
      "odds": "~4.50",
      "confidence": 28,
      "reasoning": "3 cümlelik gerekçe",
      "consistentScores": ["..."]
    }
  ],
  "avoidBets": ["Bu maçta kaçınılması gereken 2-3 bahis ve sebepleri"],
  "expertTip": "2-3 cümlelik profesyonel strateji önerisi",
  "expectedGoalRange": "${expectedGoals.total > 2.5 ? '2-4' : '1-2'} gol"
}

ÖNEMLİ: consistentScores her zaman bet ile tutarlı olmalı! Bu kuralı asla çiğneme.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      temperature: 0.4,
      max_tokens: 1800,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt vermedi");
    }

    const result = JSON.parse(content) as AIAnalysisResult;
    
    for (const pred of result.predictions) {
      const betLower = pred.bet.toLowerCase();
      
      if (betLower.includes('2.5 üst') || betLower.includes('2,5 üst')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const parts = score.split('-').map(s => parseInt(s.trim()));
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
          return (parts[0] + parts[1]) >= 3;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['2-1', '1-2', '2-2'];
        }
      } else if (betLower.includes('2.5 alt') || betLower.includes('2,5 alt')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const parts = score.split('-').map(s => parseInt(s.trim()));
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
          return (parts[0] + parts[1]) <= 2;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['1-0', '0-1', '1-1'];
        }
      } else if (betLower.includes('3.5 üst') || betLower.includes('3,5 üst')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const parts = score.split('-').map(s => parseInt(s.trim()));
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
          return (parts[0] + parts[1]) >= 4;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['3-1', '2-2', '3-2'];
        }
      } else if (betLower.includes('3.5 alt') || betLower.includes('3,5 alt')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const parts = score.split('-').map(s => parseInt(s.trim()));
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
          return (parts[0] + parts[1]) <= 3;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['2-1', '1-1', '2-0'];
        }
      } else if (betLower.includes('kg var') || betLower.includes('karşılıklı gol var')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const parts = score.split('-').map(s => parseInt(s.trim()));
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
          return parts[0] > 0 && parts[1] > 0;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['1-1', '2-1', '1-2'];
        }
      } else if (betLower.includes('kg yok') || betLower.includes('karşılıklı gol yok')) {
        pred.consistentScores = pred.consistentScores.filter(score => {
          const parts = score.split('-').map(s => parseInt(s.trim()));
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
          return parts[0] === 0 || parts[1] === 0;
        });
        if (pred.consistentScores.length === 0) {
          pred.consistentScores = ['1-0', '0-0', '2-0'];
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
