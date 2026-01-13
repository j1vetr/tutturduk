import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { HeroPrediction } from "@/components/HeroPrediction";
import { ShieldAlert, Loader2, Ticket, TrendingUp, ChevronRight, Clock, Zap, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  api_winner_name?: string;
  api_percent_home?: string;
  api_percent_draw?: string;
  api_percent_away?: string;
  is_featured?: boolean;
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

function MatchCountdown({ matchDate, matchTime }: { matchDate: string; matchTime: string }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(matchDate, matchTime));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(matchDate, matchTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [matchDate, matchTime]);
  
  if (timeLeft.isPast) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700">
        <span className="text-[10px] font-medium text-zinc-500">Bitti</span>
      </div>
    );
  }
  
  if (timeLeft.isLive) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 animate-pulse">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        <span className="text-[10px] font-bold text-red-400 uppercase">Canlı</span>
      </div>
    );
  }
  
  if (timeLeft.hours === 0 && timeLeft.minutes < 60) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30">
        <Clock className="w-3 h-3 text-orange-400" />
        <span className="text-[10px] font-bold text-orange-400">{timeLeft.minutes} dk</span>
      </div>
    );
  }
  
  if (timeLeft.hours < 24) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
        <Clock className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] font-bold text-emerald-400">{timeLeft.hours}s {timeLeft.minutes}dk</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700">
      <Clock className="w-3 h-3 text-zinc-500" />
      <span className="text-[10px] font-medium text-zinc-400">{Math.floor(timeLeft.hours / 24)} gün</span>
    </div>
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
        setPublishedMatches(data.filter((m: PublishedMatch) => !m.is_featured));
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
      <div className="space-y-6 pb-4">
        <HeroPrediction />

        {todayCoupons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-amber-500 rounded-full" />
              <h2 className="text-base font-bold text-white">Günün kuponları</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {todayCoupons.map(coupon => (
                <div 
                  key={coupon.id} 
                  className="min-w-[180px] p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-all"
                  onClick={() => setLocation(`/coupon/${coupon.id}`)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-white font-bold text-sm">{coupon.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase">Kombine oran</span>
                    <Badge className="bg-amber-500 text-black font-black text-sm px-2">{coupon.combined_odds}x</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              <h2 className="text-base font-bold text-white">Uzman tahminleri</h2>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase">AI destekli</span>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-3">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
              <p className="text-sm text-zinc-500">Tahminler yükleniyor...</p>
            </div>
          ) : publishedMatches.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium">Henüz yayınlanan maç yok</p>
              <p className="text-xs text-zinc-600 mt-1">Yakında uzman tahminleri eklenecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedMatches.map(match => {
                const timeLeft = getTimeRemaining(match.match_date, match.match_time);
                const homePercent = parseInt(match.api_percent_home?.replace('%', '') || '0');
                const awayPercent = parseInt(match.api_percent_away?.replace('%', '') || '0');
                
                return (
                  <div 
                    key={match.id} 
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 hover:border-emerald-500/30 transition-all cursor-pointer group"
                    onClick={() => setLocation(`/match/${match.id}`)}
                    data-testid={`match-card-${match.id}`}
                  >
                    {/* League Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2">
                        {match.league_logo && (
                          <div className="w-5 h-5 rounded bg-white/5 p-0.5">
                            <img src={match.league_logo} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <span className="text-[11px] text-zinc-500 font-medium">{match.league_name}</span>
                      </div>
                      <MatchCountdown matchDate={match.match_date} matchTime={match.match_time} />
                    </div>
                    
                    {/* Match Content */}
                    <div className="p-4">
                      <div className="flex items-center">
                        {/* Home Team */}
                        <div className="flex-1 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/5 p-2 border border-white/5 group-hover:border-emerald-500/20 transition-colors">
                            {match.home_logo ? (
                              <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                                {match.home_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{match.home_team}</p>
                            <p className="text-[10px] text-zinc-600">Ev sahibi</p>
                          </div>
                        </div>
                        
                        {/* VS & Time */}
                        <div className="flex flex-col items-center px-3 mx-2">
                          <div className="text-[10px] text-zinc-600 mb-1">
                            {new Date(match.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <span className="text-sm font-black text-emerald-400">{match.match_time}</span>
                          </div>
                        </div>
                        
                        {/* Away Team */}
                        <div className="flex-1 flex items-center gap-3 justify-end">
                          <div className="min-w-0 text-right">
                            <p className="text-white font-bold text-sm truncate">{match.away_team}</p>
                            <p className="text-[10px] text-zinc-600">Deplasman</p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-white/5 p-2 border border-white/5 group-hover:border-emerald-500/20 transition-colors">
                            {match.away_logo ? (
                              <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                                {match.away_team.substring(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <div className="ml-3 w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                      
                      {/* Prediction Bar */}
                      {(homePercent > 0 || awayPercent > 0) && (
                        <div className="mt-4 pt-3 border-t border-zinc-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-emerald-400">%{homePercent}</span>
                            <span className="text-[9px] text-zinc-600 uppercase">Kazanma olasılığı</span>
                            <span className="text-[10px] font-bold text-white">%{awayPercent}</span>
                          </div>
                          <div className="h-1 w-full bg-zinc-800 rounded-full flex overflow-hidden gap-0.5">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${homePercent}%` }} />
                            <div className="flex-1" />
                            <div className="h-full bg-white rounded-full" style={{ width: `${awayPercent}%` }} />
                          </div>
                        </div>
                      )}
                      
                      {/* Prediction Advice */}
                      {(match.api_winner_name || match.api_advice) && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <Star className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <p className="text-xs text-emerald-400 font-medium truncate">
                            {match.api_winner_name ? `${match.api_winner_name} kazanır` : match.api_advice}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-zinc-500" />
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Bu platform yatırım veya tahmin garantisi vermez. Paylaşılan içerikler bilgilendirme amaçlıdır. 
              Bahis oynamak risk içerir ve bağımlılık yapabilir. 18 yaşından küçükler kullanamaz.
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
