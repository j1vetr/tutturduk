import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Target, CheckCircle, XCircle, Clock, Loader2, ChevronRight, Calendar, Flame, BarChart3, Shield, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { format, subDays, isToday, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  id: number;
  bet_type: string;
  risk_level: string;
  result: string;
  confidence: number;
  reasoning?: string;
}

interface Match {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date?: string;
  match_time?: string;
  status: string;
  final_score_home?: number;
  final_score_away?: number;
  predictions?: Prediction[];
}

interface WonCoupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  match_count: number;
}

interface DailyStats {
  won: number;
  lost: number;
  pending: number;
  total: number;
  winRate: number;
}

interface OverallStats {
  totalWon: number;
  totalLost: number;
  totalEvaluated: number;
  winRate: number;
}

interface AvailableDate {
  match_date: string;
  match_count: number;
}

interface WinnersData {
  matches: Match[];
  availableDates: AvailableDate[];
  dailyStats: DailyStats;
  overallStats: OverallStats;
  wonCoupons: WonCoupon[];
}

type FilterType = 'all' | 'won' | 'lost';

export default function WinnersPage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<WinnersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const updatePredictionResult = async (predId: number, result: 'won' | 'lost' | 'pending') => {
    try {
      const res = await fetch(`/api/admin/best-bets/${predId}/result`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ result })
      });
      if (res.ok) {
        toast({ 
          title: 'Güncellendi', 
          description: `Tahmin ${result === 'won' ? 'kazandı' : result === 'lost' ? 'kaybetti' : 'bekliyor'} olarak işaretlendi`,
          className: result === 'won' ? 'bg-emerald-500 text-white border-none' : result === 'lost' ? 'bg-red-500 text-white border-none' : ''
        });
        loadData();
      } else {
        toast({ variant: 'destructive', description: 'Güncelleme başarısız' });
      }
    } catch (e) {
      toast({ variant: 'destructive', description: 'Hata oluştu' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const url = selectedDate 
        ? `/api/winners?date=${selectedDate}` 
        : '/api/winners';
      const res = await fetch(url);
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

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Bugün";
    if (isYesterday(date)) return "Dün";
    return format(date, "d MMM", { locale: tr });
  };

  const getRecentDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(new Date(), i);
      dates.push(format(date, 'yyyy-MM-dd'));
    }
    return dates;
  };

  const getMainBet = (predictions: Prediction[] | undefined) => {
    if (!predictions || predictions.length === 0) return null;
    return predictions.find(p => p.risk_level === 'düşük') || predictions[0];
  };

  const getOtherBets = (predictions: Prediction[] | undefined) => {
    if (!predictions || predictions.length === 0) return [];
    return predictions.filter(p => p.risk_level !== 'düşük');
  };

  const getMatchResult = (match: Match): 'won' | 'lost' | 'pending' => {
    const mainBet = getMainBet(match.predictions);
    if (!mainBet) return 'pending';
    return mainBet.result as 'won' | 'lost' | 'pending';
  };

  const filteredMatches = data?.matches.filter(match => {
    if (filter === 'all') return true;
    const result = getMatchResult(match);
    return result === filter;
  }) || [];

  const displayDates = data?.availableDates?.length 
    ? data.availableDates.map(d => d.match_date)
    : getRecentDates();

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-4 pb-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Tuttu / Tutmadı</h1>
              <p className="text-xs text-gray-500">Ana tahmin sonuçları</p>
            </div>
          </div>
          {data && (
            <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl px-3 py-2">
              <p className="text-xl font-black text-emerald-600">%{data.overallStats.winRate}</p>
              <p className="text-[9px] text-emerald-700 font-medium">Başarı Oranı</p>
            </div>
          )}
        </div>

        {/* Date Picker */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedDate(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedDate === null
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Tümü
            </button>
            {displayDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedDate === date
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {formatDateLabel(date)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black text-emerald-600">{data.overallStats.totalWon}</p>
                <p className="text-[9px] text-emerald-700 font-medium">Tuttu</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-xl font-black text-red-500">{data.overallStats.totalLost}</p>
                <p className="text-[9px] text-red-600 font-medium">Tutmadı</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-1">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-xl font-black text-gray-700">{data.overallStats.totalEvaluated}</p>
                <p className="text-[9px] text-gray-500 font-medium">Toplam</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilter('won')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  filter === 'won' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Tutanlar
              </button>
              <button
                onClick={() => setFilter('lost')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  filter === 'lost' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Tutmayanlar
              </button>
            </div>

            {/* Won Coupons */}
            {data.wonCoupons.length > 0 && filter === 'all' && !selectedDate && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                  Kazanan Kuponlar
                </h3>
                {data.wonCoupons.map(coupon => (
                  <div 
                    key={coupon.id}
                    className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/coupon/${coupon.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{coupon.name}</h4>
                        <p className="text-[10px] text-gray-500">
                          {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {coupon.match_count} maç
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-emerald-600">{Number(coupon.combined_odds).toFixed(2)}x</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Matches with Main Bet Focus */}
            {filteredMatches.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                  Ana Tahmin Sonuçları {selectedDate ? `(${formatDateLabel(selectedDate)})` : ''}
                </h3>
                
                {filteredMatches.map(match => {
                  const mainBet = getMainBet(match.predictions);
                  const otherBets = getOtherBets(match.predictions);
                  const matchResult = getMatchResult(match);
                  
                  return (
                    <div 
                      key={match.id}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md ${
                        matchResult === 'won' ? 'border-emerald-200' :
                        matchResult === 'lost' ? 'border-red-200' :
                        'border-gray-200'
                      }`}
                    >
                      {/* Result Badge Top */}
                      <div className={`px-4 py-2 flex items-center justify-between ${
                        matchResult === 'won' ? 'bg-gradient-to-r from-emerald-50 to-green-50' :
                        matchResult === 'lost' ? 'bg-gradient-to-r from-red-50 to-rose-50' :
                        'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {matchResult === 'won' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : matchResult === 'lost' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                          <span className={`text-sm font-bold ${
                            matchResult === 'won' ? 'text-emerald-700' :
                            matchResult === 'lost' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {matchResult === 'won' ? 'TUTTU!' : matchResult === 'lost' ? 'TUTMADI' : 'Bekliyor'}
                          </span>
                        </div>
                        {match.status === 'finished' && match.final_score_home !== undefined && (
                          <Badge className="bg-gray-800 text-white border-0 text-sm font-bold px-3">
                            {match.final_score_home} - {match.final_score_away}
                          </Badge>
                        )}
                      </div>

                      {/* Match Info */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => setLocation(`/match/${match.fixture_id}`)}
                      >
                        <div className="text-[10px] text-gray-400 mb-2">{match.league_name}</div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            {match.home_logo && (
                              <img src={match.home_logo} alt="" className="w-7 h-7 object-contain" />
                            )}
                            <span className="text-sm font-semibold text-gray-800 truncate">{match.home_team}</span>
                          </div>
                          <span className="text-xs text-gray-400 px-3">vs</span>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-sm font-semibold text-gray-800 truncate">{match.away_team}</span>
                            {match.away_logo && (
                              <img src={match.away_logo} alt="" className="w-7 h-7 object-contain" />
                            )}
                          </div>
                        </div>

                        {/* Main Bet - Ana Tahmin */}
                        {mainBet && (
                          <div className={`rounded-xl p-3 mb-2 ${
                            mainBet.result === 'won' ? 'bg-emerald-50 border border-emerald-200' :
                            mainBet.result === 'lost' ? 'bg-red-50 border border-red-200' :
                            'bg-gray-50 border border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  mainBet.result === 'won' ? 'bg-emerald-100' :
                                  mainBet.result === 'lost' ? 'bg-red-100' :
                                  'bg-gray-100'
                                }`}>
                                  <Shield className={`w-4 h-4 ${
                                    mainBet.result === 'won' ? 'text-emerald-600' :
                                    mainBet.result === 'lost' ? 'text-red-500' :
                                    'text-gray-500'
                                  }`} />
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-gray-500 uppercase">Ana Tahmin</span>
                                  <p className="text-sm font-bold text-gray-800">{mainBet.bet_type}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {mainBet.result === 'won' ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">Tuttu</Badge>
                                ) : mainBet.result === 'lost' ? (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs font-bold">Tutmadı</Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Bekliyor</Badge>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                                <Button
                                  size="sm"
                                  variant={mainBet.result === 'won' ? 'default' : 'outline'}
                                  className={`flex-1 h-7 text-xs ${mainBet.result === 'won' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); updatePredictionResult(mainBet.id, 'won'); }}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />Kazandı
                                </Button>
                                <Button
                                  size="sm"
                                  variant={mainBet.result === 'lost' ? 'default' : 'outline'}
                                  className={`flex-1 h-7 text-xs ${mainBet.result === 'lost' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); updatePredictionResult(mainBet.id, 'lost'); }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />Kaybetti
                                </Button>
                                <Button
                                  size="sm"
                                  variant={mainBet.result === 'pending' ? 'default' : 'outline'}
                                  className={`flex-1 h-7 text-xs ${mainBet.result === 'pending' ? 'bg-gray-500 hover:bg-gray-600' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); updatePredictionResult(mainBet.id, 'pending'); }}
                                >
                                  <Clock className="w-3 h-3 mr-1" />Bekliyor
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Other Bets - Diğer Tahminler */}
                        {otherBets.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-semibold text-gray-400 uppercase">Diğer Tahminler</span>
                            <div className="grid grid-cols-1 gap-2">
                              {otherBets.map((pred, idx) => (
                                <div 
                                  key={pred.id || idx}
                                  className={`p-2 rounded-lg text-xs ${
                                    pred.result === 'won' ? 'bg-emerald-50 border border-emerald-100' :
                                    pred.result === 'lost' ? 'bg-red-50 border border-red-100' :
                                    'bg-gray-50 border border-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {pred.result === 'won' ? (
                                        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                      ) : pred.result === 'lost' ? (
                                        <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                      ) : (
                                        <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                      )}
                                      <span className="font-medium text-gray-700 truncate">{pred.bet_type}</span>
                                    </div>
                                  </div>
                                  {isAdmin && (
                                    <div className="flex gap-1 mt-2">
                                      <Button
                                        size="sm"
                                        variant={pred.result === 'won' ? 'default' : 'outline'}
                                        className={`flex-1 h-6 text-[10px] ${pred.result === 'won' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); updatePredictionResult(pred.id, 'won'); }}
                                      >
                                        Kazandı
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={pred.result === 'lost' ? 'default' : 'outline'}
                                        className={`flex-1 h-6 text-[10px] ${pred.result === 'lost' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); updatePredictionResult(pred.id, 'lost'); }}
                                      >
                                        Kaybetti
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={pred.result === 'pending' ? 'default' : 'outline'}
                                        className={`flex-1 h-6 text-[10px] ${pred.result === 'pending' ? 'bg-gray-500 hover:bg-gray-600' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); updatePredictionResult(pred.id, 'pending'); }}
                                      >
                                        Bekliyor
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm">
                  {selectedDate 
                    ? `${formatDateLabel(selectedDate)} tarihinde sonuç bulunamadı`
                    : 'Henüz sonuçlanmış tahmin yok'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Veri yüklenemedi</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
