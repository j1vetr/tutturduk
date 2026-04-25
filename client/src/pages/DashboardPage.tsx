import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { useLocation } from "wouter";
import { ArrowUpRight, ChevronRight } from "lucide-react";
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
    try {
      const [statsRes, matchesRes, featuredRes, couponRes] = await Promise.all([
        fetch("/api/best-bets/stats", { credentials: "include" }),
        fetch("/api/matches", { credentials: "include" }),
        fetch("/api/featured-bet", { credentials: "include" }),
        fetch("/api/daily-coupon", { credentials: "include" }),
      ]);
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
    } finally {
      setLoading(false);
    }
  }

  const today = format(new Date(), "d MMMM yyyy", { locale: tr });
  const todayShort = format(new Date(), "EEEE", { locale: tr });

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-7 pt-3">

        {/* ───── HEADER MASTHEAD ───── */}
        <header className="flex items-baseline justify-between pt-2">
          <div className="flex flex-col gap-1">
            <span className="label-meta-sm">{todayShort}</span>
            <h1 className="font-serif-display text-[28px] sm:text-[32px] text-white leading-[1] -tracking-[0.02em]">
              <span className="italic text-white/85">İyi günler.</span>
            </h1>
            <span className="text-[11px] text-white/40 mt-1 num-display">{today}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="label-meta-sm">Başarı</span>
            <div className="flex items-baseline gap-1">
              <span className="font-serif-display text-[28px] text-white leading-none num-display">
                {loading ? "—" : animatedStats.rate}
              </span>
              <span className="text-[14px] text-white/40 font-light">%</span>
            </div>
          </div>
        </header>

        {/* ───── FEATURED BET (Günün En İyi Bahisi) ───── */}
        {featuredBet && (
          <button
            onClick={() => setLocation(`/match/${featuredBet.fixture_id}`)}
            className="block w-full text-left premium-card-elevated rounded-[20px] p-5 active:scale-[0.995] transition-transform group"
            data-testid="card-featured-bet"
          >
            {/* top label row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot-live animate-pulse-soft" />
                <span className="label-meta-sm text-white/55">Günün Bahsi</span>
              </div>
              <span className="text-[10.5px] text-white/40 num-display tracking-wider">
                {featuredBet.match_time}
              </span>
            </div>

            {/* Teams display */}
            <div className="space-y-2.5 mb-5">
              <TeamRow logo={featuredBet.home_logo} name={featuredBet.home_team} />
              <div className="flex items-center gap-3 pl-[26px]">
                <span className="text-[10px] text-white/25 font-light italic font-serif-display">vs</span>
                <span className="text-[10px] text-white/30 truncate">{featuredBet.league_name}</span>
              </div>
              <TeamRow logo={featuredBet.away_logo} name={featuredBet.away_team} />
            </div>

            {/* divider */}
            <div className="h-px bg-white/[0.06] mb-4" />

            {/* metrics row */}
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Tahmin" value={featuredBet.bet_type} serif />
              <Metric label="Oran" value={parseFloat(featuredBet.odds).toFixed(2)} mono />
              <Metric label="Güven" value={`${featuredBet.confidence}%`} mono />
            </div>

            {/* CTA arrow */}
            <div className="flex items-center justify-end gap-1.5 mt-5 pt-4 border-t border-white/[0.05]">
              <span className="text-[11px] text-white/55 font-medium tracking-wide">Detaylı analiz</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} />
            </div>
          </button>
        )}

        {/* ───── STATS STRIP ───── */}
        <section>
          <SectionLabel left="Performans" right="Toplam İstatistik" />
          <div className="premium-card rounded-[18px] overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
              <StatCell label="Kazanan" value={loading ? "—" : animatedStats.won} />
              <StatCell label="Toplam" value={loading ? "—" : animatedStats.total} />
              <StatCell label="Oran" value={loading ? "—" : `${animatedStats.rate}%`} />
            </div>
            {stats && stats.successRate > 0 && (
              <>
                <div className="h-px bg-white/[0.05]" />
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-meta-sm">Başarı Oranı</span>
                    <span className="text-[10.5px] text-white/55 num-display">
                      {stats.won} / {stats.won + stats.lost}
                    </span>
                  </div>
                  <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/85 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${animatedStats.rate}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ───── DAILY COUPON ───── */}
        {dailyCoupon && dailyCoupon.predictions && dailyCoupon.predictions.length > 0 && (
          <section>
            <SectionLabel left="Günün Kuponu" right={`${dailyCoupon.predictions.length} Maç`} />
            <button
              onClick={() => setLocation(`/coupon/${dailyCoupon.id}`)}
              className="block w-full text-left premium-card rounded-[18px] p-5 hover:bg-white/[0.025] transition-colors"
              data-testid="card-daily-coupon"
            >
              {/* header */}
              <div className="flex items-end justify-between mb-5">
                <div className="flex flex-col">
                  <span className="label-meta-sm">Toplam Oran</span>
                  <span className="font-serif-display text-[36px] text-white leading-none num-display tracking-tight mt-1">
                    {parseFloat(dailyCoupon.combined_odds).toFixed(2)}
                  </span>
                </div>
                <span className="text-[10.5px] text-white/40 num-display">
                  ID·{String(dailyCoupon.id).padStart(4, "0")}
                </span>
              </div>

              {/* dotted separator */}
              <div className="relative my-4">
                <div className="absolute left-0 right-0 top-1/2 h-px"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.18) 50%, transparent 50%)',
                    backgroundSize: '6px 1px',
                  }} />
              </div>

              {/* predictions list */}
              <div className="space-y-3">
                {dailyCoupon.predictions.map((pred, idx) => (
                  <div key={pred.id} className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 num-display w-4">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] text-white/85 font-medium truncate leading-tight">
                        {pred.home_team} <span className="text-white/30">·</span> {pred.away_team}
                      </div>
                      <div className="text-[10.5px] text-white/40 mt-0.5 num-display">
                        {pred.match_time}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-medium text-white/85 font-serif-display italic">
                        {pred.bet_type}
                      </span>
                      <span className="text-[11px] text-white/55 num-display">
                        {pred.odds ? parseFloat(pred.odds).toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* footer cta */}
              <div className="flex items-center justify-end gap-1.5 mt-5 pt-4 border-t border-white/[0.05]">
                <span className="text-[11px] text-white/55 font-medium tracking-wide">Kuponu görüntüle</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/55" strokeWidth={1.8} />
              </div>
            </button>
          </section>
        )}

        {/* ───── UPCOMING MATCHES ───── */}
        <section>
          <SectionLabel
            left="Yaklaşan Maçlar"
            right={
              <button
                onClick={() => setLocation("/predictions")}
                className="flex items-center gap-1 text-[10.5px] text-white/55 hover:text-white transition-colors uppercase tracking-[0.16em] font-medium"
                data-testid="link-all-predictions"
              >
                Tümü <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </button>
            }
          />

          {loading ? (
            <div className="space-y-px premium-card rounded-[18px] overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-3 bg-white/[0.05] rounded w-3/4 mb-2" />
                  <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : todayMatches.length > 0 ? (
            <div className="premium-card rounded-[18px] overflow-hidden divide-y divide-white/[0.05]">
              {todayMatches.map((match) => {
                const primaryBet = match.predictions?.find((p) => p.bet_category === "primary");
                return (
                  <button
                    key={match.id}
                    onClick={() => setLocation(`/match/${match.fixture_id}`)}
                    className="w-full px-5 py-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors group"
                    data-testid={`card-match-${match.fixture_id}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-white/35 truncate uppercase tracking-[0.14em] font-medium">
                        {match.league_name || "Lig"}
                      </span>
                      <span className="text-[10.5px] text-white/55 num-display tracking-wider">
                        {match.match_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] text-white/95 font-medium leading-tight">
                          {match.home_team}
                        </p>
                        <p className="text-[13.5px] text-white/95 font-medium leading-tight mt-0.5">
                          {match.away_team}
                        </p>
                      </div>
                      {primaryBet && (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-serif-display italic text-[13px] text-white/85">
                            {primaryBet.bet_type}
                          </span>
                          <span className="text-[10px] text-white/40 num-display">
                            %{primaryBet.confidence}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/65 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="premium-card rounded-[18px] px-5 py-10 text-center">
              <p className="font-serif-display text-[18px] text-white/75 italic">Bugün maç yok.</p>
              <p className="text-[12px] text-white/40 mt-1.5 font-light">
                Yeni analizler yarın saat 01:00'da yayınlanır.
              </p>
            </div>
          )}
        </section>

        {/* ───── FOOTER METHODOLOGY ───── */}
        <section className="pt-2">
          <div className="premium-card rounded-[18px] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="label-meta-sm">Yöntem</span>
              <span className="text-[10px] text-white/30 font-serif-display italic">v.10</span>
            </div>
            <p className="font-serif-display text-[19px] text-white/95 leading-[1.25] mb-2.5 -tracking-[0.01em]">
              <span className="italic">Veri</span>, sezgi değil.
            </p>
            <p className="text-[12px] text-white/45 font-light leading-relaxed">
              Form, sakatlık, geçmiş karşılaşma, oran piyasası ve sezon istatistikleri
              GPT-4o ile değerlendirilir. <span className="text-white/65">Yalnızca güven ≥70</span> ve
              <span className="text-white/65"> değer ≥%5</span> olan tahminler yayınlanır.
            </p>
          </div>
        </section>

        {/* ───── BOTTOM SIGNATURE ───── */}
        <div className="text-center pt-3 pb-2">
          <span className="label-meta-sm font-serif-display italic text-white/30 normal-case tracking-normal">
            tutturduk · veri merkezi
          </span>
        </div>

      </div>
    </MobileLayout>
  );
}

/* ───── Helpers ───── */

function SectionLabel({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mb-3">
      <span className="label-meta">{left}</span>
      {typeof right === "string" ? <span className="label-meta-sm">{right}</span> : right}
    </div>
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

function Metric({ label, value, serif, mono }: { label: string; value: string; serif?: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-meta-sm">{label}</span>
      <span
        className={`text-[15px] text-white leading-none ${serif ? "font-serif-display italic" : ""} ${mono ? "num-display" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-5 flex flex-col items-center gap-1.5">
      <span className="font-serif-display text-[28px] text-white leading-none num-display">
        {value}
      </span>
      <span className="label-meta-sm">{label}</span>
    </div>
  );
}
