import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Timer, Target, TrendingUp, BarChart3, Info } from "lucide-react";
import { useLocation } from "wouter";
import { getTeam } from "@/lib/teamsData";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

export function HeroPrediction() {
  const [, setLocation] = useLocation();
  
  // Hardcoded "Banko" match for demo
  const match = {
    id: "1", // Real Madrid vs Barcelona
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    prediction: "MS 1",
    odds: 2.15,
    league: "LA LIGA",
    time: "22:00",
    confidence: 88,
    analysis: "Real Madrid evinde son 5 maçtır kaybetmiyor. Barcelona savunma hattında eksikler var.",
    probabilities: { home: 65, draw: 20, away: 15 }
  };

  const homeTeamData = getTeam(match.homeTeam);
  const awayTeamData = getTeam(match.awayTeam);

  return (
    <div className="relative w-full h-[380px] rounded-[2rem] overflow-hidden cursor-pointer group shadow-[0_20px_50px_-12px_rgba(0,0,0,1)] border border-white/5" onClick={() => setLocation(`/match/${match.id}`)}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110"
          style={{ backgroundImage: `url(${stadiumBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
      </div>

      {/* Content Container */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
        
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <Badge className="bg-primary text-black hover:bg-primary font-black uppercase tracking-widest text-[10px] px-3 py-1 animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.4)]">
                  <Sparkles className="w-3 h-3 mr-1.5 fill-black" /> Günün Bankosu
                </Badge>
                <Badge variant="outline" className="text-[10px] font-bold text-white/80 border-white/10 bg-black/20 backdrop-blur-md">
                   {match.league}
                </Badge>
             </div>
             <p className="text-[10px] text-gray-400 font-medium pl-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Yapay zeka güven oranı: <span className="text-primary font-bold">%{match.confidence}</span>
             </p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
             <span className="text-xs font-bold text-white flex items-center gap-1.5">
               <Timer className="w-3.5 h-3.5 text-primary animate-pulse" />
               <span className="tabular-nums tracking-wider">22:00</span>
             </span>
          </div>
        </div>

        {/* Main Match Visual */}
        <div className="flex-1 flex flex-col justify-center py-4">
           <div className="flex items-center justify-between gap-4 px-2">
              {/* Home Team */}
              <div className="flex flex-col items-center gap-4 group/team w-1/3">
                 <div className="relative w-20 h-20 transition-transform duration-500 group-hover/team:scale-110">
                    <div className="absolute inset-0 bg-blue-500/20 blur-[30px] rounded-full opacity-50 group-hover/team:opacity-100 transition-opacity" />
                    <img src={homeTeamData.logo} alt={match.homeTeam} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10" />
                 </div>
                 <div className="text-center space-y-1">
                    <span className="text-lg font-display font-black text-white uppercase leading-none block">{match.homeTeam}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ev Sahibi</span>
                 </div>
              </div>
              
              {/* VS Center */}
              <div className="flex flex-col items-center justify-center w-1/3 -mt-6">
                 <span className="text-[4rem] font-display font-black text-white/5 italic select-none absolute">VS</span>
                 <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-1 shadow-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tahmin</span>
                    <span className="text-3xl font-display font-black text-primary drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">{match.prediction}</span>
                    <div className="bg-primary text-black text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                       <TrendingUp className="w-3 h-3" />
                       {match.odds.toFixed(2)}
                    </div>
                 </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center gap-4 group/team w-1/3">
                 <div className="relative w-20 h-20 transition-transform duration-500 group-hover/team:scale-110">
                    <div className="absolute inset-0 bg-red-500/20 blur-[30px] rounded-full opacity-50 group-hover/team:opacity-100 transition-opacity" />
                    <img src={awayTeamData.logo} alt={match.awayTeam} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10" />
                 </div>
                 <div className="text-center space-y-1">
                    <span className="text-lg font-display font-black text-white uppercase leading-none block">{match.awayTeam}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Deplasman</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Footer Stats & Analysis */}
        <div className="space-y-4">
           {/* Probability Bar */}
           <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider px-1">
                 <span className="text-blue-400">MS 1 %{match.probabilities.home}</span>
                 <span className="text-gray-500">BER %{match.probabilities.draw}</span>
                 <span className="text-red-400">MS 2 %{match.probabilities.away}</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full flex overflow-hidden">
                 <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${match.probabilities.home}%` }} />
                 <div className="h-full bg-gray-500" style={{ width: `${match.probabilities.draw}%` }} />
                 <div className="h-full bg-red-500" style={{ width: `${match.probabilities.away}%` }} />
              </div>
           </div>

           {/* Analysis Text & CTA */}
           <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/5 flex items-center justify-between gap-4 group-hover:bg-white/10 transition-colors">
              <div className="flex items-start gap-2">
                 <BarChart3 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                 <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    <span className="text-white font-bold">Analiz:</span> {match.analysis}
                 </p>
              </div>
              <Button size="icon" className="h-8 w-8 rounded-full bg-primary text-black hover:bg-white hover:text-black transition-all shrink-0">
                 <ArrowRight className="w-4 h-4" />
              </Button>
           </div>
        </div>

      </div>
    </div>
  );
}
