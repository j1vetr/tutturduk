import { useEffect, useState } from "react";
import { Loader2, Brain, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";

interface AIAnalysisResult {
  matchAnalysis: string;
  over25: { prediction: boolean; confidence: number; reasoning: string };
  btts: { prediction: boolean; confidence: number; reasoning: string };
  winner: { prediction: string; confidence: number; reasoning: string };
  scorePrediction: string;
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
      <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AI Analizi</div>
            <div className="text-[10px] text-purple-400">Yapay zeka tahminleri</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <span className="ml-3 text-sm text-purple-300">Analiz oluşturuluyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
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
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl border border-purple-500/20 overflow-hidden">
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              AI Uzman Analizi
              <Sparkles className="w-3 h-3 text-purple-400" />
            </div>
            <div className="text-[10px] text-purple-400">GPT-4 destekli tahminler</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-black/20 rounded-xl p-4">
          <p className="text-sm text-zinc-300 leading-relaxed">{analysis.matchAnalysis}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {analysis.over25.prediction ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-xs text-zinc-500">2.5 Gol</span>
            </div>
            <div className={`text-lg font-bold ${analysis.over25.prediction ? 'text-emerald-400' : 'text-amber-400'}`}>
              {analysis.over25.prediction ? 'ÜST' : 'ALT'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${analysis.over25.prediction ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${analysis.over25.confidence}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400">{analysis.over25.confidence}%</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">{analysis.over25.reasoning}</p>
          </div>

          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-500">KG</span>
            </div>
            <div className={`text-lg font-bold ${analysis.btts.prediction ? 'text-emerald-400' : 'text-red-400'}`}>
              {analysis.btts.prediction ? 'VAR' : 'YOK'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${analysis.btts.prediction ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${analysis.btts.confidence}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400">{analysis.btts.confidence}%</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">{analysis.btts.reasoning}</p>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-500">Maç Sonucu Tahmini</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor()}`}>
              Risk: {analysis.riskLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-white">{getWinnerText()}</div>
              <p className="text-[10px] text-zinc-500 mt-1">{analysis.winner.reasoning}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-purple-400">{analysis.scorePrediction}</div>
              <div className="text-[10px] text-zinc-500">Tahmini skor</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${analysis.winner.confidence}%` }} />
            </div>
            <span className="text-xs text-zinc-400">{analysis.winner.confidence}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">En İyi Bahis Önerisi</span>
          </div>
          <div className="text-lg font-bold text-white">{analysis.bestBet}</div>
        </div>
      </div>
    </div>
  );
}
