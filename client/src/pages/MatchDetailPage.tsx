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
          reasoning: pred.reasoning || '',
          consistentScores: pred.consistentScores || []
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
              <div className="relative rounded-3xl bg-white shadow-xl shadow-emerald-500/10 border border-emerald-100 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
                
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ana Tahmin</span>
                        <p className="text-[11px] text-gray-400">En güvenilir seçim</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-gray-900">{aiAnalysis.predictions[0].odds}</span>
                      <p className="text-[10px] text-gray-400">ORAN</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-4">
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{aiAnalysis.predictions[0].bet}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getBetComment('expected', aiAnalysis.predictions[0].bet, aiAnalysis.predictions[0].confidence).emoji}</span>
                      <p className="text-sm text-gray-600">{getBetComment('expected', aiAnalysis.predictions[0].bet, aiAnalysis.predictions[0].confidence).text}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed">{aiAnalysis.predictions[0].reasoning}</p>
                </div>
              </div>
            )}

            {/* RISK SEVEN - Medium Risk */}
            {aiAnalysis.predictions && aiAnalysis.predictions[1] && (
              <div className="relative rounded-2xl bg-white shadow-lg border border-amber-200 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Risk Seven</span>
                        <p className="text-[10px] text-gray-400">Orta risk, iyi getiri</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-gray-900">{aiAnalysis.predictions[1].odds}</span>
                      <p className="text-[9px] text-gray-400">ORAN</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 mb-3">
                    <h3 className="text-xl font-black text-gray-900">{aiAnalysis.predictions[1].bet}</h3>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{aiAnalysis.predictions[1].reasoning}</p>
                </div>
              </div>
            )}

            {/* RISKLI - High Risk */}
            {aiAnalysis.predictions && aiAnalysis.predictions[2] && (
              <div className="relative rounded-2xl bg-white shadow-lg border border-red-200 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                        <Flame className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Riskli</span>
                        <p className="text-[10px] text-gray-400">Yüksek oran, yüksek risk</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-gray-900">{aiAnalysis.predictions[2].odds}</span>
                      <p className="text-[9px] text-gray-400">ORAN</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-3 mb-3">
                    <h3 className="text-xl font-black text-gray-900">{aiAnalysis.predictions[2].bet}</h3>
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
                      const score = aiAnalysis.predictions[0]?.consistentScores?.[0] || '1-1';
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

            {/* TURKISH ODDS - İDDAA ORANLARI */}
            {turkishOdds?.found && turkishOdds.odds && (
              <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => setShowOdds(!showOdds)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-gray-800">Oranlar</span>
                      <p className="text-[10px] text-gray-400">Güncel bahis oranları</p>
                    </div>
                  </div>
                  {showOdds ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${showOdds ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-4 space-y-4">
                    {/* Maç Sonucu */}
                    {turkishOdds.odds.msOdds && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Maç Sonucu (MS)</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                            <span className="text-[10px] text-emerald-600 font-medium">1</span>
                            <p className="text-lg font-black text-emerald-700">{turkishOdds.odds.msOdds.home?.toFixed(2) || '-'}</p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                            <span className="text-[10px] text-gray-500 font-medium">X</span>
                            <p className="text-lg font-black text-gray-700">{turkishOdds.odds.msOdds.draw?.toFixed(2) || '-'}</p>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                            <span className="text-[10px] text-blue-600 font-medium">2</span>
                            <p className="text-lg font-black text-blue-700">{turkishOdds.odds.msOdds.away?.toFixed(2) || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Alt/Üst */}
                    {turkishOdds.odds.overUnder && (turkishOdds.odds.overUnder.over25 || turkishOdds.odds.overUnder.under25) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Alt / Üst</p>
                        <div className="grid grid-cols-2 gap-2">
                          {turkishOdds.odds.overUnder.under25 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                              <span className="text-[10px] text-orange-600 font-medium">2.5 Alt</span>
                              <p className="text-lg font-black text-orange-700">{turkishOdds.odds.overUnder.under25.toFixed(2)}</p>
                            </div>
                          )}
                          {turkishOdds.odds.overUnder.over25 && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                              <span className="text-[10px] text-purple-600 font-medium">2.5 Üst</span>
                              <p className="text-lg font-black text-purple-700">{turkishOdds.odds.overUnder.over25.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* KG Var/Yok */}
                    {turkishOdds.odds.btts && (turkishOdds.odds.btts.yes || turkishOdds.odds.btts.no) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Karşılıklı Gol</p>
                        <div className="grid grid-cols-2 gap-2">
                          {turkishOdds.odds.btts.yes && (
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                              <span className="text-[10px] text-teal-600 font-medium">KG Var</span>
                              <p className="text-lg font-black text-teal-700">{turkishOdds.odds.btts.yes.toFixed(2)}</p>
                            </div>
                          )}
                          {turkishOdds.odds.btts.no && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                              <span className="text-[10px] text-rose-600 font-medium">KG Yok</span>
                              <p className="text-lg font-black text-rose-700">{turkishOdds.odds.btts.no.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Çifte Şans */}
                    {turkishOdds.odds.doubleChance && (turkishOdds.odds.doubleChance.homeOrDraw || turkishOdds.odds.doubleChance.awayOrDraw) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Çifte Şans</p>
                        <div className="grid grid-cols-3 gap-2">
                          {turkishOdds.odds.doubleChance.homeOrDraw && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 text-center">
                              <span className="text-[9px] text-indigo-600 font-medium">1-X</span>
                              <p className="text-sm font-bold text-indigo-700">{turkishOdds.odds.doubleChance.homeOrDraw.toFixed(2)}</p>
                            </div>
                          )}
                          {turkishOdds.odds.doubleChance.homeOrAway && (
                            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-2 text-center">
                              <span className="text-[9px] text-cyan-600 font-medium">1-2</span>
                              <p className="text-sm font-bold text-cyan-700">{turkishOdds.odds.doubleChance.homeOrAway.toFixed(2)}</p>
                            </div>
                          )}
                          {turkishOdds.odds.doubleChance.awayOrDraw && (
                            <div className="bg-sky-50 border border-sky-200 rounded-xl p-2 text-center">
                              <span className="text-[9px] text-sky-600 font-medium">X-2</span>
                              <p className="text-sm font-bold text-sky-700">{turkishOdds.odds.doubleChance.awayOrDraw.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                  {aiAnalysis.expectedGoalRange && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                      <span className="text-xs text-blue-600 font-medium">Beklenen gol aralığı:</span>
                      <span className="text-sm font-bold text-blue-700">{aiAnalysis.expectedGoalRange}</span>
                    </div>
                  )}
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
                    {aiAnalysis.avoidBets.map((bet, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-red-50">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-700">{bet}</span>
                      </div>
                    ))}
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
