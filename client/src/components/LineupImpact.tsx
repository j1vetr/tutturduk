interface LineupImpactProps {
  homeFormation?: string;
  awayFormation?: string;
  homeTeam: string;
  awayTeam: string;
}

function getFormationInsight(formation?: string): { type: 'defensive' | 'attacking' | 'neutral'; text: string } | null {
  if (!formation) return null;
  const f = formation.trim();
  
  if (f === '5-4-1' || f === '5-3-2' || f === '5-2-3') {
    return { type: 'defensive', text: 'Temkinli diziliş düşük tempoyu destekliyor' };
  }
  if (f === '4-3-3' || f === '3-4-3' || f === '4-2-3-1') {
    return { type: 'attacking', text: 'Ofansif diziliş gollü senaryoyu destekliyor' };
  }
  return null;
}

export function LineupImpact({ homeFormation, awayFormation, homeTeam, awayTeam }: LineupImpactProps) {
  const homeInsight = getFormationInsight(homeFormation);
  const awayInsight = getFormationInsight(awayFormation);

  if (!homeInsight && !awayInsight) return null;

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Kadro Etki Analizi</div>
      <div className="space-y-2">
        {homeInsight && (
          <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold ${
              homeInsight.type === 'attacking' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {homeFormation}
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-zinc-500">{homeTeam}</div>
              <div className="text-xs text-white">{homeInsight.text}</div>
            </div>
          </div>
        )}
        {awayInsight && (
          <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold ${
              awayInsight.type === 'attacking' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {awayFormation}
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-zinc-500">{awayTeam}</div>
              <div className="text-xs text-white">{awayInsight.text}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
