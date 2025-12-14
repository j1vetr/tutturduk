import { useParams, useLocation } from "wouter";
import { MOCK_PREDICTIONS } from "@/lib/mockData";
import { getTeam } from "@/lib/teamsData";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, BrainCircuit, TrendingUp, BarChart, ShieldAlert } from "lucide-react";
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
        {/* Header with Image */}
        <div className="relative h-56 -mt-20 -mx-4 mb-6">
           <div 
             className="absolute inset-0 bg-cover bg-center"
             style={{ backgroundImage: `url(${stadiumBg})` }}
           />
           <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-background" />
           
           <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center gap-4 z-10">
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md" onClick={() => setLocation("/")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-white/80 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">{match.league}</span>
           </div>

           <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between z-10">
              <div className="flex-1 flex flex-col items-center">
                 <div className="w-16 h-16 mb-2 bg-white/10 rounded-full p-2 backdrop-blur-sm border border-white/10 shadow-lg">
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-full h-full object-contain" />
                 </div>
                 <div className="text-xl font-display font-bold text-white leading-tight text-center">{match.homeTeam}</div>
              </div>
              
              <div className="px-4 pb-8 flex flex-col items-center">
                 <div className="text-primary font-display text-2xl font-bold drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">VS</div>
                 <div className="text-xs text-white/60 font-medium mt-1 bg-black/40 px-2 py-0.5 rounded">{match.time}</div>
              </div>

              <div className="flex-1 flex flex-col items-center">
                 <div className="w-16 h-16 mb-2 bg-white/10 rounded-full p-2 backdrop-blur-sm border border-white/10 shadow-lg">
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-full h-full object-contain" />
                 </div>
                 <div className="text-xl font-display font-bold text-white leading-tight text-center">{match.awayTeam}</div>
              </div>
           </div>
        </div>

        {/* Prediction Hero */}
        <div className="flex gap-4 mb-8">
           <Card className="flex-1 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 p-4 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all" />
              <span className="text-xs font-bold text-primary mb-1 uppercase tracking-widest relative z-10">Tahmin</span>
              <span className="text-3xl font-display font-bold text-white relative z-10 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">{match.prediction}</span>
           </Card>
           
           <Card className="w-1/3 bg-card border-border p-4 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">Oran</span>
              <span className="text-3xl font-display font-bold text-white">{match.odds.toFixed(2)}</span>
           </Card>
        </div>

        {/* AI Analysis Section */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Yapay Zeka Analizi</h2>
           </div>
           
           <div className="bg-card border border-border p-5 rounded-xl space-y-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                 {match.analysis || match.comment}
              </p>
              
              <div className="flex items-center gap-2 pt-2">
                 <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Güven: {match.confidence === "high" ? "%85+" : match.confidence === "medium" ? "%70+" : "%60+"}
                 </Badge>
                 <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Risk: {match.confidence === "high" ? "Düşük" : "Orta"}
                 </Badge>
              </div>
           </div>

           {/* Stats Section (Mock Visuals) */}
           {match.homeStats && (
             <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <BarChart className="w-5 h-5 text-secondary" />
                  <h2 className="text-lg font-bold text-white">İstatistikler</h2>
               </div>

               <div className="bg-card border border-border p-5 rounded-xl space-y-6">
                  {/* Wins Bar */}
                  <div className="space-y-2">
                     <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                        <span>{match.homeTeam} Galibiyet</span>
                        <span>{match.awayTeam} Galibiyet</span>
                     </div>
                     <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                        <div className="bg-blue-500" style={{ width: `${(match.homeStats.wins / (match.homeStats.wins + match.awayStats!.wins)) * 100}%` }} />
                        <div className="bg-red-500" style={{ width: `${(match.awayStats!.wins / (match.homeStats!.wins + match.awayStats!.wins)) * 100}%` }} />
                     </div>
                  </div>

                  {/* Goals */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-2xl font-display font-bold text-white">{match.homeStats.goalsFor}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Atılan Gol ({match.homeTeam})</div>
                     </div>
                     <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-2xl font-display font-bold text-white">{match.awayStats?.goalsFor}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Atılan Gol ({match.awayTeam})</div>
                     </div>
                  </div>

                  {/* Form Guide */}
                  <div className="space-y-3">
                     <div className="text-xs font-bold text-muted-foreground uppercase text-center">Son 5 Maç Formu</div>
                     <div className="flex justify-between items-center gap-4">
                        <div className="flex gap-1">
                           {match.homeStats.last5.map((r, i) => (
                              <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black ${r === 'W' ? 'bg-secondary' : r === 'D' ? 'bg-yellow-500' : 'bg-destructive'}`}>{r}</div>
                           ))}
                        </div>
                        <div className="text-[10px] text-muted-foreground">vs</div>
                        <div className="flex gap-1">
                           {match.awayStats?.last5.map((r, i) => (
                              <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black ${r === 'W' ? 'bg-secondary' : r === 'D' ? 'bg-yellow-500' : 'bg-destructive'}`}>{r}</div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
             </div>
           )}

           {/* Disclaimer */}
           <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex gap-3 items-start">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-xs text-muted-foreground">
                 Bu istatistikler ve analizler bilgilendirme amaçlıdır. Maç sonucu garanti edilemez. Lütfen sorumlu bahis oynayınız.
              </p>
           </div>
        </div>
      </div>
    </MobileLayout>
  );
}
