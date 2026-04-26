import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { HeroPrediction } from "@/components/HeroPrediction";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

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

function getTimeInfo(matchDate: string, matchTime: string) {
  const matchISOString = `${matchDate}T${matchTime.padStart(5, "0")}:00+03:00`;
  const matchDateTime = new Date(matchISOString);
  const now = new Date();
  const diff = matchDateTime.getTime() - now.getTime();
  if (diff < 0 && diff > -2 * 60 * 60 * 1000) return { text: "Canlı", isLive: true, isPast: false };
  if (diff < 0) return { text: "Bitti", isLive: false, isPast: true };
  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hoursLeft < 1) return { text: `${minutesLeft}d`, isLive: false, isPast: false };
  if (hoursLeft < 24) return { text: `${hoursLeft}s ${minutesLeft}d`, isLive: false, isPast: false };
  return { text: `${Math.floor(hoursLeft / 24)} gün`, isLive: false, isPast: false };
}

export default function PredictionsPage() {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<PublishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveScores, setLiveScores] = useState<Record<number, LiveScore>>({});
  const [showAll, setShowAll] = useState(false);
  const perPage = 20;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/matches");
        if (res.ok) {
          const data = await res.json();
          setMatches(data.filter((m: PublishedMatch) => !m.is_featured));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    const i = setInterval(fetchLive, 180000);
    return () => clearInterval(i);
  }, []);

  const sorted = [...matches].sort((a, b) => {
    const at = new Date(`${a.match_date}T${a.match_time.padStart(5, "0")}:00+03:00`).getTime();
    const bt = new Date(`${b.match_date}T${b.match_time.padStart(5, "0")}:00+03:00`).getTime();
    return at - bt;
  });

  const visible = showAll ? sorted : sorted.slice(0, perPage);
  const hasMore = sorted.length > perPage && !showAll;

  // Group by approximate hour bucket for visual rhythm
  const grouped: { label: string; items: PublishedMatch[] }[] = [];
  visible.forEach((m) => {
    const hour = parseInt(m.match_time.split(":")[0] || "0");
    let label = "Gece";
    if (hour >= 6 && hour < 12) label = "Sabah";
    else if (hour >= 12 && hour < 17) label = "Öğleden Sonra";
    else if (hour >= 17 && hour < 21) label = "Akşam";
    else if (hour >= 21) label = "Gece";

    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.items.push(m);
    else grouped.push({ label, items: [m] });
  });

  return (
    <MobileLayout activeTab="predictions">
      <div className="space-y-7 pt-3">
        {/* MASTHEAD */}
        <header className="pt-2">
          <span className="label-meta-sm">Tahminler</span>
          <h1 className="font-serif-display text-[30px] sm:text-[34px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
            Günün <span className="italic text-white/85">analizleri</span>.
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-white/45 num-display">
              {sorted.length.toString().padStart(2, "0")} maç
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-[11px] text-white/45">Değer ≥%5</span>
          </div>
        </header>

        {/* HERO */}
        <HeroPrediction />

        {/* MATCH LIST */}
        <section>
          <SectionLabel left="Tüm Maçlar" right={`${sorted.length}`} />

          {loading ? (
            <div className="premium-card rounded-[18px] overflow-hidden divide-y divide-white/[0.05]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-2 bg-white/[0.04] rounded w-1/3 mb-2.5" />
                  <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="premium-card rounded-[18px] px-5 py-12 text-center">
              <p className="font-serif-display text-[20px] text-white/80 italic">Henüz maç yok.</p>
              <p className="text-[12px] text-white/40 mt-2 font-light">
                Yeni analizler her gün saat 01:00'da yayınlanır.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group, gIdx) => (
                <div key={gIdx}>
                  <div className="flex items-center gap-3 mb-3 px-1">
                    <span className="label-meta">{group.label}</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="label-meta-sm">{group.items.length.toString().padStart(2, "0")}</span>
                  </div>

                  <div className="premium-card rounded-[18px] overflow-hidden divide-y divide-white/[0.05]">
                    {group.items.map((match) => {
                      const live = liveScores[match.fixture_id];
                      const isLive = live && ["1H", "2H", "HT", "ET", "P", "BT"].includes(live.statusShort);
                      const isFinished = live && ["FT", "AET", "PEN"].includes(live.statusShort);
                      const time = getTimeInfo(match.match_date, match.match_time);
                      return (
                        <button
                          key={match.id}
                          onClick={() => setLocation(`/match/${match.fixture_id}`)}
                          className="w-full text-left px-5 py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors group"
                          data-testid={`match-card-${match.id}`}
                        >
                          {/* meta row */}
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] text-white/40 truncate uppercase tracking-[0.14em] font-medium max-w-[200px]">
                              {match.league_name || "Lig"}
                            </span>
                            {isLive ? (
                              <div className="flex items-center gap-1.5">
                                <span className="status-dot status-dot-live animate-pulse-soft" />
                                <span className="text-[10px] text-emerald-300/85 font-medium tracking-[0.14em] uppercase">
                                  {live.statusShort === "HT" ? "İlk Yarı" : `${live.elapsed}'`}
                                </span>
                              </div>
                            ) : isFinished ? (
                              <span className="text-[10px] text-white/35 uppercase tracking-[0.14em]">Bitti</span>
                            ) : (
                              <span className="text-[10.5px] text-white/55 num-display tracking-wider">
                                {time.text}
                              </span>
                            )}
                          </div>

                          {/* teams */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-white/95 font-medium leading-tight truncate">
                                {match.home_team}
                              </p>
                              <p className="text-[14px] text-white/95 font-medium leading-tight truncate mt-0.5">
                                {match.away_team}
                              </p>
                            </div>

                            {/* score or time */}
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[44px]">
                              {(isLive || isFinished) ? (
                                <>
                                  <span className="num-display text-[16px] text-white leading-none">
                                    {live.homeGoals ?? 0}
                                  </span>
                                  <span className="num-display text-[16px] text-white leading-none">
                                    {live.awayGoals ?? 0}
                                  </span>
                                </>
                              ) : (
                                <span className="num-display text-[12.5px] text-white/55 tracking-wider">
                                  {match.match_time}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* prediction strip */}
                          {match.best_bet && (
                            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                              <div className="flex items-baseline gap-2.5 min-w-0">
                                <span className="label-meta-sm">Tahmin</span>
                                <span className="font-serif-display italic text-[14px] text-white/95 truncate">
                                  {match.best_bet.bet_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {match.best_bet.odds && (
                                  <span className="num-display text-[12.5px] text-white/55">
                                    {parseFloat(match.best_bet.odds).toFixed(2)}
                                  </span>
                                )}
                                {match.best_bet.confidence >= 60 && (
                                  <span className="num-display text-[11px] text-white/75">
                                    %{match.best_bet.confidence}
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex flex-col items-center gap-3 pt-2">
                  <span className="label-meta-sm">
                    {visible.length} / {sorted.length}
                  </span>
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-6 py-3 rounded-full border border-white/[0.10] hover:border-white/[0.22] text-[12px] text-white/85 tracking-wide transition-colors"
                    data-testid="button-show-all"
                  >
                    Tüm maçları göster
                  </button>
                </div>
              )}

              {showAll && sorted.length > perPage && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowAll(false)}
                    className="text-[11px] text-white/45 underline underline-offset-4 hover:text-white/75 transition-colors"
                  >
                    Daha az göster
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* DISCLAIMER */}
        <p className="text-[10.5px] text-white/35 leading-relaxed text-center font-light pt-3">
          Bu platform yatırım garantisi vermez. Bahis risk içerir. 18 yaş altı kullanımı yasaktır.
        </p>
      </div>
    </MobileLayout>
  );
}

function SectionLabel({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mb-3">
      <span className="label-meta">{left}</span>
      {typeof right === "string" ? <span className="label-meta-sm num-display">{right}</span> : right}
    </div>
  );
}
