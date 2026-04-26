import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowUpRight } from "lucide-react";

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
    fetch("/api/matches/featured")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setMatch(data); })
      .catch((err) => console.error("Failed to load featured match:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!match) return;
    const calculateTime = () => {
      const [hours, minutes] = match.match_time.split(":").map(Number);
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
          isLive: false,
        });
      }
    };
    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [match]);

  if (loading) {
    return <div className="w-full h-44 rounded-[20px] bg-white/[0.02] border border-white/[0.05] animate-pulse" />;
  }
  if (!match) return null;

  const homePercent = parseInt(match.api_percent_home?.replace("%", "") || "0");
  const drawPercent = parseInt(match.api_percent_draw?.replace("%", "") || "0");
  const awayPercent = parseInt(match.api_percent_away?.replace("%", "") || "0");
  const primaryBet = match.predictions?.find((p) => p.bet_category === "primary");
  const altBet = match.predictions?.find((p) => p.bet_category === "alternative");

  const timeText = timeLeft.isLive
    ? "Canlı"
    : timeLeft.hours > 0
    ? `${timeLeft.hours}s ${timeLeft.minutes}d`
    : `${timeLeft.minutes}d`;

  return (
    <button
      onClick={() => setLocation(`/mac/${match.fixture_id}`)}
      className="block w-full text-left premium-card-elevated rounded-[20px] p-5 active:scale-[0.995] transition-transform group"
      data-testid="card-hero-prediction"
    >
      {/* top label row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {timeLeft.isLive ? (
            <span className="label-meta-sm text-emerald-300/90 uppercase tracking-[0.16em]">
              Canlı Yayın
            </span>
          ) : (
            <span className="label-meta-sm uppercase tracking-[0.16em]">Öne Çıkan</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] text-white/40 truncate max-w-[140px]">{match.league_name}</span>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[10.5px] text-white/55 num-display tracking-wider">{timeText}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-2.5 mb-5">
        <TeamRow logo={match.home_logo} name={match.home_team} />
        <div className="flex items-center gap-3 pl-[26px]">
          <span className="text-[10px] text-white/25 italic font-serif-display">vs</span>
          <span className="text-[10px] text-white/40 num-display">{match.match_time}</span>
        </div>
        <TeamRow logo={match.away_logo} name={match.away_team} />
      </div>

      {/* Probability bar */}
      {(homePercent > 0 || awayPercent > 0) && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <Prob value={homePercent} side="home" />
            <Prob value={drawPercent} side="draw" />
            <Prob value={awayPercent} side="away" />
          </div>
          <div className="h-[3px] flex rounded-full overflow-hidden bg-white/[0.05]">
            <div className="bg-white/80" style={{ width: `${homePercent}%` }} />
            <div className="bg-white/30" style={{ width: `${drawPercent}%` }} />
            <div className="bg-white/55" style={{ width: `${awayPercent}%` }} />
          </div>
        </div>
      )}

      {/* divider */}
      <div className="h-px bg-white/[0.06] mb-4" />

      {/* Bets */}
      {(primaryBet || altBet) && (
        <div className="grid grid-cols-2 gap-3">
          {primaryBet && (
            <div className="flex flex-col gap-1.5">
              <span className="label-meta-sm">Ana Tahmin</span>
              <span className="font-serif-display italic text-[16px] text-white">{primaryBet.bet_type}</span>
            </div>
          )}
          {altBet && (
            <div className="flex flex-col gap-1.5">
              <span className="label-meta-sm">Alternatif</span>
              <span className="font-serif-display italic text-[16px] text-white/85">{altBet.bet_type}</span>
            </div>
          )}
        </div>
      )}

      {/* footer cta */}
      <div className="flex items-center justify-end gap-1.5 mt-5 pt-4 border-t border-white/[0.05]">
        <span className="text-[11px] text-white/55 font-medium tracking-wide">Detaylı analiz</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} />
      </div>
    </button>
  );
}

function TeamRow({ logo, name }: { logo?: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[18px] h-[18px] rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
        {logo ? (
          <img src={logo} alt="" className="w-3 h-3 object-contain" />
        ) : (
          <span className="text-[8px] text-white/55 font-medium">{name.slice(0, 1)}</span>
        )}
      </div>
      <span className="text-[15.5px] text-white/95 font-medium truncate -tracking-[0.005em]">{name}</span>
    </div>
  );
}

function Prob({ value, side }: { value: number; side: "home" | "draw" | "away" }) {
  const labels = { home: "Ev", draw: "Beraberlik", away: "Deplasman" };
  return (
    <div className={`flex flex-col gap-0.5 ${side === "draw" ? "items-center" : side === "away" ? "items-end" : ""}`}>
      <span className="text-[9px] text-white/35 uppercase tracking-[0.14em] font-medium">{labels[side]}</span>
      <span className="text-[12.5px] text-white/85 num-display">%{value}</span>
    </div>
  );
}
