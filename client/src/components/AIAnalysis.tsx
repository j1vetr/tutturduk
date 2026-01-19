import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Target, Zap, Shield, Flame, Trophy } from "lucide-react";

interface AIAnalysisResult {
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

interface AIAnalysisProps {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
}

const ANALYSIS_STEPS = [
  { text: 'Ev sahibi son maçları analiz ediliyor', icon: '🏠', duration: 700 },
  { text: 'Deplasman performansı inceleniyor', icon: '✈️', duration: 600 },
  { text: 'Kafa kafaya geçmiş değerlendiriliyor', icon: '⚔️', duration: 550 },
  { text: 'Sakatlık ve kadro bilgileri kontrol ediliyor', icon: '🏥', duration: 450 },
  { text: 'Bahis oranları ve değer analizi yapılıyor', icon: '📊', duration: 500 },
  { text: 'Uzman yapay zeka tahminleri oluşturuluyor', icon: '🤖', duration: 800 },
];

export function AIAnalysis({ matchId, homeTeam, awayTeam }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [showingAnimation, setShowingAnimation] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [matchId]);

  useEffect(() => {
    if (analysis && !showingAnimation) {
      setTimeout(() => setRevealed(true), 100);
    }
  }, [analysis, showingAnimation]);

  useEffect(() => {
    if (showingAnimation && animationStep < ANALYSIS_STEPS.length) {
      const timer = setTimeout(() => {
        setAnimationStep(prev => prev + 1);
      }, ANALYSIS_STEPS[animationStep].duration);
      return () => clearTimeout(timer);
    } else if (showingAnimation && animationStep >= ANALYSIS_STEPS.length) {
      setTimeout(() => setShowingAnimation(false), 400);
    }
  }, [showingAnimation, animationStep]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    setRevealed(false);
    setAnimationStep(0);
    setShowingAnimation(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/ai-analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      } else {
        const err = await res.json();
        setError(err.message || 'Analiz yüklenemedi');
        setShowingAnimation(false);
      }
    } catch (e) {
      setError('Bağlantı hatası');
      setShowingAnimation(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading || showingAnimation) {
    const currentStep = ANALYSIS_STEPS[Math.min(animationStep, ANALYSIS_STEPS.length - 1)];
    const progress = ((animationStep + 1) / ANALYSIS_STEPS.length) * 100;
    
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/50 to-slate-950" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-8 bg-emerald-400/5 rounded-full blur-2xl animate-pulse delay-300" />
          </div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        </div>
        
        <div className="relative px-6 py-10">
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative">
                <svg className="w-24 h-24" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(16, 185, 129, 0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl">{currentStep?.icon}</div>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Tutturduk AI</span>
              </div>
              <div className="text-lg font-medium text-white mb-2 min-h-[28px] transition-all">
                {currentStep?.text || 'Tamamlanıyor...'}
              </div>
              <div className="text-sm text-zinc-500">
                Uzman yapay zeka maçı analiz ediyor
              </div>
            </div>
            
            <div className="w-full max-w-sm space-y-4">
              {ANALYSIS_STEPS.map((step, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    i < animationStep ? 'opacity-100' : i === animationStep ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-300 ${
                    i < animationStep 
                      ? 'bg-emerald-500/20 border border-emerald-500/30' 
                      : i === animationStep 
                        ? 'bg-emerald-500/30 border border-emerald-400/50 scale-110' 
                        : 'bg-zinc-800/50 border border-zinc-700/50'
                  }`}>
                    {i < animationStep ? (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate transition-colors ${
                      i <= animationStep ? 'text-white' : 'text-zinc-600'
                    }`}>
                      {step.text}
                    </div>
                    {i === animationStep && (
                      <div className="h-1 mt-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-progress" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .animate-progress {
            animation: progress 0.6s ease-out forwards;
          }
        `}</style>
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

  return (
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950" />
      <div className="absolute inset-0 opacity-50">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      
      <div className="relative">
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white uppercase tracking-wide">Tutturduk AI</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-zinc-500 tracking-wide">Uzman Yapay Zeka Tahminleri</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className={`transition-all duration-500 delay-100 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-2 font-semibold">Uzman Analizi</div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{analysis.matchAnalysis}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`space-y-3 transition-all duration-500 delay-200 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest px-1 font-semibold">Risk Seviyesine Göre Tahminler</div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-4">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">Beklenen</div>
                      <div className="text-[9px] text-zinc-600">Düşük Risk</div>
                    </div>
                  </div>
                  {analysis.expectedBet.odds && (
                    <div className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                      <span className="text-xs font-bold text-emerald-400">{analysis.expectedBet.odds}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-xl font-black text-white">{analysis.expectedBet.prediction}</div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">{analysis.expectedBet.confidence}%</div>
                    <div className="text-[8px] text-zinc-600 uppercase">Güven</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                    style={{ width: revealed ? `${analysis.expectedBet.confidence}%` : '0%' }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">{analysis.expectedBet.reasoning}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-4">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold">Orta Riskli</div>
                      <div className="text-[9px] text-zinc-600">Dengeli Risk</div>
                    </div>
                  </div>
                  {analysis.mediumRiskBet.odds && (
                    <div className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30">
                      <span className="text-xs font-bold text-amber-400">{analysis.mediumRiskBet.odds}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-xl font-black text-white">{analysis.mediumRiskBet.prediction}</div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-400">{analysis.mediumRiskBet.confidence}%</div>
                    <div className="text-[8px] text-zinc-600 uppercase">Güven</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000 delay-100"
                    style={{ width: revealed ? `${analysis.mediumRiskBet.confidence}%` : '0%' }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">{analysis.mediumRiskBet.reasoning}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 p-4">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-red-400 uppercase tracking-widest font-semibold">Riskli</div>
                      <div className="text-[9px] text-zinc-600">Yüksek Getiri</div>
                    </div>
                  </div>
                  {analysis.riskyBet.odds && (
                    <div className="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/30">
                      <span className="text-xs font-bold text-red-400">{analysis.riskyBet.odds}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-xl font-black text-white">{analysis.riskyBet.prediction}</div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">{analysis.riskyBet.confidence}%</div>
                    <div className="text-[8px] text-zinc-600 uppercase">Güven</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000 delay-200"
                    style={{ width: revealed ? `${analysis.riskyBet.confidence}%` : '0%' }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">{analysis.riskyBet.reasoning}</p>
              </div>
            </div>
          </div>

          <div className={`transition-all duration-500 delay-300 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2 font-semibold">Tahmini Skorlar</div>
                  <div className="flex gap-2">
                    {analysis.scorePredictions?.map((score, i) => (
                      <div key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-sm font-bold text-white">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {analysis.expertComment && (
            <div className={`transition-all duration-500 delay-400 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="relative overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30" />
                <div className="relative px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-white/80 uppercase tracking-widest mb-1">Uzman Görüşü</div>
                      <div className="text-sm font-medium text-white leading-relaxed">{analysis.expertComment}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
