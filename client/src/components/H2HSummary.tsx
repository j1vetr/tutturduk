import { Trophy } from "lucide-react";

interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

interface TeamStanding {
  rank: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  loses: number;
  goalsDiff: number;
}

interface H2HSummaryProps {
  h2h: H2HMatch[];
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeStanding?: TeamStanding;
  awayStanding?: TeamStanding;
}

export function H2HSummary({ h2h, homeTeam, awayTeam, homeLogo, awayLogo, homeStanding, awayStanding }: H2HSummaryProps) {
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
    <div className="space-y-4">
      {(homeStanding || awayStanding) && (
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Lig Sıralaması</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                {homeLogo && <img src={homeLogo} className="w-6 h-6" alt="" />}
                <span className="text-xs font-medium text-white truncate">{homeTeam}</span>
              </div>
              {homeStanding && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-emerald-500">{homeStanding.rank}.</span>
                    <span className="text-lg font-bold text-white">{homeStanding.points} puan</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="bg-zinc-900 rounded px-2 py-1">
                      <div className="text-xs font-bold text-emerald-400">{homeStanding.wins}</div>
                      <div className="text-[8px] text-zinc-500">G</div>
                    </div>
                    <div className="bg-zinc-900 rounded px-2 py-1">
                      <div className="text-xs font-bold text-zinc-400">{homeStanding.draws}</div>
                      <div className="text-[8px] text-zinc-500">B</div>
                    </div>
                    <div className="bg-zinc-900 rounded px-2 py-1">
                      <div className="text-xs font-bold text-red-400">{homeStanding.loses}</div>
                      <div className="text-[8px] text-zinc-500">M</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-center">
                    Averaj: <span className={homeStanding.goalsDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}>{homeStanding.goalsDiff > 0 ? '+' : ''}{homeStanding.goalsDiff}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                {awayLogo && <img src={awayLogo} className="w-6 h-6" alt="" />}
                <span className="text-xs font-medium text-white truncate">{awayTeam}</span>
              </div>
              {awayStanding && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-white">{awayStanding.rank}.</span>
                    <span className="text-lg font-bold text-white">{awayStanding.points} puan</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="bg-zinc-900 rounded px-2 py-1">
                      <div className="text-xs font-bold text-emerald-400">{awayStanding.wins}</div>
                      <div className="text-[8px] text-zinc-500">G</div>
                    </div>
                    <div className="bg-zinc-900 rounded px-2 py-1">
                      <div className="text-xs font-bold text-zinc-400">{awayStanding.draws}</div>
                      <div className="text-[8px] text-zinc-500">B</div>
                    </div>
                    <div className="bg-zinc-900 rounded px-2 py-1">
                      <div className="text-xs font-bold text-red-400">{awayStanding.loses}</div>
                      <div className="text-[8px] text-zinc-500">M</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-center">
                    Averaj: <span className={awayStanding.goalsDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}>{awayStanding.goalsDiff > 0 ? '+' : ''}{awayStanding.goalsDiff}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
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
    </div>
  );
}
