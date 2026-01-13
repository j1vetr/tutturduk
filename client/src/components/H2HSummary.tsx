interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

interface H2HSummaryProps {
  h2h: H2HMatch[];
  homeTeam: string;
  awayTeam: string;
}

export function H2HSummary({ h2h, homeTeam, awayTeam }: H2HSummaryProps) {
  if (!h2h || h2h.length === 0) return null;

  const last5 = h2h.slice(0, 5);
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let totalGoals = 0;
  let bttsCount = 0;

  last5.forEach(match => {
    const homeIsHome = match.homeTeam.toLowerCase().includes(homeTeam.toLowerCase().substring(0, 4));
    const hGoals = match.homeGoals;
    const aGoals = match.awayGoals;
    totalGoals += hGoals + aGoals;
    
    if (hGoals > 0 && aGoals > 0) bttsCount++;

    if (hGoals > aGoals) {
      if (homeIsHome) homeWins++; else awayWins++;
    } else if (aGoals > hGoals) {
      if (homeIsHome) awayWins++; else homeWins++;
    } else {
      draws++;
    }
  });

  const avgGoals = (totalGoals / last5.length).toFixed(1);
  const bttsPercent = Math.round((bttsCount / last5.length) * 100);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">H2H Özeti (Son 5 Maç)</div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-zinc-800 rounded-lg p-3">
          <div className="text-lg font-bold text-emerald-400">{homeWins}</div>
          <div className="text-[10px] text-zinc-500">{homeTeam} Galibiyet</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3">
          <div className="text-lg font-bold text-zinc-400">{draws}</div>
          <div className="text-[10px] text-zinc-500">Beraberlik</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3">
          <div className="text-lg font-bold text-zinc-300">{awayWins}</div>
          <div className="text-[10px] text-zinc-500">{awayTeam} Galibiyet</div>
        </div>
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800">
        <div className="text-center flex-1">
          <span className="text-sm font-bold text-white">{avgGoals}</span>
          <span className="text-[10px] text-zinc-500 ml-1">ort. gol</span>
        </div>
        <div className="text-center flex-1 border-l border-zinc-800">
          <span className="text-sm font-bold text-white">{bttsPercent}%</span>
          <span className="text-[10px] text-zinc-500 ml-1">KG var</span>
        </div>
        <div className="text-center flex-1 border-l border-zinc-800">
          <span className="text-sm font-bold text-white">{last5.length}</span>
          <span className="text-[10px] text-zinc-500 ml-1">maç</span>
        </div>
      </div>
    </div>
  );
}
