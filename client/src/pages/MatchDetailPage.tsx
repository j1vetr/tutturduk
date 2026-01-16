import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, Target, Flame, AlertTriangle, Lightbulb, TrendingUp, ChevronDown, ChevronUp, CheckCircle, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
        <div className="absolute inset-2 rounded-full bg-zinc-800 flex items-center justify-center">
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

function getBetComment(type: string, bet: string, confidence: number): { text: string; sentiment: 'positive' | 'neutral' | 'warning' } {
  const betLower = bet.toLowerCase();
  
  if (type === 'expected') {
    if (confidence >= 75) {
      return { text: 'Güvenilir seçim, bu bahis mantıklı görünüyor.', sentiment: 'positive' };
    } else if (confidence >= 60) {
      return { text: 'Makul bir tercih, istatistikler destekliyor.', sentiment: 'positive' };
    }
    return { text: 'Düşük riskli seçenek, temkinli oynanabilir.', sentiment: 'neutral' };
  }
  
  if (type === 'medium') {
    if (betLower.includes('üst')) {
      return { text: 'Gol beklentisi orta seviyede, maç açık oynanabilir.', sentiment: 'neutral' };
    }
    if (betLower.includes('kg')) {
      return { text: 'Her iki takımın da gol atma şansı var.', sentiment: 'neutral' };
    }
    return { text: 'Orta riskli bahis, getirisi makul.', sentiment: 'neutral' };
  }
  
  if (type === 'risky') {
    return { text: 'Yüksek oranlı riskli bahis. Dikkatli değerlendir.', sentiment: 'warning' };
  }
  
  return { text: 'Detaylı analiz için aşağıya bak.', sentiment: 'neutral' };
}

function getPredictionConfig(type: string) {
  switch (type) {
    case 'expected':
      return {
        label: 'EN İYİ SEÇİM',
        icon: CheckCircle,
        badge: 'bg-white text-black',
        border: 'border-white/20',
        iconColor: 'text-white'
      };
    case 'medium':
      return {
        label: 'ALTERNATİF',
        icon: Target,
        badge: 'bg-zinc-700 text-zinc-300',
        border: 'border-zinc-700',
        iconColor: 'text-zinc-400'
      };
    case 'risky':
      return {
        label: 'RİSKLİ',
        icon: Flame,
        badge: 'bg-zinc-800 text-zinc-400',
        border: 'border-zinc-700',
        iconColor: 'text-zinc-500'
      };
    default:
      return {
        label: 'TAHMİN',
        icon: Target,
        badge: 'bg-zinc-800 text-zinc-400',
        border: 'border-zinc-700',
        iconColor: 'text-zinc-500'
      };
  }
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAvoidBets, setShowAvoidBets] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-zinc-400">Maç bulunamadı</p>
          <Button variant="outline" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className={`space-y-5 pb-8 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* Back Button */}
        <button 
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>

        {/* Match Header - Minimal */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
          <div className="flex items-center justify-center gap-2 mb-4">
            {match.league_logo && <img src={match.league_logo} className="w-4 h-4 opacity-60" alt="" />}
            <span className="text-xs text-zinc-500">{match.league_name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              {match.home_logo && (
                <img src={match.home_logo} className="w-16 h-16 mx-auto object-contain" alt="" />
              )}
              <h3 className="font-semibold text-white text-sm mt-2">{match.home_team}</h3>
            </div>
            
            <div className="px-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">VS</div>
                <div className="flex items-center gap-1 text-zinc-500 mt-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{match.match_time}</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 text-center">
              {match.away_logo && (
                <img src={match.away_logo} className="w-16 h-16 mx-auto object-contain" alt="" />
              )}
              <h3 className="font-semibold text-white text-sm mt-2">{match.away_team}</h3>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-zinc-600">{formatDate(match.match_date)}</p>
          </div>

          {/* Match Context Badges - Minimal */}
          {aiAnalysis?.matchContext && (
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {aiAnalysis.matchContext.isDerby && (
                <span className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">Derbi</span>
              )}
              {aiAnalysis.matchContext.type === 'cup' && (
                <span className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">Kupa Maçı</span>
              )}
              {aiAnalysis.matchContext.significance === 'title' && (
                <span className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">Kritik Maç</span>
              )}
              {aiAnalysis.matchContext.significance === 'relegation' && (
                <span className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">Düşme Hattı</span>
              )}
            </div>
          )}
        </div>

        {loadingAI ? (
          <LoadingAnimation />
        ) : aiAnalysis ? (
          <div className={`space-y-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {/* BETTING CARDS - Main Focus */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white px-1 flex items-center gap-2">
                <Target className="w-4 h-4" />
                TAHMİNLER
              </h2>
              
              {aiAnalysis.predictions.map((pred, index) => {
                const config = getPredictionConfig(pred.type);
                const Icon = config.icon;
                const comment = getBetComment(pred.type, pred.bet, pred.confidence);
                
                return (
                  <div 
                    key={index}
                    className={`bg-zinc-900 rounded-xl border ${config.border} p-4 transition-all ${index === 0 ? 'ring-1 ring-white/10' : ''}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.iconColor}`} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-white">{pred.odds}</span>
                      </div>
                    </div>
                    
                    {/* Bet Type - Big and Clear */}
                    <div className="mb-3">
                      <h3 className="text-xl font-black text-white">{pred.bet}</h3>
                    </div>
                    
                    {/* AI Comment */}
                    <div className={`flex items-start gap-2 p-3 rounded-lg mb-3 ${
                      comment.sentiment === 'positive' ? 'bg-zinc-800' :
                      comment.sentiment === 'warning' ? 'bg-zinc-800/50' :
                      'bg-zinc-800/70'
                    }`}>
                      {comment.sentiment === 'positive' && <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />}
                      {comment.sentiment === 'warning' && <AlertTriangle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />}
                      {comment.sentiment === 'neutral' && <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />}
                      <p className="text-sm text-zinc-300">{comment.text}</p>
                    </div>
                    
                    {/* Reasoning */}
                    <p className="text-xs text-zinc-500 leading-relaxed mb-3">{pred.reasoning}</p>
                    
                    {/* Possible Scores */}
                    {pred.consistentScores && pred.consistentScores.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-600 uppercase">Olası:</span>
                        <div className="flex gap-1.5">
                          {pred.consistentScores.slice(0, 3).map((score, i) => (
                            <span key={i} className="text-xs text-zinc-400 font-mono bg-zinc-800 px-2 py-1 rounded">
                              {score}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Match Analysis - Collapsible */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-bold text-white">Maç Analizi</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{aiAnalysis.analysis}</p>
              
              {aiAnalysis.expectedGoalRange && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Beklenen gol:</span>
                  <span className="text-sm font-bold text-white">{aiAnalysis.expectedGoalRange}</span>
                </div>
              )}
            </div>

            {/* Expert Tip */}
            {aiAnalysis.expertTip && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Uzman Görüşü</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{aiAnalysis.expertTip}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Avoid Bets - Collapsible */}
            {aiAnalysis.avoidBets && aiAnalysis.avoidBets.length > 0 && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <button 
                  onClick={() => setShowAvoidBets(!showAvoidBets)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-400">Uzak Dur</span>
                    <Badge className="bg-zinc-800 text-zinc-500 border-0 text-[10px]">
                      {aiAnalysis.avoidBets.length}
                    </Badge>
                  </div>
                  {showAvoidBets ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${showAvoidBets ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-4 space-y-2">
                    {aiAnalysis.avoidBets.map((bet, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800">
                        <XCircle className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-zinc-400">{bet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Match Simulation - Toggle */}
            {aiAnalysis.predictions[0]?.consistentScores?.[0] && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <button 
                  onClick={() => setShowSimulation(!showSimulation)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚽</span>
                    <span className="text-sm font-medium text-white">Maç Simülasyonu</span>
                  </div>
                  {showSimulation ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${showSimulation ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-4">
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
                      scenario={(() => {
                        const bestBet = aiAnalysis.predictions[0]?.bet?.toLowerCase() || '';
                        const score = aiAnalysis.predictions[0]?.consistentScores?.[0] || '1-1';
                        const [home, away] = score.split('-').map(s => parseInt(s.trim()) || 0);
                        const totalGoals = home + away;
                        
                        if (bestBet.includes('üst') || totalGoals >= 3) return 'high_scoring';
                        if (bestBet.includes('alt') || totalGoals <= 1) return 'low_scoring';
                        if (bestBet.includes('kg var') || (home > 0 && away > 0)) return 'btts';
                        if (bestBet.includes('ev') || home >= away + 2) return 'one_sided_home';
                        if (bestBet.includes('deplasman') || away >= home + 2) return 'one_sided_away';
                        return 'balanced';
                      })()}
                      expectedGoals={(() => {
                        const range = aiAnalysis.expectedGoalRange || '2-3';
                        const parts = range.split('-').map(s => parseFloat(s.trim()) || 0);
                        return (parts[0] + (parts[1] || parts[0])) / 2;
                      })()}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
            <p className="text-zinc-500">AI analizi henüz yüklenmedi</p>
            <Button 
              onClick={loadAIAnalysis} 
              className="mt-4 bg-white text-black font-bold hover:bg-zinc-200"
            >
              Analizi Yükle
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
