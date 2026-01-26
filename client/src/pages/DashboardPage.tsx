import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  Target, 
  Trophy, 
  ChevronRight, 
  Flame,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";

interface Stats {
  total: number;
  won: number;
  lost: number;
  pending: number;
  successRate: number;
}

interface TodayMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_time: string;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayMatches, setTodayMatches] = useState<TodayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({ won: 0, total: 0, rate: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (stats) {
      const duration = 1500;
      const steps = 60;
      const interval = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedStats({
          won: Math.round(stats.won * eased),
          total: Math.round(stats.total * eased),
          rate: Math.round(stats.successRate * eased)
        });

        if (step >= steps) clearInterval(timer);
      }, interval);

      return () => clearInterval(timer);
    }
  }, [stats]);

  async function fetchData() {
    try {
      const [statsRes, matchesRes] = await Promise.all([
        fetch("/api/best-bets/stats"),
        fetch("/api/published-matches")
      ]);
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        const now = new Date();
        const upcoming = data
          .filter((m: any) => {
            const matchTime = new Date(`${m.match_date}T${m.match_time}:00`);
            return matchTime > now;
          })
          .slice(0, 3);
        setTodayMatches(upcoming);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileLayout activeTab="home">
      <div className="space-y-6 pb-4">
        
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl -ml-10 -mb-10" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-emerald-100 text-xs font-medium">AI Destekli Tahminler</p>
                <h2 className="text-white text-lg font-bold">Hoş Geldiniz!</h2>
              </div>
            </div>
            
            <p className="text-emerald-50/90 text-sm leading-relaxed mb-4">
              Profesyonel analizler ve yapay zeka destekli tahminlerle kazanma şansınızı artırın.
            </p>
            
            <button 
              onClick={() => setLocation("/predictions")}
              className="w-full bg-white text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-[0.98] transition-transform"
              data-testid="button-view-predictions"
            >
              <Target className="w-5 h-5" />
              Tahminleri Görüntüle
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group" data-testid="stat-won">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-gray-900" data-testid="text-won-count">{loading ? "-" : animatedStats.won}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Kazanan</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group" data-testid="stat-total">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-gray-900" data-testid="text-total-count">{loading ? "-" : animatedStats.total}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Toplam</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group" data-testid="stat-rate">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
                <Trophy className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-gray-900" data-testid="text-rate-value">%{loading ? "-" : animatedStats.rate}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Başarı</p>
            </div>
          </div>
        </div>

        {stats && stats.successRate > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Başarı Oranı</h3>
              <span className="text-xs text-gray-500">{stats.won} / {stats.won + stats.lost}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${animatedStats.rate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {stats.won} Kazandı
              </span>
              <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {stats.lost} Kaybetti
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Yaklaşan Maçlar
            </h3>
            <button 
              onClick={() => setLocation("/predictions")}
              className="text-xs text-emerald-600 font-semibold flex items-center gap-1"
              data-testid="link-all-predictions"
            >
              Tümü <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : todayMatches.length > 0 ? (
            <div className="space-y-3">
              {todayMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => setLocation(`/match/${match.fixture_id}`)}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform text-left"
                  data-testid={`card-match-${match.fixture_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                      {match.home_logo ? (
                        <img src={match.home_logo} alt="" className="w-7 h-7 object-contain" />
                      ) : (
                        <div className="w-7 h-7 bg-gray-200 rounded" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {match.home_team} vs {match.away_team}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {match.league_name || "Lig"}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {match.match_time}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Bugün için maç bulunmuyor</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation("/predictions")}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 text-left relative overflow-hidden group active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20"
            data-testid="card-predictions"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-5 -mt-5" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-base font-bold mb-1">Tahminler</h4>
              <p className="text-emerald-100 text-[10px]">AI destekli tahminler</p>
            </div>
          </button>
          
          <button
            onClick={() => setLocation("/winners")}
            className="bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-4 text-left relative overflow-hidden group active:scale-[0.98] transition-transform shadow-lg shadow-purple-500/20"
            data-testid="card-winners"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-5 -mt-5" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-base font-bold mb-1">Tuttu/Tutmadı</h4>
              <p className="text-purple-100 text-[10px]">Sonuçları görüntüle</p>
            </div>
          </button>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Nasıl Çalışır?</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Yapay zeka, takım form bilgisi, kafa kafaya istatistikler ve sakatlik verileri analiz ederek en değerli bahisleri belirler.
              </p>
            </div>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
