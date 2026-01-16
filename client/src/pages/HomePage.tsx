import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { HeroPrediction } from "@/components/HeroPrediction";
import BestBets from "@/components/BestBets";
import { Loader2, Clock, Filter, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";


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
  api_advice?: string;
  api_winner_name?: string;
  api_percent_home?: string;
  api_percent_draw?: string;
  api_percent_away?: string;
  api_goals_home?: string;
  api_goals_away?: string;
  api_comparison?: {
    att?: { home: string; away: string };
    def?: { home: string; away: string };
    form?: { home: string; away: string };
    goals?: { home: string; away: string };
    h2h?: { home: string; away: string };
  };
  is_featured?: boolean;
}

function getTimeInfo(matchDate: string, matchTime: string) {
  const [hours, minutes] = matchTime.split(':').map(Number);
  const matchDateTime = new Date(matchDate);
  matchDateTime.setHours(hours, minutes, 0, 0);
  const now = new Date();
  const diff = matchDateTime.getTime() - now.getTime();
  
  if (diff < 0 && diff > -2 * 60 * 60 * 1000) {
    return { text: 'Canlı', isLive: true, isPast: false, minutesLeft: 0 };
  }
  if (diff < 0) {
    return { text: 'Bitti', isLive: false, isPast: true, minutesLeft: -1 };
  }
  
  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const totalMinutes = hoursLeft * 60 + minutesLeft;
  
  if (hoursLeft < 1) return { text: `${minutesLeft} dk`, isLive: false, isPast: false, minutesLeft: totalMinutes };
  if (hoursLeft < 24) return { text: `${hoursLeft}s ${minutesLeft}dk`, isLive: false, isPast: false, minutesLeft: totalMinutes };
  return { text: `${Math.floor(hoursLeft / 24)} gün`, isLive: false, isPast: false, minutesLeft: totalMinutes };
}


function MatchCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse shadow-sm">
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="w-20 h-3 bg-gray-200 rounded" />
        </div>
        <div className="w-12 h-3 bg-gray-200 rounded" />
      </div>
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="w-16 h-4 bg-gray-200 rounded" />
          </div>
          <div className="w-10 h-5 bg-gray-200 rounded" />
          <div className="flex items-center gap-2 justify-end">
            <div className="w-16 h-4 bg-gray-200 rounded" />
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-16 h-4 bg-gray-200 rounded-full" />
          <div className="w-16 h-4 bg-gray-200 rounded-full" />
          <div className="w-6 h-6 bg-gray-200 rounded-full ml-auto" />
        </div>
      </div>
    </div>
  );
}

type SortOption = 'time-asc' | 'time-desc' | 'league';
type TimeFilter = 'all' | 'soon' | 'today' | 'tomorrow';

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<PublishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('time-asc');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.filter((m: PublishedMatch) => !m.is_featured));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchDateTime = (match: PublishedMatch) => {
    const [hours, minutes] = match.match_time.split(':').map(Number);
    const dt = new Date(match.match_date);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  };

  const filteredMatches = matches.filter(match => {
    if (timeFilter === 'all') return true;
    
    const matchDt = getMatchDateTime(match);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);
    
    if (timeFilter === 'soon') {
      const diff = matchDt.getTime() - now.getTime();
      return diff > 0 && diff < 3 * 60 * 60 * 1000; // 3 saat içinde
    }
    if (timeFilter === 'today') {
      return matchDt >= today && matchDt < tomorrow;
    }
    if (timeFilter === 'tomorrow') {
      return matchDt >= tomorrow && matchDt < dayAfter;
    }
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (sortBy === 'time-asc') {
      return getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime();
    }
    if (sortBy === 'time-desc') {
      return getMatchDateTime(b).getTime() - getMatchDateTime(a).getTime();
    }
    if (sortBy === 'league') {
      return (a.league_name || '').localeCompare(b.league_name || '');
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedMatches.length / perPage);
  const paginatedMatches = sortedMatches.slice((page - 1) * perPage, page * perPage);

  const filterLabels: Record<TimeFilter, string> = {
    'all': 'Tümü',
    'soon': '3 saat içinde',
    'today': 'Bugün',
    'tomorrow': 'Yarın'
  };

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6 pb-6">
        <HeroPrediction />
        
        <BestBets />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Günün maçları</h2>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrele
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showFilters && (
            <div className="mb-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Zaman</p>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'soon', 'today', 'tomorrow'] as TimeFilter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => { setTimeFilter(f); setPage(1); }}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                        timeFilter === f 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-300' 
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Sıralama</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSortBy('time-asc')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                      sortBy === 'time-asc' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-300' 
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> Yakın
                  </button>
                  <button
                    onClick={() => setSortBy('time-desc')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                      sortBy === 'time-desc' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-300' 
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> Uzak
                  </button>
                  <button
                    onClick={() => setSortBy('league')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                      sortBy === 'league' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-300' 
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Lige göre
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredMatches.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">
                {filteredMatches.length} maç
              </Badge>
              {totalPages > 1 && (
                <span className="text-[10px] text-gray-500">
                  Sayfa {page}/{totalPages}
                </span>
              )}
            </div>
          )}
          
          {loading ? (
            <div className="space-y-3">
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </div>
          ) : paginatedMatches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>Henüz maç yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedMatches.map(match => {
                const timeInfo = getTimeInfo(match.match_date, match.match_time);
                
                return (
                  <div 
                    key={match.id} 
                    className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200 group shadow-sm hover:shadow-md"
                    onClick={() => setLocation(`/match/${match.id}`)}
                    data-testid={`match-card-${match.id}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {match.league_logo && <img src={match.league_logo} className="w-4 h-4" alt="" />}
                          <span className="text-[11px] text-gray-500 font-medium">{match.league_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {timeInfo.isLive && (
                            <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          )}
                          <span className={`text-xs font-semibold ${
                            timeInfo.isLive ? 'text-red-500' : timeInfo.isPast ? 'text-gray-400' : 'text-gray-800'
                          }`}>
                            {match.match_time}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 p-1.5 mb-2">
                            {match.home_logo ? (
                              <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                {match.home_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <span className="text-gray-800 font-semibold text-xs leading-tight line-clamp-2">{match.home_team}</span>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center">
                            <span className="text-sm font-black text-gray-400">VS</span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 p-1.5 mb-2">
                            {match.away_logo ? (
                              <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                {match.away_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <span className="text-gray-800 font-semibold text-xs leading-tight line-clamp-2">{match.away_team}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2 text-emerald-500 group-hover:text-emerald-600 transition-colors">
                          <span className="text-[11px] font-medium">Analiz için dokun</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              >
                Önceki
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                        page === pageNum 
                          ? 'bg-emerald-500 text-white font-bold shadow-sm' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 leading-relaxed">
          Bu platform yatırım garantisi vermez. Bahis oynamak risk içerir. 18 yaş altı kullanımı yasaktır.
        </p>
      </div>
    </MobileLayout>
  );
}
