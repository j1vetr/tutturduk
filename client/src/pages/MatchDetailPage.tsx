import { useParams, useLocation } from "wouter";
import { MOCK_PREDICTIONS } from "@/lib/mockData";
import { getTeam } from "@/lib/teamsData";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, BrainCircuit, TrendingUp, BarChart, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const match = MOCK_PREDICTIONS.find(p => p.id === id);

  if (!match) {
    setLocation("/");
    return null;
  }

  const homeTeam = getTeam(match.homeTeam);
  const awayTeam = getTeam(match.awayTeam);

  return (
    <MobileLayout>
      <div className="pb-8 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Unique Header Design */}
        <div className="relative h-[300px] -mt-20 -mx-4 mb-6 overflow-hidden">
           {/* Dynamic Background with Team Colors */}
           <div className="absolute inset-0 bg-black">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
                style={{ backgroundImage: `url(${stadiumBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
           </div>
           
           {/* Navigation */}
           <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center justify-between z-20">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md" onClick={() => setLocation("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/5 text-xs font-bold text-white/80 uppercase tracking-widest">
                {match.league}
              </div>
              <div className="w-10" /> {/* Spacer for balance */}
           </div>

           {/* Main Versus Content */}
           <div className="absolute inset-0 flex items-center justify-center z-10 pt-10">
              <div className="w-full px-6 flex items-center justify-between gap-4">
                  {/* Home Team (Left) */}
                  <div className="flex flex-col items-center gap-4 animate-in slide-in-from-left-8 duration-700">
                      <div className="relative w-24 h-24">
                          <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                          <div className="relative w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 duration-300">
                             <img src={homeTeam.logo} alt={homeTeam.name} className="w-full h-full object-contain" />
                          </div>
                      </div>
                      <div className="text-center">
                          <h2 className="text-lg font-display font-black text-white leading-none mb-1 tracking-wide">{match.homeTeam.split(' ')[0]}</h2>
                          <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-white/60">EV SAHİBİ</Badge>
                      </div>
                  </div>

                  {/* VS Badge (Center) */}
                  <div className="flex flex-col items-center gap-2 -mt-8">
                      <div className="text-4xl font-display font-black italic text-white/10 select-none">VS</div>
                      <div className="px-3 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-bold tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                        {match.time}
                      </div>
                  </div>

                  {/* Away Team (Right) */}
                  <div className="flex flex-col items-center gap-4 animate-in slide-in-from-right-8 duration-700">
                      <div className="relative w-24 h-24">
                          <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                          <div className="relative w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 duration-300">
                             <img src={awayTeam.logo} alt={awayTeam.name} className="w-full h-full object-contain" />
                          </div>
                      </div>
                      <div className="text-center">
                          <h2 className="text-lg font-display font-black text-white leading-none mb-1 tracking-wide">{match.awayTeam.split(' ')[0]}</h2>
                          <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-white/60">DEPLASMAN</Badge>
                      </div>
                  </div>
              </div>
           </div>
        </div>

        {/* Prediction Hero Card - Unique Design */}
        <div className="relative mx-1 mb-8">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent blur-xl" />
           <Card className="relative bg-black/40 border-primary/20 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="p-5 flex items-center justify-between">
                 <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                       <span className="text-xs font-bold text-primary uppercase tracking-widest">Yapay Zeka Tahmini</span>
                    </div>
                    <div className="text-3xl font-display font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                       {match.prediction}
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Bahis Oranı</span>
                    <div className="text-3xl font-display font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                       {match.odds.toFixed(2)}
                    </div>
                 </div>
              </div>
              
              {/* Analysis Snippet */}
              <div className="px-5 pb-5 pt-0">
                 <p className="text-sm text-gray-400 border-l-2 border-white/10 pl-3 italic">
                    "{match.comment}"
                 </p>
              </div>
           </Card>
        </div>

        {/* AI Analysis Section */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 px-1">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Detaylı Maç Analizi</h2>
           </div>
           
           <div className="bg-card/50 border border-border/50 p-6 rounded-2xl space-y-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                 <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                       <span>Güven Seviyesi</span>
                       <span className="text-primary">{match.confidence === "high" ? "%85+" : match.confidence === "medium" ? "%70+" : "%60+"}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full ${match.confidence === 'high' ? 'bg-primary' : match.confidence === 'medium' ? 'bg-yellow-500' : 'bg-orange-500'}`}
                         style={{ width: match.confidence === 'high' ? '85%' : match.confidence === 'medium' ? '70%' : '60%' }} 
                       />
                    </div>
                 </div>
                 
                 <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                       <span>Risk Faktörü</span>
                       <span className="text-blue-400">{match.confidence === "high" ? "Düşük" : "Orta"}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                       <div 
                         className="h-full rounded-full bg-blue-500"
                         style={{ width: match.confidence === 'high' ? '20%' : '50%' }} 
                       />
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                 <p className="text-sm text-gray-300 leading-relaxed">
                    {match.analysis}
                 </p>
              </div>
           </div>

           {/* Stats Visualizer */}
           {match.homeStats && (
             <div className="space-y-4">
               <div className="flex items-center gap-2 px-1">
                  <BarChart className="w-5 h-5 text-secondary" />
                  <h2 className="text-lg font-bold text-white">Takım İstatistikleri</h2>
               </div>

               <div className="grid gap-4">
                  {/* Head to Head Card */}
                  <Card className="bg-card/50 border-border/50 p-5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Trophy className="w-24 h-24" />
                      </div>
                      
                      <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Galibiyet Olasılığı</h3>
                      
                      <div className="flex items-end gap-2 h-32 px-4">
                         <div className="flex-1 flex flex-col items-center gap-2 group">
                            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{match.homeStats.wins}G</span>
                            <div className="w-full bg-blue-500/80 rounded-t-lg transition-all hover:bg-blue-500 relative" style={{ height: `${(match.homeStats.wins / 20) * 100}%` }}>
                               <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-white">{match.homeTeam.substring(0,3).toUpperCase()}</div>
                            </div>
                         </div>
                         <div className="flex-1 flex flex-col items-center gap-2 group">
                             <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{match.homeStats.draws}B</span>
                             <div className="w-full bg-gray-500/50 rounded-t-lg transition-all hover:bg-gray-500 relative" style={{ height: `${(match.homeStats.draws / 20) * 100}%` }}>
                                <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-white">BER</div>
                             </div>
                         </div>
                         <div className="flex-1 flex flex-col items-center gap-2 group">
                             <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{match.awayStats!.wins}G</span>
                             <div className="w-full bg-red-500/80 rounded-t-lg transition-all hover:bg-red-500 relative" style={{ height: `${(match.awayStats!.wins / 20) * 100}%` }}>
                                <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-white">{match.awayTeam.substring(0,3).toUpperCase()}</div>
                             </div>
                         </div>
                      </div>
                  </Card>

                  {/* Form Guide */}
                  <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-card/50 border-border/50 p-4">
                          <div className="flex items-center gap-2 mb-3">
                             <img src={homeTeam.logo} className="w-6 h-6 object-contain" />
                             <span className="text-xs font-bold text-muted-foreground">Son 5 Maç</span>
                          </div>
                          <div className="flex justify-between">
                             {match.homeStats.last5.map((r, i) => (
                                <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black ${r === 'W' ? 'bg-secondary' : r === 'D' ? 'bg-yellow-500' : 'bg-destructive'}`}>{r}</div>
                             ))}
                          </div>
                      </Card>
                      
                      <Card className="bg-card/50 border-border/50 p-4">
                          <div className="flex items-center gap-2 mb-3">
                             <img src={awayTeam.logo} className="w-6 h-6 object-contain" />
                             <span className="text-xs font-bold text-muted-foreground">Son 5 Maç</span>
                          </div>
                          <div className="flex justify-between">
                             {match.awayStats?.last5.map((r, i) => (
                                <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black ${r === 'W' ? 'bg-secondary' : r === 'D' ? 'bg-yellow-500' : 'bg-destructive'}`}>{r}</div>
                             ))}
                          </div>
                      </Card>
                  </div>
               </div>
             </div>
           )}

           {/* Disclaimer */}
           <div className="bg-destructive/5 border border-destructive/10 p-4 rounded-xl flex gap-3 items-start mt-8">
              <ShieldAlert className="w-5 h-5 text-destructive/50 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                 Bu istatistikler ve yapay zeka analizleri yalnızca bilgilendirme amaçlıdır. Bahis oynamak risk içerir ve bağımlılık yapabilir. Lütfen sorumlu oyun prensiplerine uyunuz.
              </p>
           </div>
        </div>
      </div>
    </MobileLayout>
  );
}
