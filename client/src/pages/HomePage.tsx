import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { HeroPrediction } from "@/components/HeroPrediction";
import { ShieldAlert, Loader2, Ticket, TrendingUp, ChevronRight, Clock } from "lucide-react";
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
  timestamp?: string;
  prediction_advice?: string;
  api_advice?: string;
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  status: string;
  result: string;
  created_at: string;
}

function getTimeRemaining(matchDate: string, matchTime: string): { hours: number; minutes: number; isLive: boolean; isPast: boolean } {
  const [hours, minutes] = matchTime.split(':').map(Number);
  const matchDateTime = new Date(matchDate);
  matchDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const diff = matchDateTime.getTime() - now.getTime();
  
  if (diff < 0) {
    if (diff > -2 * 60 * 60 * 1000) {
      return { hours: 0, minutes: 0, isLive: true, isPast: false };
    }
    return { hours: 0, minutes: 0, isLive: false, isPast: true };
  }
  
  const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours: hoursRemaining, minutes: minutesRemaining, isLive: false, isPast: false };
}

function CountdownBadge({ matchDate, matchTime }: { matchDate: string; matchTime: string }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(matchDate, matchTime));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(matchDate, matchTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [matchDate, matchTime]);
  
  if (timeLeft.isPast) {
    return (
      <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[10px]">
        Bitti
      </Badge>
    );
  }
  
  if (timeLeft.isLive) {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-[10px]">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 inline-block" />
        CANLI
      </Badge>
    );
  }
  
  if (timeLeft.hours === 0 && timeLeft.minutes < 60) {
    return (
      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
        <Clock className="w-3 h-3 mr-1" />
        {timeLeft.minutes} dk
      </Badge>
    );
  }
  
  if (timeLeft.hours < 24) {
    return (
      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
        <Clock className="w-3 h-3 mr-1" />
        {timeLeft.hours} sa {timeLeft.minutes} dk
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-[10px]">
      <Clock className="w-3 h-3 mr-1" />
      {Math.floor(timeLeft.hours / 24)} gün
    </Badge>
  );
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [publishedMatches, setPublishedMatches] = useState<PublishedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [couponsRes, matchesRes] = await Promise.all([
        fetch('/api/coupons'),
        fetch('/api/matches')
      ]);
      
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

  const getTodayCoupons = () => {
    const today = new Date().toISOString().split('T')[0];
    return coupons.filter(c => c.coupon_date === today && c.result === 'pending');
  };

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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display text-foreground border-l-4 border-primary pl-3">Uzman Tahminleri</h2>
            <Badge variant="outline" className="text-primary border-primary/30">
              <TrendingUp className="w-3 h-3 mr-1" /> API Destekli
            </Badge>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : publishedMatches.length === 0 ? (
            <Card className="bg-zinc-900/50 border-white/5 p-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-500">Henüz yayınlanan maç yok</p>
              <p className="text-xs text-zinc-600 mt-1">Yakında uzman tahminleri eklenecek</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {publishedMatches.map(match => (
                <Card 
                  key={match.id} 
                  className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-white/5 hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                  onClick={() => setLocation(`/match/${match.id}`)}
                  data-testid={`match-card-${match.id}`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        {match.league_logo && <img src={match.league_logo} alt="" className="w-4 h-4 object-contain" />}
                        <span className="text-[11px] text-zinc-500 truncate max-w-[120px]">{match.league_name}</span>
                      </div>
                      <CountdownBadge matchDate={match.match_date} matchTime={match.match_time} />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                            {match.home_logo ? (
                              <img src={match.home_logo} alt="" className="w-10 h-10 object-contain" />
                            ) : (
                              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {match.home_team.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-semibold text-sm truncate">{match.home_team}</p>
                            <p className="text-[10px] text-zinc-600">Ev Sahibi</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center px-3 flex-shrink-0">
                          <span className="text-xs text-zinc-600 mb-1">{match.match_time}</span>
                          <div className="text-lg font-bold text-primary">VS</div>
                          <span className="text-[10px] text-zinc-600 mt-1">{new Date(match.match_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                        
                        <div className="flex-1 flex items-center gap-3 min-w-0 justify-end">
                          <div className="min-w-0 flex-1 text-right">
                            <p className="text-white font-semibold text-sm truncate">{match.away_team}</p>
                            <p className="text-[10px] text-zinc-600">Deplasman</p>
                          </div>
                          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                            {match.away_logo ? (
                              <img src={match.away_logo} alt="" className="w-10 h-10 object-contain" />
                            ) : (
                              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {match.away_team.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-zinc-600 ml-2 flex-shrink-0" />
                      </div>
                      
                      {(match.api_advice || match.prediction_advice) && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-zinc-400 line-clamp-1">
                            <span className="text-primary font-medium mr-1">Tavsiye:</span>
                            {match.api_advice || match.prediction_advice}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

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
