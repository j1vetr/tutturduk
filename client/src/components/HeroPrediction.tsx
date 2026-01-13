import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface FeaturedMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date: string;
  match_time: string;
  api_advice?: string;
  api_winner_name?: string;
  api_percent_home?: string;
  api_percent_draw?: string;
  api_percent_away?: string;
}

export function HeroPrediction() {
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<FeaturedMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, isLive: false });
  
  useEffect(() => {
    fetch('/api/matches/featured')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setMatch(data);
      })
      .catch(err => console.error('Failed to load featured match:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!match) return;
    
    const calculateTime = () => {
      const [hours, minutes] = match.match_time.split(':').map(Number);
      const matchDateTime = new Date(match.match_date);
      matchDateTime.setHours(hours, minutes, 0, 0);
      const now = new Date();
      const diff = matchDateTime.getTime() - now.getTime();
      
      if (diff < 0 && diff > -2 * 60 * 60 * 1000) {
        setTimeLeft({ hours: 0, minutes: 0, isLive: true });
      } else if (diff > 0) {
        setTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          isLive: false
        });
      }
    };
    
    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [match]);

  if (loading) {
    return (
      <div className="w-full h-48 rounded-2xl bg-zinc-900 animate-pulse" />
    );
  }
  
  if (!match) return null;

  const homePercent = parseInt(match.api_percent_home?.replace('%', '') || '0');
  const drawPercent = parseInt(match.api_percent_draw?.replace('%', '') || '0');
  const awayPercent = parseInt(match.api_percent_away?.replace('%', '') || '0');

  return (
    <div 
      className="w-full rounded-2xl overflow-hidden cursor-pointer bg-zinc-900 border border-zinc-800" 
      onClick={() => setLocation(`/match/${match.id}`)}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Öne çıkan maç</span>
          <span className="text-zinc-700">•</span>
          {match.league_logo && <img src={match.league_logo} className="w-4 h-4" alt="" />}
          <span className="text-xs text-zinc-500">{match.league_name}</span>
        </div>
        {timeLeft.isLive ? (
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold">Canlı</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500">
            {timeLeft.hours > 0 ? `${timeLeft.hours} saat ${timeLeft.minutes} dk` : `${timeLeft.minutes} dk`}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 p-2 flex items-center justify-center">
              {match.home_logo ? (
                <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg font-bold text-white">{match.home_team.substring(0, 2)}</span>
              )}
            </div>
            <div>
              <p className="text-white font-bold">{match.home_team}</p>
              <p className="text-[11px] text-zinc-600">Ev sahibi</p>
            </div>
          </div>

          <div className="px-6 text-center">
            <p className="text-2xl font-black text-white">{match.match_time}</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {new Date(match.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="text-right">
              <p className="text-white font-bold">{match.away_team}</p>
              <p className="text-[11px] text-zinc-600">Deplasman</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-zinc-800 p-2 flex items-center justify-center">
              {match.away_logo ? (
                <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg font-bold text-white">{match.away_team.substring(0, 2)}</span>
              )}
            </div>
          </div>
        </div>

        {(homePercent > 0 || awayPercent > 0) && (
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-emerald-400 font-bold">{homePercent}%</span>
              <span className="text-zinc-600">{drawPercent}%</span>
              <span className="text-zinc-400 font-bold">{awayPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full flex overflow-hidden">
              <div className="bg-emerald-500 rounded-l-full" style={{ width: `${homePercent}%` }} />
              <div className="bg-zinc-600" style={{ width: `${drawPercent}%` }} />
              <div className="bg-zinc-400 rounded-r-full" style={{ width: `${awayPercent}%` }} />
            </div>
          </div>
        )}

        {match.api_winner_name && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-400 font-medium text-center">
              {match.api_winner_name} kazanır
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
