import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, Target, Flame, AlertTriangle, Lightbulb, TrendingUp, ChevronDown, ChevronUp, CheckCircle, XCircle, Info, Shield, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchSimulation } from "@/components/MatchSimulation";

interface PredictionItem {
  type: 'expected' | 'medium' | 'risky';
  bet: string;
  odds: string;
  confidence: number;
  reasoning: string;
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
  avoidBets: (string | { bet?: string; reason?: string })[];
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

interface TurkishOdds {
  found: boolean;
  source: string;
  matchedTeams?: { home: string; away: string };
  odds: {
    msOdds?: { home: number; draw: number; away: number };
    overUnder?: {
      over15?: number; under15?: number;
      over25?: number; under25?: number;
      over35?: number; under35?: number;
    };
    btts?: { yes?: number; no?: number };
    doubleChance?: { homeOrDraw?: number; awayOrDraw?: number; homeOrAway?: number };
    halfTime?: { home?: number; draw?: number; away?: number };
  } | null;
}

function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center shadow-inner">
          <span className="text-2xl">⚽</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-gray-800">AI Analizi Hazırlanıyor</p>
        <p className="text-sm text-gray-400 mt-1">Veriler işleniyor...</p>
      </div>
    </div>
  );
}

function getBetComment(type: string, bet: string, confidence: number): { text: string; emoji: string } {
  if (type === 'expected') {
    if (confidence >= 75) return { text: 'Güçlü istatistiklerle destekleniyor', emoji: '🔥' };
    if (confidence >= 60) return { text: 'Veriler bu yönde işaret ediyor', emoji: '✨' };
    return { text: 'Güvenli tercih olarak öne çıkıyor', emoji: '✅' };
  }
  if (type === 'medium') {
    return { text: 'Orta risk, makul getiri potansiyeli', emoji: '⚡' };
  }
  return { text: 'Yüksek oran, dikkatli değerlendir', emoji: '🎯' };
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [turkishOdds, setTurkishOdds] = useState<TurkishOdds | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingOdds, setLoadingOdds] = useState(false);
  const [showAvoidBets, setShowAvoidBets] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showOdds, setShowOdds] = useState(true);
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
        loadTurkishOdds();
      }
    } catch (error) {
      console.error('Failed to load match:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTurkishOdds = async () => {
    setLoadingOdds(true);
    try {
      const res = await fetch(`/api/matches/${id}/odds`);
      if (res.ok) {
        const data = await res.json();
        setTurkishOdds(data);
      }
    } catch (error) {
      console.error('Failed to load Turkish odds:', error);
    } finally {
      setLoadingOdds(false);
    }
  };

  const loadAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch(`/api/matches/${id}/ai-analysis`);
      if (res.ok) {
        const data = await res.json();
        // Normalize predictions array - ensure it exists and has correct format
        if (!data.predictions || !Array.isArray(data.predictions)) {
          data.predictions = [];
        }
        // Ensure each prediction has required fields
        data.predictions = data.predictions.map((pred: any, index: number) => ({
          type: pred.type || (index === 0 ? 'expected' : index === 1 ? 'medium' : 'risky'),
          bet: pred.bet || 'Tahmin yükleniyor...',
          odds: pred.odds || '~1.50',
          confidence: pred.confidence || 50,
          reasoning: pred.reasoning || ''
        }));
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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500">Maç bulunamadı</p>
          <Button variant="outline" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setLocation('/')}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            {match.league_logo && <img src={match.league_logo} className="w-5 h-5" alt="" />}
            <span className="text-sm font-medium text-gray-600">{match.league_name}</span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pb-32">
        {/* Match Card - Hero */}
        <div className="relative mt-4 rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_70%)]" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
          
          <div className="relative">
            {/* Time & Date */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-semibold text-white">{match.match_time}</span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(match.match_date)}</span>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur p-3 shadow-lg">
                  {match.home_logo && (
                    <img src={match.home_logo} className="w-full h-full object-contain drop-shadow-lg" alt="" />
                  )}
                </div>
                <h3 className="font-bold text-white text-sm">{match.home_team}</h3>
                <span className="text-[10px] text-emerald-400 font-medium">EV SAHİBİ</span>
              </div>
              
              <div className="px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <span className="text-2xl font-black text-white">VS</span>
                </div>
              </div>
              
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur p-3 shadow-lg">
                  {match.away_logo && (
                    <img src={match.away_logo} className="w-full h-full object-contain drop-shadow-lg" alt="" />
                  )}
                </div>
                <h3 className="font-bold text-white text-sm">{match.away_team}</h3>
                <span className="text-[10px] text-blue-400 font-medium">DEPLASMAN</span>
              </div>
            </div>

            {/* Context Badges */}
            {aiAnalysis?.matchContext && (
              <div className="flex flex-wrap gap-2 justify-center mt-5">
                {aiAnalysis.matchContext.isDerby && (
                  <span className="text-[10px] px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 font-medium flex items-center gap-1">
                    <Flame className="w-3 h-3" /> DERBİ
                  </span>
                )}
                {aiAnalysis.matchContext.type === 'cup' && (
                  <span className="text-[10px] px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-medium">KUPA MAÇI</span>
                )}
                {aiAnalysis.matchContext.significance === 'title' && (
                  <span className="text-[10px] px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" /> KRİTİK
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {loadingAI ? (
          <LoadingAnimation />
        ) : aiAnalysis ? (
          <div className={`space-y-4 mt-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {/* No Predictions Fallback */}
            {(!aiAnalysis.predictions || aiAnalysis.predictions.length === 0) && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <p className="text-sm text-amber-700">Tahminler henüz hazırlanıyor. Lütfen daha sonra tekrar deneyin.</p>
                </div>
              </div>
            )}
            
            {/* PRIMARY BET - Hero Card */}
            {aiAnalysis.predictions && aiAnalysis.predictions[0] && (
              <div className="relative rounded-3xl bg-white shadow-xl shadow-emerald-500/10 border border-emerald-100 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />
                
                <div className="p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 transition-transform duration-300">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ana Tahmin</span>
                        <p className="text-[11px] text-gray-400">En güvenilir seçim</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{aiAnalysis.predictions[0].odds}</span>
                      <p className="text-[10px] text-gray-400 font-medium">ORAN</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl p-4 mb-4 border border-emerald-100/50">
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{aiAnalysis.predictions[0].bet}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getBetComment('expected', aiAnalysis.predictions[0].bet, aiAnalysis.predictions[0].confidence).emoji}</span>
                      <p className="text-sm text-gray-600 font-medium">{getBetComment('expected', aiAnalysis.predictions[0].bet, aiAnalysis.predictions[0].confidence).text}</p>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Güven Skoru</span>
                      <span className="text-sm font-black text-emerald-600">{aiAnalysis.predictions[0].confidence}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${aiAnalysis.predictions[0].confidence}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">{aiAnalysis.predictions[0].reasoning}</p>
                </div>
              </div>
            )}

            {/* RISK SEVEN - Medium Risk */}
            {aiAnalysis.predictions && aiAnalysis.predictions[1] && (
              <div className="relative rounded-2xl bg-white shadow-lg border border-amber-200 overflow-hidden group hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform duration-300">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Risk Seven</span>
                        <p className="text-[10px] text-gray-400">Orta risk, iyi getiri</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{aiAnalysis.predictions[1].odds}</span>
                      <p className="text-[9px] text-gray-400 font-medium">ORAN</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl p-3 mb-3 border border-amber-100/50">
                    <h3 className="text-xl font-black text-gray-900">{aiAnalysis.predictions[1].bet}</h3>
                  </div>

                  {/* Confidence Indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                        style={{ width: `${aiAnalysis.predictions[1].confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-600">{aiAnalysis.predictions[1].confidence}%</span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{aiAnalysis.predictions[1].reasoning}</p>
                </div>
              </div>
            )}

            {/* RISKLI - High Risk */}
            {aiAnalysis.predictions && aiAnalysis.predictions[2] && (
              <div className="relative rounded-2xl bg-white shadow-lg border border-red-200 overflow-hidden group hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" />
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-105 transition-transform duration-300">
                        <Flame className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                          Riskli
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        </span>
                        <p className="text-[10px] text-gray-400">Yüksek oran, yüksek risk</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{aiAnalysis.predictions[2].odds}</span>
                      <p className="text-[9px] text-gray-400 font-medium">ORAN</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 via-red-50 to-rose-50 rounded-xl p-3 mb-3 border border-red-100/50">
                    <h3 className="text-xl font-black text-gray-900">{aiAnalysis.predictions[2].bet}</h3>
                  </div>

                  {/* Risk Indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                        style={{ width: `${aiAnalysis.predictions[2].confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-red-600">{aiAnalysis.predictions[2].confidence}%</span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{aiAnalysis.predictions[2].reasoning}</p>
                </div>
              </div>
            )}

            {/* SIMULATION - Always Visible After Bets */}
            {aiAnalysis.predictions[0] && (
              <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <span className="text-lg">⚽</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Canlı Simülasyon</span>
                  </div>
                </div>
                <div className="p-4">
                  <MatchSimulation
                    homeTeam={match.home_team}
                    awayTeam={match.away_team}
                    homeLogo={match.home_logo}
                    awayLogo={match.away_logo}
                    predictedScore={(() => {
                      const bestBet = aiAnalysis.predictions[0]?.bet?.toLowerCase() || '';
                      if (bestBet.includes('ms1') || bestBet.includes('ev')) return { home: 2, away: 0 };
                      if (bestBet.includes('ms2') || bestBet.includes('deplasman')) return { home: 0, away: 2 };
                      if (bestBet.includes('2.5 üst') || bestBet.includes('3.5 üst')) return { home: 2, away: 1 };
                      if (bestBet.includes('2.5 alt') || bestBet.includes('kg yok')) return { home: 1, away: 0 };
                      if (bestBet.includes('kg var')) return { home: 1, away: 1 };
                      if (bestBet.includes('1x')) return { home: 1, away: 0 };
                      if (bestBet.includes('x2')) return { home: 0, away: 1 };
                      return { home: 1, away: 1 };
                    })()}
                    scenario={(() => {
                      const bestBet = aiAnalysis.predictions[0]?.bet?.toLowerCase() || '';
                      if (bestBet.includes('üst')) return 'high_scoring';
                      if (bestBet.includes('alt')) return 'low_scoring';
                      if (bestBet.includes('kg var')) return 'btts';
                      if (bestBet.includes('ms1') || bestBet.includes('ev') || bestBet.includes('1x')) return 'one_sided_home';
                      if (bestBet.includes('ms2') || bestBet.includes('deplasman') || bestBet.includes('x2')) return 'one_sided_away';
                      return 'balanced';
                    })()}
                    expectedGoals={(() => {
                      const bestBet = aiAnalysis.predictions[0]?.bet?.toLowerCase() || '';
                      if (bestBet.includes('3.5 üst') || bestBet.includes('4.5 üst')) return 4;
                      if (bestBet.includes('2.5 üst')) return 3;
                      if (bestBet.includes('1.5 üst')) return 2;
                      if (bestBet.includes('2.5 alt')) return 1.5;
                      if (bestBet.includes('kg var')) return 2.5;
                      return 2;
                    })()}
                  />
                </div>
              </div>
            )}

            {/* EXPERT TIP */}
            {aiAnalysis.expertTip && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1">
                      Uzman Görüşü
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </h3>
                    <p className="text-sm text-amber-700 leading-relaxed">{aiAnalysis.expertTip}</p>
                  </div>
                </div>
              </div>
            )}

            {/* MATCH ANALYSIS - Collapsible */}
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              <button 
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Detaylı Analiz</span>
                </div>
                {showAnalysis ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${showAnalysis ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{aiAnalysis.analysis}</p>
                </div>
              </div>
            </div>

            {/* AVOID BETS */}
            {aiAnalysis.avoidBets && aiAnalysis.avoidBets.length > 0 && (
              <div className="rounded-2xl bg-white shadow-lg border border-red-100 overflow-hidden">
                <button 
                  onClick={() => setShowAvoidBets(!showAvoidBets)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Uzak Durulması Gerekenler</span>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{aiAnalysis.avoidBets.length}</span>
                  </div>
                  {showAvoidBets ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${showAvoidBets ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-4 space-y-2">
                    {aiAnalysis.avoidBets.map((bet, i) => {
                      const betText = typeof bet === 'string' ? bet : (bet as any).bet || (bet as any).reason || JSON.stringify(bet);
                      return (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-red-50">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-red-700">{betText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-white shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Info className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">AI analizi henüz yüklenmedi</p>
            <Button 
              onClick={loadAIAnalysis} 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/20 rounded-xl px-6"
            >
              Analizi Yükle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
