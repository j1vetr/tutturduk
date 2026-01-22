import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { HeroPrediction } from "@/components/HeroPrediction";
import { Loader2, ChevronRight, Timer, Sparkles } from "lucide-react";
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
  best_bet?: {
    bet_type: string;
    confidence: number;
    risk_level: string;
    result: string;
  };
}

function getTimeInfo(matchDate: string, matchTime: string) {
  // Create ISO string with Turkey timezone (UTC+3)
  const matchISOString = `${matchDate}T${matchTime.padStart(5, '0')}:00+03:00`;
  const matchDateTime = new Date(matchISOString);
  
  // Get current time
  const now = new Date();
  const diff = matchDateTime.getTime() - now.getTime();
  
  // Match is live if started within last 2 hours
  if (diff < 0 && diff > -2 * 60 * 60 * 1000) {
    return { text: 'Canlı', isLive: true, isPast: false, minutesLeft: 0 };
  }
  // Match is finished if more than 2 hours ago
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

type LiveScore = {
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  status: string;
  statusShort: string;
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<PublishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [liveScores, setLiveScores] = useState<Record<number, LiveScore>>({});
  const perPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  // Poll live scores every 3 minutes
  useEffect(() => {
    const fetchLiveScores = async () => {
      try {
        const res = await fetch('/api/matches/live-scores');
        if (res.ok) {
          const data = await res.json();
          setLiveScores(data.scores || {});
        }
      } catch (error) {
        console.error('Failed to fetch live scores:', error);
      }
    };

    // Initial fetch
    fetchLiveScores();

    // Poll every 3 minutes (180000ms)
    const interval = setInterval(fetchLiveScores, 180000);

    return () => clearInterval(interval);
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

  // Sort matches by time (closest first)
  const sortedMatches = [...matches].sort((a, b) => {
    return getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime();
  });

  const totalPages = Math.ceil(sortedMatches.length / perPage);
  const paginatedMatches = sortedMatches.slice((page - 1) * perPage, page * perPage);

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6 pb-6">
        <HeroPrediction />

        <div>
          {/* Section Header - Premium Football Style */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 px-6">
                <div className="relative">
                  {/* Animated glow effect - continuous pulse */}
                  <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-2xl blur-xl animate-pulse" />
                  
                  {/* Main title container */}
                  <div className="relative bg-white border-2 border-gray-200 rounded-2xl px-6 py-4 shadow-lg group-hover:border-emerald-300 group-hover:shadow-emerald-100 transition-all duration-300">
                    {/* Football icon decoration */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs">⚽</span>
                      </div>
                    </div>
                    
                    {/* Title text */}
                    <h2 className="text-2xl font-black text-center bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent tracking-tight">
                      Günün Tahminleri
                    </h2>
                    
                    {/* Subtitle with match count */}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="h-[2px] w-6 bg-gradient-to-r from-transparent to-emerald-400 rounded-full" />
                      <p className="text-xs font-semibold text-emerald-600">{sortedMatches.length} Maç Analiz Edildi</p>
                      <div className="h-[2px] w-6 bg-gradient-to-l from-transparent to-emerald-400 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
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
                    className={`relative bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-300 group shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                      match.best_bet?.result === 'won' 
                        ? 'border-2 border-amber-400 shadow-amber-100 animate-[glow_2s_ease-in-out_infinite]' 
                        : 'border border-gray-200 hover:border-emerald-300'
                    }`}
                    style={match.best_bet?.result === 'won' ? {
                      boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.1)'
                    } : undefined}
                    onClick={() => setLocation(`/match/${match.id}`)}
                    data-testid={`match-card-${match.id}`}
                  >
                    {/* Animated border gradient */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" style={{ margin: '-2px' }} />
                    
                    <div className="relative p-4">
                      {/* Header with league and timer */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {match.league_logo && <img src={match.league_logo} className="w-4 h-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" alt="" loading="lazy" />}
                          <span className="text-[11px] text-gray-500 font-medium truncate max-w-[140px]">{match.league_name}</span>
                        </div>
                        
                        {/* Time Badge */}
                        {timeInfo.isLive ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[11px] font-bold text-red-600">CANLI</span>
                          </div>
                        ) : timeInfo.isPast ? (
                          <div className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-full">
                            <span className="text-[11px] font-medium text-gray-500">Bitti</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <Timer className="w-3 h-3 text-emerald-600" />
                            <span className="text-[11px] font-bold text-emerald-700">{timeInfo.text}</span>
                          </div>
                        )}
                      </div>

                      {/* Teams */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-2 mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                            {match.home_logo ? (
                              <img src={match.home_logo} alt="" className="w-full h-full object-contain opacity-0 animate-[fadeIn_0.4s_ease-out_0.1s_forwards]" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                                {match.home_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <span className="text-gray-800 font-semibold text-xs leading-tight line-clamp-2">{match.home_team}</span>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          {liveScores[match.fixture_id] && ['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(liveScores[match.fixture_id].statusShort) ? (
                            <>
                              <div className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 px-3 py-1.5 rounded-lg shadow-lg animate-pulse">
                                <span className="text-lg font-black text-white">
                                  {liveScores[match.fixture_id].homeGoals ?? 0}
                                </span>
                                <span className="text-xs font-bold text-white/70">-</span>
                                <span className="text-lg font-black text-white">
                                  {liveScores[match.fixture_id].awayGoals ?? 0}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-red-600">
                                {liveScores[match.fixture_id].statusShort === 'HT' ? 'D.Arası' : `${liveScores[match.fixture_id].elapsed}'`}
                              </span>
                            </>
                          ) : liveScores[match.fixture_id] && ['FT', 'AET', 'PEN'].includes(liveScores[match.fixture_id].statusShort) ? (
                            <>
                              <div className="flex items-center gap-2 bg-gray-200 px-3 py-1.5 rounded-lg">
                                <span className="text-lg font-black text-gray-700">
                                  {liveScores[match.fixture_id].homeGoals ?? 0}
                                </span>
                                <span className="text-xs font-bold text-gray-400">-</span>
                                <span className="text-lg font-black text-gray-700">
                                  {liveScores[match.fixture_id].awayGoals ?? 0}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-gray-500">MS</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-gray-800">{match.match_time}</span>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center">
                                <span className="text-[10px] font-black text-gray-400">VS</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-2 mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                            {match.away_logo ? (
                              <img src={match.away_logo} alt="" className="w-full h-full object-contain opacity-0 animate-[fadeIn_0.4s_ease-out_0.2s_forwards]" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                                {match.away_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <span className="text-gray-800 font-semibold text-xs leading-tight line-clamp-2">{match.away_team}</span>
                        </div>
                      </div>

                      {/* Prediction Badge & CTA */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        {match.best_bet ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${
                              match.best_bet.result === 'won' 
                                ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-300 shadow-sm' 
                                : match.best_bet.risk_level === 'düşük' 
                                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200' 
                                  : match.best_bet.risk_level === 'orta' 
                                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200' 
                                    : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
                            }`}>
                              {match.best_bet.result === 'won' && <span className="mr-1">✓</span>}
                              {match.best_bet.bet_type}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl py-2.5 group-hover:from-emerald-100 group-hover:to-teal-100 transition-all">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700">Tahmini Gör</span>
                            <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
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
