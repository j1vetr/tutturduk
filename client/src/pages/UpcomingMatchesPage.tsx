import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Shield, Trophy, Clock } from "lucide-react";

export default function UpcomingMatchesPage() {
  const today = new Date();
  
  // Mock Data for Design Simulation
  const mockUpcomingMatches = [
    {
      id: 1,
      league: "UEFA Champions League",
      time: "22:00",
      home: "Real Madrid",
      away: "Man. City",
      homeLogo: "https://media.api-sports.io/football/teams/541.png",
      awayLogo: "https://media.api-sports.io/football/teams/50.png"
    },
    {
      id: 2,
      league: "UEFA Champions League",
      time: "22:00",
      home: "Arsenal",
      away: "Bayern Munich",
      homeLogo: "https://media.api-sports.io/football/teams/42.png",
      awayLogo: "https://media.api-sports.io/football/teams/157.png"
    },
    {
      id: 3,
      league: "Süper Lig",
      time: "19:00",
      home: "Beşiktaş",
      away: "Trabzonspor",
      homeLogo: "https://media.api-sports.io/football/teams/607.png",
      awayLogo: "https://media.api-sports.io/football/teams/616.png"
    },
    {
      id: 4,
      league: "Serie A",
      time: "20:45",
      home: "Inter",
      away: "Napoli",
      homeLogo: "https://media.api-sports.io/football/teams/505.png",
      awayLogo: "https://media.api-sports.io/football/teams/492.png"
    }
  ];

  return (
    <MobileLayout activeTab="upcoming">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter">
              BÜLTEN
            </h1>
          </div>
          <Badge variant="outline" className="text-xs font-bold text-zinc-400 border-zinc-800 bg-zinc-900/50">
            {format(today, "d MMMM yyyy", { locale: tr })}
          </Badge>
        </div>

        <div className="space-y-3">
          {mockUpcomingMatches.map((match) => (
            <Card 
              key={match.id} 
              className="bg-zinc-900/40 border-zinc-800/60 overflow-hidden hover:bg-zinc-900/80 transition-all duration-300 group"
            >
              <div className="p-4 space-y-4">
                {/* League Header */}
                <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                  <Trophy className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate group-hover:text-white transition-colors">
                    {match.league}
                  </span>
                </div>

                {/* Teams & Time */}
                <div className="flex items-center justify-between relative">
                  {/* Home */}
                  <div className="flex flex-col items-center gap-3 w-1/3">
                    <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                      <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img 
                        src={match.homeLogo} 
                        alt={match.home}
                        className="w-full h-full object-contain relative z-10"
                      />
                    </div>
                    <span className="text-xs font-bold text-white leading-tight text-center">{match.home}</span>
                  </div>

                  {/* Time Center */}
                  <div className="flex flex-col items-center justify-center w-1/3 gap-1">
                     <div className="bg-zinc-950/80 border border-zinc-800 px-4 py-1.5 rounded-lg flex items-center gap-1.5 group-hover:border-blue-500/30 transition-colors shadow-lg">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span className="text-sm font-black text-white tracking-widest">{match.time}</span>
                     </div>
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Başlama</span>
                  </div>

                  {/* Away */}
                  <div className="flex flex-col items-center gap-3 w-1/3">
                    <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                      <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img 
                        src={match.awayLogo} 
                        alt={match.away}
                        className="w-full h-full object-contain relative z-10"
                      />
                    </div>
                    <span className="text-xs font-bold text-white leading-tight text-center">{match.away}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
