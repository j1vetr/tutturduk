import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Filter, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { useLiveMatches } from "@/lib/rapidApi";

export default function LiveMatchesPage() {
  const { data: matches, isLoading, error } = useLiveMatches();

  return (
    <MobileLayout activeTab="live">
       <div className="space-y-6 pb-20">
          {/* Header */}
          <div className="space-y-2">
             <h2 className="text-2xl font-display font-black text-white">Canlı Skorlar</h2>
             <p className="text-xs text-muted-foreground">RapidAPI API-Football verileriyle anlık güncellenir.</p>
          </div>

          {/* Search/Filter */}
          <div className="flex gap-2">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Takım veya lig ara..." className="pl-9 bg-white/5 border-white/10 h-10 text-xs" />
             </div>
             <button className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4" />
             </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-500">Veri Alınamadı</h3>
                <p className="text-xs text-red-400/80 leading-relaxed">
                  {(error as Error).message}
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="w-8 h-8 text-primary animate-spin" />
               <p className="text-xs text-muted-foreground animate-pulse">Canlı veriler yükleniyor...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && matches?.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
               <p>Şu an canlı oynanan maç bulunmuyor.</p>
            </div>
          )}

          {/* Live Matches List */}
          <div className="space-y-4">
             {matches?.map((match) => (
                <Card key={match.fixture.id} className="bg-zinc-900/50 border-white/10 overflow-hidden relative group">
                   {/* Live Indicator Bar */}
                   <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600 animate-pulse" />
                   
                   <div className="p-4">
                      {/* League Header */}
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                            {match.league.flag && <img src={match.league.flag} className="w-4 h-3 object-cover rounded-[1px]" />}
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                               {match.league.country} • {match.league.name}
                            </span>
                         </div>
                         <Badge variant="destructive" className="h-5 px-2 text-[9px] font-bold animate-pulse">
                            {match.fixture.status.elapsed}'
                         </Badge>
                      </div>

                      {/* Scoreboard */}
                      <div className="flex items-center justify-between gap-4">
                         {/* Home */}
                         <div className="flex-1 flex flex-col items-center gap-2 text-center">
                            <img src={match.teams.home.logo} className="w-10 h-10 object-contain" alt={match.teams.home.name} />
                            <span className="text-xs font-bold text-white leading-tight">{match.teams.home.name}</span>
                         </div>

                         {/* Score */}
                         <div className="flex flex-col items-center justify-center w-20 shrink-0">
                            <div className="text-3xl font-display font-black text-white tracking-widest bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                               {match.goals.home ?? 0}-{match.goals.away ?? 0}
                            </div>
                            <span className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-widest">CANLI</span>
                         </div>

                         {/* Away */}
                         <div className="flex-1 flex flex-col items-center gap-2 text-center">
                            <img src={match.teams.away.logo} className="w-10 h-10 object-contain" alt={match.teams.away.name} />
                            <span className="text-xs font-bold text-white leading-tight">{match.teams.away.name}</span>
                         </div>
                      </div>

                      {/* Latest Event Snippet (If available) */}
                      {match.events && match.events.length > 0 && (
                         <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                               <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                               Son Olay: <span className="text-white">{match.events[match.events.length - 1].type} ({match.events[match.events.length - 1].time.elapsed}')</span>
                            </p>
                            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                         </div>
                      )}
                   </div>
                </Card>
             ))}
          </div>
       </div>
    </MobileLayout>
  );
}
