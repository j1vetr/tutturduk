import { MobileLayout } from "@/components/MobileLayout";
import { PredictionCard } from "@/components/PredictionCard";
import { HeroPrediction } from "@/components/HeroPrediction";
import { MOCK_PREDICTIONS } from "@/lib/mockData";
import { ShieldAlert } from "lucide-react";

export default function HomePage() {
  const activePredictions = MOCK_PREDICTIONS.filter(p => p.status === "pending" || p.status === "won" || p.status === "lost"); // Show all for demo

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6">
        <HeroPrediction />
        
        <div className="space-y-2">
          <h2 className="text-xl font-display text-foreground border-l-4 border-primary pl-3">Günün Tahminleri</h2>
          <p className="text-xs text-muted-foreground pl-4">Yapay zeka destekli analizler ve uzman yorumları.</p>
        </div>

        <div className="space-y-4">
          {activePredictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))}
        </div>

        <div className="mt-8 p-4 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Bu platform yatırım/tahmin garantisi vermez. Paylaşılan içerikler bilgilendirme amaçlıdır. 
              Bahis oynamak risk içerir ve bağımlılık yapabilir. 18 yaşından küçükler kullanamaz.
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
