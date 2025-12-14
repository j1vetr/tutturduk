import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Filter, ArrowRight, Loader2, Radio } from "lucide-react";

export default function LiveMatchesPage() {
  // Mock Data for Design Simulation
  const mockMatches = [
    {
      id: 1,
      league: { country: "İngiltere", name: "Premier League" },
      time: "34'",
      home: { name: "Arsenal", score: 2, logo: "https://media.api-sports.io/football/teams/42.png" },
      away: { name: "Liverpool", score: 1, logo: "https://media.api-sports.io/football/teams/40.png" },
      event: "Gol! Arsenal (Saka 34')"
    },
    {
      id: 2,
      league: { country: "İtalya", name: "Serie A" },
      time: "67'",
      home: { name: "Juventus", score: 0, logo: "https://media.api-sports.io/football/teams/496.png" },
      away: { name: "Milan", score: 0, logo: "https://media.api-sports.io/football/teams/489.png" },
      event: "Sarı Kart (Hernandez 65')"
    },
    {
      id: 3,
      league: { country: "Türkiye", name: "Süper Lig" },
      time: "12'",
      home: { name: "Galatasaray", score: 1, logo: "https://media.api-sports.io/football/teams/614.png" },
      away: { name: "Fenerbahçe", score: 0, logo: "https://media.api-sports.io/football/teams/611.png" },
      event: "Gol! Galatasaray (Icardi 11')"
    },
    {
      id: 4,
      league: { country: "Almanya", name: "Bundesliga" },
      time: "45+2'",
      home: { name: "Bayern", score: 3, logo: "https://media.api-sports.io/football/teams/157.png" },
      away: { name: "Dortmund", score: 1, logo: "https://media.api-sports.io/football/teams/165.png" },
      event: "Devre Arası"
    }
  ];

  return (
    <MobileLayout activeTab="live">
       <div className="space-y-6 pb-20">
          {/* Header */}
          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <Radio className="w-6 h-6 text-red-500 animate-pulse" />
                <h2 className="text-2xl font-display font-black text-white tracking-tight">CANLI SKORLAR</h2>
             </div>
             <p className="text-xs text-zinc-400 font-medium">Anlık veri akışı simülasyonu.</p>
          </div>

          {/* Search/Filter */}
          <div className="flex gap-3">
             <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex items-center bg-black rounded-xl border border-white/10 px-3 h-11">
                    <Search className="w-4 h-4 text-zinc-500 mr-2" />
                    <Input placeholder="Takım veya lig ara..." className="bg-transparent border-none h-full text-xs placeholder:text-zinc-600 focus-visible:ring-0 p-0" />
                </div>
             </div>
             <button className="w-11 h-11 bg-black border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:border-primary/30 transition-all shadow-lg active:scale-95">
                <Filter className="w-4 h-4" />
             </button>
          </div>

          {/* Live Matches List */}
          <div className="space-y-4">
             {mockMatches.map((match) => (
                <Card key={match.id} className="bg-zinc-900/40 border-white/5 overflow-hidden relative group hover:bg-zinc-900/60 transition-all duration-300">
                   {/* Live Indicator Bar */}
                   <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                   
                   <div className="p-5">
                      {/* League Header */}
                      <div className="flex items-center justify-between mb-5">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                               {match.league.country} <span className="text-zinc-600">/</span> {match.league.name}
                            </span>
                         </div>
                         <Badge variant="destructive" className="h-5 px-2.5 text-[9px] font-bold animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)] tracking-wider">
                            {match.time}
                         </Badge>
                      </div>

                      {/* Scoreboard */}
                      <div className="flex items-center justify-between gap-4 relative">
                         {/* Background VS */}
                         <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-display font-black text-white/[0.03] italic">VS</span>

                         {/* Home */}
                         <div className="flex-1 flex flex-col items-center gap-3 text-center z-10">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 bg-white/5 rounded-full blur-md" />
                                <img src={match.home.logo} className="w-full h-full object-contain relative" alt={match.home.name} />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight tracking-wide">{match.home.name}</span>
                         </div>

                         {/* Score */}
                         <div className="flex flex-col items-center justify-center w-24 shrink-0 z-10">
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-3xl font-display font-black text-white">{match.home.score}</span>
                                <span className="text-lg font-bold text-zinc-600">-</span>
                                <span className="text-3xl font-display font-black text-white">{match.away.score}</span>
                            </div>
                         </div>

                         {/* Away */}
                         <div className="flex-1 flex flex-col items-center gap-3 text-center z-10">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 bg-white/5 rounded-full blur-md" />
                                <img src={match.away.logo} className="w-full h-full object-contain relative" alt={match.away.name} />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight tracking-wide">{match.away.name}</span>
                         </div>
                      </div>

                      {/* Event Snippet */}
                      <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
                         <p className="text-[10px] text-zinc-400 flex items-center gap-2 font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                            {match.event}
                         </p>
                         <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-primary transition-colors" />
                      </div>
                   </div>
                </Card>
             ))}
          </div>
       </div>
    </MobileLayout>
  );
}
