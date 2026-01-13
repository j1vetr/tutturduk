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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, [matchId]);

  useEffect(() => {
    if (analysis) {
      setTimeout(() => setRevealed(true), 100);
    }
  }, [analysis]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    setRevealed(false);
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
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-950 to-zinc-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl animate-pulse delay-700" />
        </div>
        <div className="relative p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-sm font-medium text-white">Yapay Zeka Analiz Ediyor</div>
              <div className="text-xs text-emerald-400/60 mt-1">Veriler işleniyor...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800">
        <div className="flex items-center gap-3 text-zinc-400">
          <AlertTriangle className="w-5 h-5" />
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

  const getWinnerSymbol = () => {
    if (analysis.winner.prediction === '1') return '1';
    if (analysis.winner.prediction === '2') return '2';
    return 'X';
  };

  const getRiskStyles = () => {
    if (analysis.riskLevel === 'düşük') return { bg: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (analysis.riskLevel === 'orta') return { bg: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    return { bg: 'from-red-500/20 to-red-600/10', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const riskStyles = getRiskStyles();

  return (
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-emerald-950/30 to-zinc-950" />
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent" />
      
      <div className="relative">
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold tracking-[0.2em] text-emerald-400/90 uppercase">TUTTURDUK AI</span>
              </div>
              <div className="text-[9px] text-zinc-500 mt-0.5 tracking-wide">UZMAN YAPAY ZEKA TAHMİNİ</div>
            </div>
            <div className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${riskStyles.bg} border ${riskStyles.border}`}>
              <span className={`text-[9px] font-medium ${riskStyles.text} uppercase tracking-wide`}>
                {analysis.riskLevel} risk
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className={`transition-all duration-500 delay-100 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="relative p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <p className="text-[13px] text-zinc-300 leading-relaxed font-light">{analysis.matchAnalysis}</p>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-3 transition-all duration-500 delay-200 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 p-4 hover:border-emerald-500/20 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-3">2.5 GOL</div>
                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-black tracking-tight ${analysis.over25.prediction ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {analysis.over25.prediction ? 'ÜST' : 'ALT'}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{analysis.over25.confidence}%</div>
                    <div className="text-[8px] text-zinc-600 uppercase">güven</div>
                  </div>
                </div>
                <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${analysis.over25.prediction ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                    style={{ width: revealed ? `${analysis.over25.confidence}%` : '0%' }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">{analysis.over25.reasoning}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 p-4 hover:border-emerald-500/20 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-3">KG (İKİ TAKIM GOL)</div>
                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-black tracking-tight ${analysis.btts.prediction ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.btts.prediction ? 'VAR' : 'YOK'}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{analysis.btts.confidence}%</div>
                    <div className="text-[8px] text-zinc-600 uppercase">güven</div>
                  </div>
                </div>
                <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 delay-100 ${analysis.btts.prediction ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                    style={{ width: revealed ? `${analysis.btts.confidence}%` : '0%' }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">{analysis.btts.reasoning}</p>
              </div>
            </div>
          </div>

          <div className={`transition-all duration-500 delay-300 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/5 p-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-4">MAÇ SONUCU TAHMİNİ</div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg" />
                      <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <span className="text-2xl font-black text-white">{getWinnerSymbol()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-white truncate">{getWinnerText()}</div>
                    <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{analysis.winner.reasoning}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-black text-white">{analysis.winner.confidence}%</div>
                    <div className="text-[8px] text-zinc-600 uppercase">model güveni</div>
                  </div>
                </div>

                <div className="mt-4 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 transition-all duration-1000 delay-200"
                    style={{ width: revealed ? `${analysis.winner.confidence}%` : '0%' }}
                  />
                </div>

                <div className="mt-5 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-zinc-600 uppercase tracking-wide mb-2">Olası Skorlar</div>
                      <div className="flex gap-2">
                        {analysis.scorePredictions?.map((score, i) => (
                          <div key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-sm font-bold text-white">{score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {analysis.expectedGoalRange && (
                      <div className="text-right">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wide mb-1">Beklenen Gol</div>
                        <div className="text-lg font-bold text-emerald-400">{analysis.expectedGoalRange}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`transition-all duration-500 delay-400 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="relative overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30" />
              <div className="relative px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-semibold text-white/70 uppercase tracking-widest mb-1">En İyi Bahis Önerisi</div>
                    <div className="text-lg font-bold text-white">{analysis.bestBet}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
