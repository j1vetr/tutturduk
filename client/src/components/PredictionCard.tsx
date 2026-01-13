import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, ChevronRight, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface PredictionData {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_id: string;
  league_name?: string;
  league_logo?: string;
  prediction: string;
  odds: number;
  match_time: string;
  match_date: string | null;
  analysis: string | null;
  confidence?: string;
  is_hero: boolean;
  result: string;
  created_at: string;
}

interface PredictionCardProps {
  prediction: PredictionData;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const [, setLocation] = useLocation();

  const status = prediction.result as 'pending' | 'won' | 'lost';
  const confidence = (prediction.confidence || 'medium') as 'low' | 'medium' | 'high';

  const statusColor = {
    pending: "text-muted-foreground",
    won: "text-secondary",
    lost: "text-destructive",
  };

  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5" />,
    won: <CheckCircle2 className="w-3.5 h-3.5" />,
    lost: <XCircle className="w-3.5 h-3.5" />,
  };

  const confidenceConfig = {
    low: { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-transparent", label: "Normal" },
    medium: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Güçlü" },
    high: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", label: "Banko" },
  };

  const leagueName = prediction.league_name || prediction.league_id || 'Lig';
  const oddsValue = typeof prediction.odds === 'number' ? prediction.odds : parseFloat(prediction.odds as any) || 0;

  return (
    <Card 
      onClick={() => setLocation(`/match/${prediction.id}`)}
      className="group relative border-border/40 bg-card overflow-hidden hover:border-primary/50 transition-all duration-500 active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-2xl"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/5 group-hover:bg-muted/10 transition-colors">
           <div className="flex items-center gap-2">
              {prediction.league_logo && (
                <img src={prediction.league_logo} alt="" className="w-4 h-4 object-contain" />
              )}
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-white transition-colors">{leagueName}</span>
           </div>
           
           <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px] font-bold uppercase border transition-all duration-300", confidenceConfig[confidence].bg, confidenceConfig[confidence].color, confidenceConfig[confidence].border, "group-hover:scale-105")}>
                 {confidenceConfig[confidence].label}
              </Badge>
              <div className="text-[10px] font-mono font-medium text-muted-foreground flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded">
                 <Clock className="w-3 h-3 text-muted-foreground/50" />
                 {prediction.match_time}
              </div>
           </div>
        </div>

        <div className="p-5 relative">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

           <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex-1 flex flex-col items-center gap-3 group/team">
                 <div className="relative w-14 h-14 transition-transform group-hover/team:scale-110 duration-300 group-hover:scale-105">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover/team:opacity-100 transition-opacity" />
                    {prediction.home_logo ? (
                      <img src={prediction.home_logo} alt={prediction.home_team} className="w-full h-full object-contain drop-shadow-md relative z-10" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-lg font-bold text-white">
                        {prediction.home_team.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                 </div>
                 <span className="text-xs font-bold text-center leading-tight line-clamp-2 h-8 flex items-center group-hover:text-white transition-colors">{prediction.home_team}</span>
              </div>

              <div className="flex flex-col items-center justify-center px-2">
                 <span className="text-2xl font-display font-black text-muted-foreground/20 italic select-none group-hover:text-muted-foreground/40 transition-colors duration-500">VS</span>
              </div>

              <div className="flex-1 flex flex-col items-center gap-3 group/team">
                 <div className="relative w-14 h-14 transition-transform group-hover/team:scale-110 duration-300 group-hover:scale-105">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-0 group-hover/team:opacity-100 transition-opacity" />
                    {prediction.away_logo ? (
                      <img src={prediction.away_logo} alt={prediction.away_team} className="w-full h-full object-contain drop-shadow-md relative z-10" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-lg font-bold text-white">
                        {prediction.away_team.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                 </div>
                 <span className="text-xs font-bold text-center leading-tight line-clamp-2 h-8 flex items-center group-hover:text-white transition-colors">{prediction.away_team}</span>
              </div>
           </div>

           <div className="flex items-center gap-3 p-1 bg-muted/10 rounded-xl border border-border/50 relative overflow-hidden group-hover:border-primary/30 transition-colors duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              
              <div className="flex-1 flex flex-col items-center justify-center py-2 border-r border-border/50 relative">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5 group-hover:text-primary transition-colors">Tahmin</span>
                 <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-base font-display font-bold text-foreground group-hover:text-white transition-colors">{prediction.prediction}</span>
                 </div>
              </div>

              <div className="w-20 flex flex-col items-center justify-center py-2 bg-card rounded-lg border border-border/50 shadow-sm mx-1 group-hover:border-primary/20 transition-colors">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Oran</span>
                 <span className="text-base font-display font-bold text-primary">{oddsValue.toFixed(2)}</span>
              </div>
           </div>
        </div>

        <div className="bg-muted/5 border-t border-border/30 px-4 py-2 flex items-center justify-between group-hover:bg-primary/5 transition-colors duration-300">
            <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", statusColor[status])}>
               {statusIcon[status]}
               {status === 'pending' ? 'Sonuç Bekleniyor' : status === 'won' ? 'Kazandı' : 'Kaybetti'}
            </div>
            
            <div className="text-[10px] font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
               İncele <ChevronRight className="w-3 h-3" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
