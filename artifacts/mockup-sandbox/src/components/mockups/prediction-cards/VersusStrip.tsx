import { ArrowUpRight } from "lucide-react";
import "./_group.css";

type Bet = {
  bet_type: string;
  confidence: number;
  odds: string;
  result?: "won" | "lost" | "pending";
};

type Match = {
  index: number;
  fixture_id: number;
  match_time: string;
  league_name: string;
  league_logo: string;
  home_team: string;
  away_team: string;
  home_logo: string;
  away_logo: string;
  status?: "upcoming" | "live" | "finished";
  elapsed?: number;
  home_score?: number;
  away_score?: number;
  relative?: string;
  best_bet: Bet;
};

const matches: Match[] = [
  {
    index: 1,
    fixture_id: 1,
    match_time: "21:30",
    league_name: "Süper Lig",
    league_logo: "https://media.api-sports.io/football/leagues/203.png",
    home_team: "Galatasaray",
    away_team: "Fenerbahçe",
    home_logo: "https://media.api-sports.io/football/teams/645.png",
    away_logo: "https://media.api-sports.io/football/teams/611.png",
    status: "upcoming",
    relative: "1s 14d",
    best_bet: { bet_type: "2.5 Üst", confidence: 78, odds: "1.72", result: "pending" },
  },
  {
    index: 2,
    fixture_id: 2,
    match_time: "23:00",
    league_name: "La Liga",
    league_logo: "https://media.api-sports.io/football/leagues/140.png",
    home_team: "Real Madrid",
    away_team: "Atletico Madrid",
    home_logo: "https://media.api-sports.io/football/teams/541.png",
    away_logo: "https://media.api-sports.io/football/teams/530.png",
    status: "live",
    elapsed: 63,
    home_score: 2,
    away_score: 1,
    best_bet: { bet_type: "KG Var", confidence: 74, odds: "1.65", result: "won" },
  },
  {
    index: 3,
    fixture_id: 3,
    match_time: "22:45",
    league_name: "Premier Lig",
    league_logo: "https://media.api-sports.io/football/leagues/39.png",
    home_team: "Manchester City",
    away_team: "Arsenal",
    home_logo: "https://media.api-sports.io/football/teams/50.png",
    away_logo: "https://media.api-sports.io/football/teams/42.png",
    status: "finished",
    home_score: 1,
    away_score: 1,
    best_bet: { bet_type: "Çifte Şans 1X", confidence: 72, odds: "1.58", result: "won" },
  },
  {
    index: 4,
    fixture_id: 4,
    match_time: "20:00",
    league_name: "Serie A",
    league_logo: "https://media.api-sports.io/football/leagues/135.png",
    home_team: "Inter",
    away_team: "Juventus",
    home_logo: "https://media.api-sports.io/football/teams/505.png",
    away_logo: "https://media.api-sports.io/football/teams/496.png",
    status: "upcoming",
    relative: "Yarın",
    best_bet: { bet_type: "1.5 Üst İY", confidence: 70, odds: "1.85", result: "pending" },
  },
];

function MatchCardVersus({ match }: { match: Match }) {
  const { status, best_bet: bet } = match;
  const isLive = status === "live";
  const isFinished = status === "finished";
  const won = bet.result === "won";
  const lost = bet.result === "lost";

  return (
    <button
      data-testid={`match-card-${match.fixture_id}`}
      className="tt-card block w-full text-left px-5 py-5 group"
    >
      {/* meta row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="tt-mono text-[10.5px] text-white/30 tt-tabular">
            {String(match.index).padStart(2, "0")}
          </span>
          <img
            src={match.league_logo}
            alt=""
            className="w-3.5 h-3.5 object-contain opacity-70 grayscale"
          />
          <span className="text-[10.5px] text-white/45 truncate uppercase tracking-[0.12em]">
            {match.league_name}
          </span>
        </div>

        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#d4ff00]/15">
            <span className="w-1.5 h-1.5 rounded-full tt-bg-lime tt-pulse" />
            <span className="text-[9.5px] tt-text-lime tracking-[0.14em] uppercase font-semibold tt-mono">
              {match.elapsed}'
            </span>
          </span>
        ) : isFinished ? (
          <span className="text-[9.5px] text-white/35 tracking-[0.14em] uppercase">Bitti</span>
        ) : (
          <span className="text-[10.5px] text-white/55 tt-mono tt-tabular">
            {match.match_time}
          </span>
        )}
      </div>

      {/* versus strip — single row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="tt-logo-plate w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
          <img src={match.home_logo} alt={match.home_team} className="w-7 h-7 object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 leading-[1.15]">
            <span className="text-[14.5px] text-white font-medium truncate">
              {match.home_team}
            </span>
            {(isLive || isFinished) && (
              <span className="tt-display tt-mono tt-tabular text-[15px] text-white font-semibold flex-shrink-0">
                {match.home_score}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 leading-[1.15] mt-1">
            <span className="text-[14.5px] text-white/55 font-medium truncate">
              {match.away_team}
            </span>
            {(isLive || isFinished) && (
              <span className="tt-display tt-mono tt-tabular text-[15px] text-white/55 font-semibold flex-shrink-0">
                {match.away_score}
              </span>
            )}
          </div>
        </div>

        <div className="tt-logo-plate w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
          <img src={match.away_logo} alt={match.away_team} className="w-7 h-7 object-contain" />
        </div>
      </div>

      {/* bet block */}
      <div className="tt-bt-hairline pt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="tt-eyebrow-tiny">Tahmin</span>
            {won && (
              <span className="text-[9px] tracking-[0.14em] uppercase font-semibold tt-text-lime">
                · Tuttu
              </span>
            )}
            {lost && (
              <span className="text-[9px] tracking-[0.14em] uppercase font-semibold text-white/40">
                · Tutmadı
              </span>
            )}
          </div>
          <div className="tt-display text-[18px] text-white leading-tight truncate font-medium">
            {bet.bet_type}
            <span className={lost ? "text-red-400/80" : "tt-text-lime"}>.</span>
          </div>
        </div>

        <div className="flex items-end gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="tt-eyebrow-tiny mb-0.5">Oran</div>
            <div className="tt-mono text-[14px] text-white/90 tt-tabular">
              {parseFloat(bet.odds).toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="tt-eyebrow-tiny mb-0.5">Güven</div>
            <div className="tt-mono text-[14px] text-white/90 tt-tabular">%{bet.confidence}</div>
          </div>
          <ArrowUpRight
            className="w-4 h-4 text-white/35 group-hover:tt-text-lime transition-all self-end mb-0.5"
            strokeWidth={2}
          />
        </div>
      </div>
    </button>
  );
}

export function VersusStrip() {
  return (
    <div className="tt-page p-4">
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="tt-display text-[22px] text-white font-semibold tracking-tight">
            Tahminler
          </h1>
          <span className="tt-mono text-[11px] text-white/40 tt-tabular">04 / 35</span>
        </div>
        <p className="text-[11px] text-white/40 tracking-[0.06em]">
          Yön 2 — Versus Strip
        </p>
      </div>

      <div className="space-y-3">
        {matches.map((m) => (
          <MatchCardVersus key={m.fixture_id} match={m} />
        ))}
      </div>
    </div>
  );
}
