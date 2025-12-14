import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Timer, Target } from "lucide-react";
import { useLocation } from "wouter";
import { getTeam } from "@/lib/teamsData";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

export function HeroPrediction() {
  const [, setLocation] = useLocation();
  
  // Hardcoded "Banko" match for demo
  const match = {
    id: "1", // Real Madrid vs Barcelona from mockData
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    prediction: "MS 1",
    odds: 2.15,
    league: "LA LIGA",
    time: "22:00",
    confidence: "high"
  };

  const homeTeamData = getTeam(match.homeTeam);
  const awayTeamData = getTeam(match.awayTeam);

  return (
    <div className="relative w-full h-[220px] rounded-2xl overflow-hidden cursor-pointer group shadow-2xl shadow-primary/20" onClick={() => setLocation(`/match/${match.id}`)}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
          style={{ backgroundImage: `url(${stadiumBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        {/* Header Badge */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Badge className="w-fit bg-primary text-black hover:bg-primary font-black uppercase tracking-widest text-[10px] px-2 py-0.5 animate-pulse">
              <Sparkles className="w-3 h-3 mr-1 fill-black" /> Günün Bankosu
            </Badge>
            <span className="text-[10px] font-bold text-white/60 ml-0.5 tracking-wider">{match.league} • {match.time}</span>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
             <span className="text-xs font-bold text-white flex items-center gap-1">
               <Timer className="w-3 h-3 text-primary" />
               <span className="tabular-nums">04:12:45</span>
             </span>
          </div>
        </div>

        {/* Match Info */}
        <div className="flex items-center gap-6 mt-2">
           <div className="flex flex-col items-center gap-2">
              <img src={homeTeamData.logo} alt={match.homeTeam} className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              <span className="text-[10px] font-bold text-white uppercase">{match.homeTeam.substring(0,3)}</span>
           </div>
           
           <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white/20 italic">VS</span>
           </div>

           <div className="flex flex-col items-center gap-2">
              <img src={awayTeamData.logo} alt={match.awayTeam} className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              <span className="text-[10px] font-bold text-white uppercase">{match.awayTeam.substring(0,3)}</span>
           </div>
        </div>

        {/* Footer / CTA */}
        <div className="flex items-end justify-between mt-auto">
           <div className="flex flex-col">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                 <Target className="w-3 h-3" /> Tahmin
              </span>
              <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-display font-black text-white">{match.prediction}</span>
                 <span className="text-sm font-bold text-primary bg-primary/10 px-2 rounded border border-primary/20">{match.odds.toFixed(2)}</span>
              </div>
           </div>

           <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90 font-bold text-xs h-8 px-4">
              İncele <ArrowRight className="w-3 h-3 ml-1" />
           </Button>
        </div>
      </div>
    </div>
  );
}
