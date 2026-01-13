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
}

export interface AIAnalysisResult {
  matchAnalysis: string;
  over25: { prediction: boolean; confidence: number; reasoning: string };
  btts: { prediction: boolean; confidence: number; reasoning: string };
  winner: { prediction: string; confidence: number; reasoning: string };
  scorePredictions: string[];
  expectedGoalRange: string;
  riskLevel: 'düşük' | 'orta' | 'yüksek';
  riskReason: string;
  primaryInsight: string;
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

export async function generateMatchAnalysis(matchData: MatchData): Promise<AIAnalysisResult> {
  const h2hTotal = matchData.h2hResults?.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0) || 0;
  const h2hCount = matchData.h2hResults?.length || 0;
  const h2hAvg = h2hCount > 0 ? (h2hTotal / h2hCount).toFixed(1) : '0';
  
  const h2hSummary = h2hCount > 0 
    ? `Son ${h2hCount} karşılaşmada toplam ${h2hTotal} gol atıldı.\nMaç başına gol ortalaması: ${h2hAvg}`
    : 'H2H verisi mevcut değil.';

  const homeStats = matchData.homeTeamStats;
  const awayStats = matchData.awayTeamStats;
  const apiPred = matchData.apiPrediction;
  const comp = matchData.comparison;
  const odds = matchData.odds;

  const prompt = `Aşağıdaki veriler, maç öncesi istatistiklere ve model karşılaştırmalarına dayalıdır.
Kesinlik içermez, olasılık ve senaryo analizi yapılmalıdır.

MAÇ BİLGİLERİ:
- Lig: ${matchData.league}
- Ev Sahibi: ${matchData.homeTeam}${matchData.homeRank ? ` (Sıralama: ${matchData.homeRank}. - ${matchData.homePoints} puan)` : ''}
- Deplasman: ${matchData.awayTeam}${matchData.awayRank ? ` (Sıralama: ${matchData.awayRank}. - ${matchData.awayPoints} puan)` : ''}

FORM DURUMU (Son 5 Maç):
- ${matchData.homeTeam}: ${formatForm(matchData.homeForm)}
- ${matchData.awayTeam}: ${formatForm(matchData.awayForm)}

SEZON İSTATİSTİKLERİ:
- ${matchData.homeTeam}: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Attığı: ${matchData.homeGoalsFor || 0} | Yediği: ${matchData.homeGoalsAgainst || 0}
- ${matchData.awayTeam}: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Attığı: ${matchData.awayGoalsFor || 0} | Yediği: ${matchData.awayGoalsAgainst || 0}

${homeStats || awayStats ? `DETAYLI TAKIM İSTATİSTİKLERİ:
${homeStats ? `${matchData.homeTeam}:
  - Temiz Kale: ${homeStats.cleanSheets || 0} maç
  - Gol Atamadığı Maç: ${homeStats.failedToScore || 0}
  - Evde Gol Ort.: ${homeStats.avgGoalsHome?.toFixed(2) || '-'} | Deplasmanda: ${homeStats.avgGoalsAway?.toFixed(2) || '-'}
  - Evde Yediği Ort.: ${homeStats.avgGoalsConcededHome?.toFixed(2) || '-'} | Deplasmanda: ${homeStats.avgGoalsConcededAway?.toFixed(2) || '-'}
  - En Uzun Galibiyet Serisi: ${homeStats.biggestWinStreak || 0} | Mağlubiyet: ${homeStats.biggestLoseStreak || 0}
  - Penaltı: ${homeStats.penaltyScored || 0} attı, ${homeStats.penaltyMissed || 0} kaçırdı
  - Gol Dakikaları: ${formatGoalMinutes(homeStats.goalsMinutes)}` : ''}
${awayStats ? `${matchData.awayTeam}:
  - Temiz Kale: ${awayStats.cleanSheets || 0} maç
  - Gol Atamadığı Maç: ${awayStats.failedToScore || 0}
  - Evde Gol Ort.: ${awayStats.avgGoalsHome?.toFixed(2) || '-'} | Deplasmanda: ${awayStats.avgGoalsAway?.toFixed(2) || '-'}
  - Evde Yediği Ort.: ${awayStats.avgGoalsConcededHome?.toFixed(2) || '-'} | Deplasmanda: ${awayStats.avgGoalsConcededAway?.toFixed(2) || '-'}
  - En Uzun Galibiyet Serisi: ${awayStats.biggestWinStreak || 0} | Mağlubiyet: ${awayStats.biggestLoseStreak || 0}
  - Penaltı: ${awayStats.penaltyScored || 0} attı, ${awayStats.penaltyMissed || 0} kaçırdı
  - Gol Dakikaları: ${formatGoalMinutes(awayStats.goalsMinutes)}` : ''}` : ''}

H2H (KAFA KAFAYA):
${h2hSummary}

KARŞILAŞTIRMA GÖSTERGELERİ:
(Bu yüzdeler göreceli güç karşılaştırmasını temsil eder, kesinlik içermez)
- Form: Ev ${comp?.form?.home || '-'} vs Dep ${comp?.form?.away || '-'}
- Atak Gücü: Ev ${comp?.att?.home || '-'} vs Dep ${comp?.att?.away || '-'}
- Defans Gücü: Ev ${comp?.def?.home || '-'} vs Dep ${comp?.def?.away || '-'}
- Poisson Dağılımı: Ev ${comp?.poisson_distribution?.home || '-'} vs Dep ${comp?.poisson_distribution?.away || '-'}
- H2H Üstünlük: Ev ${comp?.h2h?.home || '-'} vs Dep ${comp?.h2h?.away || '-'}
- Gol Beklentisi: Ev ${comp?.goals?.home || '-'} vs Dep ${comp?.goals?.away || '-'}
- Genel Güç: Ev ${comp?.total?.home || '-'} vs Dep ${comp?.total?.away || '-'}

${apiPred ? `API TAHMİN VERİLERİ:
- Kazanan Tahmini: ${apiPred.winner?.name || '-'} (${apiPred.winner?.comment || ''})
- Maç Sonucu Olasılıkları: Ev %${apiPred.percent?.home || '-'} | Beraberlik %${apiPred.percent?.draw || '-'} | Deplasman %${apiPred.percent?.away || '-'}
- Tavsiye: ${apiPred.advice || '-'}
- Alt/Üst Tahmini: ${apiPred.underOver || '-'}
- Beklenen Gol: Ev ${apiPred.goalsHome || '-'} - Dep ${apiPred.goalsAway || '-'}
- Beraberlik Olasılığı: ${apiPred.winOrDraw ? 'Yüksek' : 'Düşük'}` : ''}

${odds ? `BAHİS ORANLARI (Piyasa Beklentisi):
- Ev Kazanır: ${odds.home?.toFixed(2) || '-'}
- Beraberlik: ${odds.draw?.toFixed(2) || '-'}
- Deplasman Kazanır: ${odds.away?.toFixed(2) || '-'}
- 2.5 Üst: ${odds.over25?.toFixed(2) || '-'}
- 2.5 Alt: ${odds.under25?.toFixed(2) || '-'}` : ''}

${matchData.injuries?.home?.length || matchData.injuries?.away?.length ? `SAKATLIKLAR:
${matchData.injuries?.home?.length ? `${matchData.homeTeam}: ${matchData.injuries.home.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}
${matchData.injuries?.away?.length ? `${matchData.awayTeam}: ${matchData.injuries.away.map(i => `${i.player} (${i.reason})`).join(', ')}` : ''}` : ''}

--------------------------------
ANALİZ YAKLAŞIMI (DETAYLI)
--------------------------------

1️⃣ ANALİZE GİRİŞ
- Analize FARKLI bir açıdan başla.
- Şu başlıklardan BİRİNİ seçerek giriş yap:
  • Form ve momentum
  • Gol beklentisi ve tempo
  • Savunma dengesi
  • İki takım arasındaki güç farkı
  • Sürpriz / belirsizlik ihtimali
  • H2H geçmişi veya ilk karşılaşma durumu
  • Lig seviyesi ve rekabet düzeyi
❌ "Bu maçta…", "Bu karşılaşmada…" ile BAŞLAMA.

2️⃣ ANA ANALİZ (5-6 CÜMLE - ÇOK ÖNEMLİ)
Analizde şu konuları MUTLAKA değerlendir:
• LİG SEVİYESİ: Hangi lig? Üst düzey mi, orta seviye mi? Ligin genel karakteri (defansif/ofansif)?
• TAKIM KALİTESİ: Takımların lig içindeki konumu, bütçe farkı, kadro kalitesi
• H2H DURUMU: Eğer daha önce hiç karşılaşmadılarsa BU DURUMU MUTLAKA BELIRT ve belirsizlik faktörü olarak değerlendir
• FORM KARŞILAŞTIRMASI: Son performanslar, galibiyet/mağlubiyet serileri
• İÇ SAHA / DEPLASMAN FAKTÖRÜ: Ev sahibi avantajı veya deplasman zorluğu
• KRITIK FAKTÖRLER: Sakatlıklar, motivasyon, derbi atmosferi varsa

- Verileri tek tek sayma, aralarındaki ilişkiyi anlat.
- "Bu yüzden", "bunun sonucunda", "bu durum", "dikkate alındığında" gibi bağlaçlar kullan.
- EN AZ 5-6 CÜMLE YAZ, yüzeysel olma.

3️⃣ ALT SENARYOLAR (2.5 Gol, KG Var, Kazanan)
Her tahmin için:
• NEDEN bu sonucu bekliyorsun?
• Hangi istatistikler destekliyor?
• Karşı argüman nedir?
• Güven yüzdesini gerekçelendir

4️⃣ SKOR BEKLENTİSİ
- Kesin skor verme, 2-3 olası skor veya gol aralığı belirt.
- "En olası", "öne çıkan", "diğer ihtimaller" gibi ifadeler kullan.
- Neden bu skorları öngördüğünü kısaca açıkla.

5️⃣ RİSK DEĞERLENDİRMESİ
- Risk seviyesini 1-2 cümleyle açıkla.
- Neden düşük/orta/yüksek olduğunu belirt.
- Sürpriz olasılığından bahset.

6️⃣ ÖZEL DURUMLAR
- Eğer takımlar İLK KEZ karşılaşıyorsa: "İlk kez karşı karşıya gelen iki takım" ifadesini kullan ve belirsizlik faktörü olarak değerlendir.
- Eğer lig farkı varsa (ör: şampiyon adayı vs düşme hattı): Bu durumu vurgula.
- Eğer form farkı çok belirginse: Bunu öne çıkar.

--------------------------------
GENEL KURALLAR
--------------------------------
- Kesin ifadeler KULLANMA.
- "Olası", "öne çıkıyor", "bekleniyor", "işaret ediyor" gibi ifadeler kullan.
- Aynı kalıplarla başlayan cümleleri TEKRARLAMA.
- Bir yorumcu gibi değil, bir analizci gibi konuş.
- Türkçe yaz, mobilde okunabilir olsun.
- YÜZEYSEL OLMA, DERİNLEMESİNE ANALİZ YAP.

--------------------------------
JSON ÇIKTI FORMATI (ZORUNLU)
--------------------------------
{
  "matchAnalysis": "5-6 cümlelik, detaylı ve insani maç analizi. Lig seviyesi, takım kaliteleri, H2H durumu (ilk karşılaşma dahil), form karşılaştırması, iç saha/deplasman faktörü değerlendirilmeli.",
  "over25": {
    "prediction": true/false,
    "confidence": 0-100,
    "reasoning": "2-3 cümlelik detaylı gerekçe"
  },
  "btts": {
    "prediction": true/false,
    "confidence": 0-100,
    "reasoning": "2-3 cümlelik detaylı gerekçe"
  },
  "winner": {
    "prediction": "Ev Sahibi" veya "Beraberlik" veya "Deplasman",
    "confidence": 0-100,
    "reasoning": "2-3 cümlelik detaylı gerekçe"
  },
  "scorePredictions": ["2-1", "1-1", "3-1"],
  "expectedGoalRange": "2-4 gol",
  "riskLevel": "düşük" veya "orta" veya "yüksek",
  "riskReason": "1-2 cümlelik risk açıklaması, sürpriz olasılığı dahil",
  "primaryInsight": "Maçın en kritik faktörü ve ana çıkarım (bahis dili kullanma)"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen 20 yıllık deneyime sahip profesyonel bir futbol analisti ve veri yorumcususun. Avrupa'nın en iyi liglerinden alt liglere kadar tüm seviyeleri iyi tanıyorsun. Amacın sayıları tekrar etmek değil, verilerden derin anlam çıkarıp bunu insani ve akıcı bir dille anlatmaktır. Lig seviyelerini, takım kalitelerini, H2H geçmişini (ilk karşılaşma dahil), form durumlarını ve iç saha/deplasman faktörlerini mutlaka değerlendir. YÜZEYSEL OLMA, DERİNLEMESİNE ANALİZ YAP. Bir yorumcu gibi değil, bir analizci gibi konuş. Kesin ifadeler kullanma. 'Olası', 'öne çıkıyor', 'bekleniyor', 'işaret ediyor' gibi ifadeler kullan. Aynı kalıplarla başlayan cümleleri TEKRARLAMA. matchAnalysis alanında EN AZ 5-6 CÜMLE yaz. Sadece JSON formatında yanıt ver."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
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
