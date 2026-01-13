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
  bestBet: string;
}

function formatForm(form?: string): string {
  if (!form) return 'Veri yok';
  return form.split('').join(' ');
}

export async function generateMatchAnalysis(matchData: MatchData): Promise<AIAnalysisResult> {
  const h2hTotal = matchData.h2hResults?.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0) || 0;
  const h2hCount = matchData.h2hResults?.length || 0;
  const h2hAvg = h2hCount > 0 ? (h2hTotal / h2hCount).toFixed(1) : '0';
  
  const h2hSummary = h2hCount > 0 
    ? `Son ${h2hCount} karşılaşmada toplam ${h2hTotal} gol atıldı.\nMaç başına gol ortalaması: ${h2hAvg}`
    : 'H2H verisi mevcut değil.';

  const prompt = `Aşağıdaki veriler, maç öncesi istatistiklere ve model karşılaştırmalarına dayalıdır.
Kesinlik içermez, olasılık ve senaryo analizi yapılmalıdır.

MAÇ BİLGİLERİ:
- Lig: ${matchData.league}
- Ev Sahibi: ${matchData.homeTeam}${matchData.homeRank ? ` (Sıralama: ${matchData.homeRank}. - ${matchData.homePoints} puan)` : ''}
- Deplasman: ${matchData.awayTeam}${matchData.awayRank ? ` (Sıralama: ${matchData.awayRank}. - ${matchData.awayPoints} puan)` : ''}

FORM DURUMU:
- ${matchData.homeTeam} son 5 maç: ${formatForm(matchData.homeForm)}
- ${matchData.awayTeam} son 5 maç: ${formatForm(matchData.awayForm)}

SEZON İSTATİSTİKLERİ:
- ${matchData.homeTeam}: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Attığı: ${matchData.homeGoalsFor || 0} | Yediği: ${matchData.homeGoalsAgainst || 0}
- ${matchData.awayTeam}: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Attığı: ${matchData.awayGoalsFor || 0} | Yediği: ${matchData.awayGoalsAgainst || 0}

H2H (KAFA KAFAYA):
${h2hSummary}

KARŞILAŞTIRMA GÖSTERGELERİ:
(Bu yüzdeler göreceli güç karşılaştırmasını temsil eder, kesinlik içermez)
- Form: Ev ${matchData.comparison?.form?.home || '-'} vs Dep ${matchData.comparison?.form?.away || '-'}
- Atak Gücü: Ev ${matchData.comparison?.att?.home || '-'} vs Dep ${matchData.comparison?.att?.away || '-'}
- Defans Gücü: Ev ${matchData.comparison?.def?.home || '-'} vs Dep ${matchData.comparison?.def?.away || '-'}

GÖREVİN:
- Maçı genel senaryo açısından değerlendir.
- Aşırı iddialı veya kesin ifadeler kullanma.
- "Olası", "beklenen", "öne çıkıyor" gibi analiz dili kullan.
- Tek bir kesin skor vermek yerine 2-3 olası skor aralığı belirt.
- Toplam gol beklentisi aralığı ver.

ÇIKTI KURALLARI:
- Türkçe yaz.
- Kısa, net ve mobilde okunabilir olsun.
- Yüzdelik güven ifadelerini "model güveni" olarak ele al.
- Tahminler kesin değil, olasılık temelli olmalıdır.

Lütfen aşağıdaki formatta JSON yanıt ver:
{
  "matchAnalysis": "2-3 cümlelik senaryo analizi. Kesin ifadeler yerine 'olası', 'beklenen', 'öne çıkıyor' gibi ifadeler kullan.",
  "over25": {
    "prediction": true/false,
    "confidence": 0-100 (model güveni),
    "reasoning": "Kısa açıklama"
  },
  "btts": {
    "prediction": true/false,
    "confidence": 0-100 (model güveni),
    "reasoning": "Kısa açıklama"
  },
  "winner": {
    "prediction": "1" veya "X" veya "2",
    "confidence": 0-100 (model güveni),
    "reasoning": "Kısa açıklama"
  },
  "scorePredictions": ["2-1", "1-1", "2-0"],
  "expectedGoalRange": "2-3 gol arası",
  "riskLevel": "düşük" veya "orta" veya "yüksek",
  "bestBet": "En olası bahis önerisi"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen profesyonel bir futbol analisti ve bahis uzmanısın. Kesin ifadeler yerine olasılık temelli analiz dili kullanırsın. Sadece JSON formatında yanıt ver."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
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
