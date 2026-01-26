import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, Target, Flame, AlertTriangle, Lightbulb, TrendingUp, ChevronDown, ChevronUp, CheckCircle, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PredictionItem {
  bet_type: string;
  confidence: number;
  bet_category: string;
  reasoning?: string;
  odds?: number;
}

interface AIAnalysis {
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
  predictions?: PredictionItem[];
}

type LiveScore = {
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  status: string;
  statusShort: string;
};

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAvoidBets, setShowAvoidBets] = useState(false);

  useEffect(() => {
    if (id) loadMatch();
  }, [id]);

  useEffect(() => {
    if (!match) return;

    const fetchLiveScore = async () => {
      try {
        const res = await fetch('/api/matches/live-scores');
        if (res.ok) {
          const data = await res.json();
          if (data.scores && data.scores[match.fixture_id]) {
            setLiveScore(data.scores[match.fixture_id]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch live score:', error);
      }
    };

    fetchLiveScore();
    const interval = setInterval(fetchLiveScore, 180000);
    return () => clearInterval(interval);
  }, [match]);

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

  const predictions = match?.predictions || [];
  const primaryBet = predictions.find(p => p.bet_category === 'primary');
  const altBet = predictions.find(p => p.bet_category === 'alternative');

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Info className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-center">Mac bulunamadi</p>
          <Button variant="outline" onClick={() => setLocation('/predictions')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri don
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const isLive = liveScore && ['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(liveScore.statusShort);
  const isFinished = liveScore && ['FT', 'AET', 'PEN'].includes(liveScore.statusShort);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setLocation('/predictions')}
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            {match.league_logo && <img src={match.league_logo} className="w-5 h-5" alt="" />}
            <span className="text-sm font-medium text-slate-600">{match.league_name}</span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pb-32">
        {/* Match Card */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Date & Time */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">{match.match_time}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500">{formatDate(match.match_date)}</span>
          </div>

          {/* Teams */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-slate-50 border border-slate-100 p-2">
                  {match.home_logo ? (
                    <img src={match.home_logo} className="w-full h-full object-contain" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-slate-400">
                      {match.home_team.slice(0, 2)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{match.home_team}</h3>
                <span className="text-[11px] text-slate-400 font-medium">Ev sahibi</span>
              </div>
              
              {/* Score / VS */}
              <div className="px-4 flex flex-col items-center gap-2">
                {isLive ? (
                  <>
                    <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-800">{liveScore?.homeGoals ?? 0}</span>
                        <span className="text-slate-400">-</span>
                        <span className="text-2xl font-bold text-slate-800">{liveScore?.awayGoals ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-semibold text-red-600">
                        {liveScore?.statusShort === 'HT' ? 'Devre arasi' : `${liveScore?.elapsed}'`}
                      </span>
                    </div>
                  </>
                ) : isFinished ? (
                  <>
                    <div className="px-4 py-2 rounded-xl bg-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-800">{liveScore?.homeGoals ?? 0}</span>
                        <span className="text-slate-400">-</span>
                        <span className="text-2xl font-bold text-slate-800">{liveScore?.awayGoals ?? 0}</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Mac sonu</span>
                  </>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">VS</span>
                  </div>
                )}
              </div>
              
              {/* Away Team */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-slate-50 border border-slate-100 p-2">
                  {match.away_logo ? (
                    <img src={match.away_logo} className="w-full h-full object-contain" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-slate-400">
                      {match.away_team.slice(0, 2)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{match.away_team}</h3>
                <span className="text-[11px] text-slate-400 font-medium">Deplasman</span>
              </div>
            </div>
          </div>
        </div>

        {/* Predictions Card */}
        {(primaryBet || altBet) && (
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Tahminler</h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {/* Primary Bet */}
              {primaryBet && (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Ana tahmin</span>
                        <span className="text-sm font-bold text-slate-800">{primaryBet.confidence}%</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{primaryBet.bet_type}</h3>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${primaryBet.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alternative Bet */}
              {altBet && (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Alternatif</span>
                        <span className="text-sm font-bold text-slate-800">{altBet.confidence}%</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{altBet.bet_type}</h3>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${altBet.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading AI */}
        {loadingAI && (
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Analiz yukleniyor...</p>
            </div>
          </div>
        )}

        {/* AI Analysis Content */}
        {aiAnalysis && (
          <div className="mt-4 space-y-4">
            {/* Expert Tip */}
            {aiAnalysis.expertTip && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Uzman gorusu</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{aiAnalysis.expertTip}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Analysis - Collapsible */}
            {aiAnalysis.analysis && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-slate-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Detayli analiz</span>
                  </div>
                  {showAnalysis ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                
                {showAnalysis && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    <p className="text-sm text-slate-600 leading-relaxed">{aiAnalysis.analysis}</p>
                    {aiAnalysis.expectedGoalRange && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100">
                        <span className="text-xs text-slate-500">Beklenen gol araligi:</span>
                        <span className="text-sm font-bold text-slate-700">{aiAnalysis.expectedGoalRange}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Avoid Bets - Collapsible */}
            {aiAnalysis.avoidBets && aiAnalysis.avoidBets.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => setShowAvoidBets(!showAvoidBets)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Uzak durun</span>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      {aiAnalysis.avoidBets.length}
                    </span>
                  </div>
                  {showAvoidBets ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                
                {showAvoidBets && (
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
                )}
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {!loadingAI && !aiAnalysis && !primaryBet && !altBet && (
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Info className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4">Analiz henuz yuklenemedi</p>
            <Button 
              onClick={loadAIAnalysis} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-6"
            >
              Analizi yukle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
