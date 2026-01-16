import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Sparkles, TrendingUp, Clock, ChevronRight, Target, Zap } from 'lucide-react';

interface BestBet {
  id: number;
  match_id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date: string;
  match_time: string;
  bet_type: string;
  bet_description: string;
  confidence: number;
  risk_level: string;
  reasoning?: string;
}

export default function BestBets() {
  const { data: bets = [], isLoading } = useQuery<BestBet[]>({
    queryKey: ['/api/best-bets'],
    queryFn: async () => {
      const res = await fetch('/api/best-bets');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-lg w-48" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (bets.length === 0) {
    return null;
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'düşük': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'orta': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'yüksek': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'from-emerald-500 to-emerald-600';
    if (confidence >= 50) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-gray-800">Günün En İyi Bahisleri</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">AI Tarafından Seçildi</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {bets.slice(0, 3).map((bet, index) => (
          <Link href={`/match/${bet.match_id}`} key={bet.id}>
            <div 
              className={`relative overflow-hidden rounded-2xl border transition-all active:scale-[0.98] shadow-sm hover:shadow-md ${
                index === 0 
                  ? 'bg-gradient-to-br from-amber-50 via-white to-white border-amber-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              data-testid={`best-bet-${bet.id}`}
            >
                            
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {bet.league_logo && (
                    <img src={bet.league_logo} alt="" className="w-5 h-5 object-contain opacity-60" />
                  )}
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider truncate">{bet.league_name}</span>
                  <div className="ml-auto flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">{bet.match_time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 p-1.5 border border-gray-100">
                      {bet.home_logo && <img src={bet.home_logo} alt="" className="w-full h-full object-contain" />}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate">{bet.home_team}</span>
                  </div>
                  <span className="text-xs text-gray-300 font-bold">VS</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-sm font-medium text-gray-800 truncate">{bet.away_team}</span>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 p-1.5 border border-gray-100">
                      {bet.away_logo && <img src={bet.away_logo} alt="" className="w-full h-full object-contain" />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      index === 0 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' 
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <Target className="w-3 h-3 inline mr-1" />
                      {bet.bet_type}
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getRiskColor(bet.risk_level)}`}>
                      {bet.risk_level.toUpperCase()} RİSK
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`w-3 h-3 ${bet.confidence >= 70 ? 'text-emerald-500' : bet.confidence >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
                      <span className={`text-sm font-bold ${bet.confidence >= 70 ? 'text-emerald-600' : bet.confidence >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        %{bet.confidence}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                {bet.reasoning && (
                  <p className="mt-3 text-[11px] text-gray-500 line-clamp-2">{bet.reasoning}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
