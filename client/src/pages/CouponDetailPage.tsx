import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, CheckCircle, XCircle, Clock, Loader2, Trophy } from "lucide-react";
import { useLocation, useParams } from "wouter";

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
  analysis: string | null;
  confidence?: string;
  is_hero: boolean;
  result: string;
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  status: string;
  result: string;
  created_at: string;
  predictions?: Prediction[];
}

export default function CouponDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const couponId = params.id;
  
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (couponId) {
      loadCoupon();
    }
  }, [couponId]);

  const loadCoupon = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coupons/${couponId}`);
      if (res.ok) {
        const data = await res.json();
        setCoupon(data);
      }
    } catch (error) {
      console.error('Failed to load coupon:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'won': return 'bg-green-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'won': return <CheckCircle className="w-4 h-4" />;
      case 'lost': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'won': return 'KAZANDI';
      case 'lost': return 'KAYBETTİ';
      default: return 'BEKLENİYOR';
    }
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'high': return 'text-primary';
      case 'medium': return 'text-blue-400';
      default: return 'text-zinc-400';
    }
  };

  if (loading) {
    return (
      <MobileLayout activeTab="home">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!coupon) {
    return (
      <MobileLayout activeTab="home">
        <div className="text-center py-12">
          <Ticket className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-zinc-500">Kupon bulunamadı.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Ana Sayfaya Dön
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const totalOdds = coupon.predictions?.reduce((acc, p) => acc * (typeof p.odds === 'number' ? p.odds : parseFloat(p.odds as any) || 1), 1) || 1;

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6">
        <Button variant="ghost" className="text-zinc-400 hover:text-white -ml-2" onClick={() => setLocation('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Geri
        </Button>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-primary/30 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{coupon.name}</h1>
                  <p className="text-sm text-zinc-400">{formatDate(coupon.coupon_date)}</p>
                </div>
              </div>
              <Badge className={`${getResultColor(coupon.result)} text-white flex items-center gap-1`}>
                {getResultIcon(coupon.result)}
                {getResultText(coupon.result)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">Maç Sayısı</p>
                <p className="text-2xl font-bold text-white">{coupon.predictions?.length || 0}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">Kombine Oran</p>
                <p className="text-2xl font-bold text-primary">{coupon.combined_odds}x</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Kupondaki Tahminler
          </h2>

          {coupon.predictions && coupon.predictions.length > 0 ? (
            <div className="space-y-3">
              {coupon.predictions.map((pred, index) => (
                <Card key={pred.id} className="bg-zinc-900 border-white/5 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        {pred.league_logo && <img src={pred.league_logo} className="w-4 h-4 object-contain" />}
                        <span className="text-xs text-zinc-500">{pred.league_name || pred.league_id}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{pred.match_time}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        {pred.home_logo && <img src={pred.home_logo} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />}
                        <span className="text-sm font-medium text-white">{pred.home_team}</span>
                      </div>
                      <span className="text-zinc-600 text-xs font-bold">VS</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium text-white">{pred.away_team}</span>
                        {pred.away_logo && <img src={pred.away_logo} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Tahmin:</span>
                        <Badge variant="outline" className="text-white border-white/20">{pred.prediction}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${getConfidenceColor(pred.confidence)}`}>
                          {pred.confidence === 'high' ? 'Banko' : pred.confidence === 'medium' ? 'Güçlü' : 'Normal'}
                        </span>
                        <Badge className="bg-primary text-black font-bold">{typeof pred.odds === 'number' ? pred.odds.toFixed(2) : pred.odds}</Badge>
                      </div>
                    </div>

                    {pred.result !== 'pending' && (
                      <div className={`mt-3 p-2 rounded-lg flex items-center justify-center gap-2 ${pred.result === 'won' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {pred.result === 'won' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span className="text-sm font-bold">{pred.result === 'won' ? 'KAZANDI' : 'KAYBETTİ'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-white/5">
              <CardContent className="p-8 text-center text-zinc-500">
                Bu kuponda tahmin bulunmuyor.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
