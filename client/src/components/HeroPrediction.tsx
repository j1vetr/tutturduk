import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Timer, TrendingUp, BarChart3, Info } from "lucide-react";
import { useLocation } from "wouter";
import { getTeam } from "@/lib/teamsData";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

export function HeroPrediction() {
  const [, setLocation] = useLocation();
  
  // Hardcoded "Günün Tahmini" match for demo
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
    <div className="relative w-full h-[420px] rounded-[2.5rem] overflow-hidden cursor-pointer group shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10" onClick={() => setLocation(`/match/${match.id}`)}>
      {/* Dynamic Background with Overlay */}
      <div className="absolute inset-0 bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[30s] ease-linear group-hover:scale-110 opacity-60"
          style={{ backgroundImage: `url(${stadiumBg})` }}
        />
        {/* Complex Gradient Overlays for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      {/* Content Container */}
      <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
        
        {/* Top Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-1.5 pr-4 rounded-xl border border-white/5">
             <Badge className="bg-primary text-black hover:bg-primary font-black uppercase tracking-widest text-[10px] px-3 py-1.5 shadow-[0_0_15px_rgba(255,215,0,0.3)] border-none rounded-lg whitespace-nowrap">
                Günün Tahmini
             </Badge>
             <div className="h-4 w-[1px] bg-white/10" />
             <span className="text-[10px] font-bold text-white/90 tracking-wider uppercase whitespace-nowrap">{match.league}</span>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-lg flex items-center gap-2">
             <Timer className="w-3.5 h-3.5 text-primary animate-pulse" />
             <span className="text-xs font-bold text-white tabular-nums tracking-widest">{match.time}</span>
          </div>
        </div>

        {/* Main Match Visual - Centered & Large */}
        <div className="flex-1 flex flex-col justify-center py-6">
           <div className="flex items-center justify-between gap-2">
              {/* Home Team */}
              <div className="flex flex-col items-center gap-4 group/team w-[35%] transition-all duration-500 hover:scale-105">
                 <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-blue-600/30 blur-[40px] rounded-full opacity-60" />
                    <img src={homeTeamData.logo} alt={match.homeTeam} className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10" />
                 </div>
                 <div className="text-center space-y-1">
                    <span className="text-xl font-display font-black text-white uppercase leading-none block tracking-tight">{match.homeTeam}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] block opacity-60">Ev Sahibi</span>
                 </div>
              </div>
              
              {/* VS Center */}
              <div className="flex flex-col items-center justify-center w-[30%] relative">
                 <span className="text-[6rem] font-display font-black text-white/[0.03] italic select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150">VS</span>
                 
                 {/* Odds Card */}
                 <div className="relative z-10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tahmin</span>
                    <span className="text-4xl font-display font-black text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] leading-none">{match.prediction}</span>
                    <div className="mt-2 bg-primary text-black text-[10px] font-black px-3 py-1 rounded-md flex items-center gap-1.5 shadow-lg">
                       <TrendingUp className="w-3 h-3 stroke-[3]" />
                       <span className="text-sm">{match.odds.toFixed(2)}</span>
                    </div>
                 </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center gap-4 group/team w-[35%] transition-all duration-500 hover:scale-105">
                 <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-red-600/30 blur-[40px] rounded-full opacity-60" />
                    <img src={awayTeamData.logo} alt={match.awayTeam} className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10" />
                 </div>
                 <div className="text-center space-y-1">
                    <span className="text-xl font-display font-black text-white uppercase leading-none block tracking-tight">{match.awayTeam}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] block opacity-60">Deplasman</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Footer Stats & Analysis */}
        <div className="space-y-5 relative z-20">
           {/* Probability Bar - Sleek */}
           <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider px-1">
                 <span className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">MS 1 %{match.probabilities.home}</span>
                 <span className="text-zinc-500">BER %{match.probabilities.draw}</span>
                 <span className="text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">MS 2 %{match.probabilities.away}</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full flex overflow-hidden">
                 <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" style={{ width: `${match.probabilities.home}%` }} />
                 <div className="h-full bg-zinc-700" style={{ width: `${match.probabilities.draw}%` }} />
                 <div className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" style={{ width: `${match.probabilities.away}%` }} />
              </div>
           </div>

           {/* Analysis Text & CTA */}
           <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4 group-hover:border-primary/20 transition-colors shadow-lg">
              <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <BarChart3 className="w-4 h-4 text-primary" />
                 </div>
                 <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Yapay Zeka Analizi</p>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium line-clamp-1">
                       {match.analysis}
                    </p>
                 </div>
              </div>
              <Button size="icon" className="h-9 w-9 rounded-full bg-white text-black hover:bg-primary hover:text-black transition-all shrink-0 shadow-lg">
                 <ArrowRight className="w-4 h-4" />
              </Button>
           </div>
        </div>

      </div>
    </div>
  );
}
