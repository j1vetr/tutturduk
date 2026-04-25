import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { format, subDays, addDays, isToday, isYesterday, parseISO } from "date-fns";
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
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
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

interface WinnersData {
  matches: Match[];
  availableDates: { match_date: string; match_count: number }[];
  dailyStats: DailyStats;
  overallStats: OverallStats;
  wonCoupons: WonCoupon[];
}

type FilterType = "all" | "won" | "lost";

export default function WinnersPage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<WinnersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [filter, setFilter] = useState<FilterType>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  useEffect(() => { loadData(); }, [selectedDate]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/winners?date=${selectedDate}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function updateResult(predId: number, result: "won" | "lost" | "pending") {
    try {
      const res = await fetch(`/api/admin/best-bets/${predId}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ result }),
      });
      if (res.ok) {
        toast({ title: "Güncellendi", description: result === "won" ? "Kazandı" : result === "lost" ? "Kaybetti" : "Bekliyor" });
        loadData();
      } else toast({ variant: "destructive", description: "Güncelleme başarısız" });
    } catch { toast({ variant: "destructive", description: "Hata oluştu" }); }
  }

  async function clearHistory() {
    if (!confirm("Tüm bitmiş maç geçmişini silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/clear-history", { method: "POST", credentials: "include" });
      if (res.ok) { toast({ title: "Geçmiş Temizlendi" }); loadData(); }
    } catch { toast({ variant: "destructive", description: "Hata oluştu" }); }
  }

  const formatDateLabel = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return "Bugün";
    if (isYesterday(date)) return "Dün";
    return format(date, "d MMM", { locale: tr });
  };
  const recentDates = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
  const displayDates = data?.availableDates?.length ? data.availableDates.map((d) => d.match_date) : recentDates;
  const navigateDate = (dir: "prev" | "next") => {
    const cur = parseISO(selectedDate);
    const newDate = dir === "prev" ? subDays(cur, 1) : addDays(cur, 1);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const getMain = (preds?: Prediction[]) => preds?.find((p) => p.bet_category === "primary") || preds?.[0] || null;
  const getAlt = (preds?: Prediction[]) => preds?.find((p) => p.bet_category === "alternative") || null;
  const getResult = (m: Match) => (getMain(m.predictions)?.result as "won" | "lost" | "pending") || "pending";

  const filtered = data?.matches.filter((m) => filter === "all" || getResult(m) === filter) || [];

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-7 pt-3">
        {/* MASTHEAD */}
        <header className="pt-2 flex items-start justify-between">
          <div>
            <span className="label-meta-sm">Sonuçlar</span>
            <h1 className="font-serif-display text-[30px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
              Tahmin <span className="italic text-white/85">performansı</span>.
            </h1>
          </div>
          {isAdmin && (
            <button
              onClick={clearHistory}
              className="h-9 w-9 rounded-full flex items-center justify-center border border-white/[0.08] hover:border-red-400/30 hover:bg-red-400/[0.05] transition-all"
              data-testid="button-clear-history"
              title="Geçmişi Temizle"
            >
              <Trash2 className="w-[14px] h-[14px] text-white/55" strokeWidth={1.6} />
            </button>
          )}
        </header>

        {/* DATE NAV */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate("prev")}
            className="w-9 h-9 rounded-full border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-white/55 transition-colors flex-shrink-0"
            data-testid="button-prev-date"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {displayDates.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  data-testid={`button-date-${d}`}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-medium transition-all tracking-wide ${
                    selectedDate === d
                      ? "bg-white text-black"
                      : "border border-white/[0.08] text-white/65 hover:border-white/[0.18] hover:text-white/90"
                  }`}
                >
                  {formatDateLabel(d)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigateDate("next")}
            className="w-9 h-9 rounded-full border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-white/55 transition-colors flex-shrink-0"
            data-testid="button-next-date"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border border-white/[0.10] border-t-white/60 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* STATS - Daily / Overall side by side */}
            <section>
              <SectionLabel left="Performans" right={`${data.dailyStats.total} maç`} />
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Günlük" rate={data.dailyStats.winRate} won={data.dailyStats.won} lost={data.dailyStats.lost} />
                <StatBlock label="Genel" rate={data.overallStats.winRate} won={data.overallStats.totalWon} lost={data.overallStats.totalLost} elevated />
              </div>
              {data.dailyStats.pending > 0 && (
                <div className="flex items-center gap-2 px-1 mt-3">
                  <span className="status-dot status-dot-pending" />
                  <span className="text-[11px] text-white/55">
                    <span className="num-display text-white/80">{data.dailyStats.pending}</span> maç sonuç bekliyor
                  </span>
                </div>
              )}
            </section>

            {/* FILTER TABS */}
            <div className="flex gap-1.5 premium-card rounded-full p-1.5">
              {[
                { key: "all" as FilterType, label: "Tümü", count: data.dailyStats.total },
                { key: "won" as FilterType, label: "Tutanlar", count: data.dailyStats.won },
                { key: "lost" as FilterType, label: "Tutmayanlar", count: data.dailyStats.lost },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  data-testid={`button-filter-${tab.key}`}
                  className={`flex-1 py-2 rounded-full text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                    filter === tab.key ? "bg-white text-black" : "text-white/55 hover:text-white/80"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[10px] num-display ${filter === tab.key ? "text-black/60" : "text-white/35"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* WON COUPONS */}
            {data.wonCoupons.length > 0 && filter === "all" && (
              <section>
                <SectionLabel left="Kazanan Kuponlar" right={`${data.wonCoupons.length}`} />
                <div className="space-y-2.5">
                  {data.wonCoupons.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setLocation(`/coupon/${c.id}`)}
                      className="w-full text-left premium-card rounded-[16px] px-5 py-4 flex items-center justify-between hover:bg-white/[0.025] transition-colors group"
                      data-testid={`card-coupon-${c.id}`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-serif-display text-[15px] text-white truncate -tracking-[0.005em]">{c.name}</span>
                        <span className="text-[10.5px] text-white/40 num-display">
                          {format(parseISO(c.coupon_date), "d MMM", { locale: tr })} · {c.match_count} maç
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="num-display text-[18px] text-white">{Number(c.combined_odds).toFixed(2)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* MATCH RESULTS */}
            {filtered.length > 0 ? (
              <section>
                <SectionLabel left="Tahmin Sonuçları" right={`${filtered.length}`} />
                <div className="premium-card rounded-[18px] divide-y divide-white/[0.05] overflow-hidden">
                  {filtered.map((match) => {
                    const main = getMain(match.predictions);
                    const alt = getAlt(match.predictions);
                    const result = getResult(match);
                    const isOpen = expanded === match.id;
                    const dotClass =
                      result === "won" ? "status-dot-won" : result === "lost" ? "status-dot-lost" : "status-dot-pending";

                    return (
                      <div key={match.id} data-testid={`card-match-${match.id}`}>
                        {/* match summary */}
                        <button
                          onClick={() => setLocation(`/match/${match.fixture_id}`)}
                          className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-white/40 truncate uppercase tracking-[0.14em] font-medium max-w-[200px]">
                              {match.league_name || "Lig"}
                            </span>
                            {match.match_time && (
                              <span className="text-[10.5px] text-white/45 num-display tracking-wider">{match.match_time}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-white/95 font-medium leading-tight truncate">{match.home_team}</p>
                              <p className="text-[14px] text-white/95 font-medium leading-tight truncate mt-0.5">{match.away_team}</p>
                            </div>
                            {match.final_score_home !== undefined && match.final_score_home !== null ? (
                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className="num-display text-[16px] text-white leading-none">{match.final_score_home}</span>
                                <span className="num-display text-[16px] text-white leading-none mt-0.5">{match.final_score_away}</span>
                              </div>
                            ) : (
                              <span className="text-[10.5px] text-white/40 italic font-serif-display">vs</span>
                            )}
                          </div>
                        </button>

                        {/* primary bet result */}
                        {main && (
                          <div
                            onClick={(e) => { e.stopPropagation(); if (alt) setExpanded(isOpen ? null : match.id); }}
                            className={`px-5 py-3 border-t border-white/[0.04] flex items-center justify-between ${alt ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`status-dot ${dotClass}`} />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-serif-display italic text-[14px] text-white/95 truncate">{main.bet_type}</span>
                                  {main.odds && <span className="num-display text-[11px] text-white/45">{Number(main.odds).toFixed(2)}</span>}
                                </div>
                                <span className="label-meta-sm">Ana Tahmin</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                              <span className="text-[10px] text-white/55 uppercase tracking-[0.14em] font-medium">
                                {main.result === "won" ? "Tuttu" : main.result === "lost" ? "Tutmadı" : "Bekliyor"}
                              </span>
                              {alt && (isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/45" strokeWidth={1.8} /> : <ChevronDown className="w-3.5 h-3.5 text-white/45" strokeWidth={1.8} />)}
                            </div>
                          </div>
                        )}

                        {isAdmin && main && (
                          <div className="px-5 pb-3 flex gap-1.5">
                            {(["won", "lost", "pending"] as const).map((r) => (
                              <button
                                key={r}
                                onClick={(e) => { e.stopPropagation(); updateResult(main.id, r); }}
                                className={`flex-1 py-1.5 rounded-full text-[10px] font-medium tracking-wide transition-colors ${
                                  main.result === r
                                    ? "bg-white text-black"
                                    : "border border-white/[0.06] text-white/45 hover:border-white/[0.16] hover:text-white/75"
                                }`}
                                data-testid={`button-${r}-${main.id}`}
                              >
                                {r === "won" ? "Tuttu" : r === "lost" ? "Tutmadı" : "Bekliyor"}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* alt expanded */}
                        {alt && isOpen && (
                          <div className="border-t border-white/[0.04] bg-white/[0.012]">
                            <div className="px-5 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`status-dot ${alt.result === "won" ? "status-dot-won" : alt.result === "lost" ? "status-dot-lost" : "status-dot-pending"}`} />
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-serif-display italic text-[14px] text-white/85 truncate">{alt.bet_type}</span>
                                    {alt.odds && <span className="num-display text-[11px] text-white/40">{Number(alt.odds).toFixed(2)}</span>}
                                  </div>
                                  <span className="label-meta-sm">Alternatif</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-white/45 uppercase tracking-[0.14em] font-medium">
                                {alt.result === "won" ? "Tuttu" : alt.result === "lost" ? "Tutmadı" : "Bekliyor"}
                              </span>
                            </div>
                            {isAdmin && (
                              <div className="px-5 pb-3 flex gap-1.5">
                                {(["won", "lost", "pending"] as const).map((r) => (
                                  <button
                                    key={r}
                                    onClick={(e) => { e.stopPropagation(); updateResult(alt.id, r); }}
                                    className={`flex-1 py-1.5 rounded-full text-[10px] font-medium tracking-wide transition-colors ${
                                      alt.result === r
                                        ? "bg-white text-black"
                                        : "border border-white/[0.06] text-white/45 hover:border-white/[0.16] hover:text-white/75"
                                    }`}
                                  >
                                    {r === "won" ? "Tuttu" : r === "lost" ? "Tutmadı" : "Bekliyor"}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="premium-card rounded-[18px] px-5 py-12 text-center">
                <p className="font-serif-display text-[18px] text-white/75 italic">Bu tarihte sonuç yok.</p>
                <p className="text-[12px] text-white/40 mt-2 font-light">Başka bir tarih seçmeyi deneyin.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-white/55">Veri yüklenemedi</div>
        )}

        <div className="text-center pt-3 pb-2">
          <span className="label-meta-sm font-serif-display italic text-white/30 normal-case tracking-normal">
            tutturduk · veri merkezi
          </span>
        </div>
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

function StatBlock({ label, rate, won, lost, elevated }: { label: string; rate: number; won: number; lost: number; elevated?: boolean }) {
  return (
    <div className={`${elevated ? "premium-card-elevated" : "premium-card"} rounded-[18px] p-4`}>
      <span className="label-meta-sm">{label}</span>
      <div className="flex items-baseline gap-1 mt-2 mb-3">
        <span className="font-serif-display text-[34px] text-white num-display leading-none">{rate}</span>
        <span className="text-[14px] text-white/40 font-light">%</span>
      </div>
      <div className="h-[2px] bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <div className="h-full bg-white/85 transition-all duration-1000" style={{ width: `${rate}%` }} />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-white/55 num-display">{won} tuttu</span>
        <span className="text-[10px] text-white/35 num-display">{lost} tutmadı</span>
      </div>
    </div>
  );
}
