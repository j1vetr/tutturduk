import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/MobileLayout";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";

interface CouponPrediction {
  id: number;
  home_team: string;
  away_team: string;
  league_name?: string;
  prediction: string;
  odds: string;
  match_time?: string;
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: string;
  status: string;
  result: string;
  predictions?: CouponPrediction[];
}

export default function CouponCreatorPage() {
  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
    queryFn: async () => {
      const res = await fetch("/api/coupons");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
  });

  const todayCoupons = coupons.filter((c) => c.status === "pending" || c.result === "pending").slice(0, 3);
  const resultLabel = (r: string) => (r === "won" ? "Kazandı" : r === "lost" ? "Kaybetti" : "Bekliyor");
  const resultDot = (r: string) =>
    r === "won" ? "status-dot-won" : r === "lost" ? "status-dot-lost" : "status-dot-pending";

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-7 pt-3">
        {/* MASTHEAD */}
        <header className="pt-2">
          <span className="label-meta-sm">Kuponlar</span>
          <h1 className="font-serif-display text-[30px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
            Günün <span className="italic text-white/85">uzman kuponları</span>.
          </h1>
          <p className="text-[11.5px] text-white/45 leading-relaxed mt-3 max-w-[360px] font-light">
            Her gün, en yüksek güven değerine sahip 2-3 maçlık kombinasyonlar paylaşılır.
          </p>
        </header>

        {/* COUPONS */}
        <section className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="premium-card rounded-[18px] h-44 animate-pulse" />
              ))}
            </div>
          ) : todayCoupons.length === 0 ? (
            <div className="premium-card rounded-[18px] py-12 text-center">
              <p className="font-serif-display text-[20px] text-white/80 italic">Henüz kupon yok.</p>
              <p className="text-[12px] text-white/40 mt-2 font-light">
                Yeni kupon önerileri her gün saat 01:00'da yayınlanır.
              </p>
            </div>
          ) : (
            todayCoupons.map((coupon, idx) => (
              <Link key={coupon.id} href={`/coupon/${coupon.id}`}>
                <a className="block premium-card rounded-[18px] p-5 hover:bg-white/[0.025] transition-colors group">
                  {/* header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[10px] text-white/30 num-display">
                          KUPON {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                          <span className={`status-dot ${resultDot(coupon.result)}`} />
                          <span className="text-[10px] text-white/55 uppercase tracking-[0.14em] font-medium">
                            {resultLabel(coupon.result)}
                          </span>
                        </div>
                      </div>
                      <span className="font-serif-display text-[18px] text-white -tracking-[0.005em] leading-tight">
                        {coupon.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="label-meta-sm">Oran</span>
                      <span className="num-display text-[24px] text-white leading-none mt-1 tracking-tight">
                        {parseFloat(coupon.combined_odds || "1").toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.06] mb-4" />

                  {/* predictions */}
                  {coupon.predictions && coupon.predictions.length > 0 ? (
                    <div className="space-y-3">
                      {coupon.predictions.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="text-[10px] text-white/30 num-display w-4">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] text-white/85 font-medium truncate leading-tight">
                              {p.home_team} <span className="text-white/30">·</span> {p.away_team}
                            </div>
                            <div className="text-[10.5px] text-white/40 mt-0.5 num-display">{p.match_time}</div>
                          </div>
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-serif-display italic text-[12px] text-white/85">{p.prediction}</span>
                            <span className="num-display text-[11px] text-white/55">{parseFloat(p.odds || "0").toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-white/45 font-light text-center py-2">
                      Bu kupona henüz maç eklenmedi.
                    </p>
                  )}

                  {/* footer cta */}
                  <div className="flex items-center justify-end gap-1.5 mt-5 pt-4 border-t border-white/[0.05]">
                    <span className="text-[11px] text-white/55 font-medium tracking-wide">Detayları gör</span>
                    <ArrowUpRight
                      className="w-3.5 h-3.5 text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.8}
                    />
                  </div>
                </a>
              </Link>
            ))
          )}
        </section>

        {/* DISCLAIMER */}
        <div className="premium-card rounded-[16px] px-5 py-4">
          <p className="text-[11.5px] text-white/45 leading-relaxed font-light">
            Kuponlar yalnızca bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir. Bahis risk içerir.
          </p>
        </div>

        <div className="text-center pt-2 pb-2">
          <span className="label-meta-sm font-serif-display italic text-white/30 normal-case tracking-normal">
            tutturduk · veri merkezi
          </span>
        </div>
      </div>
    </MobileLayout>
  );
}
