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
  predictions?: Array<{
    bet_type: string;
    confidence: number;
    bet_category: string;
  }>;
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
      <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" />
    );
  }
  
  if (!match) return null;

  const homePercent = parseInt(match.api_percent_home?.replace('%', '') || '0');
  const drawPercent = parseInt(match.api_percent_draw?.replace('%', '') || '0');
  const awayPercent = parseInt(match.api_percent_away?.replace('%', '') || '0');

  return (
    <div 
      className="w-full rounded-2xl overflow-hidden cursor-pointer bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow" 
      onClick={() => setLocation(`/match/${match.fixture_id}`)}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Öne çıkan maç</span>
          <span className="text-gray-300">•</span>
          {match.league_logo && <img src={match.league_logo} className="w-4 h-4" alt="" />}
          <span className="text-xs text-gray-500">{match.league_name}</span>
        </div>
        {timeLeft.isLive ? (
          <div className="flex items-center gap-1.5 text-red-500">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold">Canlı</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">
            {timeLeft.hours > 0 ? `${timeLeft.hours} saat ${timeLeft.minutes} dk` : `${timeLeft.minutes} dk`}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 p-2 mb-2">
              {match.home_logo ? (
                <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-600">
                  {match.home_team.substring(0, 2)}
                </div>
              )}
            </div>
            <p className="text-gray-800 font-bold text-sm leading-tight">{match.home_team}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Ev sahibi</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-black text-gray-800">{match.match_time}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Date(match.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 p-2 mb-2">
              {match.away_logo ? (
                <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-600">
                  {match.away_team.substring(0, 2)}
                </div>
              )}
            </div>
            <p className="text-gray-800 font-bold text-sm leading-tight">{match.away_team}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Deplasman</p>
          </div>
        </div>

        {(homePercent > 0 || awayPercent > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-emerald-600 font-bold">{homePercent}%</span>
              <span className="text-gray-400">{drawPercent}%</span>
              <span className="text-blue-600 font-bold">{awayPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full flex overflow-hidden">
              <div className="bg-emerald-500 rounded-l-full" style={{ width: `${homePercent}%` }} />
              <div className="bg-gray-300" style={{ width: `${drawPercent}%` }} />
              <div className="bg-blue-500 rounded-r-full" style={{ width: `${awayPercent}%` }} />
            </div>
          </div>
        )}

        {match.predictions && match.predictions.length > 0 && (
          <div className="mt-4 flex gap-2">
            {match.predictions.filter(p => p.bet_category === 'primary').map((pred, i) => (
              <div key={i} className="flex-1 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wide mb-0.5">Ana Tahmin</p>
                <p className="text-sm text-emerald-700 font-bold">{pred.bet_type}</p>
              </div>
            ))}
            {match.predictions.filter(p => p.bet_category === 'alternative').map((pred, i) => (
              <div key={i} className="flex-1 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Alternatif</p>
                <p className="text-sm text-blue-700 font-bold">{pred.bet_type}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
