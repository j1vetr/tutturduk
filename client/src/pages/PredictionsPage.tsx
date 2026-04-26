import { useState, useEffect, useMemo } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface PublishedMatch {
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
  is_featured?: boolean;
  best_bet?: {
    bet_type: string;
    confidence: number;
    risk_level: string;
    result: string;
    odds?: string;
  };
}

type LiveScore = {
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  status: string;
  statusShort: string;
};

type FilterKey = "all" | "live" | "upcoming" | "finished";

const LIVE_CODES = ["1H", "2H", "HT", "ET", "P", "BT"];
const FINISHED_CODES = ["FT", "AET", "PEN"];

function getMatchTimestamp(d: string, t: string) {
  return new Date(`${d}T${t.padStart(5, "0")}:00+03:00`).getTime();
}

/* derive status with timestamp fallback when live data is missing */
type MatchPhase = "live" | "finished" | "upcoming";
function getMatchPhase(m: PublishedMatch, live?: LiveScore): MatchPhase {
  if (live) {
    if (LIVE_CODES.includes(live.statusShort)) return "live";
    if (FINISHED_CODES.includes(live.statusShort)) return "finished";
  }
  const ts = getMatchTimestamp(m.match_date, m.match_time);
  const elapsed = Date.now() - ts;
  /* assume game ends ~2.25h after kickoff */
  if (elapsed > 2.25 * 3_600_000) return "finished";
  if (elapsed > 0) return "live";
  return "upcoming";
}

function formatRelative(matchDate: string, matchTime: string) {
  const ts = getMatchTimestamp(matchDate, matchTime);
  const diff = ts - Date.now();
  if (diff < 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h < 1) return `${m} dk`;
  if (h < 24) return `${h}s ${m}d`;
  return `${Math.floor(h / 24)} gün`;
}

export default function PredictionsPage() {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<PublishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liveScores, setLiveScores] = useState<Record<number, LiveScore>>({});
  const [filter, setFilter] = useState<FilterKey>("all");

  /* fetch matches */
  const loadMatches = async () => {
    setError(false);
    try {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMatches(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  /* poll live scores */
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch("/api/matches/live-scores");
        if (res.ok) {
          const data = await res.json();
          setLiveScores(data.scores || {});
        }
      } catch {}
    };
    fetchLive();
    const i = setInterval(fetchLive, 180_000);
    return () => clearInterval(i);
  }, []);

  /* sort earliest first */
  const sorted = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          getMatchTimestamp(a.match_date, a.match_time) -
          getMatchTimestamp(b.match_date, b.match_time)
      ),
    [matches]
  );

  /* counters — phase-aware (uses timestamp fallback) */
  const counts = useMemo(() => {
    let live = 0;
    let finished = 0;
    let upcoming = 0;
    sorted.forEach((m) => {
      const phase = getMatchPhase(m, liveScores[m.fixture_id]);
      if (phase === "live") live++;
      else if (phase === "finished") finished++;
      else upcoming++;
    });
    return { all: sorted.length, live, finished, upcoming };
  }, [sorted, liveScores]);

  /* filter — phase-aware */
  const visible = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((m) => getMatchPhase(m, liveScores[m.fixture_id]) === filter);
  }, [sorted, liveScores, filter]);

  /* aggregate stats from best_bet */
  const aggregate = useMemo(() => {
    const withBet = sorted.filter((m) => m.best_bet);
    if (!withBet.length) return { count: 0, avgOdds: "—", avgConf: "—" };
    const odds = withBet
      .map((m) => parseFloat(m.best_bet!.odds || "0"))
      .filter((n) => n > 0);
    const conf = withBet
      .map((m) => m.best_bet!.confidence)
      .filter((n) => n > 0);
    const avgOdds =
      odds.length ? (odds.reduce((s, n) => s + n, 0) / odds.length).toFixed(2) : "—";
    const avgConf =
      conf.length ? `%${Math.round(conf.reduce((s, n) => s + n, 0) / conf.length)}` : "—";
    return { count: withBet.length, avgOdds, avgConf };
  }, [sorted]);

  /* group by time-of-day for visible list */
  const grouped = useMemo(() => {
    const groups: { label: string; items: PublishedMatch[] }[] = [];
    visible.forEach((m) => {
      const hour = parseInt(m.match_time.split(":")[0] || "0");
      let label = "Gece";
      if (hour >= 6 && hour < 12) label = "Sabah";
      else if (hour >= 12 && hour < 17) label = "Öğleden Sonra";
      else if (hour >= 17 && hour < 21) label = "Akşam";
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(m);
      else groups.push({ label, items: [m] });
    });
    return groups;
  }, [visible]);

  const dateLabel = format(new Date(), "d MMMM, EEEE", { locale: tr }).toUpperCase();
  const weekLabel = format(new Date(), "'HAFTA' w · yyyy", { locale: tr }).toUpperCase();

  return (
    <MobileLayout activeTab="predictions">
      <div className="space-y-9 pt-7 pb-2">
        {/* ════════ MASTHEAD ════════ */}
        <header className="animate-fade-in" data-testid="predictions-hero">
          <div className="flex items-center justify-between mb-4">
            <span className="eyebrow num-mono">{dateLabel}</span>
            <span className="eyebrow-tiny num-mono">{weekLabel}</span>
          </div>
          <h1 className="text-display-3xl text-white">
            Tahminler<span className="text-lime">.</span>
          </h1>
          <p className="mt-4 text-[14px] text-white/55 leading-relaxed max-w-[88%]">
            {sorted.length > 0
              ? `Bugün ${sorted.length} maç incelendi. Yalnızca güven oranı yüksek olanlar listede.`
              : "Bugün için yayında maç yok."}
          </p>
        </header>

        {/* ════════ STATS BAND ════════ */}
        {sorted.length > 0 && (
          <section className="surface rounded-2xl overflow-hidden" data-testid="section-summary">
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              <Stat label="Yayındaki Maç" value={String(sorted.length).padStart(2, "0")} />
              <Stat label="Ortalama Oran" value={aggregate.avgOdds} />
              <Stat label="Ortalama Güven" value={aggregate.avgConf} accent />
            </div>
          </section>
        )}

        {/* ════════ FILTER STRIP ════════ */}
        {sorted.length > 0 && (
          <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 min-w-max" data-testid="filter-strip">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="Hepsi"
                count={counts.all}
                testId="filter-all"
              />
              {counts.live > 0 && (
                <FilterChip
                  active={filter === "live"}
                  onClick={() => setFilter("live")}
                  label="Canlı"
                  count={counts.live}
                  live
                  testId="filter-live"
                />
              )}
              {counts.upcoming > 0 && (
                <FilterChip
                  active={filter === "upcoming"}
                  onClick={() => setFilter("upcoming")}
                  label="Yaklaşan"
                  count={counts.upcoming}
                  testId="filter-upcoming"
                />
              )}
              {counts.finished > 0 && (
                <FilterChip
                  active={filter === "finished"}
                  onClick={() => setFilter("finished")}
                  label="Bitti"
                  count={counts.finished}
                  testId="filter-finished"
                />
              )}
            </div>
          </div>
        )}

        {/* ════════ ERROR STATE ════════ */}
        {error && (
          <div className="surface rounded-2xl px-5 py-9 text-center" data-testid="error-predictions">
            <p className="font-display text-[18px] text-white mb-2">Bağlantı hatası.</p>
            <p className="text-[12.5px] text-white/45 mb-5">Maç verileri alınamadı.</p>
            <button
              onClick={() => {
                setLoading(true);
                loadMatches();
              }}
              className="btn-ghost inline-flex items-center gap-2 px-5 py-2.5 text-[12px]"
              data-testid="button-retry-predictions"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              Yeniden Dene
            </button>
          </div>
        )}

        {/* ════════ MATCH LIST ════════ */}
        {error ? null : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="surface rounded-2xl px-5 py-5 animate-pulse">
                <div className="h-2 bg-white/[0.05] rounded w-2/5 mb-4" />
                <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
                <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-5" />
                <div className="h-px bg-white/[0.05] mb-4" />
                <div className="h-7 bg-white/[0.05] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="surface rounded-2xl px-5 py-14 text-center" data-testid="empty-predictions">
            <p className="font-display text-[20px] text-white mb-2">Henüz maç yayında değil.</p>
            <p className="text-[12.5px] text-white/45 leading-relaxed max-w-[260px] mx-auto">
              Yeni analizler her gün saat 01:00'da yayınlanır.
            </p>
          </div>
        ) : !error && visible.length === 0 ? (
          <div className="surface rounded-2xl px-5 py-12 text-center" data-testid="empty-filter">
            <p className="font-display text-[16px] text-white/85">Bu filtrede maç yok.</p>
            <button
              onClick={() => setFilter("all")}
              className="mt-3 text-[12px] text-lime lime-underline"
              data-testid="button-clear-filter"
            >
              Tümünü Göster
            </button>
          </div>
        ) : (
          <div className="space-y-9" data-testid="match-list">
            {grouped.map((group, gIdx) => {
              const baseIndex =
                grouped.slice(0, gIdx).reduce((s, g) => s + g.items.length, 0) + 1;
              return (
                <section key={`${group.label}-${gIdx}`}>
                  {/* Group header */}
                  <div className="flex items-baseline justify-between mb-4 px-1">
                    <span className="eyebrow text-white/85">{group.label}</span>
                    <span className="eyebrow-tiny num-mono">
                      {String(group.items.length).padStart(2, "0")} MAÇ
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((match, idx) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        index={baseIndex + idx}
                        live={liveScores[match.fixture_id]}
                        onClick={() => setLocation(`/mac/${match.fixture_id}`)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ════════ FOOTER NOTE ════════ */}
        <div className="pt-5 text-center">
          <p className="text-[10.5px] text-white/30 leading-relaxed">
            Tahminler bilgi amaçlıdır. Bahis risk içerir. 18 yaş altına kapalıdır.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}

/* ───────── Sub-components ───────── */

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-5 text-center">
      <div className="eyebrow-tiny mb-2">{label}</div>
      <div
        className={`font-display tabular num-mono leading-none ${
          accent ? "text-lime" : "text-white"
        } text-[22px]`}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  live = false,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  live?: boolean;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-[12px] font-medium tracking-wide ${
        active
          ? "bg-lime text-[#0a0a0a]"
          : "bg-[#141416] text-white/70 hover:text-white border border-white/[0.06]"
      }`}
    >
      {live && !active && (
        <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse-soft" aria-hidden />
      )}
      <span>{label}</span>
      <span className="num-mono opacity-70">{String(count).padStart(2, "0")}</span>
    </button>
  );
}

function MatchRow({
  match,
  index,
  live,
  onClick,
}: {
  match: PublishedMatch;
  index: number;
  live?: LiveScore;
  onClick: () => void;
}) {
  const isLive = live && LIVE_CODES.includes(live.statusShort);
  const isFinished = live && FINISHED_CODES.includes(live.statusShort);
  const relative = !isLive && !isFinished ? formatRelative(match.match_date, match.match_time) : null;
  const bet = match.best_bet;
  const won = bet?.result === "won";
  const lost = bet?.result === "lost";

  return (
    <button
      onClick={onClick}
      data-testid={`match-card-${match.fixture_id}`}
      className="block w-full text-left bg-[#131316] hover:bg-[#1a1a1d] active:bg-[#1a1a1d] rounded-2xl px-5 py-5 transition-colors group"
    >
      {/* meta row */}
      <div className="flex items-baseline justify-between gap-3 mb-3.5">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="num-mono text-[10.5px] text-white/30 tabular">
            {String(index).padStart(2, "0")}
          </span>
          <span className="num-mono text-[12px] text-white/85 tabular">{match.match_time}</span>
          <span className="text-[10.5px] text-white/40 truncate uppercase tracking-[0.12em]">
            {match.league_name || "—"}
          </span>
        </div>

        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-lime/15">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse-soft" aria-hidden />
            <span className="text-[9.5px] text-lime tracking-[0.14em] uppercase font-semibold num-mono">
              {live!.statusShort === "HT" ? "Devre Arası" : `${live!.elapsed ?? 0}'`}
            </span>
          </span>
        ) : isFinished ? (
          <span className="text-[9.5px] text-white/35 tracking-[0.14em] uppercase">Bitti</span>
        ) : relative ? (
          <span className="text-[10.5px] text-white/55 num-mono tabular">{relative}</span>
        ) : null}
      </div>

      {/* teams */}
      <div className="mb-4">
        <p className="text-[15.5px] text-white leading-[1.2] font-medium truncate">
          {match.home_team}
        </p>
        <p className="text-[15.5px] text-white/60 leading-[1.2] font-medium truncate mt-0.5">
          {match.away_team}
        </p>
      </div>

      {/* score for live/finished */}
      {(isLive || isFinished) && live && (
        <div className="bt-hairline pt-4 mb-4 flex items-end justify-between">
          <div className="eyebrow-tiny">Skor</div>
          <div className="font-display num-mono tabular text-[22px] text-white leading-none">
            {live.homeGoals ?? 0}
            <span className="text-white/30 mx-2">—</span>
            {live.awayGoals ?? 0}
          </div>
        </div>
      )}

      {/* bet block */}
      {bet ? (
        <div className={`${(isLive || isFinished) ? "" : "bt-hairline pt-4"} flex items-end justify-between gap-3`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow-tiny">Tahmin</span>
              {won && (
                <span className="text-[9px] tracking-[0.14em] uppercase font-semibold text-lime">
                  · Tuttu
                </span>
              )}
              {lost && (
                <span className="text-[9px] tracking-[0.14em] uppercase font-semibold text-white/40">
                  · Tutmadı
                </span>
              )}
            </div>
            <div className="font-display text-[18px] text-white leading-tight truncate">
              {bet.bet_type}
              <span className={lost ? "text-red-400/80" : "text-lime"}>.</span>
            </div>
          </div>

          <div className="flex items-end gap-4 flex-shrink-0">
            {bet.odds && (
              <div className="text-right">
                <div className="eyebrow-tiny mb-0.5">Oran</div>
                <div className="num-mono text-[14px] text-white/90 tabular">
                  {parseFloat(bet.odds).toFixed(2)}
                </div>
              </div>
            )}
            {bet.confidence > 0 && (
              <div className="text-right">
                <div className="eyebrow-tiny mb-0.5">Güven</div>
                <div className="num-mono text-[14px] text-white/90 tabular">%{bet.confidence}</div>
              </div>
            )}
            <ArrowUpRight
              className="w-4 h-4 text-white/35 group-hover:text-lime group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all self-end mb-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>
      ) : (
        !(isLive || isFinished) && (
          <div className="bt-hairline pt-4 flex items-center justify-between">
            <span className="text-[11.5px] text-white/40">Detaylar için aç</span>
            <ArrowUpRight
              className="w-4 h-4 text-white/35 group-hover:text-lime transition-all"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        )
      )}
    </button>
  );
}
