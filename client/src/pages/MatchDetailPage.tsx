import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, Trophy, Target, Flame, Shield, AlertTriangle, Lightbulb, TrendingUp, ChevronDown, ChevronUp, Star, Zap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MatchSimulation } from "@/components/MatchSimulation";

interface PredictionItem {
  type: 'expected' | 'medium' | 'risky';
  bet: string;
  odds: string;
  confidence: number;
  reasoning: string;
  consistentScores: string[];
}

interface MatchContext {
  type: string;
  significance: string;
  homeLeagueLevel: number;
  awayLeagueLevel: number;
  isCupUpset: boolean;
  isDerby: boolean;
}

interface AIAnalysis {
  matchContext: MatchContext;
  analysis: string;
  predictions: PredictionItem[];
  avoidBets: string[];
  expertTip: string;
  expectedGoalRange: string;
}

interface PublishedMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date: string;
  match_time: string;
  is_featured?: boolean;
}

function AnimatedRing({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-zinc-800"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white">%{animatedValue}</span>
        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">güven</span>
      </div>
    </div>
  );
}

function GoalDistributionChart({ homeTeam, awayTeam }: { homeTeam: string; awayTeam: string }) {
  const homeData = [3, 1, 2, 4, 2, 5];
  const awayData = [1, 3, 2, 2, 4, 3];
  const labels = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
  const maxVal = Math.max(...homeData, ...awayData);

  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-white/5 p-4 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
      
      <div className="flex items-center gap-2 mb-4 relative">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <Timer className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-bold text-white">Gol Dağılımı</h3>
      </div>

      <div className="space-y-4 relative">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">{homeTeam}</span>
            <span className="text-[10px] text-emerald-400">Ev Sahibi</span>
          </div>
          <div className="flex gap-1 h-6">
            {homeData.map((val, i) => (
              <div key={i} className="flex-1 relative group">
                <div className="absolute bottom-0 w-full rounded-t bg-emerald-500/30 transition-all duration-500"
                  style={{ height: `${(val / maxVal) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t opacity-80" />
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-zinc-600">
                  {labels[i].split('-')[0]}'
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-800/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">{awayTeam}</span>
            <span className="text-[10px] text-blue-400">Deplasman</span>
          </div>
          <div className="flex gap-1 h-6">
            {awayData.map((val, i) => (
              <div key={i} className="flex-1 relative">
                <div className="absolute bottom-0 w-full rounded-t bg-blue-500/30 transition-all duration-500"
                  style={{ height: `${(val / maxVal) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t opacity-80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
        <span className="text-[11px] text-yellow-300/90">Son 15 dakikada gol oranı yüksek!</span>
      </div>
    </div>
  );
}

function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
          <span className="text-xl">⚽</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white">AI Analizi Hazırlanıyor</p>
        <p className="text-xs text-zinc-500 mt-1">Veriler işleniyor...</p>
      </div>
    </div>
  );
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activePrediction, setActivePrediction] = useState(0);
  const [showAvoidBets, setShowAvoidBets] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadMatch();
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const loadMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        loadAIAnalysis();
      }
    } catch (error) {
      console.error('Failed to load match:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch(`/api/matches/${id}/ai-analysis`);
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to load AI analysis:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  };

  const getFormStars = (form?: string) => {
    if (!form) return 0;
    const wins = (form.match(/W/g) || []).length;
    return Math.min(5, Math.ceil(wins * 1.5));
  };

  const getPredictionConfig = (type: string) => {
    switch (type) {
      case 'expected':
        return {
          label: 'BEKLENEN',
          sublabel: 'Düşük Risk',
          icon: Shield,
          gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
          bgGradient: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          ringColor: '#10b981',
          glow: 'shadow-emerald-500/20'
        };
      case 'medium':
        return {
          label: 'ORTA RİSK',
          sublabel: 'Orta Getiri',
          icon: Target,
          gradient: 'from-amber-500 via-orange-500 to-yellow-500',
          bgGradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          ringColor: '#f59e0b',
          glow: 'shadow-amber-500/20'
        };
      case 'risky':
        return {
          label: 'RİSKLİ',
          sublabel: 'Yüksek Oran',
          icon: Flame,
          gradient: 'from-red-500 via-rose-500 to-pink-500',
          bgGradient: 'from-red-500/20 via-red-600/10 to-transparent',
          border: 'border-red-500/40',
          text: 'text-red-400',
          ringColor: '#ef4444',
          glow: 'shadow-red-500/20'
        };
      default:
        return {
          label: 'TAHMİN',
          sublabel: '',
          icon: Target,
          gradient: 'from-zinc-500 to-zinc-600',
          bgGradient: 'from-zinc-500/20 to-transparent',
          border: 'border-zinc-500/30',
          text: 'text-zinc-400',
          ringColor: '#71717a',
          glow: ''
        };
    }
  };

  const getMatchTypeBadges = (context: MatchContext) => {
    const badges = [];
    if (context.isDerby) badges.push({ label: 'Derbi', icon: Flame, color: 'from-red-500 to-orange-500' });
    if (context.type === 'cup') badges.push({ label: 'Kupa', icon: Trophy, color: 'from-purple-500 to-violet-500' });
    if (context.significance === 'title') badges.push({ label: 'Kritik', icon: Zap, color: 'from-yellow-500 to-amber-500' });
    if (context.significance === 'relegation') badges.push({ label: 'Düşme Hattı', icon: AlertTriangle, color: 'from-orange-500 to-red-500' });
    return badges;
  };

  const scrollToCard = (index: number) => {
    setActivePrediction(index);
    if (sliderRef.current) {
      const cards = sliderRef.current.children;
      if (cards[index]) {
        (cards[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-zinc-400">Maç bulunamadı</p>
          <Button variant="outline" onClick={() => setLocation('/predictions')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className={`space-y-4 pb-8 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button 
          onClick={() => setLocation('/predictions')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-white/10">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
          </div>
          
          <div className="relative p-5">
            <div className="flex items-center justify-center gap-2 mb-5">
              {match.league_logo && <img src={match.league_logo} className="w-5 h-5" alt="" />}
              <span className="text-xs text-zinc-400 font-medium">{match.league_name}</span>
              <span className="text-zinc-600">•</span>
              <div className="flex items-center gap-1 text-zinc-500">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-medium">{match.match_time}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <div className="relative inline-block">
                  {match.home_logo && (
                    <img src={match.home_logo} className="w-20 h-20 mx-auto object-contain drop-shadow-lg" alt="" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-full blur-xl -z-10" />
                </div>
                <h3 className="font-bold text-white text-sm mt-2 leading-tight">{match.home_team}</h3>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-2.5 h-2.5 ${i < getFormStars(aiAnalysis?.analysis) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
                  ))}
                </div>
              </div>
              
              <div className="flex-shrink-0 relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center">
                  <span className="text-xl font-black bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">VS</span>
                </div>
                <div className="absolute inset-0 animate-pulse">
                  <div className="w-full h-full rounded-full border-2 border-emerald-500/30" />
                </div>
              </div>
              
              <div className="flex-1 text-center">
                <div className="relative inline-block">
                  {match.away_logo && (
                    <img src={match.away_logo} className="w-20 h-20 mx-auto object-contain drop-shadow-lg" alt="" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent rounded-full blur-xl -z-10" />
                </div>
                <h3 className="font-bold text-white text-sm mt-2 leading-tight">{match.away_team}</h3>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-2.5 h-2.5 ${i < getFormStars(aiAnalysis?.analysis) - 1 ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-zinc-500">{formatDate(match.match_date)}</p>
            </div>

            {aiAnalysis?.matchContext && getMatchTypeBadges(aiAnalysis.matchContext).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {getMatchTypeBadges(aiAnalysis.matchContext).map((badge, i) => {
                  const Icon = badge.icon;
                  return (
                    <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${badge.color} shadow-lg`}>
                      <Icon className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wide">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {loadingAI ? (
          <LoadingAnimation />
        ) : aiAnalysis ? (
          <div className={`space-y-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {/* Match Simulation */}
            {aiAnalysis.predictions[0]?.consistentScores?.[0] && (
              <MatchSimulation
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeLogo={match.home_logo}
                awayLogo={match.away_logo}
                predictedScore={(() => {
                  const score = aiAnalysis.predictions[0].consistentScores[0];
                  const [home, away] = score.split('-').map(s => parseInt(s.trim()) || 0);
                  return { home, away };
                })()}
              />
            )}
            
            <div className="rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-white/5 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-2 mb-3 relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-white">Maç Analizi</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed relative">{aiAnalysis.analysis}</p>
              
              {aiAnalysis.expectedGoalRange && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                  <span className="text-xs text-blue-400 font-medium">Beklenen:</span>
                  <span className="text-xs text-white font-bold">{aiAnalysis.expectedGoalRange}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  TAHMİNLER
                </h3>
                <div className="flex gap-1">
                  {aiAnalysis.predictions.map((pred, i) => {
                    const config = getPredictionConfig(pred.type);
                    return (
                      <button
                        key={i}
                        onClick={() => scrollToCard(i)}
                        className={`w-2 h-2 rounded-full transition-all ${activePrediction === i ? `bg-gradient-to-r ${config.gradient} scale-125` : 'bg-zinc-700'}`}
                      />
                    );
                  })}
                </div>
              </div>
              
              <div 
                ref={sliderRef}
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {aiAnalysis.predictions.map((pred, index) => {
                  const config = getPredictionConfig(pred.type);
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => setActivePrediction(index)}
                      className={`flex-shrink-0 w-[85%] snap-center relative overflow-hidden rounded-2xl border ${config.border} ${config.glow} shadow-xl transition-all duration-300 ${activePrediction === index ? 'scale-100' : 'scale-95 opacity-70'}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient}`} />
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: config.ringColor }} />
                      
                      <div className="relative p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>
                                {config.label}
                              </span>
                              <div className="text-[10px] text-zinc-500">{config.sublabel}</div>
                            </div>
                          </div>
                          <AnimatedRing value={pred.confidence} color={config.ringColor} size={56} />
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="text-xl font-black text-white mb-1">{pred.bet}</h4>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r ${config.gradient} shadow-lg`}>
                            <span className="text-xs font-bold text-white">{pred.odds}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{pred.reasoning}</p>
                        
                        {pred.consistentScores && pred.consistentScores.length > 0 && (
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Olası Skorlar</span>
                            <div className="flex gap-2">
                              {pred.consistentScores.map((score, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-white/5">
                                  <span className="text-sm text-white font-mono font-bold">{score}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <GoalDistributionChart homeTeam={match.home_team} awayTeam={match.away_team} />

            {aiAnalysis.avoidBets && aiAnalysis.avoidBets.length > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-red-950/40 to-zinc-900 border border-red-500/20 overflow-hidden">
                <button 
                  onClick={() => setShowAvoidBets(!showAvoidBets)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-sm font-bold text-red-400">Dikkat Et</span>
                    <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">
                      {aiAnalysis.avoidBets.length}
                    </Badge>
                  </div>
                  {showAvoidBets ? (
                    <ChevronUp className="w-4 h-4 text-red-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-red-400" />
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${showAvoidBets ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-4 space-y-2">
                    {aiAnalysis.avoidBets.map((bet, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10">
                        <span className="text-red-500 font-bold">✕</span>
                        <span className="text-sm text-zinc-300">{bet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {aiAnalysis.expertTip && (
              <div className="relative overflow-hidden rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-zinc-900">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBMMCA0MFYwaDB6IiBmaWxsPSJyZ2JhKDI1NSwyMDUsMCwwLjAyKSIvPjwvZz48L3N2Zz4=')] opacity-50" />
                
                <div className="relative p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 flex-shrink-0">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-bold text-yellow-400">Uzman Görüşü</h3>
                        <div className="flex gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed">{aiAnalysis.expertTip}</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500" />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-8 text-center">
            <p className="text-zinc-500">AI analizi henüz yüklenmedi</p>
            <Button 
              onClick={loadAIAnalysis} 
              className="mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/20"
            >
              Analizi Yükle
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
