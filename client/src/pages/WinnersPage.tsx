import { useState, useEffect, useMemo, useRef } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowUpRight, RefreshCw, Trash2, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { format, parseISO, isToday, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  id: number;
  bet_type: string;
  bet_category?: string;
  odds?: number;
  risk_level: string;
  result: string;
  confidence: number;
}

interface Match {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  league_name?: string;
  match_date?: string;
  match_time?: string;
  status: string;
  final_score_home?: number;
  final_score_away?: number;
  predictions?: Prediction[];
}

interface WonCoupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  match_count: number;
}

interface DailyStats {
  won: number;
  lost: number;
  pending: number;
  total: number;
  winRate: number;
}

interface OverallStats {
  totalWon: number;
  totalLost: number;
  totalEvaluated: number;
  winRate: number;
}

interface AvailableDate {
  match_date: string;
  match_count: number;
}

interface WinnersData {
  matches: Match[];
  availableDates: AvailableDate[];
  dailyStats: DailyStats;
  overallStats: OverallStats;
  wonCoupons: WonCoupon[];
}

type FilterKey = "all" | "won" | "lost" | "pending";

const TODAY_STR = format(new Date(), "yyyy-MM-dd");

export default function WinnersPage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<WinnersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [autoJumped, setAutoJumped] = useState(false);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  /* fetch */
  async function loadData(dateOverride?: string) {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/winners?date=${dateOverride ?? selectedDate}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  /* auto-jump to most recent date with actual results if today is empty (one-time) */
  useEffect(() => {
    if (
      !autoJumped &&
      !loading &&
      data &&
      selectedDate === TODAY_STR &&
      data.matches.length === 0
    ) {
      const latestWithData = data.availableDates.find(
        (d) => d.match_date !== TODAY_STR && d.match_count > 0
      );
      if (latestWithData) {
        setAutoJumped(true);
        setSelectedDate(latestWithData.match_date);
      }
    }
  }, [data, loading, autoJumped, selectedDate]);

  /* admin actions */
  async function updateResult(predId: number, result: "won" | "lost" | "pending") {
    try {
      const res = await fetch(`/api/admin/best-bets/${predId}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ result }),
      });
      if (res.ok) {
        toast({
          title: "Güncellendi",
          description:
            result === "won" ? "Tuttu" : result === "lost" ? "Tutmadı" : "Bekliyor",
        });
        loadData();
      } else toast({ variant: "destructive", description: "Güncelleme başarısız" });
    } catch {
      toast({ variant: "destructive", description: "Hata oluştu" });
    }
  }

  async function clearHistory() {
    if (!confirm("Tüm bitmiş maç geçmişini silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/clear-history", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Geçmiş Temizlendi" });
        loadData();
      }
    } catch {
      toast({ variant: "destructive", description: "Hata oluştu" });
    }
  }

  /* date strip — always include Bugün, then API dates (newest first), no duplicates */
  const dateStrip = useMemo(() => {
    const apiDates = data?.availableDates ?? [];
    const apiHasToday = apiDates.some((d) => d.match_date === TODAY_STR);
    const today: AvailableDate = {
      match_date: TODAY_STR,
      match_count:
        apiDates.find((d) => d.match_date === TODAY_STR)?.match_count ?? 0,
    };
    return apiHasToday
      ? [today, ...apiDates.filter((d) => d.match_date !== TODAY_STR)]
      : [today, ...apiDates];
  }, [data]);

  /* filter matches by primary bet result */
  const getPrimary = (preds?: Prediction[]) =>
    preds?.find((p) => p.bet_category === "primary") || preds?.[0] || null;
  const getAlt = (preds?: Prediction[]) =>
    preds?.find((p) => p.bet_category === "alternative") || null;

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.matches.filter((m) => {
      if (filter === "all") return true;
      const primary = getPrimary(m.predictions);
      return primary?.result === filter;
    });
  }, [data, filter]);

  /* counts derived from displayed matches (not server stats) — keeps filter chips in sync with the list */
  const matchCounts = useMemo(() => {
    if (!data) return { all: 0, won: 0, lost: 0, pending: 0 };
    let won = 0, lost = 0, pending = 0;
    data.matches.forEach((m) => {
      const r = getPrimary(m.predictions)?.result;
      if (r === "won") won++;
      else if (r === "lost") lost++;
      else pending++;
    });
    return { all: data.matches.length, won, lost, pending };
  }, [data]);

  /* hit-rate must use evaluated denominator (won + lost), not total which includes pending */
  const dailyRate = useMemo(() => {
    if (!data) return 0;
    const evalCount = data.dailyStats.won + data.dailyStats.lost;
    if (evalCount === 0) return 0;
    return Math.round((data.dailyStats.won / evalCount) * 100);
  }, [data]);

  /* reset auto-jump flag when user manually returns to today, so future visits can re-jump if needed */
  useEffect(() => {
    if (selectedDate !== TODAY_STR && autoJumped) return;
    if (selectedDate === TODAY_STR) setAutoJumped(false);
  }, [selectedDate, autoJumped]);

  const selectedDateLabel = useMemo(() => {
    const d = parseISO(selectedDate);
    if (isToday(d)) return "Bugün";
    return format(d, "d MMMM EEEE", { locale: tr });
  }, [selectedDate]);

  const weekLabel = format(new Date(), "'HAFTA' w · yyyy", { locale: tr }).toUpperCase();

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-9 pt-7 pb-2">
        {/* ════════ MASTHEAD ════════ */}
        <header className="animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="eyebrow num-mono">Performans</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="eyebrow-tiny num-mono">{weekLabel}</span>
              {isAdmin && (
                <button
                  onClick={clearHistory}
                  className="h-8 w-8 rounded-full flex items-center justify-center border border-white/[0.08] hover:border-red-400/30 hover:bg-red-400/[0.05] transition-all"
                  data-testid="button-clear-history"
                  title="Geçmişi Temizle"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white/55" strokeWidth={1.6} />
                </button>
              )}
            </div>
          </div>
          <h1 className="text-display-3xl text-white">
            Sonuçlar<span className="text-lime">.</span>
          </h1>
          <p className="mt-4 text-[14px] text-white/55 leading-relaxed max-w-[88%]">
            Geçmiş tahminlerin gerçekleşen durumu. Veriye sahip günler aşağıda.
          </p>
        </header>

        {/* ════════ DATE STRIP ════════ */}
        <section data-testid="section-date-picker">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-white/40" strokeWidth={1.8} aria-hidden />
              <span className="eyebrow text-white/85">Tarih</span>
            </div>
            {selectedDate !== TODAY_STR && (
              <button
                onClick={() => setSelectedDate(TODAY_STR)}
                className="text-[11px] text-lime lime-underline tabular num-mono"
                data-testid="button-jump-today"
              >
                BUGÜN'E DÖN
              </button>
            )}
          </div>

          <div
            ref={dateScrollRef}
            className="-mx-5 px-5 overflow-x-auto scrollbar-none"
          >
            <div className="flex items-stretch gap-2 min-w-max">
              {dateStrip.map((d) => (
                <DatePill
                  key={d.match_date}
                  dateStr={d.match_date}
                  count={d.match_count}
                  active={d.match_date === selectedDate}
                  onClick={() => setSelectedDate(d.match_date)}
                />
              ))}
              {dateStrip.length <= 1 && !loading && (
                <div className="surface rounded-2xl px-5 py-4 flex items-center text-[12px] text-white/45">
                  Henüz başka tarih yok
                </div>
              )}
            </div>
          </div>

          {/* selected day caption */}
          <div className="mt-3 px-1 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-lime" aria-hidden />
            <span className="text-[12px] text-white/65 font-medium tabular">
              {selectedDateLabel}
            </span>
            {data && (
              <>
                <span className="w-px h-3 bg-white/10" />
                <span className="text-[11.5px] text-white/40 num-mono tabular">
                  {data.dailyStats.total.toString().padStart(2, "0")} BAHIS
                </span>
              </>
            )}
          </div>
        </section>

        {/* ════════ ERROR ════════ */}
        {error && (
          <div className="surface rounded-2xl px-5 py-9 text-center" data-testid="error-winners">
            <p className="font-display text-[18px] text-white mb-2">Veri alınamadı.</p>
            <p className="text-[12.5px] text-white/45 mb-5">Bağlantı kurulamadı.</p>
            <button
              onClick={() => loadData()}
              className="btn-ghost inline-flex items-center gap-2 px-5 py-2.5 text-[12px]"
              data-testid="button-retry-winners"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              Yeniden Dene
            </button>
          </div>
        )}

        {/* ════════ DAILY HEADLINE STAT ════════ */}
        {!error && (
          <section className="surface rounded-2xl overflow-hidden" data-testid="section-daily-stat">
            {loading ? (
              <div className="px-6 py-7 animate-pulse">
                <div className="h-2 bg-white/[0.05] rounded w-1/4 mb-4" />
                <div className="h-12 bg-white/[0.06] rounded w-2/3 mb-5" />
                <div className="h-1 bg-white/[0.05] rounded w-full mb-4" />
                <div className="h-3 bg-white/[0.05] rounded w-3/4" />
              </div>
            ) : data ? (
              <div className="px-6 py-7">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="eyebrow-tiny">Gün İsabeti</span>
                  <span className="eyebrow-tiny num-mono">
                    {data.dailyStats.total.toString().padStart(2, "0")} BAHIS
                  </span>
                </div>

                {data.dailyStats.total === 0 ? (
                  <div className="py-2">
                    <p className="font-display text-[24px] text-white/50 leading-tight">
                      Veri yok<span className="text-white/20">.</span>
                    </p>
                    <p className="text-[12.5px] text-white/40 mt-2">
                      Bu tarihte değerlendirilen bahis bulunmuyor.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-3 mb-5">
                      <span
                        className={`font-display num-mono tabular leading-none text-[64px] ${
                          dailyRate >= 50 ? "text-lime" : "text-white"
                        }`}
                      >
                        %{dailyRate}
                      </span>
                      <span className="text-[12px] text-white/45 tabular">
                        {data.dailyStats.won}/{data.dailyStats.total}
                      </span>
                    </div>

                    {/* progress bar */}
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-lime transition-all duration-700"
                        style={{ width: `${dailyRate}%` }}
                      />
                    </div>

                    {/* breakdown */}
                    <div className="flex items-center gap-4 text-[11.5px]">
                      <Breakdown label="Tuttu" value={data.dailyStats.won} dot="lime" />
                      <Breakdown label="Tutmadı" value={data.dailyStats.lost} dot="white" />
                      {data.dailyStats.pending > 0 && (
                        <Breakdown label="Bekliyor" value={data.dailyStats.pending} dot="dim" />
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {/* overall comparison footer */}
            {data && (
              <div className="bt-hairline px-6 py-4 flex items-center justify-between bg-[#0f0f11]">
                <div className="flex items-baseline gap-2">
                  <span className="eyebrow-tiny">Genel</span>
                  <span className="font-display num-mono tabular text-[15px] text-white">
                    %{data.overallStats.winRate}
                  </span>
                </div>
                <span className="text-[10.5px] text-white/40 num-mono tabular">
                  {data.overallStats.totalWon}/{data.overallStats.totalEvaluated} BAHIS
                </span>
              </div>
            )}
          </section>
        )}

        {/* ════════ FILTER STRIP ════════ */}
        {!error && data && data.matches.length > 0 && (
          <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 min-w-max" data-testid="filter-strip">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="Hepsi"
                count={matchCounts.all}
                testId="filter-all"
              />
              {matchCounts.won > 0 && (
                <FilterChip
                  active={filter === "won"}
                  onClick={() => setFilter("won")}
                  label="Tuttu"
                  count={matchCounts.won}
                  accent
                  testId="filter-won"
                />
              )}
              {matchCounts.lost > 0 && (
                <FilterChip
                  active={filter === "lost"}
                  onClick={() => setFilter("lost")}
                  label="Tutmadı"
                  count={matchCounts.lost}
                  testId="filter-lost"
                />
              )}
              {matchCounts.pending > 0 && (
                <FilterChip
                  active={filter === "pending"}
                  onClick={() => setFilter("pending")}
                  label="Bekliyor"
                  count={matchCounts.pending}
                  testId="filter-pending"
                />
              )}
            </div>
          </div>
        )}

        {/* ════════ WON COUPONS ════════ */}
        {!error && data && data.wonCoupons.length > 0 && filter === "all" && (
          <section data-testid="section-coupons">
            <div className="flex items-baseline justify-between mb-3 px-1">
              <span className="eyebrow text-white/85">Kazanan Kuponlar</span>
              <span className="eyebrow-tiny num-mono">
                {data.wonCoupons.length.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="space-y-2.5">
              {data.wonCoupons.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setLocation(`/kupon/${c.id}`)}
                  className="block w-full text-left bg-[#131316] hover:bg-[#1a1a1d] rounded-2xl px-5 py-4 transition-colors group"
                  data-testid={`card-coupon-${c.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1 h-1 rounded-full bg-lime" aria-hidden />
                        <span className="eyebrow-tiny num-mono">
                          {format(parseISO(c.coupon_date), "d MMM", { locale: tr }).toUpperCase()}
                          {" · "}
                          {c.match_count} MAÇ
                        </span>
                      </div>
                      <p className="font-display text-[15px] text-white truncate">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="eyebrow-tiny mb-0.5">Toplam</div>
                        <div className="font-display num-mono tabular text-[18px] text-lime leading-none">
                          {Number(c.combined_odds).toFixed(2)}
                        </div>
                      </div>
                      <ArrowUpRight
                        className="w-4 h-4 text-white/35 group-hover:text-lime group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ════════ MATCH RESULTS ════════ */}
        {!error && (
          <section data-testid="section-results">
            <div className="flex items-baseline justify-between mb-3 px-1">
              <span className="eyebrow text-white/85">Maç Sonuçları</span>
              {data && (
                <span className="eyebrow-tiny num-mono">
                  {filtered.length.toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="surface rounded-2xl px-5 py-5 animate-pulse">
                    <div className="h-2 bg-white/[0.05] rounded w-2/5 mb-4" />
                    <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
                    <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-5" />
                    <div className="h-px bg-white/[0.05] mb-4" />
                    <div className="h-7 bg-white/[0.05] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : data && data.matches.length === 0 ? (
              <EmptyCard
                title="Bu tarihte sonuç yok."
                hint={
                  data.availableDates.length > 0
                    ? "Yukarıdaki diğer tarihleri deneyin."
                    : "Henüz değerlendirilmiş maç bulunmuyor."
                }
              />
            ) : data && filtered.length === 0 ? (
              <EmptyCard
                title="Bu filtrede maç yok."
                hint="Filtreyi değiştirip yeniden deneyin."
                action={{ label: "Tümünü Göster", onClick: () => setFilter("all") }}
              />
            ) : data ? (
              <div className="space-y-2.5">
                {filtered.map((match, idx) => (
                  <ResultRow
                    key={match.id}
                    match={match}
                    index={idx + 1}
                    isAdmin={isAdmin}
                    onUpdateResult={updateResult}
                    onClick={() => setLocation(`/mac/${match.fixture_id}`)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        )}

        {/* footer */}
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

function DatePill({
  dateStr,
  count,
  active,
  onClick,
}: {
  dateStr: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const date = parseISO(dateStr);
  const today = isSameDay(date, new Date());
  const weekday = format(date, "EEE", { locale: tr }).toUpperCase().slice(0, 3);
  const day = format(date, "d");
  const hasData = count > 0;

  return (
    <button
      onClick={onClick}
      data-testid={`date-pill-${dateStr}`}
      className={`relative flex flex-col items-center justify-center min-w-[58px] px-3 py-3 rounded-2xl transition-all ${
        active
          ? "bg-lime text-[#0a0a0a]"
          : today
          ? "bg-[#141416] border border-lime/40 text-white"
          : "bg-[#141416] border border-white/[0.06] text-white/75 hover:border-white/[0.16]"
      }`}
    >
      <span
        className={`text-[9px] tracking-[0.16em] font-bold uppercase ${
          active ? "text-[#0a0a0a]/65" : today ? "text-lime" : "text-white/45"
        }`}
      >
        {weekday}
      </span>
      <span
        className={`font-display num-mono tabular text-[20px] leading-none mt-1 ${
          active ? "text-[#0a0a0a]" : "text-white"
        }`}
      >
        {day}
      </span>
      <span
        className={`text-[8.5px] num-mono tabular tracking-wider mt-1.5 ${
          active
            ? "text-[#0a0a0a]/65"
            : hasData
            ? "text-white/55"
            : "text-white/20"
        }`}
      >
        {count > 0 ? `${count} BAHIS` : "—"}
      </span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  accent = false,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: boolean;
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
      {accent && !active && (
        <span className="w-1.5 h-1.5 rounded-full bg-lime" aria-hidden />
      )}
      <span>{label}</span>
      <span className="num-mono opacity-70">{count.toString().padStart(2, "0")}</span>
    </button>
  );
}

function Breakdown({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: "lime" | "white" | "dim";
}) {
  const dotClass =
    dot === "lime" ? "bg-lime" : dot === "white" ? "bg-white/55" : "bg-white/25";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden />
      <span className="num-mono tabular text-white/85">{value}</span>
      <span className="text-white/45">{label}</span>
    </div>
  );
}

function EmptyCard({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="surface rounded-2xl px-5 py-12 text-center" data-testid="empty-results">
      <p className="font-display text-[18px] text-white/85 mb-2">{title}</p>
      <p className="text-[12.5px] text-white/45 max-w-[260px] mx-auto leading-relaxed">{hint}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-[12px] text-lime lime-underline"
          data-testid="button-clear-filter"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function ResultRow({
  match,
  index,
  isAdmin,
  onUpdateResult,
  onClick,
}: {
  match: Match;
  index: number;
  isAdmin: boolean;
  onUpdateResult: (id: number, r: "won" | "lost" | "pending") => void;
  onClick: () => void;
}) {
  const primary = match.predictions?.find((p) => p.bet_category === "primary") ||
    match.predictions?.[0] ||
    null;
  const alt = match.predictions?.find((p) => p.bet_category === "alternative") || null;
  const hasScore =
    match.final_score_home !== undefined && match.final_score_home !== null;

  return (
    <div
      data-testid={`card-match-${match.id}`}
      className="bg-[#131316] rounded-2xl overflow-hidden"
    >
      {/* meta + teams + score */}
      <button
        onClick={onClick}
        className="block w-full text-left px-5 pt-5 pb-4 hover:bg-[#1a1a1d] transition-colors"
      >
        <div className="flex items-baseline justify-between gap-3 mb-3.5">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="num-mono text-[10.5px] text-white/30 tabular">
              {index.toString().padStart(2, "0")}
            </span>
            {match.match_time && (
              <span className="num-mono text-[12px] text-white/85 tabular">
                {match.match_time}
              </span>
            )}
            <span className="text-[10.5px] text-white/40 truncate uppercase tracking-[0.12em]">
              {match.league_name || "—"}
            </span>
          </div>
          <span className="text-[9.5px] text-white/35 tracking-[0.14em] uppercase">Bitti</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] text-white leading-[1.2] font-medium truncate">
              {match.home_team}
            </p>
            <p className="text-[15.5px] text-white/60 leading-[1.2] font-medium truncate mt-0.5">
              {match.away_team}
            </p>
          </div>
          {hasScore && (
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="font-display num-mono tabular text-[20px] text-white leading-none">
                {match.final_score_home}
              </span>
              <span className="font-display num-mono tabular text-[20px] text-white/65 leading-none mt-1">
                {match.final_score_away}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* primary bet result */}
      {primary && (
        <BetRow prediction={primary} category="Ana Tahmin" />
      )}

      {/* admin controls for primary */}
      {isAdmin && primary && (
        <AdminControls predId={primary.id} current={primary.result} onUpdate={onUpdateResult} />
      )}

      {/* alternative bet inline */}
      {alt && (
        <>
          <div className="bt-hairline mx-5" />
          <BetRow prediction={alt} category="Alternatif" muted />
          {isAdmin && (
            <AdminControls predId={alt.id} current={alt.result} onUpdate={onUpdateResult} />
          )}
        </>
      )}
    </div>
  );
}

function BetRow({
  prediction,
  category,
  muted = false,
}: {
  prediction: Prediction;
  category: string;
  muted?: boolean;
}) {
  const won = prediction.result === "won";
  const lost = prediction.result === "lost";
  const pending = prediction.result === "pending";

  const statusLabel = won ? "Tuttu" : lost ? "Tutmadı" : "Bekliyor";
  const periodColor = won ? "text-lime" : lost ? "text-red-400/70" : "text-white/30";
  const statusTextColor = won
    ? "text-lime"
    : lost
    ? "text-white/40"
    : "text-white/55";

  return (
    <div className="px-5 py-4 bt-hairline">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow-tiny">{category}</span>
            <span
              className={`text-[9px] tracking-[0.14em] uppercase font-semibold ${statusTextColor}`}
            >
              · {statusLabel}
            </span>
          </div>
          <div
            className={`font-display text-[17px] leading-tight truncate ${
              muted ? "text-white/75" : "text-white"
            }`}
          >
            {prediction.bet_type}
            <span className={periodColor}>.</span>
          </div>
        </div>

        <div className="flex items-end gap-4 flex-shrink-0">
          {prediction.odds && Number(prediction.odds) > 0 && (
            <div className="text-right">
              <div className="eyebrow-tiny mb-0.5">Oran</div>
              <div className="num-mono tabular text-[13.5px] text-white/85">
                {Number(prediction.odds).toFixed(2)}
              </div>
            </div>
          )}
          {prediction.confidence > 0 && (
            <div className="text-right">
              <div className="eyebrow-tiny mb-0.5">Güven</div>
              <div className="num-mono tabular text-[13.5px] text-white/85">
                %{prediction.confidence}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminControls({
  predId,
  current,
  onUpdate,
}: {
  predId: number;
  current: string;
  onUpdate: (id: number, r: "won" | "lost" | "pending") => void;
}) {
  return (
    <div className="px-5 pb-4 flex gap-1.5">
      {(["won", "lost", "pending"] as const).map((r) => (
        <button
          key={r}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(predId, r);
          }}
          className={`flex-1 py-1.5 rounded-full text-[10px] font-medium tracking-wide transition-colors ${
            current === r
              ? "bg-lime text-[#0a0a0a]"
              : "border border-white/[0.06] text-white/45 hover:border-white/[0.16] hover:text-white/75"
          }`}
          data-testid={`button-${r}-${predId}`}
        >
          {r === "won" ? "Tuttu" : r === "lost" ? "Tutmadı" : "Bekliyor"}
        </button>
      ))}
    </div>
  );
}
