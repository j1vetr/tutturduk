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

const PULL_QUOTES = [
  "Form çizgisi yukarı, savunma istikrarlı.",
  "Oran piyasası bu senaryoyu hafife almış.",
  "Veri güçlü, sürpriz olasılığı düşük.",
  "Geçmiş karşılaşmalar bu yönü destekliyor.",
  "Sezonun seyri net bir tablo çiziyor.",
  "İki takımın da ofansif tercihleri aynı yönü işaret ediyor.",
  "Sayısal ağırlıklar tek bir senaryoda buluşuyor.",
];

function pullQuoteFor(bet: FeaturedBet | null) {
  if (!bet) return PULL_QUOTES[0];
  const idx = (bet.fixture_id || bet.confidence || 0) % PULL_QUOTES.length;
  return PULL_QUOTES[idx];
}

function bulletinTimeLabel() {
  const h = new Date().getHours();
  if (h < 6) return "BU GECE BÜLTENDE";
  if (h < 12) return "BU SABAH BÜLTENDE";
  if (h < 17) return "BU ÖĞLE BÜLTENDE";
  if (h < 21) return "BU AKŞAM BÜLTENDE";
  return "BU GECE BÜLTENDE";
}

function issueNumber() {
  // Issue counter from a fixed launch date — gives an "almanak" feel.
  const launch = new Date("2026-01-01T00:00:00+03:00");
  const today = new Date();
  return Math.max(1, Math.floor((today.getTime() - launch.getTime()) / 86400000) + 1);
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
      const duration = 1200;
      const steps = 50;
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

      // If the two core endpoints both fail, treat as a hard error.
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
          .slice(0, 5);
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

  const todayLong = format(new Date(), "d MMMM, EEEE", { locale: tr }).toUpperCase();
  const todayShort = format(new Date(), "d MMMM yyyy", { locale: tr });

  return (
    <MobileLayout activeTab="home">
      {/* Atmosphere — fixed background layers behind everything */}
      <div className="atmosphere-glow" aria-hidden />
      <div className="atmosphere-grain" aria-hidden />

      <div className="space-y-10 pt-2 relative z-10">

        {/* ───── MASTHEAD ───── */}
        <header className="pt-3 animate-fade-in">
          {/* Künye satırı */}
          <div className="flex items-center justify-between text-[9.5px] font-medium tracking-[0.2em] text-white/40 uppercase mb-5">
            <span className="num-display tracking-[0.18em]">
              SAYI · {String(issueNumber()).padStart(3, "0")}
            </span>
            <span className="w-6 h-px bg-white/10" />
            <span>{todayLong}</span>
          </div>

          {/* Headline */}
          <h1 className="almanac-mast text-[42px] sm:text-[48px] text-white">
            Bugünün <span className="italic text-white/85">bülteni</span>.
          </h1>

          {/* Edition mark */}
          <div className="flex items-baseline justify-between mt-4">
            <span className="text-[11px] text-white/35 font-light italic font-serif-display">
              — günün analizleri, oranlar ve değer.
            </span>
            <span className="text-[10px] text-white/35 font-serif-display italic tracking-wide">
              v.10 · GPT-4o
            </span>
          </div>
        </header>

        {/* ───── ERROR STATE ───── */}
        {error && !loading && (
          <div className="premium-card rounded-[18px] px-5 py-5 text-center" data-testid="error-dashboard">
            <p className="font-serif-display italic text-[18px] text-white/85 leading-tight">
              {error}
            </p>
            <p className="text-[12px] text-white/45 font-light mt-2">
              Sunucuya ulaşırken bir aksaklık oldu.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="mt-4 px-5 py-2 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.2em] font-medium text-white/85 hover:bg-white/[0.04] transition-colors"
              data-testid="button-retry-dashboard"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {/* ───── COVER STORY — Featured Bet ───── */}
        {featuredBet ? (
          <button
            onClick={() => setLocation(`/match/${featuredBet.fixture_id}`)}
            className="block w-full text-left group animate-slide-up"
            data-testid="card-featured-bet"
          >
            <div className="relative premium-card-elevated rounded-[22px] overflow-hidden">
              {/* Cream accent rail (left) */}
              <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-accent-cream rounded-full opacity-90" />

              <div className="px-6 py-6">
                {/* Top label row */}
                <div className="flex items-center justify-between mb-6 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="status-dot status-dot-live animate-pulse-soft" />
                    <span className="text-[9.5px] font-medium tracking-[0.2em] uppercase accent-cream opacity-90">
                      Bugünün Bahsi
                    </span>
                  </div>
                  <span className="text-[10.5px] text-white/45 num-display tracking-wider">
                    {featuredBet.match_time}
                  </span>
                </div>

                {/* Teams — magazine cover horizontal balance */}
                <div className="pl-3 mb-5">
                  <div className="flex items-center justify-between gap-3">
                    <TeamSide
                      logo={featuredBet.home_logo}
                      name={featuredBet.home_team}
                      align="left"
                    />
                    <div className="flex flex-col items-center flex-shrink-0 px-1">
                      <span className="font-serif-display italic text-[13px] text-white/45 leading-none">
                        vs
                      </span>
                      <span className="block w-5 h-px bg-white/15 mt-2" aria-hidden />
                    </div>
                    <TeamSide
                      logo={featuredBet.away_logo}
                      name={featuredBet.away_team}
                      align="right"
                    />
                  </div>
                  {featuredBet.league_name && (
                    <p className="text-center text-[9.5px] text-white/35 uppercase tracking-[0.22em] font-medium mt-3">
                      {featuredBet.league_name}
                    </p>
                  )}
                </div>

                {/* Pull quote — editor's reading of the match */}
                <div className="pl-3 mb-6 relative">
                  <div className="absolute left-0 top-1 bottom-1 w-px bg-white/15" />
                  <p className="pull-quote text-[16px] pl-3.5">
                    “{pullQuoteFor(featuredBet)}”
                  </p>
                </div>

                {/* Hairline */}
                <div className="h-px bg-white/[0.06] mb-5" />

                {/* Metrics info-strip */}
                <div className="grid grid-cols-3 gap-4 pl-3">
                  <CoverMetric label="Tahmin" value={featuredBet.bet_type} accent />
                  <CoverMetric label="Oran" value={parseFloat(featuredBet.odds).toFixed(2)} mono />
                  <CoverMetric label="Güven" value={`%${featuredBet.confidence}`} mono />
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end gap-1.5 mt-6 pt-4 border-t border-white/[0.05]">
                  <span className="font-serif-display italic text-[12.5px] text-white/65">
                    Detaylı analiz
                  </span>
                  <span
                    aria-hidden
                    className="text-white/65 transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </div>
              </div>
            </div>
          </button>
        ) : loading ? (
          <div className="premium-card rounded-[22px] h-[320px] animate-pulse" />
        ) : null}

        <Ornament />

        {/* ───── BUGÜNÜN HESABI — kartsız stat blok ───── */}
        <section>
          <SectionLabel left="Bugünün Hesabı" right={stats ? `${stats.won}/${stats.won + stats.lost}` : "—"} />

          <div className="grid grid-cols-3 gap-0">
            <BigStat
              label="Kazanan"
              value={loading ? "—" : animatedStats.won}
              border="right"
            />
            <BigStat
              label="Toplam"
              value={loading ? "—" : animatedStats.total}
              border="right"
            />
            <BigStat
              label="Oran"
              value={loading ? "—" : `%${animatedStats.rate}`}
            />
          </div>

          {stats && stats.successRate > 0 && (
            <div className="mt-5 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="label-meta-sm">Başarı oranı</span>
                <span className="text-[10.5px] text-white/55 num-display">
                  {stats.won} tuttu · {stats.lost} tutmadı
                </span>
              </div>
              <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/85 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${animatedStats.rate}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ───── EDITOR'S COUPON ───── */}
        {dailyCoupon && dailyCoupon.predictions && dailyCoupon.predictions.length > 0 && (
          <>
            <Ornament />
            <section>
              <SectionLabel
                left="Editörün Kuponu"
                right={`${dailyCoupon.predictions.length} MAÇ`}
              />

              <button
                onClick={() => setLocation(`/coupon/${dailyCoupon.id}`)}
                className="block w-full text-left premium-card rounded-[22px] p-6 hover:bg-white/[0.025] transition-colors animate-slide-up"
                data-testid="card-daily-coupon"
              >
                {/* Header — büyük italic toplam oran solda */}
                <div className="flex items-end justify-between mb-5">
                  <div className="flex flex-col">
                    <span className="label-meta-sm">Toplam Oran</span>
                    <span className="font-serif-display italic text-[44px] text-white leading-[0.95] tracking-tight mt-1.5">
                      {parseFloat(dailyCoupon.combined_odds).toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10.5px] text-white/40 num-display tracking-wider">
                    ID·{String(dailyCoupon.id).padStart(4, "0")}
                  </span>
                </div>

                {/* Dotted separator */}
                <div className="dotted-separator my-5" />

                {/* Predictions list */}
                <div className="space-y-3.5">
                  {dailyCoupon.predictions.map((pred, idx) => (
                    <div key={pred.id} className="flex items-center gap-3">
                      <span className="font-serif-display italic text-[13px] text-white/40 w-[22px] flex-shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-white/95 font-medium truncate leading-tight">
                          {pred.home_team} <span className="text-white/30">·</span> {pred.away_team}
                        </div>
                        <div className="text-[10.5px] text-white/40 mt-0.5 num-display">
                          {pred.match_time}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2.5 flex-shrink-0">
                        <span className="text-[12px] text-white/85 font-serif-display italic">
                          {pred.bet_type}
                        </span>
                        <span className="text-[11px] text-white/55 num-display">
                          {pred.odds ? parseFloat(pred.odds).toFixed(2) : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer CTA */}
                <div className="flex items-center justify-end gap-1.5 mt-6 pt-4 border-t border-white/[0.05]">
                  <span className="font-serif-display italic text-[12.5px] text-white/65">
                    Kuponu görüntüle
                  </span>
                  <span aria-hidden className="text-white/65">→</span>
                </div>
              </button>
            </section>
          </>
        )}

        <Ornament />

        {/* ───── BU AKŞAM BÜLTENDE — yaklaşan maçlar (kartsız) ───── */}
        <section>
          <SectionLabel
            left={bulletinTimeLabel()}
            right={
              <button
                onClick={() => setLocation("/predictions")}
                className="flex items-center gap-1 text-[10px] text-white/55 hover:text-white transition-colors uppercase tracking-[0.18em] font-medium"
                data-testid="link-all-predictions"
              >
                Tümü <span aria-hidden>→</span>
              </button>
            }
          />

          {loading ? (
            <div className="space-y-4 px-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-white/[0.04] rounded w-1/2 mb-2" />
                  <div className="h-2 bg-white/[0.03] rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : todayMatches.length > 0 ? (
            <div className="px-1">
              {todayMatches.map((match, idx) => {
                const primaryBet = match.predictions?.find((p) => p.bet_category === "primary");
                return (
                  <button
                    key={match.id}
                    onClick={() => setLocation(`/match/${match.fixture_id}`)}
                    className="w-full py-4 text-left active:opacity-70 transition-opacity group block border-t border-white/[0.05] first:border-t-0"
                    data-testid={`card-match-${match.fixture_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="num-display text-[12px] text-white/55 tracking-wider flex-shrink-0 w-[42px]">
                        {match.match_time}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] text-white/95 font-medium leading-tight truncate">
                          {match.home_team} <span className="text-white/30">·</span> {match.away_team}
                        </p>
                        {match.league_name && (
                          <p className="text-[10px] text-white/35 mt-1 uppercase tracking-[0.14em] font-medium truncate">
                            {match.league_name}
                          </p>
                        )}
                      </div>
                      {primaryBet && (
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="font-serif-display italic text-[13px] text-white/85 leading-none">
                            {primaryBet.bet_type}
                          </span>
                          <span className="text-[10px] text-white/40 num-display mt-1">
                            %{primaryBet.confidence}
                          </span>
                        </div>
                      )}
                      <span className="text-white/30 group-hover:text-white/65 group-hover:translate-x-0.5 transition-all text-[14px] flex-shrink-0">
                        →
                      </span>
                    </div>
                  </button>
                );
              })}
              {/* bottom hairline */}
              <div className="h-px bg-white/[0.05]" />
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="font-serif-display italic text-[20px] text-white/75">Bugün maç yok.</p>
              <p className="text-[12px] text-white/40 mt-2 font-light">
                Yeni analizler yarın saat 01:00'da yayınlanır.
              </p>
            </div>
          )}
        </section>

        <Ornament />

        {/* ───── EDİTÖRDEN ───── */}
        <section className="relative">
          <div className="flex items-start gap-4">
            <span className="drop-cap leading-[0.85] flex-shrink-0 mt-1">V</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[9.5px] font-medium tracking-[0.2em] uppercase text-white/45">
                  Editörden · {todayShort}
                </span>
                <span className="text-[10px] text-white/30 font-serif-display italic">v.10</span>
              </div>
              <p className="font-serif-display italic text-[16px] text-white/85 leading-[1.4] -tracking-[0.005em]">
                eri, sezgi değil.
              </p>
              <p className="text-[12.5px] text-white/45 font-light leading-[1.55] mt-3">
                Form, sakatlık, geçmiş karşılaşma, oran piyasası ve sezon istatistikleri
                GPT-4o ile değerlendirilir. Yalnızca <span className="text-white/75">güven ≥%70</span> ve
                <span className="text-white/75"> değer ≥%5</span> olan tahminler yayınlanır.
              </p>
              <div className="text-right mt-3">
                <span className="font-serif-display italic text-[11px] text-white/40">
                  — tutturduk
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ───── KÜNYE / SIGNATURE ───── */}
        <div className="text-center pt-4 pb-2">
          <span className="font-serif-display italic text-[11px] text-white/30 tracking-wide">
            tutturduk · veri merkezi · {String(issueNumber()).padStart(3, "0")}
          </span>
        </div>

      </div>
    </MobileLayout>
  );
}

/* ───── Helpers ───── */

function SectionLabel({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/55">
        {left}
      </span>
      {typeof right === "string" ? (
        <span className="text-[10px] font-medium tracking-[0.18em] uppercase text-white/40 num-display">
          {right}
        </span>
      ) : (
        right
      )}
    </div>
  );
}

function Ornament() {
  return <div className="ornament-divider py-2" aria-hidden />;
}

function TeamSide({
  logo,
  name,
  align,
}: {
  logo?: string;
  name: string;
  align: "left" | "right";
}) {
  const isRight = align === "right";
  return (
    <div className={`flex flex-col flex-1 min-w-0 gap-2 ${isRight ? "items-end text-right" : "items-start text-left"}`}>
      <div className="w-[34px] h-[34px] rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
        {logo ? (
          <img src={logo} alt="" className="w-6 h-6 object-contain" />
        ) : (
          <span className="text-[12px] text-white/55 font-medium">{name.slice(0, 1)}</span>
        )}
      </div>
      <span className="text-[15px] text-white/95 font-medium leading-tight -tracking-[0.005em] line-clamp-2 w-full">
        {name}
      </span>
    </div>
  );
}

function CoverMetric({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-white/40">
        {label}
      </span>
      <span
        className={`text-[15px] leading-none ${
          accent ? "font-serif-display italic text-white/95" : ""
        } ${mono ? "num-display text-white/95" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function BigStat({
  label,
  value,
  border,
}: {
  label: string;
  value: string | number;
  border?: "right";
}) {
  return (
    <div
      className={`px-2 py-3 flex flex-col items-center gap-2 ${
        border === "right" ? "border-r border-white/[0.06]" : ""
      }`}
    >
      <span className="font-serif-display text-[34px] text-white leading-none num-display tracking-tight">
        {value}
      </span>
      <span className="text-[9.5px] font-medium tracking-[0.2em] uppercase text-white/45">
        {label}
      </span>
    </div>
  );
}
