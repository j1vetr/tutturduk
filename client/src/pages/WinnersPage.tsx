import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, Ticket, CheckCircle, XCircle, Clock, Loader2, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface Prediction {
  id: number;
  home_team: string;
  away_team: string;
  prediction: string;
  odds: number;
  match_date: string | null;
  result: string;
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  result: string;
  predictions?: Prediction[];
}

interface Stats {
  totalPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  winRate: number;
  totalCoupons: number;
  wonCoupons: number;
  couponWinRate: number;
}

export default function WinnersPage() {
  const [, setLocation] = useLocation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [couponsRes, allPredsRes] = await Promise.all([
        fetch('/api/coupons'),
        fetch('/api/predictions')
      ]);
      
      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setCoupons(data);
      }
      
      if (allPredsRes.ok) {
        const data = await allPredsRes.json();
        setPredictions(data);
        
        const won = data.filter((p: Prediction) => p.result === 'won').length;
        const lost = data.filter((p: Prediction) => p.result === 'lost').length;
        const pending = data.filter((p: Prediction) => p.result === 'pending').length;
        const total = data.length;
        
        const couponsData = await couponsRes.json().catch(() => []);
        const wonCoupons = coupons.filter(c => c.result === 'won').length;
        
        setStats({
          totalPredictions: total,
          wonPredictions: won,
          lostPredictions: lost,
          pendingPredictions: pending,
          winRate: total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0,
          totalCoupons: coupons.length,
          wonCoupons: wonCoupons,
          couponWinRate: coupons.length > 0 ? Math.round((wonCoupons / (wonCoupons + coupons.filter(c => c.result === 'lost').length || 1)) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const wonCoupons = coupons.filter(c => c.result === 'won');
  const wonPredictions = predictions.filter(p => p.result === 'won');

  const totalCompleted = predictions.filter(p => p.result !== 'pending').length;
  const winRate = totalCompleted > 0 ? Math.round((wonPredictions.length / totalCompleted) * 100) : 0;

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-display text-foreground border-l-4 border-secondary pl-3">Başarı İstatistikleri</h2>
          <p className="text-xs text-muted-foreground pl-4">Geçmiş performansımız ve kazandıran kuponlar.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-green-900/30 to-green-800/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-green-400 font-medium">Kazanma Oranı</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">%{winRate}</p>
                  <p className="text-xs text-zinc-500 mt-1">{wonPredictions.length}/{totalCompleted} tahmin</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="text-xs text-primary font-medium">Toplam Tahmin</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{predictions.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">{predictions.filter(p => p.result === 'pending').length} bekleyen</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5 text-blue-500" />
                    <span className="text-xs text-blue-400 font-medium">Kupon Sayısı</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{coupons.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">{wonCoupons.length} kazandı</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/10 border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs text-yellow-400 font-medium">Kazanan Kupon</span>
                  </div>
                  <p className="text-3xl font-bold text-yellow-500">{wonCoupons.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">toplam kazanç</p>
                </CardContent>
              </Card>
            </div>

            {wonCoupons.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />
                  Kazanan Kuponlar
                </h3>
                
                <div className="space-y-3">
                  {wonCoupons.map(coupon => (
                    <Card 
                      key={coupon.id} 
                      className="bg-gradient-to-r from-green-900/20 to-green-800/10 border-green-500/20 cursor-pointer hover:border-green-500/50 transition-colors"
                      onClick={() => setLocation(`/coupon/${coupon.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{coupon.name}</h4>
                              <p className="text-xs text-zinc-500">
                                {new Date(coupon.coupon_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-green-500 text-black font-bold">{coupon.combined_odds}x</Badge>
                            <ChevronRight className="w-5 h-5 text-zinc-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {wonPredictions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Son Kazanan Tahminler
                </h3>
                
                <div className="space-y-2">
                  {wonPredictions.slice(0, 10).map(pred => (
                    <Card key={pred.id} className="bg-zinc-900 border-white/5">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-white">{pred.home_team} - {pred.away_team}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{pred.prediction}</Badge>
                            <Badge className="bg-green-500/20 text-green-500">{typeof pred.odds === 'number' ? pred.odds.toFixed(2) : pred.odds}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {wonCoupons.length === 0 && wonPredictions.length === 0 && (
              <Card className="bg-zinc-900 border-white/5">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-zinc-500">Henüz kazanan tahmin veya kupon yok.</p>
                  <p className="text-xs text-zinc-600 mt-1">İlk tahminler eklendikten sonra burada görünecek.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
