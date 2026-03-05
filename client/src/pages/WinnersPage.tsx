import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle, XCircle, Clock, Loader2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, BarChart3, Trash2, TrendingUp, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { format, subDays, addDays, isToday, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  id: number;
  bet_type: string;
  bet_category?: string;
  odds?: number;
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
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
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
      const url = `/api/winners?date=${selectedDate}`;
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
      dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
    }
    return dates;
  };

  const getMainBet = (predictions: Prediction[] | undefined) => {
    if (!predictions || predictions.length === 0) return null;
    return predictions.find(p => p.bet_category === 'primary') || predictions[0];
  };

  const getAlternativeBet = (predictions: Prediction[] | undefined) => {
    if (!predictions || predictions.length === 0) return null;
    return predictions.find(p => p.bet_category === 'alternative') || null;
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

  const clearHistory = async () => {
    if (!confirm('Tüm bitmiş maç geçmişini silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch('/api/admin/clear-history', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const result = await res.json();
        toast({ 
          title: 'Geçmiş Temizlendi', 
          description: result.message,
          className: 'bg-emerald-500 text-white border-none'
        });
        loadData();
      }
    } catch (e) {
      toast({ variant: 'destructive', description: 'Hata oluştu' });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = parseISO(selectedDate);
    const newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const wonCount = data?.dailyStats.won || 0;
  const lostCount = data?.dailyStats.lost || 0;
  const totalEval = wonCount + lostCount;
  const progressPercent = totalEval > 0 ? Math.round((wonCount / totalEval) * 100) : 0;

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-4 pb-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 data-testid="text-page-title" className="text-lg font-bold text-slate-800">Sonuçlar</h1>
              <p className="text-xs text-slate-500">Tahmin performansı</p>
            </div>
          </div>
          {isAdmin && (
            <button
              data-testid="button-clear-history"
              onClick={clearHistory}
              className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
              title="Geçmişi Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button 
            data-testid="button-prev-date"
            onClick={() => navigateDate('prev')}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5">
              {displayDates.map((date) => (
                <button
                  key={date}
                  data-testid={`button-date-${date}`}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedDate === date
                      ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {formatDateLabel(date)}
                </button>
              ))}
            </div>
          </div>
          <button 
            data-testid="button-next-date"
            onClick={() => navigateDate('next')}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : data ? (
          <>
            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Daily Performance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Günlük</p>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-3xl font-black text-slate-800">{data.dailyStats.winRate}</span>
                    <span className="text-lg font-bold text-slate-400">%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{data.dailyStats.total} maç</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${data.dailyStats.winRate}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-medium text-emerald-600">{data.dailyStats.won} tuttu</span>
                  <span className="text-[10px] font-medium text-red-500">{data.dailyStats.lost} tutmadı</span>
                </div>
              </div>

              {/* Overall Performance */}
              <div className="bg-slate-800 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Genel</p>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-3xl font-black text-white">{data.overallStats.winRate}</span>
                    <span className="text-lg font-bold text-slate-500">%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{data.overallStats.totalEvaluated} maç</p>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
                    style={{ width: `${data.overallStats.winRate}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-medium text-emerald-400">{data.overallStats.totalWon} tuttu</span>
                  <span className="text-[10px] font-medium text-red-400">{data.overallStats.totalLost} tutmadı</span>
                </div>
              </div>
            </div>

            {/* Quick Stat Badges */}
            {data.dailyStats.pending > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-amber-600">{data.dailyStats.pending}</span> maç sonuç bekliyor
                </span>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'all' as FilterType, label: 'Tümü', count: data.dailyStats.total },
                { key: 'won' as FilterType, label: 'Tutanlar', count: data.dailyStats.won, color: 'text-emerald-600' },
                { key: 'lost' as FilterType, label: 'Tutmayanlar', count: data.dailyStats.lost, color: 'text-red-500' },
              ].map(tab => (
                <button
                  key={tab.key}
                  data-testid={`button-filter-${tab.key}`}
                  onClick={() => setFilter(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    filter === tab.key 
                      ? `bg-white shadow-sm ${tab.color || 'text-slate-800'}` 
                      : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      filter === tab.key ? 'bg-slate-100' : 'bg-slate-200/50'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Won Coupons */}
            {data.wonCoupons.length > 0 && filter === 'all' && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Kazanan Kuponlar</h3>
                {data.wonCoupons.map(coupon => (
                  <div 
                    key={coupon.id}
                    data-testid={`card-coupon-${coupon.id}`}
                    className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-200/60 p-3.5 flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setLocation(`/coupon/${coupon.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{coupon.name}</h4>
                        <p className="text-[10px] text-slate-500">
                          {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {coupon.match_count} maç
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-emerald-600">{Number(coupon.combined_odds).toFixed(2)}x</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Match Results */}
            {filteredMatches.length > 0 ? (
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Tahmin Sonuçları
                </h3>
                
                {filteredMatches.map(match => {
                  const mainBet = getMainBet(match.predictions);
                  const altBet = getAlternativeBet(match.predictions);
                  const matchResult = getMatchResult(match);
                  const isExpanded = expandedMatch === match.id;
                  
                  return (
                    <div 
                      key={match.id}
                      data-testid={`card-match-${match.id}`}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                        matchResult === 'won' ? 'border-emerald-200' :
                        matchResult === 'lost' ? 'border-red-200' :
                        'border-slate-200'
                      }`}
                    >
                      {/* Match Header - Score & Teams */}
                      <div 
                        className="p-3.5 cursor-pointer"
                        onClick={() => setLocation(`/match/${match.fixture_id}`)}
                      >
                        {/* League */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            {match.league_logo && (
                              <img src={match.league_logo} alt="" className="w-3.5 h-3.5 object-contain" />
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">{match.league_name}</span>
                          </div>
                          {match.match_time && (
                            <span className="text-[10px] text-slate-400">{match.match_time}</span>
                          )}
                        </div>

                        {/* Teams & Score */}
                        <div className="flex items-center gap-3">
                          {/* Home */}
                          <div className="flex-1 flex items-center gap-2.5">
                            {match.home_logo && (
                              <img src={match.home_logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                            )}
                            <span className="text-sm font-bold text-slate-800 leading-tight">{match.home_team}</span>
                          </div>

                          {/* Score */}
                          {match.final_score_home !== undefined && match.final_score_home !== null ? (
                            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-base tabular-nums ${
                              matchResult === 'won' ? 'bg-emerald-500 text-white' :
                              matchResult === 'lost' ? 'bg-red-500 text-white' :
                              'bg-slate-800 text-white'
                            }`}>
                              <span>{match.final_score_home}</span>
                              <span className="text-white/50">-</span>
                              <span>{match.final_score_away}</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold">
                              vs
                            </div>
                          )}

                          {/* Away */}
                          <div className="flex-1 flex items-center gap-2.5 justify-end">
                            <span className="text-sm font-bold text-slate-800 leading-tight text-right">{match.away_team}</span>
                            {match.away_logo && (
                              <img src={match.away_logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Predictions Section */}
                      <div className="border-t border-slate-100">
                        {/* Primary Bet */}
                        {mainBet && (
                          <div 
                            className={`px-3.5 py-2.5 flex items-center justify-between ${
                              altBet ? 'cursor-pointer' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (altBet) setExpandedMatch(isExpanded ? null : match.id);
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                mainBet.result === 'won' ? 'bg-emerald-100' :
                                mainBet.result === 'lost' ? 'bg-red-100' :
                                'bg-slate-100'
                              }`}>
                                {mainBet.result === 'won' ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                ) : mainBet.result === 'lost' ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-slate-800">{mainBet.bet_type}</span>
                                  {mainBet.odds && (
                                    <span className="text-xs font-semibold text-slate-400">@{Number(mainBet.odds).toFixed(2)}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-emerald-600 font-semibold">Ana Tahmin</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {mainBet.result === 'won' ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold">TUTTU</span>
                              ) : mainBet.result === 'lost' ? (
                                <span className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold">TUTMADI</span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold">Bekliyor</span>
                              )}
                              {altBet && (
                                isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Admin Controls for Primary */}
                        {isAdmin && mainBet && (
                          <div className="px-3.5 pb-2 flex gap-1.5">
                            <button
                              data-testid={`button-won-${mainBet.id}`}
                              onClick={(e) => { e.stopPropagation(); updatePredictionResult(mainBet.id, 'won'); }}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                                mainBet.result === 'won' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                              }`}
                            >
                              Kazandı
                            </button>
                            <button
                              data-testid={`button-lost-${mainBet.id}`}
                              onClick={(e) => { e.stopPropagation(); updatePredictionResult(mainBet.id, 'lost'); }}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                                mainBet.result === 'lost' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600'
                              }`}
                            >
                              Kaybetti
                            </button>
                          </div>
                        )}

                        {/* Alternative Bet - Expandable */}
                        {altBet && isExpanded && (
                          <div className="border-t border-slate-100">
                            <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50/50">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  altBet.result === 'won' ? 'bg-blue-100' :
                                  altBet.result === 'lost' ? 'bg-orange-100' :
                                  'bg-slate-100'
                                }`}>
                                  {altBet.result === 'won' ? (
                                    <CheckCircle className="w-4 h-4 text-blue-500" />
                                  ) : altBet.result === 'lost' ? (
                                    <XCircle className="w-4 h-4 text-orange-500" />
                                  ) : (
                                    <Zap className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-slate-700">{altBet.bet_type}</span>
                                    {altBet.odds && (
                                      <span className="text-xs font-semibold text-slate-400">@{Number(altBet.odds).toFixed(2)}</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-blue-600 font-semibold">Alternatif</span>
                                </div>
                              </div>
                              <div>
                                {altBet.result === 'won' ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-bold">TUTTU</span>
                                ) : altBet.result === 'lost' ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-xs font-bold">TUTMADI</span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold">Bekliyor</span>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="px-3.5 pb-2 bg-slate-50/50 flex gap-1.5">
                                <button
                                  data-testid={`button-alt-won-${altBet.id}`}
                                  onClick={(e) => { e.stopPropagation(); updatePredictionResult(altBet.id, 'won'); }}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                                    altBet.result === 'won' ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                >
                                  Kazandı
                                </button>
                                <button
                                  data-testid={`button-alt-lost-${altBet.id}`}
                                  onClick={(e) => { e.stopPropagation(); updatePredictionResult(altBet.id, 'lost'); }}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                                    altBet.result === 'lost' ? 'bg-orange-500 text-white' : 'bg-white text-slate-400 hover:bg-orange-50 hover:text-orange-600'
                                  }`}
                                >
                                  Kaybetti
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  {selectedDate 
                    ? `${formatDateLabel(selectedDate)} tarihinde sonuç yok`
                    : 'Henüz sonuçlanmış tahmin yok'}
                </p>
                <p className="text-slate-400 text-xs mt-1">Başka bir tarih seçmeyi deneyin</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500">Veri yüklenemedi</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
