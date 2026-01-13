import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { PredictionCard } from "@/components/PredictionCard";
import { HeroPrediction } from "@/components/HeroPrediction";
import { ShieldAlert, Calendar, Loader2, Ticket, TrendingUp, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

interface PublishedMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date: string;
  match_time: string;
  prediction_advice?: string;
  prediction_home?: string;
  prediction_draw?: string;
  prediction_away?: string;
  prediction_under_over?: string;
  prediction_winner?: string;
}

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
  created_at: string;
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

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [publishedMatches, setPublishedMatches] = useState<PublishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "tomorrow">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [predsRes, couponsRes, matchesRes] = await Promise.all([
        fetch('/api/predictions/pending'),
        fetch('/api/coupons'),
        fetch('/api/matches')
      ]);
      
      if (predsRes.ok) {
        const data = await predsRes.json();
        setPredictions(data);
      }
      
      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setCoupons(data);
      }
      
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        setPublishedMatches(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPredictions = () => {
    if (activeFilter === "all") return predictions;
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (activeFilter === "today") {
      return predictions.filter(p => p.match_date === today);
    } else if (activeFilter === "tomorrow") {
      return predictions.filter(p => p.match_date === tomorrow);
    }
    return predictions;
  };

  const groupPredictionsByDate = (preds: Prediction[]) => {
    const groups: Record<string, Prediction[]> = {};
    preds.forEach(p => {
      const date = p.match_date || 'Tarih Belirtilmemiş';
      if (!groups[date]) groups[date] = [];
      groups[date].push(p);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const formatDate = (dateStr: string) => {
    if (dateStr === 'Tarih Belirtilmemiş') return dateStr;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    if (dateStr === today.toISOString().split('T')[0]) return "Bugün";
    if (dateStr === tomorrow.toISOString().split('T')[0]) return "Yarın";
    
    return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getTodayCoupons = () => {
    const today = new Date().toISOString().split('T')[0];
    return coupons.filter(c => c.coupon_date === today && c.result === 'pending');
  };

  const filteredPredictions = getFilteredPredictions();
  const groupedPredictions = groupPredictionsByDate(filteredPredictions);
  const todayCoupons = getTodayCoupons();

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6">
        <HeroPrediction />

        {todayCoupons.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-display text-foreground border-l-4 border-primary pl-3">Günün Kuponları</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {todayCoupons.map(coupon => (
                <Card 
                  key={coupon.id} 
                  className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-primary/20 min-w-[200px] cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setLocation(`/coupon/${coupon.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      <span className="text-white font-bold text-sm">{coupon.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Kombine</span>
                      <Badge className="bg-primary text-black font-bold">{coupon.combined_odds}x</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Published Matches - AI Predictions */}
        {publishedMatches.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display text-foreground border-l-4 border-primary pl-3">Uzman Tahminleri</h2>
              <Badge variant="outline" className="text-primary border-primary/30">
                <TrendingUp className="w-3 h-3 mr-1" /> API Destekli
              </Badge>
            </div>
            <div className="space-y-3">
              {publishedMatches.map(match => (
                <Card 
                  key={match.id} 
                  className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-white/5 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setLocation(`/match/${match.id}`)}
                  data-testid={`match-card-${match.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {match.league_logo && <img src={match.league_logo} alt="" className="w-4 h-4" />}
                        <span className="text-xs text-zinc-500">{match.league_name}</span>
                      </div>
                      <span className="text-xs text-primary font-medium">{match.match_date} • {match.match_time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          {match.home_logo && <img src={match.home_logo} alt="" className="w-8 h-8 object-contain" />}
                          <span className="font-semibold text-white">{match.home_team}</span>
                        </div>
                        <span className="text-zinc-600 text-sm">vs</span>
                        <div className="flex items-center gap-2">
                          {match.away_logo && <img src={match.away_logo} alt="" className="w-8 h-8 object-contain" />}
                          <span className="font-semibold text-white">{match.away_team}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </div>
                    {match.prediction_advice && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-sm text-zinc-400 line-clamp-1">{match.prediction_advice}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display text-foreground border-l-4 border-primary pl-3">Tahminler</h2>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === "all" 
                  ? "bg-primary text-black" 
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setActiveFilter("today")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === "today" 
                  ? "bg-primary text-black" 
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Bugün
            </button>
            <button
              onClick={() => setActiveFilter("tomorrow")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === "tomorrow" 
                  ? "bg-primary text-black" 
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Yarın
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz tahmin eklenmemiş.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedPredictions.map(([date, preds]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-zinc-400">{formatDate(date)}</span>
                  <Badge variant="outline" className="text-xs">{preds.length} maç</Badge>
                </div>
                <div className="space-y-3">
                  {preds.map((prediction) => (
                    <PredictionCard key={prediction.id} prediction={prediction} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Bu platform yatırım/tahmin garantisi vermez. Paylaşılan içerikler bilgilendirme amaçlıdır. 
              Bahis oynamak risk içerir ve bağımlılık yapabilir. 18 yaşından küçükler kullanamaz.
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
