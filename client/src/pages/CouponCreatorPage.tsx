import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/MobileLayout";
import { 
  Sparkles, Ticket, TrendingUp, Clock, ChevronRight, 
  Target, AlertCircle, Trophy
} from "lucide-react";
import { Link } from "wouter";

interface CouponPrediction {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  prediction: string;
  odds: string;
  match_time?: string;
  match_date?: string;
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
    queryKey: ['/api/coupons'],
    queryFn: async () => {
      const res = await fetch('/api/coupons');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000
  });

  const todayCoupons = coupons
    .filter(c => c.status === 'pending' || c.result === 'pending')
    .slice(0, 3);

  const getResultBadge = (result: string) => {
    if (result === 'won') return { text: 'KAZANDI', color: 'bg-emerald-500 text-white' };
    if (result === 'lost') return { text: 'KAYBETTİ', color: 'bg-red-500 text-white' };
    return { text: 'BEKLİYOR', color: 'bg-amber-500/20 text-amber-400' };
  };

  return (
    <MobileLayout activeTab="coupons">
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/20 p-6 mx-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white">Günün Uzman Kuponları</h1>
                <p className="text-[11px] text-zinc-400">AI Destekli Profesyonel Öneriler</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              Uzman analistlerimiz ve yapay zeka tarafından hazırlanan günün en iyi kupon önerileri. 
              Her gün maksimum 3 adet özel kupon paylaşılmaktadır.
            </p>
          </div>
        </div>

        {/* Coupons List */}
        <div className="px-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-zinc-900 rounded-2xl h-48" />
              ))}
            </div>
          ) : todayCoupons.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Henüz Kupon Yok</h3>
              <p className="text-sm text-zinc-500">
                Bugün için henüz kupon önerisi paylaşılmadı. Lütfen daha sonra tekrar kontrol edin.
              </p>
            </div>
          ) : (
            todayCoupons.map((coupon, index) => {
              const badge = getResultBadge(coupon.result);
              return (
                <div 
                  key={coupon.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  {/* Coupon Header */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                          <span className="text-lg font-black text-white">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{coupon.name}</h3>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { 
                              day: 'numeric', month: 'long' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${badge.color}`}>
                          {badge.text}
                        </span>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-lg font-bold text-emerald-400">
                            {parseFloat(coupon.combined_odds || '1').toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Predictions */}
                  <div className="divide-y divide-zinc-800">
                    {coupon.predictions && coupon.predictions.length > 0 ? (
                      coupon.predictions.map(pred => (
                        <div key={pred.id} className="p-3 hover:bg-zinc-800/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-6 h-6 rounded bg-white/5 p-0.5 flex-shrink-0">
                                {pred.home_logo && <img src={pred.home_logo} alt="" className="w-full h-full object-contain" />}
                              </div>
                              <span className="text-xs text-white truncate">{pred.home_team}</span>
                              <span className="text-[10px] text-zinc-600">vs</span>
                              <span className="text-xs text-white truncate">{pred.away_team}</span>
                              <div className="w-6 h-6 rounded bg-white/5 p-0.5 flex-shrink-0">
                                {pred.away_logo && <img src={pred.away_logo} alt="" className="w-full h-full object-contain" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                                {pred.prediction}
                              </span>
                              <span className="text-xs font-bold text-amber-400">
                                {pred.odds}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-8">
                            <span className="text-[9px] text-zinc-600">{pred.league_name}</span>
                            {pred.match_time && (
                              <>
                                <span className="text-zinc-700">•</span>
                                <Clock className="w-3 h-3 text-zinc-600" />
                                <span className="text-[9px] text-zinc-600">{pred.match_time}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-zinc-500">Bu kupona henüz maç eklenmedi</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-zinc-900/50 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>AI Destekli Analiz</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>{coupon.predictions?.length || 0} Maç</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info Section */}
        <div className="mx-4 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Önemli Bilgi</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Kuponlar sadece bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir. 
                Bahis oynarken sorumlu davranın ve bütçenizi aşmayın.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
