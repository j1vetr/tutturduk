import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { HeroPrediction } from "@/components/HeroPrediction";
import BestBets from "@/components/BestBets";
import { Loader2, Clock, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { calculateScenario, getChaosColor } from "@/lib/scenarioEngine";
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

function getContextHint(scenario: ReturnType<typeof calculateScenario>): string {
  const { DI, GI, BI, chaos, classification } = scenario;
  
  if (chaos > 70) return "Tahmin zorluğu yüksek";
  if (classification === 'goals-likely' && GI > 60) return "Gol beklentisi yüksek";
  if (classification === 'btts-goals' && BI > 55) return "İki takım da gol bulabilir";
  if (classification === 'one-sided' && DI > 65) return "Güç farkı belirgin";
  if (classification === 'upset-prone') return "Sürpriz ihtimali var";
  if (classification === 'tight' && DI < 30) return "Olasılıklar dengede";
  if (classification === 'balanced') return "Düşük gol beklentisi";
  if (GI < 40) return "Düşük gol beklentisi";
  if (DI > 50) return "Form farkı belirgin";
  return "Dengeli mücadele";
}

function ScenarioRow({ match }: { match: PublishedMatch }) {
  const homePercent = parseInt(match.api_percent_home?.replace('%', '') || '0');
  const drawPercent = parseInt(match.api_percent_draw?.replace('%', '') || '0');
  const awayPercent = parseInt(match.api_percent_away?.replace('%', '') || '0');

  if (homePercent === 0 && awayPercent === 0) return null;

  const scenario = calculateScenario({
    homePercent,
    drawPercent,
    awayPercent,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    comparison: match.api_comparison,
    expectedGoalsHome: match.api_goals_home,
    expectedGoalsAway: match.api_goals_away,
  });

  const contextHint = getContextHint(scenario);

  const badgeColors: Record<string, string> = {
    'Kilit Maç': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Gollü Maç': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Dengeli': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    'Tek Taraflı': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Sürprize Açık': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        {scenario.badges.slice(0, 2).map((badge, i) => (
          <span 
            key={i} 
            className={`text-[9px] px-2 py-0.5 rounded-full border ${badgeColors[badge] || badgeColors['Dengeli']}`}
          >
            {badge}
          </span>
        ))}
        <div className="relative w-6 h-6 ml-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="12" cy="12" r="10" stroke="#27272a" strokeWidth="2" fill="none" />
            <circle 
              cx="12" cy="12" r="10" 
              stroke={getChaosColor(scenario.chaos)}
              strokeWidth="2" 
              fill="none"
              strokeDasharray={`${(scenario.chaos / 100) * 63} 63`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
            {scenario.chaos}
          </span>
        </div>
      </div>
      <p className="text-[9px] text-zinc-500 mt-1">{contextHint}</p>
    </div>
  );
}

function MatchCardSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden animate-pulse">
      <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-800 rounded" />
          <div className="w-20 h-3 bg-zinc-800 rounded" />
        </div>
        <div className="w-12 h-3 bg-zinc-800 rounded" />
      </div>
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
            <div className="w-16 h-4 bg-zinc-800 rounded" />
          </div>
          <div className="w-10 h-5 bg-zinc-800 rounded" />
          <div className="flex items-center gap-2 justify-end">
            <div className="w-16 h-4 bg-zinc-800 rounded" />
            <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-16 h-4 bg-zinc-800 rounded-full" />
          <div className="w-16 h-4 bg-zinc-800 rounded-full" />
          <div className="w-6 h-6 bg-zinc-800 rounded-full ml-auto" />
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
            <h2 className="text-lg font-bold text-white">Günün maçları</h2>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrele
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showFilters && (
            <div className="mb-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-3">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Zaman</p>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'soon', 'today', 'tomorrow'] as TimeFilter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => { setTimeFilter(f); setPage(1); }}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                        timeFilter === f 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Sıralama</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSortBy('time-asc')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                      sortBy === 'time-asc' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> Yakın
                  </button>
                  <button
                    onClick={() => setSortBy('time-desc')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                      sortBy === 'time-desc' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> Uzak
                  </button>
                  <button
                    onClick={() => setSortBy('league')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                      sortBy === 'league' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
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
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                {filteredMatches.length} maç
              </Badge>
              {totalPages > 1 && (
                <span className="text-[10px] text-zinc-500">
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
            <div className="text-center py-12 text-zinc-500">
              <p>Henüz maç yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedMatches.map(match => {
                const timeInfo = getTimeInfo(match.match_date, match.match_time);
                const homePercent = parseInt(match.api_percent_home?.replace('%', '') || '0');
                const awayPercent = parseInt(match.api_percent_away?.replace('%', '') || '0');
                
                return (
                  <div 
                    key={match.id} 
                    className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer active:bg-zinc-800 transition-colors"
                    onClick={() => setLocation(`/match/${match.id}`)}
                  >
                    <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-800/50">
                      <div className="flex items-center gap-2">
                        {match.league_logo && <img src={match.league_logo} className="w-4 h-4" alt="" />}
                        <span className="text-[11px] text-zinc-500">{match.league_name}</span>
                      </div>
                      <span className={`text-[11px] font-medium ${
                        timeInfo.isLive ? 'text-red-400' : timeInfo.isPast ? 'text-zinc-600' : 'text-emerald-400'
                      }`}>
                        {timeInfo.isLive && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse" />}
                        {timeInfo.text}
                      </span>
                    </div>

                    <div className="p-3">
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 p-1 flex-shrink-0">
                            {match.home_logo ? (
                              <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                {match.home_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <span className="text-white font-medium text-sm">{match.home_team}</span>
                        </div>

                        <div className="text-center px-2">
                          <span className="text-base font-bold text-white">{match.match_time}</span>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-white font-medium text-sm text-right">{match.away_team}</span>
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 p-1 flex-shrink-0">
                            {match.away_logo ? (
                              <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                {match.away_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(homePercent > 0 || awayPercent > 0) && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] text-emerald-400 font-medium w-8">{homePercent}%</span>
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${homePercent}%` }} />
                            <div className="flex-1" />
                            <div className="bg-zinc-400 rounded-r-full" style={{ width: `${awayPercent}%` }} />
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium w-8 text-right">{awayPercent}%</span>
                        </div>
                      )}

                      <ScenarioRow match={match} />
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
                className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
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
                          ? 'bg-emerald-500 text-black font-bold' 
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
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
                className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Bu platform yatırım garantisi vermez. Bahis oynamak risk içerir. 18 yaş altı kullanımı yasaktır.
        </p>
      </div>
    </MobileLayout>
  );
}
