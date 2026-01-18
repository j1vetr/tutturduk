import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, CheckCircle, XCircle, Clock, Loader2, ChevronRight, ChevronLeft, Calendar, Flame, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { format, subDays, isToday, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

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

  useEffect(() => {
    loadData();
  }, [selectedDate]);

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

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'düşük': return 'Beklenen';
      case 'orta': return 'Orta';
      case 'yüksek': return 'Riskli';
      default: return riskLevel;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'düşük': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'orta': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'yüksek': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'won':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'lost':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'won':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5">Tuttu</Badge>;
      case 'lost':
        return <Badge className="bg-red-100 text-red-700 border-0 text-[10px] px-1.5">Tutmadı</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] px-1.5">Bekliyor</Badge>;
    }
  };

  const filteredMatches = data?.matches.filter(match => {
    if (filter === 'all') return true;
    if (!match.predictions) return false;
    
    if (filter === 'won') {
      return match.predictions.some(p => p.result === 'won');
    }
    if (filter === 'lost') {
      return match.predictions.some(p => p.result === 'lost');
    }
    return true;
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
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Sonuçlar</h1>
              <p className="text-xs text-gray-500">Tahmin geçmişi</p>
            </div>
          </div>
          {data && (
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600">%{data.overallStats.winRate}</p>
              <p className="text-[10px] text-gray-400">Genel Başarı</p>
            </div>
          )}
        </div>

        {/* Date Picker - uses availableDates from API */}
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
            {/* Daily Stats Card */}
            {selectedDate && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      {formatDateLabel(selectedDate)} İstatistikleri
                    </span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border-0">
                    {data.dailyStats.total} Tahmin
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">{data.dailyStats.won}</p>
                    <p className="text-[10px] text-gray-500">Tuttu</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-500">{data.dailyStats.lost}</p>
                    <p className="text-[10px] text-gray-500">Tutmadı</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-400">{data.dailyStats.pending}</p>
                    <p className="text-[10px] text-gray-500">Bekliyor</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-600">%{data.dailyStats.winRate}</p>
                    <p className="text-[10px] text-gray-500">Başarı</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {(data.dailyStats.won + data.dailyStats.lost) > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${(data.dailyStats.won / (data.dailyStats.won + data.dailyStats.lost)) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-red-400 transition-all"
                        style={{ width: `${(data.dailyStats.lost / (data.dailyStats.won + data.dailyStats.lost)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overall Stats (when no date selected) */}
            {!selectedDate && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-emerald-600">%{data.overallStats.winRate}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Başarı</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-emerald-600">{data.overallStats.totalWon}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Kazanan</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-red-500">{data.overallStats.totalLost}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Kaybeden</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-gray-700">{data.overallStats.totalEvaluated}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Toplam</p>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilter('won')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                  filter === 'won' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Tutanlar
              </button>
              <button
                onClick={() => setFilter('lost')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                  filter === 'lost' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
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

            {/* Matches with All Predictions */}
            {filteredMatches.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                  Maç Tahminleri {selectedDate ? `(${formatDateLabel(selectedDate)})` : ''}
                </h3>
                
                {filteredMatches.map(match => (
                  <div 
                    key={match.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Match Header */}
                    <div 
                      className="p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setLocation(`/match/${match.fixture_id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-400">{match.league_name}</span>
                        {match.status === 'finished' && match.final_score_home !== undefined && (
                          <Badge className="bg-gray-100 text-gray-700 border-0 text-xs font-bold">
                            {match.final_score_home} - {match.final_score_away}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {match.home_logo && (
                            <img src={match.home_logo} alt="" className="w-6 h-6 object-contain" />
                          )}
                          <span className="text-sm font-medium text-gray-800 truncate">{match.home_team}</span>
                        </div>
                        <span className="text-xs text-gray-400 px-2">vs</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-sm font-medium text-gray-800 truncate">{match.away_team}</span>
                          {match.away_logo && (
                            <img src={match.away_logo} alt="" className="w-6 h-6 object-contain" />
                          )}
                        </div>
                      </div>
                      
                      {match.match_date && (
                        <div className="text-[10px] text-gray-400 mt-2 text-center">
                          {format(parseISO(match.match_date), 'd MMM yyyy', { locale: tr })} • {match.match_time}
                        </div>
                      )}
                    </div>

                    {/* All 3 Predictions */}
                    {match.predictions && match.predictions.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-2 space-y-1.5">
                        {match.predictions.map((pred, idx) => (
                          <div 
                            key={pred.id || idx}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              pred.result === 'won' ? 'bg-emerald-50 border border-emerald-200' :
                              pred.result === 'lost' ? 'bg-red-50 border border-red-200' :
                              'bg-white border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {getResultIcon(pred.result)}
                              <Badge className={`text-[10px] px-2 py-0.5 border ${getRiskColor(pred.risk_level)}`}>
                                {getRiskLabel(pred.risk_level)}
                              </Badge>
                              <span className="text-sm font-medium text-gray-800">{pred.bet_type}</span>
                            </div>
                            {getResultBadge(pred.result)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
