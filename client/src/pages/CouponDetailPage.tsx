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
      case 'won': return 'bg-emerald-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-amber-500';
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
      case 'high': return 'text-emerald-600';
      case 'medium': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <MobileLayout activeTab="home">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!coupon) {
    return (
      <MobileLayout activeTab="home">
        <div className="text-center py-12">
          <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500">Kupon bulunamadı.</p>
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
        <Button variant="ghost" className="text-gray-500 hover:text-gray-800 -ml-2" onClick={() => setLocation('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Geri
        </Button>

        <Card className="bg-gradient-to-br from-white to-gray-50 border-emerald-200 overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{coupon.name}</h1>
                  <p className="text-sm text-gray-400">{formatDate(coupon.coupon_date)}</p>
                </div>
              </div>
              <Badge className={`${getResultColor(coupon.result)} text-white flex items-center gap-1`}>
                {getResultIcon(coupon.result)}
                {getResultText(coupon.result)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-100 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Maç Sayısı</p>
                <p className="text-2xl font-bold text-gray-800">{coupon.predictions?.length || 0}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Kombine Oran</p>
                <p className="text-2xl font-bold text-emerald-600">{coupon.combined_odds}x</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-500" />
            Kupondaki Tahminler
          </h2>

          {coupon.predictions && coupon.predictions.length > 0 ? (
            <div className="space-y-3">
              {coupon.predictions.map((pred, index) => (
                <Card key={pred.id} className="bg-white border-gray-200 overflow-hidden shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        {pred.league_logo && <img src={pred.league_logo} className="w-4 h-4 object-contain" />}
                        <span className="text-xs text-gray-400">{pred.league_name || pred.league_id}</span>
                      </div>
                      <span className="text-xs text-gray-400">{pred.match_time}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        {pred.home_logo && <img src={pred.home_logo} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />}
                        <span className="text-sm font-medium text-gray-800">{pred.home_team}</span>
                      </div>
                      <span className="text-gray-300 text-xs font-bold">VS</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium text-gray-800">{pred.away_team}</span>
                        {pred.away_logo && <img src={pred.away_logo} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Tahmin:</span>
                        <Badge variant="outline" className="text-gray-800 border-gray-300">{pred.prediction}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${getConfidenceColor(pred.confidence)}`}>
                          {pred.confidence === 'high' ? 'Banko' : pred.confidence === 'medium' ? 'Güçlü' : 'Normal'}
                        </span>
                        <Badge className="bg-emerald-500 text-white font-bold">{typeof pred.odds === 'number' ? pred.odds.toFixed(2) : pred.odds}</Badge>
                      </div>
                    </div>

                    {pred.result !== 'pending' && (
                      <div className={`mt-3 p-2 rounded-lg flex items-center justify-center gap-2 ${pred.result === 'won' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {pred.result === 'won' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span className="text-sm font-bold">{pred.result === 'won' ? 'KAZANDI' : 'KAYBETTİ'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-400">
                Bu kuponda tahmin bulunmuyor.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
