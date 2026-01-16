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
        
        {/* Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Kazananlar</h1>
            <p className="text-xs text-gray-500">Tutturulan tahminler</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <p className="text-xl font-bold text-emerald-600">%{data.stats.winRate}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Başarı</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <p className="text-xl font-bold text-gray-800">{data.stats.totalWon}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Kazanan</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <p className="text-xl font-bold text-gray-800">{data.stats.totalLost}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Kaybeden</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <p className="text-xl font-bold text-amber-600">{data.stats.couponsWon}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Kupon</p>
              </div>
            </div>

            {/* Won Coupons */}
            {data.wonCoupons.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">Kazanan Kuponlar</h3>
                {data.wonCoupons.map(coupon => (
                  <div 
                    key={coupon.id}
                    className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow shadow-sm"
                    onClick={() => setLocation(`/coupon/${coupon.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{coupon.name}</h4>
                        <p className="text-[10px] text-gray-400">
                          {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {coupon.match_count} maç
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{Number(coupon.combined_odds).toFixed(2)}x</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Finished Matches with Results */}
            {data.finishedMatches.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">Biten Maçlar</h3>
                
                {data.finishedMatches.slice(0, 20).map(match => {
                  const mainPred = getMainPrediction(match.predictions);
                  const otherPreds = getOtherPredictions(match.predictions);
                  const mainWon = mainPred?.result === 'won';
                  const mainLost = mainPred?.result === 'lost';
                  const otherWonPreds = otherPreds.filter(p => p.result === 'won');
                  
                  return (
                    <div 
                      key={match.id}
                      className={`bg-white rounded-xl border overflow-hidden shadow-sm ${
                        mainWon ? 'border-l-4 border-l-emerald-500 border-gray-200' : 
                        mainLost ? 'border-l-4 border-l-red-400 border-gray-200' : 
                        'border-gray-200'
                      }`}
                    >
                      {/* Match Info */}
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-gray-400">{match.league_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {match.home_logo && <img src={match.home_logo} className="w-6 h-6 object-contain" alt="" />}
                            <span className="text-sm text-gray-700 font-medium truncate">{match.home_team}</span>
                          </div>
                          
                          <div className="px-3 py-1 rounded bg-gray-100 mx-2">
                            <span className="text-lg font-bold text-gray-800">
                              {match.final_score_home} - {match.final_score_away}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-sm text-gray-700 font-medium truncate">{match.away_team}</span>
                            {match.away_logo && <img src={match.away_logo} className="w-6 h-6 object-contain" alt="" />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Main Prediction */}
                      {mainPred && (
                        <div className={`px-3 py-3 border-t ${
                          mainWon ? 'bg-emerald-50 border-emerald-100' : mainLost ? 'bg-red-50 border-red-100' : 'border-gray-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {mainWon ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              ) : mainLost ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <Target className="w-5 h-5 text-gray-400" />
                              )}
                              <div>
                                <span className={`text-sm font-bold ${mainWon ? 'text-emerald-700' : mainLost ? 'text-red-600' : 'text-gray-600'}`}>
                                  {mainPred.bet_type}
                                </span>
                                <span className="text-[10px] text-gray-400 ml-2">Ana Tahmin</span>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              mainWon ? 'bg-emerald-500 text-white' : 
                              mainLost ? 'bg-red-500 text-white' : 
                              'bg-gray-200 text-gray-500'
                            }`}>
                              {mainWon ? 'TUTTU' : mainLost ? 'TUTMADI' : 'BEKLENİYOR'}
                            </span>
                          </div>
                          
                          {/* Other predictions that won */}
                          {otherWonPreds.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex flex-wrap gap-1.5">
                                {otherWonPreds.map((pred, idx) => (
                                  <span 
                                    key={idx}
                                    className="text-[10px] px-2 py-1 rounded bg-white border border-emerald-200 text-emerald-600 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-2.5 h-2.5" />
                                    {pred.bet_type}
                                    <span className="text-gray-400">
                                      ({pred.risk_level === 'orta' ? 'Orta' : 'Riskli'})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show lost other predictions only if main won */}
                          {mainWon && otherPreds.filter(p => p.result === 'lost').length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {otherPreds.filter(p => p.result === 'lost').map((pred, idx) => (
                                <span 
                                  key={idx}
                                  className="text-[10px] px-2 py-1 rounded bg-white border border-red-200 text-red-400 flex items-center gap-1"
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
                        <div className="px-3 py-2 border-t border-gray-100">
                          <span className="text-[10px] text-gray-400">Tahmin bulunamadı</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {data.finishedMatches.length === 0 && data.wonCoupons.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">Henüz tamamlanan maç yok.</p>
                <p className="text-[10px] text-gray-400 mt-1">Maçlar bittikten sonra sonuçlar burada görünecek.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Veri yüklenemedi</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
