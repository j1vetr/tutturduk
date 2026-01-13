import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, CheckCircle, RefreshCcw } from "lucide-react";

interface FinishedMatch {
  id: number;
  date: string;
  localDate: string;
  localTime: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string };
  score: { home: number; away: number };
  status: string;
}

type DateFilter = 'all' | 'today' | 'yesterday';

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState<FinishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    loadFinishedMatches();
  }, []);

  const loadFinishedMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/football/finished');
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Failed to load finished matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });

  const filteredMatches = matches.filter(m => {
    const matchesSearch = m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.league.name.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (dateFilter === 'today') return m.localDate === today;
    if (dateFilter === 'yesterday') return m.localDate === yesterday;
    return true;
  });

  const groupedByDate = filteredMatches.reduce((acc, match) => {
    const date = match.localDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {} as Record<string, FinishedMatch[]>);

  const todayCount = matches.filter(m => m.localDate === today).length;
  const yesterdayCount = matches.filter(m => m.localDate === yesterday).length;

  return (
    <MobileLayout activeTab="live">
      <div className="space-y-6 pb-20">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-display font-black text-white tracking-tight">BİTEN MAÇLAR</h2>
            </div>
            <button 
              onClick={loadFinishedMatches}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-400 font-medium">Dün ve bugün oynanan maçların sonuçları</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDateFilter('all')}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
              dateFilter === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Tümü ({matches.length})
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
              dateFilter === 'today'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Bugün ({todayCount})
          </button>
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
              dateFilter === 'yesterday'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Dün ({yesterdayCount})
          </button>
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
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Bitmiş maç bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateMatches]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {date === today ? 'Bugün' : date === yesterday ? 'Dün' : date}
                  </span>
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{dateMatches.length} maç</Badge>
                </div>
                
                {dateMatches.map((match) => (
                  <Card key={match.id} className="bg-zinc-900/40 border-white/5 overflow-hidden relative group hover:bg-zinc-900/60 transition-all duration-300">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600" />
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <img src={match.league.logo} alt="" className="w-4 h-4 object-contain" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {match.league.country} / {match.league.name}
                          </span>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {match.localTime}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-4 relative">
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-display font-black text-white/[0.03]">VS</span>

                        <div className="flex-1 flex flex-col items-center gap-2 text-center z-10">
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-md" />
                            <img src={match.homeTeam.logo} className="w-full h-full object-contain relative" alt={match.homeTeam.name} />
                          </div>
                          <span className="text-[10px] font-bold text-white leading-tight">{match.homeTeam.name}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center w-20 shrink-0 z-10">
                          <div className="flex items-center justify-center gap-1 bg-zinc-800/50 px-3 py-1 rounded-lg">
                            <span className="text-2xl font-display font-black text-white">{match.score.home}</span>
                            <span className="text-lg font-bold text-zinc-600">-</span>
                            <span className="text-2xl font-display font-black text-white">{match.score.away}</span>
                          </div>
                          <span className="text-[9px] text-emerald-400 font-medium mt-1">MS</span>
                        </div>

                        <div className="flex-1 flex flex-col items-center gap-2 text-center z-10">
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-md" />
                            <img src={match.awayTeam.logo} className="w-full h-full object-contain relative" alt={match.awayTeam.name} />
                          </div>
                          <span className="text-[10px] font-bold text-white leading-tight">{match.awayTeam.name}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
