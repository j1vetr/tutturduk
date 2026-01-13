import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface AIAnalysisResult {
  matchAnalysis: string;
  over25: { prediction: boolean; confidence: number; reasoning: string };
  btts: { prediction: boolean; confidence: number; reasoning: string };
  winner: { prediction: string; confidence: number; reasoning: string };
  scorePredictions: string[];
  expectedGoalRange: string;
  riskLevel: 'düşük' | 'orta' | 'yüksek';
  bestBet: string;
}

interface AIAnalysisProps {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
}

export function AIAnalysis({ matchId, homeTeam, awayTeam }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, [matchId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/ai-analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      } else {
        const err = await res.json();
        setError(err.message || 'Analiz yüklenemedi');
      }
    } catch (e) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="mb-4">
          <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">TUTTURDUK AI Analizi</div>
          <div className="text-[9px] text-zinc-600 mt-1">UZMAN YAPAY ZEKA TAHMİNİ</div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-3 text-sm text-zinc-400">Analiz oluşturuluyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-500">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getWinnerText = () => {
    if (analysis.winner.prediction === '1') return homeTeam;
    if (analysis.winner.prediction === '2') return awayTeam;
    return 'Beraberlik';
  };

  const getRiskColor = () => {
    if (analysis.riskLevel === 'düşük') return 'text-emerald-400 bg-emerald-500/20';
    if (analysis.riskLevel === 'orta') return 'text-amber-400 bg-amber-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">TUTTURDUK AI Analizi</div>
        <div className="text-[9px] text-zinc-600 mt-1">UZMAN YAPAY ZEKA TAHMİNİ</div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <p className="text-sm text-zinc-300 leading-relaxed">{analysis.matchAnalysis}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">2.5 Gol</div>
            <div className={`text-xl font-bold ${analysis.over25.prediction ? 'text-emerald-400' : 'text-amber-400'}`}>
              {analysis.over25.prediction ? 'ÜST' : 'ALT'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${analysis.over25.prediction ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${analysis.over25.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{analysis.over25.confidence}%</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">{analysis.over25.reasoning}</p>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">KG</div>
            <div className={`text-xl font-bold ${analysis.btts.prediction ? 'text-emerald-400' : 'text-red-400'}`}>
              {analysis.btts.prediction ? 'VAR' : 'YOK'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${analysis.btts.prediction ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${analysis.btts.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{analysis.btts.confidence}%</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">{analysis.btts.reasoning}</p>
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Maç Sonucu</div>
            <span className={`text-[10px] px-2 py-0.5 rounded ${getRiskColor()}`}>
              Risk: {analysis.riskLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white">{getWinnerText()}</div>
              <p className="text-[10px] text-zinc-600 mt-1">{analysis.winner.reasoning}</p>
            </div>
            <div className="text-right">
              <div className="flex gap-1.5 justify-end">
                {analysis.scorePredictions?.map((score, i) => (
                  <span key={i} className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                    {score}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">Olası skorlar</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${analysis.winner.confidence}%` }} />
            </div>
            <span className="text-[10px] text-zinc-500">{analysis.winner.confidence}%</span>
          </div>
          {analysis.expectedGoalRange && (
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Beklenen gol aralığı</span>
                <span className="text-sm font-semibold text-white">{analysis.expectedGoalRange}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
          <div className="text-[10px] text-emerald-500 uppercase tracking-wide font-semibold mb-2">En İyi Bahis Önerisi</div>
          <div className="text-lg font-bold text-white">{analysis.bestBet}</div>
        </div>
      </div>
    </div>
  );
}
