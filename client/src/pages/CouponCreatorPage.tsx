import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Ticket, Trash2, Plus, TrendingUp, Shield, 
  Target, Zap, ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

interface CouponItem {
  id: number;
  coupon_id: number;
  match_id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_date: string;
  match_time: string;
  bet_type: string;
  odds: number;
  result: string;
}

interface UserCoupon {
  id: number;
  user_id: number;
  name: string;
  coupon_type: string;
  total_odds: number;
  status: string;
  created_at: string;
  items?: CouponItem[];
}

export default function CouponCreatorPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creatingCoupon, setCreatingCoupon] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery<UserCoupon[]>({
    queryKey: ['/api/user/coupons'],
    queryFn: async () => {
      const res = await fetch('/api/user/coupons', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user
  });

  const createAICoupon = useMutation({
    mutationFn: async (riskLevel: string) => {
      setCreatingCoupon(riskLevel);
      const res = await fetch('/api/user/coupons/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskLevel }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Kupon oluşturulamadı');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/coupons'] });
      setCreatingCoupon(null);
    },
    onError: () => {
      setCreatingCoupon(null);
    }
  });

  const deleteCoupon = useMutation({
    mutationFn: async (couponId: number) => {
      const res = await fetch(`/api/user/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Kupon silinemedi');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/coupons'] });
    }
  });

  if (!user) {
    return (
      <MobileLayout activeTab="coupons">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Kupon Oluşturucu</h2>
          <p className="text-sm text-zinc-400 mb-6">AI destekli kuponlar oluşturmak için giriş yapın</p>
          <Link href="/login">
            <Button className="bg-emerald-500 text-black font-bold hover:bg-emerald-400">
              Giriş Yap
            </Button>
          </Link>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout activeTab="coupons">
      <div className="space-y-6 pb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/20 p-6 mx-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white">AI Kupon Oluşturucu</h1>
                <p className="text-[11px] text-zinc-400">Yapay zeka destekli kuponlar</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              AI'ın günün en iyi bahislerinden otomatik kupon oluşturmasını sağla. Risk seviyeni seç ve kuponun hazır!
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => createAICoupon.mutate('low')}
                disabled={!!creatingCoupon}
                className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 h-auto py-3 flex-col"
                variant="ghost"
              >
                {creatingCoupon === 'low' ? (
                  <Loader2 className="w-5 h-5 animate-spin mb-1" />
                ) : (
                  <Shield className="w-5 h-5 mb-1" />
                )}
                <span className="text-[10px] font-bold">GÜVENLİ</span>
                <span className="text-[9px] opacity-70">3 maç</span>
              </Button>
              
              <Button
                onClick={() => createAICoupon.mutate('medium')}
                disabled={!!creatingCoupon}
                className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 h-auto py-3 flex-col"
                variant="ghost"
              >
                {creatingCoupon === 'medium' ? (
                  <Loader2 className="w-5 h-5 animate-spin mb-1" />
                ) : (
                  <Target className="w-5 h-5 mb-1" />
                )}
                <span className="text-[10px] font-bold">DENGELİ</span>
                <span className="text-[9px] opacity-70">4 maç</span>
              </Button>
              
              <Button
                onClick={() => createAICoupon.mutate('high')}
                disabled={!!creatingCoupon}
                className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 h-auto py-3 flex-col"
                variant="ghost"
              >
                {creatingCoupon === 'high' ? (
                  <Loader2 className="w-5 h-5 animate-spin mb-1" />
                ) : (
                  <Zap className="w-5 h-5 mb-1" />
                )}
                <span className="text-[10px] font-bold">YÜKSEK KAZANÇ</span>
                <span className="text-[9px] opacity-70">5 maç</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Kuponlarım</h2>
            {coupons.length > 0 && (
              <span className="text-xs text-zinc-500">({coupons.length})</span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">Henüz kupon oluşturmadınız</p>
              <p className="text-xs text-zinc-600 mt-1">Yukarıdan AI destekli kupon oluşturun</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coupons.map(coupon => (
                <div 
                  key={coupon.id}
                  className={`rounded-2xl border overflow-hidden ${
                    coupon.coupon_type === 'ai-generated' 
                      ? 'bg-gradient-to-br from-amber-500/5 via-zinc-900 to-zinc-900 border-amber-500/20'
                      : 'bg-zinc-900/80 border-zinc-800'
                  }`}
                >
                  <div className="p-4 border-b border-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {coupon.coupon_type === 'ai-generated' && (
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                          </div>
                        )}
                        <span className="text-sm font-bold text-white">{coupon.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCoupon.mutate(coupon.id)}
                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>{coupon.items?.length || 0} maç</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">
                          {parseFloat(String(coupon.total_odds || 1)).toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>

                  {coupon.items && coupon.items.length > 0 && (
                    <div className="divide-y divide-zinc-800/50">
                      {coupon.items.map(item => (
                        <div key={item.id} className="p-3 flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-6 h-6 rounded bg-white/5 p-1 flex-shrink-0">
                              {item.home_logo && <img src={item.home_logo} alt="" className="w-full h-full object-contain" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-white truncate">
                                {item.home_team} - {item.away_team}
                              </p>
                              <p className="text-[10px] text-zinc-500">{item.match_time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              {item.bet_type}
                            </span>
                            <span className="text-xs text-zinc-400">{item.odds}x</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!coupon.items || coupon.items.length === 0) && (
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">Günün en iyi bahisleri henüz oluşturulmamış</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
