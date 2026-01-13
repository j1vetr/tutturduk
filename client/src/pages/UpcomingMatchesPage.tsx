import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Trophy, Clock, Loader2, Search, TrendingUp, RefreshCcw } from "lucide-react";

interface UpcomingMatch {
  id: number;
  date: string;
  localDate: string;
  localTime: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string };
  prediction?: {
    winner?: { id: number; name: string; comment: string };
    advice?: string;
    percent?: { home: string; draw: string; away: string };
    goals?: { home: string; away: string };
    comparison?: any;
    homeForm?: string;
    awayForm?: string;
  };
}

export default function UpcomingMatchesPage() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const today = new Date();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/football/all-predictions');
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(m =>
    m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
    m.awayTeam.name.toLowerCase().includes(search.toLowerCase()) ||
    m.league.name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByDate = filteredMatches.reduce((acc, match) => {
    const date = match.localDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {} as Record<string, UpcomingMatch[]>);

  const todayStr = today.toLocaleDateString('tr-TR');
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR');

  return (
    <MobileLayout activeTab="upcoming">
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter">
              BÜLTEN
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-bold text-zinc-400 border-zinc-800 bg-zinc-900/50">
              {format(today, "d MMMM yyyy", { locale: tr })}
            </Badge>
            <button 
              onClick={loadMatches}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center bg-black rounded-xl border border-white/10 px-3 h-11">
            <Search className="w-4 h-4 text-zinc-500 mr-2" />
            <Input 
              placeholder="Takım veya lig ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none h-full text-xs placeholder:text-zinc-600 focus-visible:ring-0 p-0" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Maç bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateMatches]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {date === todayStr ? 'Bugün' : date === tomorrowStr ? 'Yarın' : date}
                  </span>
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{dateMatches.length} maç</Badge>
                </div>

                {dateMatches.map((match) => {
                  const homePercent = parseInt(match.prediction?.percent?.home?.replace('%', '') || '0');
                  const drawPercent = parseInt(match.prediction?.percent?.draw?.replace('%', '') || '0');
                  const awayPercent = parseInt(match.prediction?.percent?.away?.replace('%', '') || '0');
                  const hasPrediction = homePercent > 0 || awayPercent > 0;

                  return (
                    <Card 
                      key={match.id} 
                      className="bg-zinc-900/40 border-zinc-800/60 overflow-hidden hover:bg-zinc-900/80 transition-all duration-300 group"
                    >
                      <div className="p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                          <img src={match.league.logo} alt="" className="w-4 h-4 object-contain" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate group-hover:text-white transition-colors">
                            {match.league.country} / {match.league.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between relative">
                          <div className="flex flex-col items-center gap-3 w-1/3">
                            <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                              <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                              <img 
                                src={match.homeTeam.logo} 
                                alt={match.homeTeam.name}
                                className="w-full h-full object-contain relative z-10"
                              />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight text-center">{match.homeTeam.name}</span>
                            {match.prediction?.homeForm && (
                              <span className="text-[9px] text-zinc-500">Form: {match.prediction.homeForm}</span>
                            )}
                          </div>

                          <div className="flex flex-col items-center justify-center w-1/3 gap-1">
                            <div className="bg-zinc-950/80 border border-zinc-800 px-4 py-1.5 rounded-lg flex items-center gap-1.5 group-hover:border-blue-500/30 transition-colors shadow-lg">
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span className="text-sm font-black text-white tracking-widest">{match.localTime}</span>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Başlama</span>
                          </div>

                          <div className="flex flex-col items-center gap-3 w-1/3">
                            <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                              <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                              <img 
                                src={match.awayTeam.logo} 
                                alt={match.awayTeam.name}
                                className="w-full h-full object-contain relative z-10"
                              />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight text-center">{match.awayTeam.name}</span>
                            {match.prediction?.awayForm && (
                              <span className="text-[9px] text-zinc-500">Form: {match.prediction.awayForm}</span>
                            )}
                          </div>
                        </div>

                        {hasPrediction && (
                          <div className="pt-3 border-t border-white/5 space-y-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3 h-3 text-blue-400" />
                              <span className="text-[10px] text-zinc-400">Tahmin</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-400 font-medium w-8">{homePercent}%</span>
                              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500" style={{ width: `${homePercent}%` }} />
                                <div className="bg-zinc-600" style={{ width: `${drawPercent}%` }} />
                                <div className="bg-zinc-400" style={{ width: `${awayPercent}%` }} />
                              </div>
                              <span className="text-[10px] text-zinc-400 font-medium w-8 text-right">{awayPercent}%</span>
                            </div>
                            
                            <div className="flex justify-between text-[9px]">
                              <span className="text-emerald-400">Ev</span>
                              <span className="text-zinc-500">Beraberlik {drawPercent}%</span>
                              <span className="text-zinc-400">Deplasman</span>
                            </div>

                            {match.prediction?.advice && (
                              <p className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                {match.prediction.advice}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
