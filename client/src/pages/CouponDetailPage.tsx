import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft } from "lucide-react";

interface Prediction {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_id: string;
  league_name?: string;
  league_logo?: string;
  prediction: string;
  odds: number;
  match_time: string;
  match_date: string | null;
  result: string;
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  status: string;
  result: string;
  predictions?: Prediction[];
}

export default function CouponDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const couponId = params.id;
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!couponId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/coupons/${couponId}`);
        if (res.ok) setCoupon(await res.json());
      } finally { setLoading(false); }
    })();
  }, [couponId]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  const resultLabel = (r: string) => (r === "won" ? "Kazandı" : r === "lost" ? "Kaybetti" : "Bekliyor");
  const resultDot = (r: string) =>
    r === "won" ? "status-dot-won" : r === "lost" ? "status-dot-lost" : "status-dot-pending";

  if (loading) {
    return (
      <MobileLayout activeTab="home">
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 rounded-full border border-white/[0.10] border-t-white/60 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (!coupon) {
    return (
      <MobileLayout activeTab="home">
        <div className="text-center py-24">
          <p className="font-serif-display text-[20px] text-white/80 italic mb-2">Kupon bulunamadı.</p>
          <button
            onClick={() => setLocation("/")}
            className="mt-6 px-6 py-3 rounded-full border border-white/[0.10] hover:border-white/[0.22] text-[12px] text-white/85 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Ana Sayfa
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6 pt-3">
        {/* back */}
        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 text-[11px] text-white/55 hover:text-white/90 transition-colors -ml-1"
          data-testid="button-back-coupon"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span className="tracking-wide">Geri</span>
        </button>

        {/* MASTHEAD */}
        <header>
          <span className="label-meta-sm">Kupon</span>
          <h1 className="font-serif-display text-[28px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
            {coupon.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-white/45">{formatDate(coupon.coupon_date)}</span>
            <span className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className={`status-dot ${resultDot(coupon.result)}`} />
              <span className="text-[10px] text-white/55 uppercase tracking-[0.14em] font-medium">{resultLabel(coupon.result)}</span>
            </div>
          </div>
        </header>

        {/* HEADLINE STATS */}
        <section className="premium-card-elevated rounded-[20px] p-6">
          <div className="flex items-end justify-between mb-5">
            <div className="flex flex-col">
              <span className="label-meta-sm">Toplam Oran</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif-display text-[44px] text-white num-display tracking-tight leading-none">
                  {Number(coupon.combined_odds).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="label-meta-sm">Maç</span>
              <span className="num-display text-[28px] text-white leading-none mt-1">{coupon.predictions?.length || 0}</span>
            </div>
          </div>
          <div className="text-[10.5px] text-white/40 num-display">ID·{String(coupon.id).padStart(4, "0")}</div>
        </section>

        {/* PREDICTIONS */}
        <section>
          <div className="px-1 mb-3">
            <span className="label-meta">Kupondaki Tahminler</span>
          </div>
          {coupon.predictions && coupon.predictions.length > 0 ? (
            <div className="premium-card rounded-[18px] divide-y divide-white/[0.05] overflow-hidden">
              {coupon.predictions.map((p, i) => (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-white/30 num-display w-4">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[10px] text-white/40 truncate uppercase tracking-[0.14em] font-medium max-w-[180px]">
                        {p.league_name || p.league_id}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-white/45 num-display tracking-wider">{p.match_time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-white/95 font-medium leading-tight truncate">{p.home_team}</p>
                      <p className="text-[13.5px] text-white/95 font-medium leading-tight truncate mt-0.5">{p.away_team}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                    <div className="flex items-baseline gap-2.5">
                      <span className="label-meta-sm">Tahmin</span>
                      <span className="font-serif-display italic text-[14px] text-white/95">{p.prediction}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num-display text-[12.5px] text-white/55">
                        {typeof p.odds === "number" ? p.odds.toFixed(2) : Number(p.odds).toFixed(2)}
                      </span>
                      {p.result !== "pending" && (
                        <span className={`text-[10px] uppercase tracking-[0.14em] font-medium ${
                          p.result === "won" ? "text-emerald-300/85" : "text-red-300/85"
                        }`}>
                          {p.result === "won" ? "Tuttu" : "Tutmadı"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-card rounded-[18px] py-10 text-center">
              <p className="font-serif-display text-[18px] text-white/75 italic">Bu kuponda tahmin yok.</p>
            </div>
          )}
        </section>

        <div className="text-center pt-3 pb-2">
          <span className="label-meta-sm font-serif-display italic text-white/30 normal-case tracking-normal">
            tutturduk · veri merkezi
          </span>
        </div>
      </div>
    </MobileLayout>
  );
}
