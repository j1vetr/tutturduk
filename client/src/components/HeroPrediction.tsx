import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Timer, TrendingUp, Clock } from "lucide-react";
import { useLocation } from "wouter";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

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
  
  useEffect(() => {
    fetch('/api/matches/featured')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setMatch(data);
      })
      .catch(err => console.error('Failed to load featured match:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[320px] rounded-2xl bg-zinc-900 animate-pulse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!match) {
    return null;
  }

  const homePercent = parseInt(match.api_percent_home?.replace('%', '') || '0');
  const drawPercent = parseInt(match.api_percent_draw?.replace('%', '') || '0');
  const awayPercent = parseInt(match.api_percent_away?.replace('%', '') || '0');

  return (
    <div 
      className="relative w-full h-[320px] rounded-2xl overflow-hidden cursor-pointer group shadow-lg border border-white/10" 
      onClick={() => setLocation(`/match/${match.id}`)}
    >
      <div className="absolute inset-0 bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[30s] ease-linear group-hover:scale-110 opacity-50"
          style={{ backgroundImage: `url(${stadiumBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
      </div>

      <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
            <Badge className="bg-primary text-black font-bold text-[9px] px-2 py-0.5">
              Öne Çıkan
            </Badge>
            {match.league_logo && <img src={match.league_logo} className="w-4 h-4" />}
            <span className="text-[10px] text-white/80">{match.league_name}</span>
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
            <Timer className="w-3 h-3 text-primary" />
            <span className="text-xs font-bold text-white">{match.match_time}</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col items-center gap-2 w-[35%]">
            <div className="w-16 h-16 rounded-xl bg-white/5 p-2 backdrop-blur-sm border border-white/10">
              {match.home_logo ? (
                <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
                  {match.home_team.substring(0, 2)}
                </div>
              )}
            </div>
            <span className="text-sm font-bold text-white text-center leading-tight">{match.home_team}</span>
          </div>
          
          <div className="flex flex-col items-center gap-2 w-[30%]">
            <div className="text-xs text-zinc-500">
              {new Date(match.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-center">
              <div className="text-3xl font-black text-primary">VS</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 w-[35%]">
            <div className="w-16 h-16 rounded-xl bg-white/5 p-2 backdrop-blur-sm border border-white/10">
              {match.away_logo ? (
                <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
                  {match.away_team.substring(0, 2)}
                </div>
              )}
            </div>
            <span className="text-sm font-bold text-white text-center leading-tight">{match.away_team}</span>
          </div>
        </div>

        <div className="space-y-3">
          {(homePercent > 0 || drawPercent > 0 || awayPercent > 0) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider px-1">
                <span className="text-emerald-400">%{homePercent}</span>
                <span className="text-zinc-500">%{drawPercent}</span>
                <span className="text-white">%{awayPercent}</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full flex overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${homePercent}%` }} />
                <div className="h-full bg-zinc-600" style={{ width: `${drawPercent}%` }} />
                <div className="h-full bg-white" style={{ width: `${awayPercent}%` }} />
              </div>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Uzman tavsiyesi</p>
                <p className="text-xs text-white/80 leading-snug truncate">
                  {match.api_winner_name ? `${match.api_winner_name} kazanır` : match.api_advice || 'Detaylar için tıklayın'}
                </p>
              </div>
            </div>
            <Button size="icon" className="h-8 w-8 rounded-full bg-primary text-black hover:bg-primary/80 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
