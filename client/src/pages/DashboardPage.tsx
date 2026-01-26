import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  Target, 
  Trophy, 
  ChevronRight, 
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Activity,
  Star,
  Shield,
  BarChart3
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
  match_date: string;
  predictions?: Array<{
    bet_type: string;
    confidence: number;
    bet_category: string;
  }>;
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
            const matchDateTime = new Date(`${m.match_date}T${m.match_time}:00+03:00`);
            return matchDateTime > now && m.status !== 'finished';
          })
          .slice(0, 4);
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
      <div className="space-y-5 pb-4">
        
        {/* Hero Section with Floating Elements */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating Orbs */}
            <div className="absolute top-4 right-8 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/15 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Geometric Patterns */}
            <div className="absolute top-6 left-6 w-20 h-20 border border-white/5 rounded-full" />
            <div className="absolute top-10 left-10 w-12 h-12 border border-white/5 rounded-full" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border border-emerald-500/10 rounded-2xl rotate-45" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }} />
          </div>
          
          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-full px-3 py-1.5 mb-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-300 text-[11px] font-semibold tracking-wide">Yapay Zeka Destekli</span>
            </div>
            
            <h1 className="text-white text-2xl font-black tracking-tight mb-2">
              Hoş geldiniz!
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-5 max-w-[280px]">
              Profesyonel analizler ve yapay zeka ile kazanma şansınızı artırın.
            </p>
            
            <button 
              onClick={() => setLocation("/predictions")}
              className="group w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all duration-300"
              data-testid="button-view-predictions"
            >
              <Target className="w-5 h-5" />
              <span>Tahminleri Görüntüle</span>
              <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Stats Grid with Premium Design */}
        <div className="grid grid-cols-3 gap-3">
          <div className="relative bg-white rounded-2xl p-4 border border-slate-100 shadow-sm overflow-hidden group" data-testid="stat-won">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-[40px] opacity-60" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-2 shadow-sm">
                <Trophy className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums" data-testid="text-won-count">
                {loading ? "-" : animatedStats.won}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Kazanan</p>
            </div>
          </div>
          
          <div className="relative bg-white rounded-2xl p-4 border border-slate-100 shadow-sm overflow-hidden group" data-testid="stat-total">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-[40px] opacity-60" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-2 shadow-sm">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums" data-testid="text-total-count">
                {loading ? "-" : animatedStats.total}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Toplam</p>
            </div>
          </div>
          
          <div className="relative bg-white rounded-2xl p-4 border border-slate-100 shadow-sm overflow-hidden group" data-testid="stat-rate">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-100 to-transparent rounded-bl-[40px] opacity-60" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center mb-2 shadow-sm">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <p className="text-2xl font-black text-slate-800 tabular-nums" data-testid="text-rate-value">
                %{loading ? "-" : animatedStats.rate}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Başarı</p>
            </div>
          </div>
        </div>

        {/* Success Rate Progress */}
        {stats && stats.successRate > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Başarı Oranı</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {stats.won}/{stats.won + stats.lost}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${animatedStats.rate}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                {stats.won} kazandı
              </span>
              <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {stats.lost} kaybetti
              </span>
            </div>
          </div>
        )}

        {/* Upcoming Matches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Yaklaşan Maçlar</h3>
            </div>
            <button 
              onClick={() => setLocation("/predictions")}
              className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
              data-testid="link-all-predictions"
            >
              Tümünü gör
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                    <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : todayMatches.length > 0 ? (
            <div className="space-y-3">
              {todayMatches.map((match, index) => {
                const primaryBet = match.predictions?.find(p => p.bet_category === 'primary');
                return (
                  <button
                    key={match.id}
                    onClick={() => setLocation(`/match/${match.fixture_id}`)}
                    className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 active:scale-[0.99] transition-all text-left relative overflow-hidden group"
                    data-testid={`card-match-${match.fixture_id}`}
                  >
                    {/* Decorative corner */}
                    {index === 0 && (
                      <div className="absolute top-0 right-0 bg-gradient-to-bl from-emerald-500/10 to-transparent w-20 h-20 rounded-bl-[40px]" />
                    )}
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center overflow-hidden p-1.5">
                        {match.home_logo ? (
                          <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-sm font-bold text-slate-600">{match.home_team.slice(0, 2)}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {match.home_team}
                          <span className="text-slate-400 font-normal mx-1.5">vs</span>
                          {match.away_team}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 truncate">
                            {match.league_name || "Lig"}
                          </span>
                          {primaryBet && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-semibold text-emerald-600">
                                {primaryBet.bet_type}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 px-2.5 py-1 rounded-lg shadow-sm">
                          {match.match_time}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 text-center border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">Yaklaşan maç bulunamadı</p>
              <p className="text-xs text-slate-400">Yeni maçlar için tahminler sayfasını kontrol edin.</p>
            </div>
          )}
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation("/predictions")}
            className="group relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 text-left overflow-hidden active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
            data-testid="card-predictions"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/10 rounded-full blur-xl -ml-4 -mb-4" />
            <div className="absolute top-4 right-4 w-8 h-8 border border-white/20 rounded-full" />
            
            <div className="relative z-10">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-inner">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-base font-bold mb-0.5">Tahminler</h4>
              <p className="text-emerald-100 text-[11px] opacity-90">AI destekli analizler</p>
            </div>
          </button>
          
          <button
            onClick={() => setLocation("/winners")}
            className="group relative bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 text-white rounded-2xl p-5 text-left overflow-hidden active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20"
            data-testid="card-winners"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/10 rounded-full blur-xl -ml-4 -mb-4" />
            <div className="absolute top-4 right-4 w-8 h-8 border border-white/20 rounded-full" />
            
            <div className="relative z-10">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-inner">
                <Star className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-base font-bold mb-0.5">Sonuçlar</h4>
              <p className="text-purple-100 text-[11px] opacity-90">Tuttu / Tutmadı</p>
            </div>
          </button>
        </div>

        {/* Info Card */}
        <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-5 border border-amber-200/50 overflow-hidden">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-[60px]" />
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-1.5">Nasıl çalışır?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Yapay zeka, takım formları, kafa kafaya istatistikler ve sakatlık verilerini analiz ederek en değerli bahisleri belirler.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] font-medium">Güvenli</span>
          </div>
          <div className="w-1 h-1 bg-slate-300 rounded-full" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-medium">AI Analiz</span>
          </div>
          <div className="w-1 h-1 bg-slate-300 rounded-full" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-medium">Gerçek Zamanlı</span>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
