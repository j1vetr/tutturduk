import { AlertTriangle } from "lucide-react";

interface ModelOddsProps {
  homePercent: number;
  drawPercent: number;
  awayPercent: number;
  homeTeam: string;
  awayTeam: string;
  odds?: {
    home?: string;
    draw?: string;
    away?: string;
  };
}

function oddsToImpliedProb(odds: string): number {
  const o = parseFloat(odds);
  if (isNaN(o) || o <= 0) return 0;
  return (1 / o) * 100;
}

export function ModelOddsComparison({ homePercent, drawPercent, awayPercent, homeTeam, awayTeam, odds }: ModelOddsProps) {
  if (!odds || (!odds.home && !odds.away)) {
    return null;
  }

  const homeOdds = parseFloat(odds.home || '0');
  const awayOdds = parseFloat(odds.away || '0');

  if (homeOdds <= 0 && awayOdds <= 0) return null;

  const modelFavorite = homePercent > awayPercent ? 'home' : awayPercent > homePercent ? 'away' : 'draw';
  const marketFavorite = homeOdds < awayOdds ? 'home' : awayOdds < homeOdds ? 'away' : 'draw';

  const homeImplied = oddsToImpliedProb(odds.home || '0');
  const awayImplied = oddsToImpliedProb(odds.away || '0');

  const homeDiff = Math.abs(homePercent - homeImplied);
  const awayDiff = Math.abs(awayPercent - awayImplied);
  const significantDiff = homeDiff > 15 || awayDiff > 15;

  const hasMismatch = modelFavorite !== marketFavorite || significantDiff;

  if (!hasMismatch) return null;

  let insight = "";
  if (modelFavorite === 'home' && marketFavorite === 'away') {
    insight = `Model ${homeTeam}'i öne çıkarırken, oranlar ${awayTeam}'i favori gösteriyor.`;
  } else if (modelFavorite === 'away' && marketFavorite === 'home') {
    insight = `Model ${awayTeam}'i öne çıkarırken, oranlar ${homeTeam}'i favori gösteriyor.`;
  } else if (significantDiff) {
    if (homeDiff > awayDiff) {
      insight = `${homeTeam} için model (%${homePercent}) ve oranlar (%${Math.round(homeImplied)}) arasında belirgin fark var.`;
    } else {
      insight = `${awayTeam} için model (%${awayPercent}) ve oranlar (%${Math.round(awayImplied)}) arasında belirgin fark var.`;
    }
  }

  return (
    <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold mb-1">
            Model & Oran Karşılaştırması
          </div>
          <p className="text-sm text-zinc-300">{insight}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-zinc-500 mb-1">Model Tahmini</div>
              <div className="flex justify-between">
                <span className="text-white">{homeTeam}</span>
                <span className="text-emerald-400 font-bold">{homePercent}%</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-white">{awayTeam}</span>
                <span className="text-zinc-400 font-bold">{awayPercent}%</span>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-zinc-500 mb-1">Oran Olasılığı</div>
              <div className="flex justify-between">
                <span className="text-white">{homeTeam}</span>
                <span className="text-emerald-400 font-bold">{homeImplied > 0 ? `${Math.round(homeImplied)}%` : '-'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-white">{awayTeam}</span>
                <span className="text-zinc-400 font-bold">{awayImplied > 0 ? `${Math.round(awayImplied)}%` : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
