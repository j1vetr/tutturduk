import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, ChevronRight, TrendingUp } from "lucide-react";
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

  const confidenceColor = {
    low: "bg-muted/50 text-muted-foreground border-transparent",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <Card 
      onClick={() => setLocation(`/match/${prediction.id}`)}
      className="group relative border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden hover:border-primary/30 transition-all active:scale-[0.98] cursor-pointer"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

      <CardContent className="p-0">
        {/* Header Section */}
        <div className="flex items-center justify-between p-3 border-b border-border/50 bg-black/20">
          <div className="flex items-center gap-2">
             <div className="w-1 h-4 bg-primary rounded-full" />
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{prediction.league}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/80">
            <span>{prediction.date}</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            <span>{prediction.time}</span>
          </div>
        </div>

        {/* Match Info */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
             {/* Home Team */}
             <div className="flex-1 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-lg backdrop-blur-sm">
                   <img src={homeTeam.logo} alt={homeTeam.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">{prediction.homeTeam}</span>
             </div>

             {/* VS / Score */}
             <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground/50">VS</span>
             </div>

             {/* Away Team */}
             <div className="flex-1 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-lg backdrop-blur-sm">
                   <img src={awayTeam.logo} alt={awayTeam.name} className="w-full h-full object-contain" />
                </div>
                 <span className="text-xs font-medium text-foreground leading-tight">{prediction.awayTeam}</span>
             </div>
          </div>

          {/* Prediction Box */}
          <div className="flex items-stretch gap-2">
            <div className="flex-1 bg-primary/5 border border-primary/20 rounded-lg p-2 flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 blur-sm" />
               <span className="text-[10px] text-primary/80 uppercase font-bold relative z-10">Tahmin</span>
               <span className="text-lg font-display font-bold text-primary relative z-10">{prediction.prediction}</span>
            </div>
            
            <div className="w-20 bg-card border border-border rounded-lg p-2 flex flex-col items-center justify-center">
               <span className="text-[10px] text-muted-foreground uppercase font-bold">Oran</span>
               <span className="text-lg font-display font-bold text-white">{prediction.odds.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className={cn("h-6 px-2 text-[10px]", confidenceColor[prediction.confidence])}>
              <TrendingUp className="w-3 h-3 mr-1" />
              {prediction.confidence === "high" ? "Yüksek Güven" : "Analiz"}
            </Badge>

            <div className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider", statusColor[prediction.status])}>
               {statusIcon[prediction.status]}
               {prediction.status === 'pending' ? 'Beklemede' : prediction.status === 'won' ? 'Kazandı' : 'Kaybetti'}
            </div>
          </div>
        </div>

        {/* View Details Action */}
        <div className="bg-primary/5 p-2 text-center border-t border-primary/10 group-hover:bg-primary/10 transition-colors">
           <span className="text-[10px] font-bold text-primary flex items-center justify-center gap-1">
             DETAYLI ANALİZİ GÖR <ChevronRight className="w-3 h-3" />
           </span>
        </div>
      </CardContent>
    </Card>
  );
}
