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

  const systemPrompt = `Sen Türkiye'nin en başarılı bahis analisti "STAT MASTER"sın. 25 yıllık profesyonel tecrübe, %72 uzun vadeli başarı oranı.

🎯 UZMANLIKLARIN:
- İstatistiksel futbol analizi ve model kurma
- Value betting (değer bahisi) tespiti
- Psikolojik faktör analizi (motivasyon, baskı, derbi atmosferi)
- Oran hareketleri ve piyasa analizi
- Risk yönetimi ve bankroll stratejileri

📊 ANALİZ METODOLOJİN:
1. TEMEL ANALİZ: Form, kadro, sakatlıklar, motivasyon
2. İSTATİSTİKSEL ANALİZ: xG, gol beklentisi, temiz kale oranları
3. PAZAR ANALİZİ: Oran değeri, piyasa beklentisi vs gerçek olasılık
4. PSİKOLOJİK ANALİZ: Takım motivasyonu, taraftar baskısı, seri durumu

🔢 GÜVENİLİRLİK KALİBRASYONU:
BAŞLANGIÇ: %50 (her maç için)
+ Form tutarlılığı güçlü: +12%
+ H2H trendi destekliyor: +8%
+ Ev sahibi avantajı belirgin: +7%
+ Oranlar düşük (1.30-1.50): +5%
+ Değer bahisi tespit edildi: +5%
- Derbi/Kupa maçı: -12% (belirsizlik)
- İlk karşılaşma: -10%
- Sakatlık/ceza yoğunluğu: -8%
- Son dakika form düşüşü: -6%

💡 DEĞER BAHİSİ PRENSİBİ:
Oran > (100 / gerçek olasılık %) ise VALUE VAR!
Örnek: %60 olasılık → 1.67 altı oran value YOK, üstü VALUE VAR

⚖️ RİSK/ÖDÜL DENGELEME:
- BEKLENEN: %55-75 güven, 1.25-1.75 oran (güvenli seçim)
- ORTA RİSK: %40-55 güven, 1.75-2.50 oran (dengeli risk)
- RİSKLİ: %25-40 güven, 2.50+ oran (yüksek potansiyel)

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
💰 BAHİS ORANLARI (Türkiye İddaa)
================================
MAÇ SONUCU:
- Ev Kazanır (1): ${odds.home?.toFixed(2) || '-'}
- Beraberlik (X): ${odds.draw?.toFixed(2) || '-'}
- Deplasman (2): ${odds.away?.toFixed(2) || '-'}

ALT/ÜST GOLLER:
- 1.5 Alt: ${odds.under15?.toFixed(2) || '-'} | 1.5 Üst: ${odds.over15?.toFixed(2) || '-'}
- 2.5 Alt: ${odds.under25?.toFixed(2) || '-'} | 2.5 Üst: ${odds.over25?.toFixed(2) || '-'}
- 3.5 Alt: ${odds.under35?.toFixed(2) || '-'} | 3.5 Üst: ${odds.over35?.toFixed(2) || '-'}
- 4.5 Alt: ${odds.under45?.toFixed(2) || '-'} | 4.5 Üst: ${odds.over45?.toFixed(2) || '-'}

KARŞILIKLI GOL:
- KG Var: ${odds.bttsYes?.toFixed(2) || '-'} | KG Yok: ${odds.bttsNo?.toFixed(2) || '-'}

ÇİFTE ŞANS:
- 1-X (Ev veya Beraberlik): ${odds.doubleChanceHomeOrDraw?.toFixed(2) || '-'}
- 1-2 (Ev veya Deplasman): ${odds.doubleChanceHomeOrAway?.toFixed(2) || '-'}
- X-2 (Beraberlik veya Deplasman): ${odds.doubleChanceAwayOrDraw?.toFixed(2) || '-'}

İLK YARI:
- İY Ev: ${odds.halfTimeHome?.toFixed(2) || '-'} | İY X: ${odds.halfTimeDraw?.toFixed(2) || '-'} | İY Deplasman: ${odds.halfTimeAway?.toFixed(2) || '-'}` : ''}

${matchData.injuries?.home?.length || matchData.injuries?.away?.length ? `================================
🏥 SAKATLIK/CEZA BİLGİLERİ
================================
${matchData.injuries?.home?.length ? `${matchData.homeTeam}: ${matchData.injuries.home.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}
${matchData.injuries?.away?.length ? `${matchData.awayTeam}: ${matchData.injuries.away.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}` : ''}

================================
⚠️ KRİTİK KURALLAR (ZORUNLU)
================================

🔴 0️⃣ GLOBAL TUTARLILIK (EN ÖNEMLİ KURAL!)
   ÜÇ TAHMİN BİRBİRİYLE ÇELİŞMEMELİ!
   
   Önce maç senaryosunu belirle:
   - DÜŞÜK GOLLU SENARYO → Tüm tahminler düşük gol desteklemeli (2.5 Alt, KG Yok, 1-0, 0-0)
   - YÜKSEK GOLLU SENARYO → Tüm tahminler yüksek gol desteklemeli (2.5 Üst, KG Var, 3.5 Üst)
   - EV SAHİBİ ÜSTÜN → MS1, Ev -1.5, Ev 1.5 Üst (hep ev sahibi lehine)
   - DEPLASMAN ÜSTÜN → MS2, Dep -1.5, Dep 1.5 Üst (hep deplasman lehine)
   
   ❌ YASAK KOMBİNASYONLAR (ASLA YAPMA!):
   - Ana: "MS1" (3-0, 2-1) + Alternatif: "2.5 Alt" → ÇELİŞKİ!
   - Ana: "2.5 Üst" + Alternatif: "KG Yok" (1-0, 2-0) → ÇELİŞKİ!
   - Ana: "KG Var" + Alternatif: "2.5 Alt" → ÇELİŞKİ! (KG Var en az 2 gol demek)
   
   ✅ DOĞRU KOMBİNASYONLAR:
   - DÜŞÜK GOL: "2.5 Alt" + "KG Yok" + "İY 0.5 Alt"
   - YÜKSEK GOL: "2.5 Üst" + "KG Var" + "3.5 Üst"
   - EV ÜSTÜN: "MS1" + "Ev -1.5" + "Ev 2.5 Üst" (hep ev sahibi)
   - DEPLASMAN: "MS2" + "2.5 Üst" + "KG Var"

1️⃣ SKOR-GOL TUTARLILIĞI
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

4️⃣ SON KONTROL (JSON döndürmeden önce)
   Üç tahmini gözden geçir:
   - Tüm "consistentScores" aynı gol bandında mı? (hepsi 0-2 veya hepsi 3+)
   - Çelişen bahis var mı? (Üst+Alt, KG Var+KG Yok)
   - Varsa, çelişen tahmini senaryo ile uyumlu bir bahisle değiştir!

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
  "analysis": "8-12 cümlelik derinlemesine analiz. Her paragrafta: (1) Form ve momentum değerlendirmesi, (2) Taktiksel ve teknik karşılaştırma, (3) Psikolojik faktörler ve motivasyon, (4) Sonuç ve tahmin özeti. Profesyonel spor yazarı üslubuyla yaz.",
  
  "keyFactors": [
    {"factor": "En önemli istatistiksel faktör", "impact": "positive|negative|neutral", "weight": 9},
    {"factor": "İkinci önemli faktör", "impact": "positive|negative|neutral", "weight": 7},
    {"factor": "Üçüncü faktör", "impact": "positive|negative|neutral", "weight": 5}
  ],
  
  "predictions": [
    {
      "type": "expected",
      "bet": "En güvenilir bahis (2.5 Alt/Üst, KG Var/Yok, MS1/X/2)",
      "odds": "~1.55",
      "confidence": 62,
      "isValueBet": true,
      "reasoning": "3-4 cümlelik detaylı gerekçe. Hangi istatistikler bu tahmini destekliyor? Neden bu oran değerli?",
      "consistentScores": ["X-X", "X-X", "X-X"]
    },
    {
      "type": "medium",
      "bet": "Orta riskli bahis (Handikap, 3.5 Üst, Çifte Şans)",
      "odds": "~2.10",
      "confidence": 48,
      "isValueBet": false,
      "reasoning": "3-4 cümlelik detaylı gerekçe. Risk faktörleri neler? Hangi senaryoda kazanır?",
      "consistentScores": ["X-X", "X-X"]
    },
    {
      "type": "risky",
      "bet": "Yüksek oranlı bahis (Tam Skor, İY-MS, 4.5 Üst)",
      "odds": "~4.50",
      "confidence": 28,
      "isValueBet": true,
      "reasoning": "3-4 cümlelik gerekçe. Bu yüksek oran neden değerli? Hangi koşulda gerçekleşir?",
      "consistentScores": ["X-X"]
    }
  ],
  
  "expertCommentary": {
    "headline": "Dikkat çekici 1 cümlelik başlık (tıklama çekici, profesyonel)",
    "keyInsight": "Bu maçın en kritik noktası nedir? 2-3 cümle derinlemesine içgörü.",
    "formAnalysis": "Her iki takımın form durumu hakkında 2-3 cümle profesyonel yorum.",
    "tacticalView": "Taktiksel beklentiler ve olası oyun planları. 2-3 cümle.",
    "riskWarning": "Bu maçta nelere dikkat edilmeli? Potansiyel tuzaklar neler? 2-3 cümle.",
    "stakeSuggestion": "düşük|orta|yüksek (bankroll'un %1-5 arası önerisi)"
  },
  
  "avoidBets": [
    {"bet": "Kaçınılması gereken bahis 1", "reason": "Neden riskli?"},
    {"bet": "Kaçınılması gereken bahis 2", "reason": "Neden riskli?"}
  ],
  
  "matchPrediction": {
    "mostLikelyScore": "X-X",
    "expectedTotalGoals": "${expectedGoals.total.toFixed(1)}",
    "winProbabilities": {"home": 45, "draw": 25, "away": 30},
    "overUnderProbability": {"over25": 55, "under25": 45}
  }
}

⚠️ KRİTİK HATIRLATMALAR:
- consistentScores HER ZAMAN bet türüyle tutarlı olmalı!
- keyFactors gerçek istatistiklere dayalı olmalı (uydurma yapma)
- winProbabilities toplamı 100 olmalı
- isValueBet: Oran gerçek olasılığa göre değerliyse true

ÖNEMLİ: Tüm tahminler birbiriyle tutarlı olmalı. Aynı maç senaryosunu desteklemeli!`;

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
      temperature: 0.35,
      max_tokens: 2500,
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
    
    // GLOBAL CONSISTENCY CHECK - Fix conflicting predictions
    if (result.predictions.length >= 2) {
      const mainPred = result.predictions[0];
      const mainBet = mainPred.bet.toLowerCase();
      
      // Determine main bet's goal expectation from scores
      const mainScores = mainPred.consistentScores;
      let mainTotalGoals = 0;
      let mainHomeGoals = 0;
      let mainAwayGoals = 0;
      if (mainScores.length > 0) {
        const scoreParts = mainScores.map(s => {
          const parts = s.split('-').map(n => parseInt(n.trim()) || 0);
          return { home: parts[0], away: parts[1], total: parts[0] + parts[1] };
        });
        mainTotalGoals = scoreParts.reduce((a, b) => a + b.total, 0) / scoreParts.length;
        mainHomeGoals = scoreParts.reduce((a, b) => a + b.home, 0) / scoreParts.length;
        mainAwayGoals = scoreParts.reduce((a, b) => a + b.away, 0) / scoreParts.length;
      }
      
      // Classify main bet scenario - NUMERIC SCORE IS THE SOURCE OF TRUTH
      // Use actual goal expectation from scores, not just text keywords
      const hasExplicitHighKeyword = mainBet.includes('üst') || mainBet.includes('kg var');
      const hasExplicitLowKeyword = mainBet.includes('alt') || mainBet.includes('kg yok');
      
      // Numeric goal expectation takes priority over text keywords
      // If scores show 2.5+ goals on average, it's high scoring regardless of text
      const isHighScoring = mainTotalGoals >= 2.5 || (mainTotalGoals >= 2 && hasExplicitHighKeyword);
      // Low scoring ONLY if numeric is low AND NOT explicitly high scoring
      const isLowScoring = mainTotalGoals < 2 && !isHighScoring;
      
      const isHomeWin = mainBet.includes('ms1') || mainBet.includes('ev kazanır') || mainHomeGoals > mainAwayGoals + 0.5;
      const isAwayWin = mainBet.includes('ms2') || mainBet.includes('deplasman') || mainAwayGoals > mainHomeGoals + 0.5;
      const isBothScore = mainBet.includes('kg var') || (mainHomeGoals >= 1 && mainAwayGoals >= 1);
      // Clean sheet detection - one team scored 0
      const isCleanSheet = mainBet.includes('kg yok') || mainHomeGoals < 0.5 || mainAwayGoals < 0.5;
      
      console.log(`[AI Consistency] Main bet: "${mainPred.bet}", Avg goals: ${mainTotalGoals.toFixed(1)} (${mainHomeGoals.toFixed(1)}-${mainAwayGoals.toFixed(1)})`);
      console.log(`[AI Consistency] Scenario: High=${isHighScoring}, Low=${isLowScoring}, Home=${isHomeWin}, Away=${isAwayWin}, BothScore=${isBothScore}`);
      
      // Check and fix conflicting predictions
      for (let i = 1; i < result.predictions.length; i++) {
        const pred = result.predictions[i];
        const betLower = pred.bet.toLowerCase();
        let conflict = false;
        
        // HIGH SCORING conflicts (avg goals ≥ 2.5, all replacement scores must be ≥3 total)
        if (isHighScoring) {
          // 2.5 Alt conflicts with high scoring
          if (betLower.includes('2.5 alt') || betLower.includes('2,5 alt')) {
            console.log(`[AI Consistency] Conflict: High scoring main + "2.5 Alt". Replacing...`);
            // If clean sheet scenario, use team-specific over bets (with ≥3 total goals)
            if (isCleanSheet) {
              if (isHomeWin) {
                pred.bet = pred.type === 'medium' ? 'Ev 1.5 Üst' : 'Ev -1.5';
                pred.consistentScores = ['3-0', '4-0', '5-0']; // All ≥3 total, home 2+
                pred.reasoning = 'Ev sahibi rahat kazanır, gollü bir performans bekleniyor.';
              } else if (isAwayWin) {
                pred.bet = pred.type === 'medium' ? 'Dep 1.5 Üst' : 'Dep -1.5';
                pred.consistentScores = ['0-3', '0-4', '0-5']; // All ≥3 total, away 2+
                pred.reasoning = 'Deplasman fark yapar, gollü bir galibiyet bekleniyor.';
              } else {
                pred.bet = pred.type === 'medium' ? '2.5 Üst' : '3.5 Üst';
                pred.consistentScores = pred.type === 'medium' ? ['3-0', '0-3', '4-0'] : ['4-0', '0-4', '5-0'];
                pred.reasoning = 'Tek taraflı ama gollü bir maç bekleniyor.';
              }
            } else {
              // High-scoring BTTS: KG Var with ≥3 total goals
              pred.bet = pred.type === 'medium' ? 'KG Var' : '3.5 Üst';
              pred.consistentScores = pred.type === 'medium' ? ['2-1', '3-1', '2-2'] : ['3-1', '2-2', '3-2'];
              pred.reasoning = 'Maçın gol potansiyeli yüksek, bu bahis ana tahminle uyumlu.';
            }
            conflict = true;
          }
          // KG Yok conflicts with high scoring - ONLY if not clean sheet scenario
          if (!conflict && betLower.includes('kg yok') && !isCleanSheet) {
            console.log(`[AI Consistency] Conflict: High scoring BTTS main + "KG Yok". Replacing...`);
            // Replace with bets that support high-scoring BTTS scenario
            pred.bet = pred.type === 'medium' ? '2.5 Üst' : 'KG Var';
            pred.consistentScores = pred.type === 'medium' ? ['2-1', '3-1', '1-2'] : ['2-1', '3-1', '2-2']; // All ≥3 total
            pred.reasoning = 'Gollü bir maç bekleniyor, her iki takımın da skorerlerini sahaya sürmesi muhtemel.';
            conflict = true;
          }
          // High scoring clean sheet - KG Yok is actually OK, just needs goal-compatible replacement for other conflicts
        }
        
        // LOW SCORING conflicts
        if (isLowScoring && !conflict) {
          // 2.5 Üst or 3.5 Üst conflicts with low scoring
          if (betLower.includes('2.5 üst') || betLower.includes('2,5 üst') || betLower.includes('3.5 üst') || betLower.includes('3,5 üst')) {
            console.log(`[AI Consistency] Conflict: Low scoring main + "Üst". Replacing...`);
            pred.bet = pred.type === 'medium' ? 'KG Yok' : 'İY 0.5 Alt';
            pred.consistentScores = pred.type === 'medium' ? ['1-0', '0-0', '2-0'] : ['0-0'];
            pred.reasoning = 'Düşük gol beklentisi doğrultusunda temkinli bir seçim.';
            conflict = true;
          }
          // KG Var conflicts with low scoring
          if (!conflict && betLower.includes('kg var')) {
            console.log(`[AI Consistency] Conflict: Low scoring main + "KG Var". Replacing...`);
            pred.bet = pred.type === 'medium' ? '2.5 Alt' : '0-0';
            pred.consistentScores = pred.type === 'medium' ? ['1-0', '0-1', '1-1'] : ['0-0'];
            pred.reasoning = 'Düşük skorlu maç senaryosu ile uyumlu bir tercih.';
            conflict = true;
          }
        }
        
        // BOTH TEAMS SCORE conflicts
        if (isBothScore && !conflict) {
          if (betLower.includes('kg yok')) {
            console.log(`[AI Consistency] Conflict: BothScore main + "KG Yok". Replacing...`);
            // Both teams score implies at least 2 goals, but high-scoring BTTS implies 3+
            pred.bet = isHighScoring ? '2.5 Üst' : 'KG Var';
            pred.consistentScores = isHighScoring ? ['2-1', '1-2', '3-1'] : ['1-1', '2-1', '1-2'];
            pred.reasoning = 'Her iki takımın da gol atması bekleniyor, toplam gol yüksek olabilir.';
            conflict = true;
          }
        }
        
        // CLEAN SHEET conflicts - respect goal expectation
        if (isCleanSheet && !conflict) {
          if (betLower.includes('kg var')) {
            console.log(`[AI Consistency] Conflict: CleanSheet main + "KG Var". Replacing...`);
            // If high scoring clean sheet (e.g. 3-0, 4-0), use goal-appropriate replacement with ≥3 total
            if (isHighScoring || mainTotalGoals >= 2.5) {
              // High scoring clean sheet - use team-specific over bets with ≥3 total goals
              if (isHomeWin) {
                pred.bet = pred.type === 'medium' ? 'Ev 1.5 Üst' : 'Ev -1.5';
                pred.consistentScores = ['3-0', '4-0', '5-0']; // All ≥3 total, home 2+
                pred.reasoning = 'Ev sahibi rahat kazanır, gollü bir performans bekleniyor.';
              } else if (isAwayWin) {
                pred.bet = pred.type === 'medium' ? 'Dep 1.5 Üst' : 'Dep -1.5';
                pred.consistentScores = ['0-3', '0-4', '0-5']; // All ≥3 total, away 2+
                pred.reasoning = 'Deplasman fark yapar, gollü bir galibiyet bekleniyor.';
              } else {
                pred.bet = pred.type === 'medium' ? '2.5 Üst' : '3.5 Üst';
                pred.consistentScores = pred.type === 'medium' ? ['3-0', '0-3', '4-0'] : ['4-0', '0-4', '5-0'];
                pred.reasoning = 'Tek taraflı ama gollü bir maç bekleniyor.';
              }
            } else {
              // Low scoring clean sheet - use 2.5 Alt
              pred.bet = '2.5 Alt';
              pred.consistentScores = ['1-0', '0-0', '0-1'];
              pred.reasoning = 'En az bir takımın gol atamayacağı bekleniyor.';
            }
            conflict = true;
          }
        }
        
        // HOME WIN conflicts
        if (isHomeWin && !conflict) {
          // MS2 or Deplasman Kazanır conflicts with home win
          if (betLower.includes('ms2') || betLower.includes('deplasman kazanır')) {
            console.log(`[AI Consistency] Conflict: Home win main + "MS2/Deplasman". Replacing...`);
            pred.bet = pred.type === 'medium' ? 'Ev -0.5 Handikap' : 'Ev 1.5 Üst';
            pred.consistentScores = pred.type === 'medium' ? ['2-0', '2-1', '3-1'] : ['2-0', '3-0', '2-1'];
            pred.reasoning = 'Ev sahibi avantajlı konumda, galibiyeti destekleyen bir bahis.';
            conflict = true;
          }
        }
        
        // AWAY WIN conflicts
        if (isAwayWin && !conflict) {
          // MS1 or Ev Kazanır conflicts with away win
          if (betLower.includes('ms1') || betLower.includes('ev kazanır')) {
            console.log(`[AI Consistency] Conflict: Away win main + "MS1/Ev". Replacing...`);
            pred.bet = pred.type === 'medium' ? 'Dep -0.5 Handikap' : 'Dep 1.5 Üst';
            pred.consistentScores = pred.type === 'medium' ? ['0-2', '1-2', '1-3'] : ['0-2', '0-3', '1-2'];
            pred.reasoning = 'Deplasman takımı formda, galibiyeti destekleyen bir bahis.';
            conflict = true;
          }
        }
      }
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
    
    if (!analysis || !analysis.predictions || analysis.predictions.length === 0) {
      console.log(`[AI+BestBets] No predictions generated for ${homeTeam} vs ${awayTeam}`);
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
            pred.consistentScores?.join(', ') || '',
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
    
    const cacheKey = `ai_analysis_v7_${fixtureId}`;
    try {
      await pool.query(
        `INSERT INTO api_cache (key, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')
         ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = NOW() + INTERVAL '24 hours'`,
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
