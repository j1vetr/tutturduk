import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MatchData {
  homeTeam: string;
  awayTeam: string;
  league: string;
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

export interface AIAnalysisResult {
  matchAnalysis: string;
  expectedBet: {
    prediction: string;
    confidence: number;
    reasoning: string;
    odds?: string;
  };
  mediumRiskBet: {
    prediction: string;
    confidence: number;
    reasoning: string;
    odds?: string;
  };
  riskyBet: {
    prediction: string;
    confidence: number;
    reasoning: string;
    odds?: string;
  };
  scorePredictions: string[];
  expectedGoalRange: string;
  expertComment: string;
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

  const prompt = `Sen 25 yıllık deneyime sahip UZMAN BİR BAHİSÇİSİN. Profesyonel bahis stratejileri geliştiriyorsun.

Aşağıdaki verileri analiz ederek 3 farklı risk seviyesinde TAHMİN üreteceksin.

================================
MAÇ BİLGİLERİ
================================
Lig: ${matchData.league}
Ev Sahibi: ${matchData.homeTeam}${matchData.homeRank ? ` (Sıralama: ${matchData.homeRank}. - ${matchData.homePoints} puan)` : ''}
Deplasman: ${matchData.awayTeam}${matchData.awayRank ? ` (Sıralama: ${matchData.awayRank}. - ${matchData.awayPoints} puan)` : ''}

================================
EV SAHİBİ SON MAÇLARI
================================
${matchData.homeTeam}:
  ${formatLastMatches(matchData.homeLastMatches)}
  
Form (Son 5): ${formatForm(matchData.homeForm)}
Sezon: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Attığı: ${matchData.homeGoalsFor || 0} | Yediği: ${matchData.homeGoalsAgainst || 0}
${homeStats ? `Detay:
  - Temiz Kale: ${homeStats.cleanSheets || 0}
  - Gol Atamadığı Maç: ${homeStats.failedToScore || 0}
  - Evde Gol Ort.: ${homeStats.avgGoalsHome?.toFixed(2) || '-'}
  - Evde Yediği Ort.: ${homeStats.avgGoalsConcededHome?.toFixed(2) || '-'}
  - Gol Dakikaları: ${formatGoalMinutes(homeStats.goalsMinutes)}` : ''}

================================
DEPLASMAN SON MAÇLARI
================================
${matchData.awayTeam}:
  ${formatLastMatches(matchData.awayLastMatches)}
  
Form (Son 5): ${formatForm(matchData.awayForm)}
Sezon: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Attığı: ${matchData.awayGoalsFor || 0} | Yediği: ${matchData.awayGoalsAgainst || 0}
${awayStats ? `Detay:
  - Temiz Kale: ${awayStats.cleanSheets || 0}
  - Gol Atamadığı Maç: ${awayStats.failedToScore || 0}
  - Deplasmanda Gol Ort.: ${awayStats.avgGoalsAway?.toFixed(2) || '-'}
  - Deplasmanda Yediği Ort.: ${awayStats.avgGoalsConcededAway?.toFixed(2) || '-'}
  - Gol Dakikaları: ${formatGoalMinutes(awayStats.goalsMinutes)}` : ''}

================================
H2H (KAFA KAFAYA GEÇMİŞ)
================================
${h2hSummary}
${matchData.h2hResults?.length ? matchData.h2hResults.slice(0, 5).map(h => `  ${matchData.homeTeam} ${h.homeGoals} - ${h.awayGoals} ${matchData.awayTeam}`).join('\n') : ''}

================================
MODEL KARŞILAŞTIRMALARI
================================
- Form: Ev ${comp?.form?.home || '-'}% vs Dep ${comp?.form?.away || '-'}%
- Atak Gücü: Ev ${comp?.att?.home || '-'}% vs Dep ${comp?.att?.away || '-'}%
- Defans Gücü: Ev ${comp?.def?.home || '-'}% vs Dep ${comp?.def?.away || '-'}%
- H2H Üstünlük: Ev ${comp?.h2h?.home || '-'}% vs Dep ${comp?.h2h?.away || '-'}%
- Gol Beklentisi: Ev ${comp?.goals?.home || '-'}% vs Dep ${comp?.goals?.away || '-'}%

${apiPred ? `================================
API TAHMİN VERİLERİ
================================
- Kazanan: ${apiPred.winner?.name || '-'} (${apiPred.winner?.comment || ''})
- Olasılıklar: Ev %${apiPred.percent?.home || '-'} | X %${apiPred.percent?.draw || '-'} | Dep %${apiPred.percent?.away || '-'}
- Alt/Üst: ${apiPred.underOver || '-'}
- Beklenen Skor: ${apiPred.goalsHome || '-'} - ${apiPred.goalsAway || '-'}
- Tavsiye: ${apiPred.advice || '-'}` : ''}

${odds ? `================================
BAHİS ORANLARI
================================
- Ev Kazanır: ${odds.home?.toFixed(2) || '-'}
- Beraberlik: ${odds.draw?.toFixed(2) || '-'}
- Deplasman Kazanır: ${odds.away?.toFixed(2) || '-'}
- 2.5 Üst: ${odds.over25?.toFixed(2) || '-'}
- 2.5 Alt: ${odds.under25?.toFixed(2) || '-'}` : ''}

${matchData.injuries?.home?.length || matchData.injuries?.away?.length ? `================================
SAKATLIKLAR VE CEZALILAR
================================
${matchData.injuries?.home?.length ? `${matchData.homeTeam}: ${matchData.injuries.home.map(i => `${i.player} (${i.reason})`).join(', ')}` : `${matchData.homeTeam}: Bilgi yok`}
${matchData.injuries?.away?.length ? `${matchData.awayTeam}: ${matchData.injuries.away.map(i => `${i.player} (${i.reason})`).join(', ')}` : `${matchData.awayTeam}: Bilgi yok`}` : `================================
SAKATLIKLAR
================================
Sakatlık bilgisi mevcut değil.`}

================================
UZMAN BAHİSÇİ OLARAK TAHMİN YAP
================================

3 FARKLI RİSK SEVİYESİNDE TAHMİN VER:

1️⃣ BEKLENEN (Düşük Risk)
- En güvenli tahmin
- Genellikle 2.5 Üst veya 2.5 Alt gibi standart bahisler
- %60+ güven oranı beklenir
- Oran: 1.40 - 1.80 arası

2️⃣ ORTA RİSKLİ
- Daha cesur tahmin
- Örnekler: 3.5 Üst, 4.5 Üst, İY 1.5 Alt, İY 0.5 Üst, Ev Kazanır, Deplasman Kazanır, KG Var/Yok
- %40-60 güven oranı
- Oran: 1.80 - 2.50 arası

3️⃣ RİSKLİ (Yüksek Risk)
- En cesur ve kazançlı tahmin
- Örnekler: İY 0 - MS 1, İY 1-1, Tam Skor, Handikaplı Sonuç, İlk Gol Dakikası, 5+ Gol
- %20-40 güven oranı
- Oran: 2.50+ (genellikle 3.00+)

================================
ANALİZ KURALLARI
================================
- Her takımın son maçlarını detaylı incele
- H2H geçmişini değerlendir (ilk karşılaşma ise bunu belirt)
- Lig seviyesini ve takım kalitelerini karşılaştır
- İç saha/deplasman performanslarını analiz et
- Sakatlık bilgisi varsa etkisini değerlendir
- Bahis oranlarını ve değer analizini yap
- UZMAN bir bahisçi gibi profesyonelce yorum yap
- Tahminlerde Türkçe kullan (Üst/Alt, İY/MS, KG Var/Yok gibi)

================================
JSON ÇIKTI FORMATI (ZORUNLU)
================================
{
  "matchAnalysis": "5-6 cümlelik detaylı uzman analizi. Lig seviyesi, takım kaliteleri, son maçlar, H2H durumu, form karşılaştırması ve iç saha faktörünü içermeli. Profesyonel bahisçi bakış açısıyla yaz.",
  "expectedBet": {
    "prediction": "2.5 Üst veya 2.5 Alt gibi tek bir tahmin",
    "confidence": 65,
    "reasoning": "Neden bu tahmini verdiğini 2 cümleyle açıkla",
    "odds": "~1.55"
  },
  "mediumRiskBet": {
    "prediction": "3.5 Üst, Ev Kazanır, İY 1.5 Alt gibi tek bir tahmin",
    "confidence": 48,
    "reasoning": "Neden bu tahmini verdiğini 2 cümleyle açıkla",
    "odds": "~2.10"
  },
  "riskyBet": {
    "prediction": "İY 0 - MS 1, Tam Skor 2-1, Handikap -1.5 gibi cesur tek bir tahmin",
    "confidence": 28,
    "reasoning": "Neden bu tahmini verdiğini 2 cümleyle açıkla",
    "odds": "~4.50"
  },
  "scorePredictions": ["2-1", "1-1", "2-0"],
  "expectedGoalRange": "2-3 gol",
  "expertComment": "Uzman bahisçi olarak 1-2 cümlelik kısa strateji önerisi ve maç hakkında ana görüş"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen 25 yıllık deneyime sahip profesyonel bir bahis uzmanı ve futbol analistisin. Avrupa'nın tüm liglerini yakından takip ediyorsun. Risk yönetimi ve değer bahisi konularında uzmansın. Verilerden anlam çıkarıp pratik bahis önerileri sunuyorsun. Türkçe yazıyorsun. Kesin ifadeler kullanmıyorsun. Sadece JSON formatında yanıt veriyorsun."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1800,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt vermedi");
    }

    const result = JSON.parse(content) as AIAnalysisResult;
    return result;
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw error;
  }
}

export type { MatchData };
