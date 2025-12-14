import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useUpcomingMatches } from "@/lib/rapidApi";
import { Loader2, CalendarDays, Shield, Trophy } from "lucide-react";
import { useState } from "react";

export default function UpcomingMatchesPage() {
  // Use today's date formatted as YYYYMMDD
  const today = new Date();
  const formattedDate = format(today, "yyyyMMdd");
  const [date] = useState(formattedDate);
  
  const { data: matches, isLoading, error } = useUpcomingMatches(date);

  return (
    <MobileLayout activeTab="upcoming">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter">
            Gelecek <span className="text-primary">Maçlar</span>
          </h1>
          <Badge variant="outline" className="text-xs font-bold text-zinc-400 border-zinc-800">
            {format(today, "d MMMM yyyy", { locale: tr })}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-zinc-500 font-bold animate-pulse">Maçlar yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-500 font-bold mb-2">Veri Alınamadı</p>
            <p className="text-xs text-red-400/60">{(error as Error).message}</p>
          </div>
        ) : matches?.length === 0 ? (
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
             <CalendarDays className="w-10 h-10 text-zinc-700 mx-auto" />
             <p className="text-zinc-500 font-bold">Bugün için planlanmış maç bulunamadı.</p>
           </div>
        ) : (
          <div className="space-y-3">
            {matches?.map((match) => (
              <Card 
                key={match.id} 
                className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:bg-zinc-900 transition-colors"
              >
                <div className="p-4 space-y-4">
                  {/* League Header (Using ID since name is missing in this endpoint) */}
                  <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                    <Trophy className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
                      Lig #{match.leagueId}
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    {/* Home */}
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="relative w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-zinc-600" />
                      </div>
                      <span className="text-xs font-bold text-white leading-tight">
                        {match.home.name}
                      </span>
                    </div>

                    {/* Time/Score */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="bg-zinc-950 border border-zinc-800 px-3 py-1 rounded text-xs font-bold text-zinc-400">
                        {match.time.split(' ')[1] || match.time}
                      </div>
                      {match.status.started && (
                        <span className="text-[9px] font-bold text-primary animate-pulse">CANLI</span>
                      )}
                    </div>

                    {/* Away */}
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="relative w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-zinc-600" />
                      </div>
                      <span className="text-xs font-bold text-white leading-tight">
                        {match.away.name}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
