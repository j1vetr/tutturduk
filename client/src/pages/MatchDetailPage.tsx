import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, Trophy, Target, Flame, Shield, AlertTriangle, Lightbulb, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) loadMatch();
  }, [id]);

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

  const getPredictionConfig = (type: string) => {
    switch (type) {
      case 'expected':
        return {
          label: 'BEKLENEN',
          icon: Shield,
          gradient: 'from-emerald-500/20 to-emerald-600/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/20'
        };
      case 'medium':
        return {
          label: 'ORTA RİSK',
          icon: Target,
          gradient: 'from-amber-500/20 to-amber-600/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          bg: 'bg-amber-500/20'
        };
      case 'risky':
        return {
          label: 'RİSKLİ',
          icon: Flame,
          gradient: 'from-red-500/20 to-red-600/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          bg: 'bg-red-500/20'
        };
      default:
        return {
          label: 'TAHMİN',
          icon: Target,
          gradient: 'from-zinc-500/20 to-zinc-600/10',
          border: 'border-zinc-500/30',
          text: 'text-zinc-400',
          bg: 'bg-zinc-500/20'
        };
    }
  };

  const getMatchTypeBadge = (context: MatchContext) => {
    const badges = [];
    
    if (context.type === 'cup') {
      badges.push({ label: 'Kupa Maçı', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' });
    }
    if (context.isDerby) {
      badges.push({ label: 'Derbi', color: 'bg-red-500/20 text-red-400 border-red-500/30' });
    }
    if (context.significance === 'title') {
      badges.push({ label: 'Şampiyonluk', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' });
    }
    if (context.significance === 'relegation') {
      badges.push({ label: 'Düşme Hattı', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' });
    }
    if (context.homeLeagueLevel !== context.awayLeagueLevel) {
      badges.push({ label: 'Farklı Lig', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' });
    }
    
    return badges;
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
      <div className="space-y-4 pb-8">
        <button 
          onClick={() => setLocation('/predictions')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-white/5">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
          </div>
          
          <div className="relative p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {match.league_logo && <img src={match.league_logo} className="w-5 h-5" alt="" />}
                <span className="text-xs text-zinc-400">{match.league_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{match.match_time}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                {match.home_logo && (
                  <img src={match.home_logo} className="w-16 h-16 mx-auto mb-2 object-contain" alt="" />
                )}
                <h3 className="font-bold text-white text-sm leading-tight">{match.home_team}</h3>
              </div>
              
              <div className="flex-shrink-0 px-4">
                <div className="text-2xl font-black text-zinc-600">VS</div>
              </div>
              
              <div className="flex-1 text-center">
                {match.away_logo && (
                  <img src={match.away_logo} className="w-16 h-16 mx-auto mb-2 object-contain" alt="" />
                )}
                <h3 className="font-bold text-white text-sm leading-tight">{match.away_team}</h3>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-zinc-500">{formatDate(match.match_date)}</p>
            </div>

            {aiAnalysis?.matchContext && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                {getMatchTypeBadge(aiAnalysis.matchContext).map((badge, i) => (
                  <Badge key={i} variant="outline" className={`text-[10px] ${badge.color}`}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {loadingAI ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-zinc-500">AI analizi yükleniyor...</p>
          </div>
        ) : aiAnalysis ? (
          <>
            <div className="rounded-xl bg-zinc-900/80 border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-white">Maç Analizi</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{aiAnalysis.analysis}</p>
              
              {aiAnalysis.expectedGoalRange && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Beklenen: {aiAnalysis.expectedGoalRange}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white px-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                TAHMİNLER
              </h3>
              
              {aiAnalysis.predictions.map((pred, index) => {
                const config = getPredictionConfig(pred.type);
                const Icon = config.icon;
                
                return (
                  <div 
                    key={index}
                    className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${config.gradient} border ${config.border}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${config.text}`} />
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${config.text}`}>
                              {config.label}
                            </span>
                            <div className={`text-xs text-zinc-500`}>%{pred.confidence} güven</div>
                          </div>
                        </div>
                        <Badge className={`${config.bg} ${config.text} border-0 font-bold`}>
                          {pred.odds}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-lg font-black text-white">{pred.bet}</h4>
                      </div>
                      
                      <p className="text-sm text-zinc-400 mb-3">{pred.reasoning}</p>
                      
                      {pred.consistentScores && pred.consistentScores.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">Olası Skorlar:</span>
                          <div className="flex gap-1.5">
                            {pred.consistentScores.map((score, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-300 font-mono">
                                {score}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className={`h-1 ${config.bg}`}>
                      <div 
                        className={`h-full ${config.text.replace('text-', 'bg-')}`}
                        style={{ width: `${pred.confidence}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {aiAnalysis.avoidBets && aiAnalysis.avoidBets.length > 0 && (
              <div className="rounded-xl bg-red-950/30 border border-red-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-bold text-red-400">Kaçınılacak Bahisler</h3>
                </div>
                <ul className="space-y-2">
                  {aiAnalysis.avoidBets.map((bet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{bet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiAnalysis.expertTip && (
              <div className="rounded-xl bg-gradient-to-r from-yellow-900/20 to-amber-900/10 border border-yellow-500/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-yellow-400 mb-1">Uzman Notu</h3>
                    <p className="text-sm text-zinc-300">{aiAnalysis.expertTip}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-8 text-center">
            <p className="text-zinc-500">AI analizi henüz yüklenmedi</p>
            <Button 
              onClick={loadAIAnalysis} 
              className="mt-4 bg-emerald-500 text-black font-bold hover:bg-emerald-400"
            >
              Analizi Yükle
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
