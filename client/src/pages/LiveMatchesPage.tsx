import { MobileLayout } from "@/components/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Filter, ArrowRight } from "lucide-react";
import { getTeam } from "@/lib/teamsData"; // Assuming we might map names to logos if they match

// Mock Data simulating RapidAPI API-Football response
const LIVE_MATCHES = [
  { 
    id: 101, 
    league: { name: "Süper Lig", country: "Turkey", logo: "https://media.api-sports.io/football/leagues/203.png" },
    home: { name: "Galatasaray", logo: "https://upload.wikimedia.org/wikipedia/commons/3/37/Galatasaray_Star_Logo.png", goals: 1 },
    away: { name: "Fenerbahçe", logo: "https://upload.wikimedia.org/wikipedia/tr/8/86/Fenerbah%C3%A7e_SK.png", goals: 1 },
    time: "78'",
    status: "2H",
    events: ["78' Gol - Icardi", "42' Gol - Dzeko"]
  },
  { 
    id: 102, 
    league: { name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
    home: { name: "Manchester City", logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg", goals: 2 },
    away: { name: "Liverpool", logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg", goals: 1 },
    time: "42'",
    status: "1H",
    events: ["12' Gol - Haaland", "38' Gol - Salah", "40' Gol - De Bruyne"]
  },
  { 
    id: 103, 
    league: { name: "Bundesliga", country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png" },
    home: { name: "Bayern Munich", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg", goals: 0 },
    away: { name: "Dortmund", logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg", goals: 0 },
    time: "12'",
    status: "1H",
    events: []
  },
  { 
    id: 104, 
    league: { name: "Serie A", country: "Italy", logo: "https://media.api-sports.io/football/leagues/135.png" },
    home: { name: "AC Milan", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg", goals: 1 },
    away: { name: "Inter", logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg", goals: 2 },
    time: "88'",
    status: "2H",
    events: ["10' Gol - Martinez", "55' Gol - Leao", "82' Gol - Thuram"]
  }
];

export default function LiveMatchesPage() {
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

          {/* Live Matches List */}
          <div className="space-y-4">
             {LIVE_MATCHES.map((match) => (
                <Card key={match.id} className="bg-zinc-900/50 border-white/10 overflow-hidden relative group">
                   {/* Live Indicator Bar */}
                   <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600 animate-pulse" />
                   
                   <div className="p-4">
                      {/* League Header */}
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                               {match.league.country} • {match.league.name}
                            </span>
                         </div>
                         <Badge variant="destructive" className="h-5 px-2 text-[9px] font-bold animate-pulse">
                            {match.time}
                         </Badge>
                      </div>

                      {/* Scoreboard */}
                      <div className="flex items-center justify-between gap-4">
                         {/* Home */}
                         <div className="flex-1 flex flex-col items-center gap-2 text-center">
                            <img src={match.home.logo} className="w-10 h-10 object-contain" alt={match.home.name} />
                            <span className="text-xs font-bold text-white leading-tight">{match.home.name}</span>
                         </div>

                         {/* Score */}
                         <div className="flex flex-col items-center justify-center w-20 shrink-0">
                            <div className="text-3xl font-display font-black text-white tracking-widest bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                               {match.home.goals}-{match.away.goals}
                            </div>
                            <span className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-widest">CANLI</span>
                         </div>

                         {/* Away */}
                         <div className="flex-1 flex flex-col items-center gap-2 text-center">
                            <img src={match.away.logo} className="w-10 h-10 object-contain" alt={match.away.name} />
                            <span className="text-xs font-bold text-white leading-tight">{match.away.name}</span>
                         </div>
                      </div>

                      {/* Latest Event Snippet */}
                      {match.events.length > 0 && (
                         <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                               <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                               Son Olay: <span className="text-white">{match.events[0]}</span>
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
