import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, CheckCircle, XCircle, Loader2, ChevronRight, Flame, Shield, Award, Zap } from "lucide-react";
import { useLocation } from "wouter";

interface BestBet {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_date?: string;
  match_time?: string;
  bet_type: string;
  confidence: number;
  risk_level: string;
  result: string;
}

interface WonCoupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  match_count: number;
}

interface MatchPrediction {
  id: number;
  bet_type: string;
  risk_level: string;
  result: string;
  confidence: number;
}

interface FinishedMatch {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_date?: string;
  match_time?: string;
  final_score_home: number;
  final_score_away: number;
  predictions?: MatchPrediction[];
}

interface WinnersData {
  finishedMatches: FinishedMatch[];
  wonBestBets: BestBet[];
  wonCoupons: WonCoupon[];
  stats: {
    totalEvaluated: number;
    totalWon: number;
    totalLost: number;
    winRate: number;
    couponsEvaluated: number;
    couponsWon: number;
  };
}

export default function WinnersPage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<WinnersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/winners');
      if (res.ok) {
        const winnersData = await res.json();
        setData(winnersData);
      }
    } catch (error) {
      console.error('Failed to load winners data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMainPrediction = (predictions?: MatchPrediction[]) => {
    if (!predictions || predictions.length === 0) return null;
    return predictions.find(p => p.risk_level === 'düşük') || predictions[0];
  };

  const getOtherPredictions = (predictions?: MatchPrediction[]) => {
    if (!predictions || predictions.length === 0) return [];
    return predictions.filter(p => p.risk_level !== 'düşük');
  };

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-5 pb-6">
        
        {/* Header - Minimal */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Kazananlar</h1>
            <p className="text-xs text-zinc-500">Tutturulan tahminler</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : data ? (
          <>
            {/* Stats - Minimal Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 text-center">
                <p className="text-xl font-bold text-white">%{data.stats.winRate}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Başarı</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 text-center">
                <p className="text-xl font-bold text-white">{data.stats.totalWon}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Kazanan</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 text-center">
                <p className="text-xl font-bold text-white">{data.stats.totalLost}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Kaybeden</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 text-center">
                <p className="text-xl font-bold text-white">{data.stats.couponsWon}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Kupon</p>
              </div>
            </div>

            {/* Won Coupons */}
            {data.wonCoupons.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wide px-1">Kazanan Kuponlar</h3>
                {data.wonCoupons.map(coupon => (
                  <div 
                    key={coupon.id}
                    className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setLocation(`/coupon/${coupon.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{coupon.name}</h4>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {coupon.match_count} maç
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{Number(coupon.combined_odds).toFixed(2)}x</span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Finished Matches with Results */}
            {data.finishedMatches.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wide px-1">Biten Maçlar</h3>
                
                {data.finishedMatches.slice(0, 20).map(match => {
                  const mainPred = getMainPrediction(match.predictions);
                  const otherPreds = getOtherPredictions(match.predictions);
                  const mainWon = mainPred?.result === 'won';
                  const mainLost = mainPred?.result === 'lost';
                  const otherWonPreds = otherPreds.filter(p => p.result === 'won');
                  
                  return (
                    <div 
                      key={match.id}
                      className={`bg-zinc-900 rounded-xl border overflow-hidden ${
                        mainWon ? 'border-l-4 border-l-white border-zinc-800' : 
                        mainLost ? 'border-l-4 border-l-zinc-600 border-zinc-800' : 
                        'border-zinc-800'
                      }`}
                    >
                      {/* Match Info */}
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-zinc-600">{match.league_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {match.home_logo && <img src={match.home_logo} className="w-6 h-6 object-contain" alt="" />}
                            <span className="text-sm text-white font-medium truncate">{match.home_team}</span>
                          </div>
                          
                          <div className="px-3 py-1 rounded bg-zinc-800 mx-2">
                            <span className="text-lg font-bold text-white">
                              {match.final_score_home} - {match.final_score_away}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-sm text-white font-medium truncate">{match.away_team}</span>
                            {match.away_logo && <img src={match.away_logo} className="w-6 h-6 object-contain" alt="" />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Main Prediction - Primary Focus */}
                      {mainPred && (
                        <div className={`px-3 py-3 border-t border-zinc-800 ${
                          mainWon ? 'bg-zinc-800/50' : mainLost ? 'bg-zinc-900' : ''
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {mainWon ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : mainLost ? (
                                <XCircle className="w-5 h-5 text-zinc-500" />
                              ) : (
                                <Target className="w-5 h-5 text-zinc-600" />
                              )}
                              <div>
                                <span className={`text-sm font-bold ${mainWon ? 'text-white' : 'text-zinc-400'}`}>
                                  {mainPred.bet_type}
                                </span>
                                <span className="text-[10px] text-zinc-600 ml-2">Ana Tahmin</span>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              mainWon ? 'bg-white text-black' : 
                              mainLost ? 'bg-zinc-700 text-zinc-400' : 
                              'bg-zinc-800 text-zinc-500'
                            }`}>
                              {mainWon ? 'TUTTU' : mainLost ? 'TUTMADI' : 'BEKLENİYOR'}
                            </span>
                          </div>
                          
                          {/* Other predictions that won */}
                          {otherWonPreds.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-zinc-700/50">
                              <div className="flex flex-wrap gap-1.5">
                                {otherWonPreds.map((pred, idx) => (
                                  <span 
                                    key={idx}
                                    className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-2.5 h-2.5" />
                                    {pred.bet_type}
                                    <span className="text-zinc-600">
                                      ({pred.risk_level === 'orta' ? 'Orta' : 'Riskli'})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show lost other predictions only if main won (for context) */}
                          {mainWon && otherPreds.filter(p => p.result === 'lost').length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {otherPreds.filter(p => p.result === 'lost').map((pred, idx) => (
                                <span 
                                  key={idx}
                                  className="text-[10px] px-2 py-1 rounded bg-zinc-900 text-zinc-600 flex items-center gap-1"
                                >
                                  <XCircle className="w-2.5 h-2.5" />
                                  {pred.bet_type}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* No predictions case */}
                      {!mainPred && (
                        <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900">
                          <span className="text-[10px] text-zinc-600">Tahmin bulunamadı</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {data.finishedMatches.length === 0 && data.wonCoupons.length === 0 && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                <p className="text-sm text-zinc-500">Henüz tamamlanan maç yok.</p>
                <p className="text-[10px] text-zinc-600 mt-1">Maçlar bittikten sonra sonuçlar burada görünecek.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-500">Veri yüklenemedi</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
