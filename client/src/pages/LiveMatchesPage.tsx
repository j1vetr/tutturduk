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
              <CheckCircle className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight">BİTEN MAÇLAR</h2>
            </div>
            <button 
              onClick={loadFinishedMatches}
              className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 font-medium">Dün ve bugün oynanan maçların sonuçları</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDateFilter('all')}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
              dateFilter === 'all'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            Tümü ({matches.length})
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
              dateFilter === 'today'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            Bugün ({todayCount})
          </button>
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
              dateFilter === 'yesterday'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            Dün ({yesterdayCount})
          </button>
        </div>

        <div className="relative">
          <div className="flex items-center bg-white rounded-xl border border-gray-200 px-3 h-11 shadow-sm">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <Input 
              placeholder="Takım veya lig ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none h-full text-xs placeholder:text-gray-400 focus-visible:ring-0 p-0" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Bitmiş maç bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateMatches]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {date === today ? 'Bugün' : date === yesterday ? 'Dün' : date}
                  </span>
                  <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-[10px]">{dateMatches.length} maç</Badge>
                </div>
                
                {dateMatches.map((match) => (
                  <Card key={match.id} className="bg-white border-gray-200 overflow-hidden relative group hover:shadow-md transition-all duration-300 shadow-sm">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600" />
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <img src={match.league.logo} alt="" className="w-4 h-4 object-contain" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {match.league.country} / {match.league.name}
                          </span>
                        </div>
                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">
                          {match.localTime}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-4 relative">
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-display font-black text-gray-100">VS</span>

                        <div className="flex-1 flex flex-col items-center gap-2 text-center z-10">
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gray-100 rounded-full blur-md" />
                            <img src={match.homeTeam.logo} className="w-full h-full object-contain relative" alt={match.homeTeam.name} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-800 leading-tight">{match.homeTeam.name}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center w-20 shrink-0 z-10">
                          <div className="flex items-center justify-center gap-1 bg-gray-100 px-3 py-1 rounded-lg">
                            <span className="text-2xl font-display font-black text-gray-800">{match.score.home}</span>
                            <span className="text-lg font-bold text-gray-300">-</span>
                            <span className="text-2xl font-display font-black text-gray-800">{match.score.away}</span>
                          </div>
                          <span className="text-[9px] text-blue-500 font-medium mt-1">MS</span>
                        </div>

                        <div className="flex-1 flex flex-col items-center gap-2 text-center z-10">
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gray-100 rounded-full blur-md" />
                            <img src={match.awayTeam.logo} className="w-full h-full object-contain relative" alt={match.awayTeam.name} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-800 leading-tight">{match.awayTeam.name}</span>
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
