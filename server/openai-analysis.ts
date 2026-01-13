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
  scorePrediction: string;
  riskLevel: 'düşük' | 'orta' | 'yüksek';
  bestBet: string;
}

export async function generateMatchAnalysis(matchData: MatchData): Promise<AIAnalysisResult> {
  const h2hSummary = matchData.h2hResults?.length 
    ? `Son ${matchData.h2hResults.length} karşılaşmada toplam ${matchData.h2hResults.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0)} gol atıldı. Ortalama: ${(matchData.h2hResults.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0) / matchData.h2hResults.length).toFixed(1)} gol/maç.`
    : 'H2H verisi yok.';

  const prompt = `Sen profesyonel bir futbol analisti ve bahis uzmanısın. Aşağıdaki maç verilerini analiz et ve Türkçe olarak detaylı tahmin yap.

MAÇ BİLGİLERİ:
- Lig: ${matchData.league}
- Ev Sahibi: ${matchData.homeTeam} ${matchData.homeRank ? `(Sıralama: ${matchData.homeRank}. - ${matchData.homePoints} puan)` : ''}
- Deplasman: ${matchData.awayTeam} ${matchData.awayRank ? `(Sıralama: ${matchData.awayRank}. - ${matchData.awayPoints} puan)` : ''}

FORM DURUMU:
- ${matchData.homeTeam} son 5 maç: ${matchData.homeForm || 'Veri yok'}
- ${matchData.awayTeam} son 5 maç: ${matchData.awayForm || 'Veri yok'}

İSTATİSTİKLER:
- ${matchData.homeTeam}: ${matchData.homeWins || 0}G ${matchData.homeDraws || 0}B ${matchData.homeLosses || 0}M | Attığı: ${matchData.homeGoalsFor || 0} Yediği: ${matchData.homeGoalsAgainst || 0}
- ${matchData.awayTeam}: ${matchData.awayWins || 0}G ${matchData.awayDraws || 0}B ${matchData.awayLosses || 0}M | Attığı: ${matchData.awayGoalsFor || 0} Yediği: ${matchData.awayGoalsAgainst || 0}

H2H (KAFA KAFAYA):
${h2hSummary}

KARŞILAŞTIRMA:
- Form: Ev ${matchData.comparison?.form?.home || '-'} vs Dep ${matchData.comparison?.form?.away || '-'}
- Atak Gücü: Ev ${matchData.comparison?.att?.home || '-'} vs Dep ${matchData.comparison?.att?.away || '-'}
- Defans Gücü: Ev ${matchData.comparison?.def?.home || '-'} vs Dep ${matchData.comparison?.def?.away || '-'}

Lütfen aşağıdaki formatta JSON yanıt ver:
{
  "matchAnalysis": "2-3 cümlelik genel maç analizi ve beklentiler",
  "over25": {
    "prediction": true/false (2.5 üst mü?),
    "confidence": 0-100 arası güven yüzdesi,
    "reasoning": "Neden bu tahmini yaptın kısa açıklama"
  },
  "btts": {
    "prediction": true/false (KG var mı?),
    "confidence": 0-100 arası güven yüzdesi,
    "reasoning": "Neden bu tahmini yaptın kısa açıklama"
  },
  "winner": {
    "prediction": "1" veya "X" veya "2" (1=ev sahibi, X=beraberlik, 2=deplasman),
    "confidence": 0-100 arası güven yüzdesi,
    "reasoning": "Neden bu tahmini yaptın kısa açıklama"
  },
  "scorePrediction": "Örn: 2-1",
  "riskLevel": "düşük" veya "orta" veya "yüksek",
  "bestBet": "En güvenli bahis önerisi (örn: '2.5 Üst' veya 'KG Var' veya 'Ev Sahibi Kazanır')"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen profesyonel bir futbol analisti ve bahis uzmanısın. Sadece JSON formatında yanıt ver, başka bir şey yazma."
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
