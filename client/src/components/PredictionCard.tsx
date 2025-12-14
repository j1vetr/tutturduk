import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, ChevronRight, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { Prediction } from "@/lib/mockData";
import { getTeam } from "@/lib/teamsData";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface PredictionCardProps {
  prediction: Prediction;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const [, setLocation] = useLocation();
  const homeTeam = getTeam(prediction.homeTeam);
  const awayTeam = getTeam(prediction.awayTeam);

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
    low: { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-transparent", label: "Normal Analiz" },
    medium: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Güçlü Tahmin" },
    high: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", label: "Banko Kupon" },
  };

  return (
    <Card 
      onClick={() => setLocation(`/match/${prediction.id}`)}
      className="group relative border-border/40 bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-md"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-0">
        {/* League & Time Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/5">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{prediction.league}</span>
           </div>
           
           <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px] font-bold uppercase border", confidenceConfig[prediction.confidence].bg, confidenceConfig[prediction.confidence].color, confidenceConfig[prediction.confidence].border)}>
                 {confidenceConfig[prediction.confidence].label}
              </Badge>
              <div className="text-[10px] font-mono font-medium text-muted-foreground">
                 {prediction.time}
              </div>
           </div>
        </div>

        {/* Teams & Matchup */}
        <div className="p-5">
           <div className="flex items-center justify-between gap-2 mb-6">
              {/* Home */}
              <div className="flex-1 flex flex-col items-center gap-3">
                 <div className="relative w-14 h-14 transition-transform group-hover:scale-110 duration-300">
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-full h-full object-contain drop-shadow-md" />
                 </div>
                 <span className="text-xs font-bold text-center leading-tight line-clamp-2 h-8 flex items-center">{prediction.homeTeam}</span>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center px-2">
                 <span className="text-2xl font-display font-black text-muted-foreground/20 italic select-none">VS</span>
              </div>

              {/* Away */}
              <div className="flex-1 flex flex-col items-center gap-3">
                 <div className="relative w-14 h-14 transition-transform group-hover:scale-110 duration-300">
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-full h-full object-contain drop-shadow-md" />
                 </div>
                 <span className="text-xs font-bold text-center leading-tight line-clamp-2 h-8 flex items-center">{prediction.awayTeam}</span>
              </div>
           </div>

           {/* Prediction Action Bar */}
           <div className="flex items-center gap-3 p-1 bg-muted/10 rounded-xl border border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="flex-1 flex flex-col items-center justify-center py-2 border-r border-border/50">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Tahmin</span>
                 <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-base font-display font-bold text-foreground">{prediction.prediction}</span>
                 </div>
              </div>

              <div className="w-20 flex flex-col items-center justify-center py-2 bg-card rounded-lg border border-border/50 shadow-sm mx-1">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Oran</span>
                 <span className="text-base font-display font-bold text-primary">{prediction.odds.toFixed(2)}</span>
              </div>
           </div>
        </div>

        {/* Footer Status */}
        <div className="bg-muted/5 border-t border-border/30 px-4 py-2 flex items-center justify-between">
            <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", statusColor[prediction.status])}>
               {statusIcon[prediction.status]}
               {prediction.status === 'pending' ? 'Sonuç Bekleniyor' : prediction.status === 'won' ? 'Kazandı' : 'Kaybetti'}
            </div>
            
            <div className="text-[10px] font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
               İncele <ChevronRight className="w-3 h-3" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
