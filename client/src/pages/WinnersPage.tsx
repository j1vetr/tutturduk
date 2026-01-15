import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
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

  const getRiskIcon = (riskLevel: string) => {
    if (riskLevel === 'düşük') return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
    if (riskLevel === 'orta') return <Target className="w-3.5 h-3.5 text-amber-400" />;
    return <Flame className="w-3.5 h-3.5 text-red-400" />;
  };

  const getRiskColor = (riskLevel: string) => {
    if (riskLevel === 'düşük') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (riskLevel === 'orta') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-zinc-950" />
          <div className="absolute inset-0 opacity-50">
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          </div>
          <div className="relative px-5 py-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Kazananlar</h1>
                <p className="text-xs text-zinc-400">Tutturulan tahminler ve istatistikler</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              <span className="text-sm text-zinc-500">Yükleniyor...</span>
            </div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/20 p-4">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">Başarı Oranı</span>
                  </div>
                  <p className="text-3xl font-black text-emerald-400">%{data.stats.winRate}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{data.stats.totalWon}/{data.stats.totalEvaluated} tahmin</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-500/20 p-4">
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide">Kazanan Tahmin</span>
                  </div>
                  <p className="text-3xl font-black text-yellow-400">{data.stats.totalWon}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">toplam kazanan</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/20 p-4">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Kazanan Kupon</span>
                  </div>
                  <p className="text-3xl font-black text-blue-400">{data.stats.couponsWon}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{data.stats.couponsEvaluated} kupon değerlendirildi</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/20 p-4">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">Kaybeden</span>
                  </div>
                  <p className="text-3xl font-black text-red-400">{data.stats.totalLost}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">kayıp tahmin</p>
                </div>
              </div>
            </div>

            {data.wonCoupons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Kazanan Kuponlar</h3>
                </div>
                
                <div className="space-y-2">
                  {data.wonCoupons.map(coupon => (
                    <div 
                      key={coupon.id}
                      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/30 to-emerald-800/10 border border-emerald-500/20 p-4 cursor-pointer hover:border-emerald-500/40 transition-colors"
                      onClick={() => setLocation(`/coupon/${coupon.id}`)}
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{coupon.name}</h4>
                            <p className="text-[10px] text-zinc-500">
                              {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} • {coupon.match_count} maç
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500 text-black font-bold">{Number(coupon.combined_odds).toFixed(2)}x</Badge>
                          <ChevronRight className="w-5 h-5 text-zinc-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.wonBestBets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tutturulan Tahminler</h3>
                </div>
                
                <div className="space-y-2">
                  {data.wonBestBets.map(bet => (
                    <div 
                      key={bet.id}
                      className="relative overflow-hidden rounded-xl bg-zinc-900/80 border border-white/5 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {bet.home_logo && <img src={bet.home_logo} className="w-4 h-4" alt="" />}
                              <span className="text-sm text-white font-medium truncate">{bet.home_team}</span>
                              <span className="text-zinc-600">vs</span>
                              <span className="text-sm text-white font-medium truncate">{bet.away_team}</span>
                              {bet.away_logo && <img src={bet.away_logo} className="w-4 h-4" alt="" />}
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{bet.league_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getRiskColor(bet.risk_level)}`}>
                            {getRiskIcon(bet.risk_level)}
                            <span className="text-[10px] font-medium">{bet.bet_type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.finishedMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Target className="w-5 h-5 text-zinc-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Biten Maçlar</h3>
                </div>
                
                <div className="space-y-3">
                  {data.finishedMatches.slice(0, 15).map(match => {
                    const totalGoals = match.final_score_home + match.final_score_away;
                    const hasPredictions = match.predictions && match.predictions.length > 0;
                    
                    return (
                      <div 
                        key={match.id}
                        className="relative overflow-hidden rounded-xl bg-zinc-900/80 border border-white/5"
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              {match.home_logo && <img src={match.home_logo} className="w-6 h-6" alt="" />}
                              <span className="text-sm text-white font-medium">{match.home_team}</span>
                            </div>
                            <div className="px-4 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 mx-2">
                              <span className="text-xl font-black text-white">
                                {match.final_score_home} - {match.final_score_away}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm text-white font-medium">{match.away_team}</span>
                              {match.away_logo && <img src={match.away_logo} className="w-6 h-6" alt="" />}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-zinc-500">{match.league_name}</p>
                            <p className="text-[10px] text-zinc-600">Toplam: {totalGoals} gol</p>
                          </div>
                        </div>
                        
                        {hasPredictions && (
                          <div className="border-t border-white/5 bg-black/20 px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {match.predictions!.map((pred, idx) => {
                                const isWon = pred.result === 'won';
                                const isLost = pred.result === 'lost';
                                
                                return (
                                  <div 
                                    key={idx}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                                      isWon 
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                                        : isLost 
                                          ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                          : 'bg-zinc-700/50 border-zinc-600 text-zinc-300'
                                    }`}
                                  >
                                    {isWon && <CheckCircle className="w-3 h-3" />}
                                    {isLost && <XCircle className="w-3 h-3" />}
                                    {getRiskIcon(pred.risk_level)}
                                    <span>{pred.bet_type}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.wonBestBets.length === 0 && data.wonCoupons.length === 0 && data.finishedMatches.length === 0 && (
              <div className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-white/5 p-8 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-sm text-zinc-500">Henüz tamamlanan tahmin veya maç yok.</p>
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
