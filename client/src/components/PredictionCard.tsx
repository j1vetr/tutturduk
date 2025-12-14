import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, BarChart3 } from "lucide-react";
import { Prediction } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface PredictionCardProps {
  prediction: Prediction;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const statusColor = {
    pending: "text-muted-foreground",
    won: "text-secondary",
    lost: "text-destructive",
  };

  const statusIcon = {
    pending: <Clock className="w-4 h-4" />,
    won: <CheckCircle2 className="w-4 h-4" />,
    lost: <XCircle className="w-4 h-4" />,
  };

  const statusText = {
    pending: "Beklemede",
    won: "Kazandı",
    lost: "Kaybetti",
  };

  const confidenceColor = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    high: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{prediction.league}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{prediction.date}</span>
          <span>{prediction.time}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-foreground">{prediction.match}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background/50 rounded-lg p-3 border border-border flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground mb-1">Tahmin</span>
            <span className="text-lg font-bold text-primary">{prediction.prediction}</span>
          </div>
          <div className="bg-background/50 rounded-lg p-3 border border-border flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground mb-1">Oran</span>
            <span className="text-lg font-bold text-white">{prediction.odds.toFixed(2)}</span>
          </div>
        </div>

        {prediction.comment && (
          <div className="bg-muted/30 p-3 rounded-md border-l-2 border-primary">
            <p className="text-sm text-muted-foreground italic">"{prediction.comment}"</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Badge variant="outline" className={cn("border", confidenceColor[prediction.confidence])}>
            <BarChart3 className="w-3 h-3 mr-1" />
            Güven: {prediction.confidence === "high" ? "Yüksek" : prediction.confidence === "medium" ? "Orta" : "Düşük"}
          </Badge>
          
          <div className={cn("flex items-center gap-1.5 text-sm font-medium", statusColor[prediction.status])}>
            {statusIcon[prediction.status]}
            {statusText[prediction.status]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
