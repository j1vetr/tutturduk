import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";
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
  const oddsValue = typeof prediction.odds === 'number' ? prediction.odds : parseFloat(prediction.odds as any) || 0;
  const leagueName = prediction.league_name || prediction.league_id || 'Lig';

  const statusConfig = {
    pending: { color: "text-white/40", icon: <Clock className="w-3.5 h-3.5" />, label: "Sonuç Bekleniyor" },
    won:     { color: "text-emerald-400", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Kazandı" },
    lost:    { color: "text-red-400", icon: <XCircle className="w-3.5 h-3.5" />, label: "Kaybetti" },
  };

  const confidenceConfig = {
    low:    { color: "text-white/50",   bg: "bg-white/5",      border: "border-white/10",      label: "Normal" },
    medium: { color: "text-blue-400",   bg: "bg-blue-500/10",  border: "border-blue-500/20",   label: "Güçlü" },
    high:   { color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20",label: "Banko" },
  };

  const cfg = confidenceConfig[confidence];
  const stCfg = statusConfig[status];

  return (
    <Card
      onClick={() => setLocation(`/mac/${prediction.id}`)}
      className="group relative border-white/[0.06] bg-[#111115] overflow-hidden hover:border-white/[0.14] transition-all duration-300 active:scale-[0.99] cursor-pointer shadow-md hover:shadow-xl"
      style={{ background: "linear-gradient(145deg, #131317 0%, #0e0e12 100%)" }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardContent className="p-0">
        {/* ── Header: Lig + saat ── */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            {prediction.league_logo && (
              <img src={prediction.league_logo} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />
            )}
            <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{leagueName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("h-5 px-2 text-[9px] font-bold uppercase tracking-wide border", cfg.bg, cfg.color, cfg.border)}>
              {cfg.label}
            </Badge>
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/35">
              <Clock className="w-3 h-3" />
              {prediction.match_time}
            </div>
          </div>
        </div>

        {/* ── Takımlar: yan yana büyük logolar ── */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-2">
            {/* Ev sahibi */}
            <div className="flex-1 flex flex-col items-center gap-2.5">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center p-2 group-hover:border-white/[0.12] transition-colors">
                {prediction.home_logo ? (
                  <img src={prediction.home_logo} alt={prediction.home_team} className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.opacity = '0.15'; }} />
                ) : (
                  <span className="text-xl font-black text-white/25">{prediction.home_team.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[12px] font-semibold text-white/85 text-center leading-tight line-clamp-2">{prediction.home_team}</span>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1 px-1">
              <span className="text-[22px] font-black text-white/[0.06] italic select-none">VS</span>
            </div>

            {/* Deplasman */}
            <div className="flex-1 flex flex-col items-center gap-2.5">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center p-2 group-hover:border-white/[0.12] transition-colors">
                {prediction.away_logo ? (
                  <img src={prediction.away_logo} alt={prediction.away_team} className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.opacity = '0.15'; }} />
                ) : (
                  <span className="text-xl font-black text-white/25">{prediction.away_team.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[12px] font-semibold text-white/85 text-center leading-tight line-clamp-2">{prediction.away_team}</span>
            </div>
          </div>
        </div>

        {/* ── Tahmin + Oran kutusu ── */}
        <div className="px-4 pb-4">
          <div className="flex items-stretch gap-2 rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.02]">
            {/* Tahmin */}
            <div className="flex-1 flex flex-col items-center justify-center py-3 px-3 border-r border-white/[0.07]">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Tahmin</span>
              <span className="text-[17px] font-bold text-white leading-none">{prediction.prediction}</span>
            </div>

            {/* İddaa logosu + oran — en belirgin alan */}
            <div className="flex flex-col items-center justify-center py-3 px-4 gap-1 min-w-[90px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <img src="/iddaa-logo.png" alt="iddaa" className="w-5 h-5 object-contain" />
                <span className="text-[9px] text-white/30 font-medium tracking-tight">iddaa.com</span>
              </div>
              <span className="text-[24px] font-black text-white leading-none num-display">{oddsValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Footer: sonuç + incele ── */}
        <div className="border-t border-white/[0.05] px-4 py-2.5 flex items-center justify-between">
          <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", stCfg.color)}>
            {stCfg.icon}
            {stCfg.label}
          </div>
          <div className="text-[10px] font-bold text-white/30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0">
            İncele <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
