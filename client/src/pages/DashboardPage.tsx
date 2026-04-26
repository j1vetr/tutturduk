import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Stats {
  total: number;
  won: number;
  lost: number;
  pending: number;
  successRate: number;
}

interface TodayMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_time: string;
  match_date: string;
  status?: string;
  predictions?: Array<{
    bet_type: string;
    confidence: number;
    bet_category: string;
  }>;
}

interface FeaturedBet {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_time: string;
  match_date: string;
  bet_type: string;
  confidence: number;
  odds: string;
  risk_level: string;
}

interface DailyCoupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: string;
  result: string;
  predictions: Array<{
    id: number;
    home_team: string;
    away_team: string;
    home_logo?: string;
    away_logo?: string;
    league_name?: string;
    match_time: string;
    bet_type: string;
    odds: string;
    confidence: number;
    result: string;
  }>;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayMatches, setTodayMatches] = useState<TodayMatch[]>([]);
  const [featuredBet, setFeaturedBet] = useState<FeaturedBet | null>(null);
  const [dailyCoupon, setDailyCoupon] = useState<DailyCoupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatedStats, setAnimatedStats] = useState({ won: 0, total: 0, rate: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (stats) {
      const duration = 1100;
      const steps = 40;
      const interval = duration / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const eased = 1 - Math.pow(1 - step / steps, 3);
        setAnimatedStats({
          won: Math.round(stats.won * eased),
          total: Math.round(stats.total * eased),
          rate: Math.round(stats.successRate * eased),
        });
        if (step >= steps) clearInterval(timer);
      }, interval);
      return () => clearInterval(timer);
    }
  }, [stats]);

  async function fetchData() {
    setError(null);
    try {
      const [statsRes, matchesRes, featuredRes, couponRes] = await Promise.all([
        fetch("/api/best-bets/stats", { credentials: "include" }),
        fetch("/api/matches", { credentials: "include" }),
        fetch("/api/featured-bet", { credentials: "include" }),
        fetch("/api/daily-coupon", { credentials: "include" }),
      ]);
      if (!statsRes.ok && !matchesRes.ok) {
        throw new Error("Veriler yüklenemedi.");
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        const now = new Date();
        const upcoming = data
          .filter((m: any) => {
            if (m.status === "finished") return false;
            const timeStr = m.match_time?.padStart(5, "0") || "00:00";
            const matchDateTime = new Date(`${m.match_date}T${timeStr}:00+03:00`);
            return matchDateTime > now;
          })
          .slice(0, 6);
        setTodayMatches(upcoming);
      }
      if (featuredRes.ok) setFeaturedBet(await featuredRes.json());
      if (couponRes.ok) setDailyCoupon(await couponRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  const dateLabel = format(new Date(), "d MMMM, EEEE", { locale: tr }).toUpperCase();
  const weekLabel = format(new Date(), "'HAFTA' w · yyyy", { locale: tr }).toUpperCase();

  /* Build ticker items from real data */
  const tickerItems: string[] = [];
  if (stats && stats.total > 0) {
    tickerItems.push(`BUGÜNE KADAR · %${stats.successRate} İSABET`);
    tickerItems.push(`${stats.won}/${stats.total} TUTAN BAHİS`);
  }
  if (featuredBet) {
    tickerItems.push(
      `GÜNÜN BAHSİ · ${featuredBet.bet_type.toUpperCase()} · ORAN ${parseFloat(featuredBet.odds).toFixed(2)}`
    );
  }
  if (todayMatches.length > 0) {
    tickerItems.push(`${todayMatches.length} MAÇ ANALİZE HAZIR`);
  }
  if (dailyCoupon) {
    tickerItems.push(`KUPON · ${parseFloat(dailyCoupon.combined_odds).toFixed(2)}x TOPLAM`);
  }
  const tickerLine =
    tickerItems.length > 0
      ? tickerItems.join("   ◆   ")
      : "TUTTURDUK · ANALİZ MERKEZİ · GPT-4O · TÜRKİYE";

  return (
    <MobileLayout activeTab="home">
      <div className="-mx-5">
        {/* ════════ TICKER BAR ════════ */}
        <div
          className="bb-hairline bg-[#0d0d0f] py-2.5 overflow-hidden ticker-mask"
          data-testid="ticker-stats"
          role="marquee"
          aria-label={tickerLine}
        >
          <div className="flex animate-marquee whitespace-nowrap" aria-hidden="true">
            <span className="eyebrow-tiny px-4 num-mono">{tickerLine}</span>
            <span className="eyebrow-tiny px-4 num-mono">{tickerLine}</span>
            <span className="eyebrow-tiny px-4 num-mono">{tickerLine}</span>
          </div>
        </div>
      </div>

      <div className="space-y-9 pt-7 pb-2">

        {/* ════════ HERO MASTHEAD ════════ */}
        <header className="animate-fade-in" data-testid="dashboard-hero">
          <div className="flex items-center justify-between mb-4">
            <span className="eyebrow num-mono">{dateLabel}</span>
            <span className="eyebrow-tiny num-mono">{weekLabel}</span>
          </div>
          <h1 className="text-display-3xl text-white">
            Bugün<span className="text-lime">.</span>
          </h1>
          <p className="mt-4 text-[14px] text-white/55 leading-relaxed max-w-[88%]">
            Veriye dayalı tahminler. Bugünün öne çıkan bahsi, kuponu ve maçları
            tek bir akışta.
          </p>
        </header>

        {/* ════════ ERROR STATE ════════ */}
        {error && !loading && (
          <div className="surface rounded-2xl px-5 py-6 text-center" data-testid="error-dashboard">
            <p className="text-display-md text-white">{error}</p>
            <p className="text-[12.5px] text-white/45 mt-2">
              Sunucuya ulaşırken bir aksaklık oldu.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="btn-ghost mt-5"
              data-testid="button-retry-dashboard"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {/* ════════ FEATURED BET — broadcast tile ════════ */}
        {featuredBet ? (
          <button
            onClick={() => setLocation(`/match/${featuredBet.fixture_id}`)}
            className="block w-full text-left group animate-slide-up"
            data-testid="card-featured-bet"
          >
            <div className="surface rounded-3xl overflow-hidden">
              {/* Top bar — lime tag + meta */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <span className="tag-lime">Günün Bahsi</span>
                <div className="flex items-center gap-2.5">
                  <span className="status-dot status-dot-live animate-pulse-soft" />
                  <span className="eyebrow-tiny num-mono">{featuredBet.match_time}</span>
                </div>
              </div>

              {/* League strip */}
              {featuredBet.league_name && (
                <div className="px-5 pb-3">
                  <span className="eyebrow-tiny truncate block max-w-full">
                    {featuredBet.league_name}
                  </span>
                </div>
              )}

              {/* Teams — stacked, very large, broadcast headline style */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3 mb-2">
                  <TeamBadge logo={featuredBet.home_logo} name={featuredBet.home_team} />
                  <h2 className="text-display-lg text-white truncate flex-1">
                    {featuredBet.home_team}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <TeamBadge logo={featuredBet.away_logo} name={featuredBet.away_team} />
                  <h2 className="text-display-lg text-white/70 truncate flex-1">
                    {featuredBet.away_team}
                  </h2>
                </div>
              </div>

              {/* Lime separator */}
              <div className="bg-lime h-[2px] mx-5" aria-hidden />

              {/* Bet stats grid */}
              <div className="grid grid-cols-3 px-5">
                <BetStat label="Tahmin" value={featuredBet.bet_type} highlight />
                <BetStat
                  label="Oran"
                  value={parseFloat(featuredBet.odds).toFixed(2)}
                  mono
                  border="left"
                />
                <BetStat
                  label="Güven"
                  value={`${featuredBet.confidence}%`}
                  mono
                  border="left"
                />
              </div>

              {/* CTA bar */}
              <div className="bt-hairline px-5 py-4 flex items-center justify-between">
                <span className="eyebrow-tiny">Detaylı analiz</span>
                <span
                  aria-hidden
                  className="text-lime text-[16px] font-bold transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </div>
          </button>
        ) : loading ? (
          <div className="surface rounded-3xl h-[340px] animate-pulse" />
        ) : null}

        {/* ════════ STATS BAND — score-card style ════════ */}
        <section data-testid="section-stats">
          <div className="flex items-end justify-between mb-4">
            <span className="eyebrow">Hesabımız</span>
            {stats && stats.total > 0 && (
              <span className="eyebrow-tiny num-mono">
                {stats.won} TUTTU · {stats.lost} TUTMADI
              </span>
            )}
          </div>

          <div className="surface rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3">
              <ScoreBlock
                label="Kazanan"
                value={loading ? "—" : animatedStats.won}
                accent
              />
              <ScoreBlock
                label="Toplam"
                value={loading ? "—" : animatedStats.total}
                border="left"
              />
              <ScoreBlock
                label="İsabet"
                value={loading ? "—" : `${animatedStats.rate}%`}
                border="left"
              />
            </div>

            {stats && stats.total > 0 && (
              <div className="bt-hairline px-5 py-3.5 flex items-center gap-3">
                <span className="eyebrow-tiny flex-shrink-0">Başarı</span>
                <div className="flex-1 h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${animatedStats.rate}%` }}
                  />
                </div>
                <span className="num-mono text-[12px] text-white tabular flex-shrink-0">
                  {animatedStats.rate}%
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ════════ DAILY COUPON — split tile ════════ */}
        {dailyCoupon && dailyCoupon.predictions && dailyCoupon.predictions.length > 0 && (
          <section data-testid="section-daily-coupon">
            <div className="flex items-end justify-between mb-4">
              <span className="eyebrow">Günün Kuponu</span>
              <span className="eyebrow-tiny num-mono">
                {dailyCoupon.predictions.length} MAÇ · KOMBİNE
              </span>
            </div>

            <button
              onClick={() => setLocation(`/coupon/${dailyCoupon.id}`)}
              className="block w-full text-left surface rounded-2xl overflow-hidden hover:bg-[#16161a] transition-colors animate-slide-up"
              data-testid="card-daily-coupon"
            >
              {/* Top — combined odds as hero number */}
              <div className="flex items-stretch">
                <div className="flex-1 px-5 py-5">
                  <span className="eyebrow-tiny block mb-2">Toplam Oran</span>
                  <div className="text-display-2xl text-lime tabular leading-none">
                    {parseFloat(dailyCoupon.combined_odds).toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#0f0f11] px-5 py-5 flex flex-col justify-center items-end border-l border-white/[0.06] min-w-[88px]">
                  <span className="eyebrow-tiny block mb-1">ID</span>
                  <span className="num-mono text-[15px] text-white tabular">
                    #{String(dailyCoupon.id).padStart(4, "0")}
                  </span>
                </div>
              </div>

              {/* Predictions list */}
              <div className="bt-hairline">
                {dailyCoupon.predictions.map((pred, idx) => (
                  <div
                    key={pred.id}
                    className={`px-5 py-3.5 flex items-center gap-3 ${
                      idx > 0 ? "bt-hairline" : ""
                    }`}
                  >
                    <span className="num-mono text-[11px] text-white/40 tabular w-5 flex-shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-white font-medium truncate leading-tight">
                        {pred.home_team} <span className="text-white/30">·</span> {pred.away_team}
                      </p>
                      <p className="num-mono text-[10.5px] text-white/40 tabular mt-0.5">
                        {pred.match_time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-display-md text-white">{pred.bet_type}</span>
                      <span className="num-mono text-[12.5px] text-lime tabular font-semibold">
                        {pred.odds ? parseFloat(pred.odds).toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer CTA */}
              <div className="bt-hairline px-5 py-4 flex items-center justify-between">
                <span className="eyebrow-tiny">Kuponu görüntüle</span>
                <span
                  aria-hidden
                  className="text-lime text-[16px] font-bold transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </button>
          </section>
        )}

        {/* ════════ TODAY'S MATCHES — list ════════ */}
        <section data-testid="section-today-matches">
          <div className="flex items-end justify-between mb-4">
            <span className="eyebrow">Bugünün Maçları</span>
            <button
              onClick={() => setLocation("/predictions")}
              className="eyebrow-tiny flex items-center gap-1.5 hover:text-white transition-colors"
              data-testid="link-all-predictions"
            >
              Tümü
              <span aria-hidden className="text-lime">→</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="surface rounded-xl h-[68px] animate-pulse" />
              ))}
            </div>
          ) : todayMatches.length > 0 ? (
            <div className="surface rounded-2xl overflow-hidden">
              {todayMatches.map((match, idx) => {
                const primaryBet = match.predictions?.find((p) => p.bet_category === "primary");
                return (
                  <button
                    key={match.id}
                    onClick={() => setLocation(`/match/${match.fixture_id}`)}
                    className={`w-full px-4 py-4 text-left active:bg-white/[0.02] transition-colors group block ${
                      idx > 0 ? "bt-hairline" : ""
                    }`}
                    data-testid={`card-match-${match.fixture_id}`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Time block */}
                      <div className="num-mono text-[13px] text-white tabular flex-shrink-0 w-[44px] font-semibold">
                        {match.match_time}
                      </div>

                      {/* Vertical divider */}
                      <div className="w-px h-9 bg-white/[0.08] flex-shrink-0" aria-hidden />

                      {/* Teams + league */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] text-white font-semibold leading-tight truncate font-display">
                          {match.home_team} <span className="text-white/30">·</span> {match.away_team}
                        </p>
                        {match.league_name && (
                          <p className="eyebrow-tiny mt-1 truncate">{match.league_name}</p>
                        )}
                      </div>

                      {/* Bet badge */}
                      {primaryBet ? (
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-display-md text-white">
                            {primaryBet.bet_type}
                          </span>
                          <span className="num-mono text-[10px] text-lime tabular font-semibold">
                            %{primaryBet.confidence}
                          </span>
                        </div>
                      ) : (
                        <span className="eyebrow-tiny">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="surface rounded-2xl px-5 py-12 text-center">
              <p className="text-display-lg text-white">Bugün maç yok.</p>
              <p className="text-[12.5px] text-white/45 mt-2">
                Yeni analizler her gün 01:00'da yayınlanır.
              </p>
            </div>
          )}
        </section>

        {/* ════════ METHOD STRIP ════════ */}
        <section className="surface rounded-2xl px-5 py-5" data-testid="section-method">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-lime" aria-hidden />
            <span className="eyebrow-tiny">Yöntem</span>
          </div>
          <p className="text-[13.5px] text-white/85 leading-relaxed font-display">
            Her tahmin <span className="text-lime font-semibold">GPT-4o</span> ile değerlendirilir.
            Form, sakatlık, oran piyasası ve sezon istatistikleri tek bir modelde
            buluşur. Yalnızca <span className="text-white">güven ≥%70</span> ve
            <span className="text-white"> değer ≥%5</span> olan bahisler yayınlanır.
          </p>
        </section>

        {/* ════════ SIGNATURE FOOTER ════════ */}
        <div className="text-center py-5">
          <span className="eyebrow-tiny num-mono">
            TUTTURDUK · ANALİZ MERKEZİ
          </span>
        </div>

      </div>
    </MobileLayout>
  );
}

/* ───────── Sub-components ───────── */

function TeamBadge({ logo, name }: { logo?: string; name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#1f1f23] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
      {logo ? (
        <img src={logo} alt="" className="w-6 h-6 object-contain" />
      ) : (
        <span className="text-display-md text-white/55">{name.slice(0, 1)}</span>
      )}
    </div>
  );
}

function BetStat({
  label,
  value,
  highlight,
  mono,
  border,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  border?: "left";
}) {
  return (
    <div
      className={`px-3 py-4 flex flex-col gap-2 ${
        border === "left" ? "border-l border-white/[0.06]" : ""
      }`}
    >
      <span className="eyebrow-tiny">{label}</span>
      <span
        className={`leading-none ${
          highlight ? "text-display-lg text-white" : "text-display-md text-white"
        } ${mono ? "num-mono tabular" : "font-display"}`}
      >
        {value}
      </span>
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  border,
  accent,
}: {
  label: string;
  value: string | number;
  border?: "left";
  accent?: boolean;
}) {
  return (
    <div
      className={`px-3 py-5 flex flex-col gap-2.5 items-center ${
        border === "left" ? "border-l border-white/[0.06]" : ""
      }`}
    >
      <span
        className={`text-display-xl tabular leading-none ${
          accent ? "text-lime" : "text-white"
        } num-mono`}
      >
        {value}
      </span>
      <span className="eyebrow-tiny">{label}</span>
    </div>
  );
}
