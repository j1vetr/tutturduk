import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreMatchScenario } from "@/components/PreMatchScenario";

interface TeamStats {
  id: number;
  name: string;
  logo: string;
  last_5?: {
    att: string;
    def: string;
    form: string;
    goals: { for: { total: number; average: string }; against: { total: number; average: string } };
  };
  league?: {
    form: string;
    goals: {
      for: { total: { home: number; away: number; total: number }; average: { home: string; away: string; total: string } };
      against: { total: { home: number; away: number; total: number }; average: { home: string; away: string; total: string } };
    };
    fixtures: { wins: { total: number; home: number; away: number }; draws: { total: number }; loses: { total: number }; played: { total: number; home: number; away: number } };
    clean_sheet: { total: number; home: number; away: number };
    failed_to_score: { total: number; home: number; away: number };
    penalty: { scored: { total: number; percentage: string }; missed: { total: number; percentage: string } };
    lineups: { formation: string; played: number }[];
    biggest: { wins: { home: string; away: string }; loses: { home: string; away: string }; streak: { wins: number; loses: number; draws: number }; goals: { for: { home: number; away: number }; against: { home: number; away: number } } };
  };
}

interface PublishedMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_id?: number;
  league_name?: string;
  league_logo?: string;
  venue_name?: string;
  venue_city?: string;
  referee?: string;
  match_date: string;
  match_time: string;
  timestamp?: number;
  api_advice?: string;
  api_winner_name?: string;
  api_winner_comment?: string;
  api_percent_home?: string;
  api_percent_draw?: string;
  api_percent_away?: string;
  api_under_over?: string;
  api_goals_home?: string;
  api_goals_away?: string;
  api_comparison?: {
    att?: { home: string; away: string };
    def?: { home: string; away: string };
    form?: { home: string; away: string };
    goals?: { home: string; away: string };
    h2h?: { home: string; away: string };
    total?: { home: string; away: string };
    poisson_distribution?: { home: string; away: string };
  };
  api_h2h?: { date: string; homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }[];
  api_teams?: { home: TeamStats; away: TeamStats };
  is_featured?: boolean;
}

interface Lineup {
  team: { id: number; name: string; logo: string; colors: any };
  formation: string;
  startXI: { player: { id: number; name: string; number: number; pos: string } }[];
  substitutes: { player: { id: number; name: string; number: number; pos: string } }[];
  coach: { id: number; name: string; photo: string };
}

interface OddsData {
  league: { id: number; name: string };
  fixture: { id: number };
  bookmakers: {
    id: number;
    name: string;
    bets: {
      id: number;
      name: string;
      values: { value: string; odd: string }[];
    }[];
  }[];
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [odds, setOdds] = useState<OddsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadMatch();
  }, [id]);

  const loadMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        fetch(`/api/matches/${id}/lineups`).then(r => r.json()).then(setLineups).catch(() => {});
        fetch(`/api/matches/${id}/odds`).then(r => r.json()).then(setOdds).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load match:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-zinc-500">Maç bulunamadı</p>
          <Button variant="ghost" className="mt-4" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri dön
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const parsePercent = (val?: string) => parseInt(val?.replace('%', '') || '0');
  const homePercent = parsePercent(match.api_percent_home);
  const drawPercent = parsePercent(match.api_percent_draw);
  const awayPercent = parsePercent(match.api_percent_away);
  const comparison = match.api_comparison || {};
  const h2h = match.api_h2h || [];
  const homeTeam = match.api_teams?.home;
  const awayTeam = match.api_teams?.away;
  const getFormArray = (form?: string) => form?.split('').slice(-5) || [];
  const homeForm = getFormArray(homeTeam?.league?.form);
  const awayForm = getFormArray(awayTeam?.league?.form);

  const getUnderOver = () => {
    if (!match.api_under_over) return null;
    const isOver = match.api_under_over.toLowerCase().includes('over');
    const value = match.api_under_over.match(/[\d.]+/)?.[0] || '2.5';
    return { isOver, value, text: isOver ? `${value} üst` : `${value} alt` };
  };

  const underOver = getUnderOver();

  const getOddsForMarket = (marketName: string) => {
    if (!odds.length) return null;
    for (const o of odds) {
      for (const bm of o.bookmakers || []) {
        for (const bet of bm.bets || []) {
          if (bet.name === marketName) {
            return { bookmaker: bm.name, values: bet.values };
          }
        }
      }
    }
    return null;
  };

  const matchWinnerOdds = getOddsForMarket('Match Winner');
  const overUnderOdds = getOddsForMarket('Goals Over/Under');

  return (
    <MobileLayout>
      <div className="pb-6 -mx-4 -mt-20">
        <div className="bg-gradient-to-b from-zinc-900 to-background pt-6 pb-8 px-4">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 text-white hover:bg-white/10" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
              {match.league_logo && <img src={match.league_logo} className="w-4 h-4" />}
              <span className="text-xs text-white/70">{match.league_name}</span>
            </div>
            <div className="w-10" />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex flex-col items-center flex-1">
              <div className="w-20 h-20 rounded-2xl bg-white/5 p-3 mb-3">
                {match.home_logo ? (
                  <img src={match.home_logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">{match.home_team.substring(0, 2)}</div>
                )}
              </div>
              <span className="text-sm font-semibold text-white text-center px-2">{match.home_team}</span>
              <div className="flex gap-1 mt-3">
                {homeForm.map((r, i) => (
                  <div key={i} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r === 'D' ? 'bg-zinc-500/20 text-zinc-400' : 'bg-red-500/20 text-red-400'}`}>
                    {r === 'W' ? 'G' : r === 'D' ? 'B' : 'M'}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center pt-6 px-2">
              <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-sm font-semibold mb-2">
                <Clock className="w-3.5 h-3.5" />
                {match.match_time}
              </div>
              <span className="text-xs text-zinc-500 mb-1">{new Date(match.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
              {match.venue_name && (
                <div className="flex items-center gap-1 text-zinc-600 text-[10px]">
                  <MapPin className="w-3 h-3" />
                  <span className="max-w-[90px] truncate">{match.venue_name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center flex-1">
              <div className="w-20 h-20 rounded-2xl bg-white/5 p-3 mb-3">
                {match.away_logo ? (
                  <img src={match.away_logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">{match.away_team.substring(0, 2)}</div>
                )}
              </div>
              <span className="text-sm font-semibold text-white text-center px-2">{match.away_team}</span>
              <div className="flex gap-1 mt-3">
                {awayForm.map((r, i) => (
                  <div key={i} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r === 'D' ? 'bg-zinc-500/20 text-zinc-400' : 'bg-red-500/20 text-red-400'}`}>
                    {r === 'W' ? 'G' : r === 'D' ? 'B' : 'M'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-4 mb-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="p-4">
              <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold mb-3">Uzman tahminleri</div>
              <div className="space-y-2">
                {match.api_winner_name && (
                  <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Maç sonucu</span>
                    <span className="text-sm font-bold text-white">{match.api_winner_name} kazanır</span>
                  </div>
                )}
                {underOver && (
                  <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Gol tahmini</span>
                    <span className="text-sm font-bold text-white">{underOver.text}</span>
                  </div>
                )}
                {!match.api_winner_name && !underOver && match.api_advice && (
                  <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Tavsiye</span>
                    <span className="text-sm font-bold text-white">{match.api_advice}</span>
                  </div>
                )}
              </div>
              {match.api_winner_comment && (
                <p className="text-xs text-zinc-500 italic mt-3">"{match.api_winner_comment}"</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1 rounded-xl h-auto grid grid-cols-6 gap-1">
              <TabsTrigger value="analysis" className="text-[9px] py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Analiz</TabsTrigger>
              <TabsTrigger value="odds" className="text-[9px] py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Oranlar</TabsTrigger>
              <TabsTrigger value="stats" className="text-[9px] py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">İstatistik</TabsTrigger>
              <TabsTrigger value="goals" className="text-[9px] py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Goller</TabsTrigger>
              <TabsTrigger value="h2h" className="text-[9px] py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">H2H</TabsTrigger>
              <TabsTrigger value="lineups" className="text-[9px] py-2.5 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Kadro</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="mt-4 space-y-4">
              <PreMatchScenario 
                homePercent={homePercent}
                drawPercent={drawPercent}
                awayPercent={awayPercent}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                comparison={comparison}
                expectedGoalsHome={match.api_goals_home}
                expectedGoalsAway={match.api_goals_away}
              />

              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Kazanma olasılığı</div>
                <div className="flex justify-between items-end mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{match.api_percent_home || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Ev sahibi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-zinc-600">{match.api_percent_draw || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Beraberlik</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{match.api_percent_away || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Deplasman</div>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${homePercent}%` }} />
                  <div className="bg-zinc-600 transition-all" style={{ width: `${drawPercent}%` }} />
                  <div className="bg-white transition-all" style={{ width: `${awayPercent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-2">
                  <span>{match.home_team}</span>
                  <span>{match.away_team}</span>
                </div>
              </div>

              {Object.keys(comparison).length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Takım karşılaştırması</div>
                  <div className="space-y-4">
                    {comparison.form && <CompBar label="Form" home={comparison.form.home} away={comparison.form.away} />}
                    {comparison.att && <CompBar label="Atak gücü" home={comparison.att.home} away={comparison.att.away} />}
                    {comparison.def && <CompBar label="Defans gücü" home={comparison.def.home} away={comparison.def.away} />}
                    {comparison.goals && <CompBar label="Gol gücü" home={comparison.goals.home} away={comparison.goals.away} />}
                    {comparison.h2h && <CompBar label="H2H avantajı" home={comparison.h2h.home} away={comparison.h2h.away} />}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="odds" className="mt-4 space-y-4">
              {matchWinnerOdds ? (
                <>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-zinc-500 uppercase tracking-wide">Maç sonucu oranları</div>
                      <span className="text-[10px] text-zinc-600">{matchWinnerOdds.bookmaker}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {matchWinnerOdds.values.map((v, i) => (
                        <div key={i} className="bg-zinc-800 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-white">{v.odd}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {v.value === 'Home' ? match.home_team : v.value === 'Draw' ? 'Beraberlik' : match.away_team}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {overUnderOdds && (
                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide">Alt/üst oranları</div>
                        <span className="text-[10px] text-zinc-600">{overUnderOdds.bookmaker}</span>
                      </div>
                      <div className="space-y-2">
                        {overUnderOdds.values.slice(0, 6).map((v, i) => (
                          <div key={i} className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-sm text-zinc-400">{v.value}</span>
                            <span className="text-sm font-bold text-white">{v.odd}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 text-center">
                  <p className="text-sm text-zinc-500">Oran bilgisi bulunamadı</p>
                  <p className="text-xs text-zinc-600 mt-1">Oranlar maç yaklaştıkça güncellenecektir</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="mt-4 space-y-4">
              {homeTeam?.league && awayTeam?.league && (
                <>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Sezon performansı</div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0 items-center mb-2">
                      <div></div>
                      <div className="flex items-center gap-1 justify-center w-12">
                        <img src={match.home_logo} className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1 justify-center w-12">
                        <img src={match.away_logo} className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <StatCompRow label="Maç" home={homeTeam.league.fixtures.played.total} away={awayTeam.league.fixtures.played.total} />
                      <StatCompRow label="Galibiyet" home={homeTeam.league.fixtures.wins.total} away={awayTeam.league.fixtures.wins.total} highlight="high" />
                      <StatCompRow label="Beraberlik" home={homeTeam.league.fixtures.draws.total} away={awayTeam.league.fixtures.draws.total} />
                      <StatCompRow label="Mağlubiyet" home={homeTeam.league.fixtures.loses.total} away={awayTeam.league.fixtures.loses.total} highlight="low" />
                      <StatCompRow label="Atılan gol" home={homeTeam.league.goals.for.total.total} away={awayTeam.league.goals.for.total.total} highlight="high" />
                      <StatCompRow label="Yenilen gol" home={homeTeam.league.goals.against.total.total} away={awayTeam.league.goals.against.total.total} highlight="low" />
                      <StatCompRow label="Temiz kale" home={homeTeam.league.clean_sheet.total} away={awayTeam.league.clean_sheet.total} highlight="high" />
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Favori diziliş</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-zinc-600 mb-2">{match.home_team}</div>
                        {homeTeam.league.lineups?.slice(0, 2).map((l, i) => (
                          <div key={i} className="flex justify-between text-sm bg-zinc-800 rounded-lg px-3 py-2 mb-1">
                            <span className="font-mono text-white">{l.formation}</span>
                            <span className="text-zinc-500">{l.played} kez</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-600 mb-2">{match.away_team}</div>
                        {awayTeam.league.lineups?.slice(0, 2).map((l, i) => (
                          <div key={i} className="flex justify-between text-sm bg-zinc-800 rounded-lg px-3 py-2 mb-1">
                            <span className="font-mono text-white">{l.formation}</span>
                            <span className="text-zinc-500">{l.played} kez</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="goals" className="mt-4 space-y-4">
              {homeTeam?.league && awayTeam?.league && (
                <>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Ev/deplasman gol verisi</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-zinc-600 mb-3">{match.home_team} (evinde)</div>
                        <div className="space-y-2">
                          <div className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs text-zinc-400">Atılan</span>
                            <span className="text-sm font-bold text-emerald-500">{homeTeam.league.goals.for.total.home}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs text-zinc-400">Yenilen</span>
                            <span className="text-sm font-bold text-red-400">{homeTeam.league.goals.against.total.home}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs text-zinc-400">Ortalama</span>
                            <span className="text-sm font-bold text-white">{homeTeam.league.goals.for.average.home}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-600 mb-3">{match.away_team} (deplasmanda)</div>
                        <div className="space-y-2">
                          <div className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs text-zinc-400">Atılan</span>
                            <span className="text-sm font-bold text-emerald-500">{awayTeam.league.goals.for.total.away}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs text-zinc-400">Yenilen</span>
                            <span className="text-sm font-bold text-red-400">{awayTeam.league.goals.against.total.away}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs text-zinc-400">Ortalama</span>
                            <span className="text-sm font-bold text-white">{awayTeam.league.goals.for.average.away}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Bu maç için hesaplama</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-500">{homeTeam.league.goals.for.average.home}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">{match.home_team} atar</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-400">
                          {(parseFloat(homeTeam.league.goals.for.average.home) + parseFloat(awayTeam.league.goals.for.average.away)).toFixed(1)}
                        </div>
                        <div className="text-[10px] text-emerald-500/70 mt-1">Toplam beklenen</div>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-white">{awayTeam.league.goals.for.average.away}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">{match.away_team} atar</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="h2h" className="mt-4 space-y-4">
              {h2h.length > 0 ? (
                <>
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wide">Son karşılaşmalar</div>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {h2h.map((game, i) => {
                        const homeWin = game.homeGoals > game.awayGoals;
                        const awayWin = game.awayGoals > game.homeGoals;
                        return (
                          <div key={i} className="flex items-center px-4 py-3">
                            <span className="text-[10px] text-zinc-600 w-16">{new Date(game.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                            <div className="flex-1 flex items-center justify-center gap-2">
                              <span className={`text-xs ${homeWin ? 'text-white font-semibold' : 'text-zinc-500'} truncate max-w-[80px] text-right`}>{game.homeTeam}</span>
                              <span className="text-sm font-bold text-white bg-zinc-800 px-3 py-1 rounded-lg min-w-[50px] text-center">{game.homeGoals} - {game.awayGoals}</span>
                              <span className={`text-xs ${awayWin ? 'text-white font-semibold' : 'text-zinc-500'} truncate max-w-[80px]`}>{game.awayTeam}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">H2H özeti</div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-emerald-500">{h2h.filter(g => g.homeGoals > g.awayGoals).length}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">Ev gal.</div>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-zinc-400">{h2h.filter(g => g.homeGoals === g.awayGoals).length}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">Beraberlik</div>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-white">{h2h.filter(g => g.awayGoals > g.homeGoals).length}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">Dep. gal.</div>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">{(h2h.reduce((sum, g) => sum + g.homeGoals + g.awayGoals, 0) / h2h.length).toFixed(1)}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">Ort. gol</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                  <p className="text-sm text-zinc-500">Karşılaşma geçmişi bulunamadı</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lineups" className="mt-4 space-y-4">
              {lineups.length > 0 ? (
                lineups.map((lineup, idx) => (
                  <div key={idx} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                      <img src={lineup.team.logo} className="w-8 h-8" />
                      <div>
                        <div className="text-sm font-semibold text-white">{lineup.team.name}</div>
                        <div className="text-xs text-zinc-500">Diziliş: {lineup.formation}</div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-[10px] text-emerald-500 uppercase tracking-wide mb-2">İlk 11</div>
                      <div className="grid grid-cols-2 gap-1 mb-4">
                        {lineup.startXI?.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-xs font-bold text-emerald-500 w-5">{p.player.number}</span>
                            <span className="text-xs text-white truncate flex-1">{p.player.name}</span>
                            <span className="text-[10px] text-zinc-600">{p.player.pos}</span>
                          </div>
                        ))}
                      </div>
                      {lineup.substitutes?.length > 0 && (
                        <>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Yedekler</div>
                          <div className="grid grid-cols-2 gap-1">
                            {lineup.substitutes?.slice(0, 6).map((p, i) => (
                              <div key={i} className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
                                <span className="text-xs font-bold text-zinc-500 w-5">{p.player.number}</span>
                                <span className="text-xs text-zinc-400 truncate flex-1">{p.player.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-2xl">👕</span>
                  </div>
                  <p className="text-sm text-zinc-500">Kadro bilgisi henüz açıklanmadı</p>
                  <p className="text-xs text-zinc-600 mt-1">Maçtan kısa süre önce güncellenecektir</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
}

function CompBar({ label, home, away }: { label: string; home: string; away: string }) {
  const h = parseInt(home?.replace('%', '') || '0');
  const a = parseInt(away?.replace('%', '') || '0');
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-white">{home}</span>
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-sm font-semibold text-white">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800 gap-1">
        <div className="bg-emerald-500 rounded-full" style={{ width: `${h}%` }} />
        <div className="flex-1" />
        <div className="bg-white rounded-full" style={{ width: `${a}%` }} />
      </div>
    </div>
  );
}

function StatCompRow({ label, home, away, highlight }: { label: string; home: number; away: number; highlight?: 'high' | 'low' }) {
  const homeWins = highlight === 'high' ? home > away : highlight === 'low' ? home < away : false;
  const awayWins = highlight === 'high' ? away > home : highlight === 'low' ? away < home : false;
  
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2 border-b border-zinc-800 last:border-0 items-center">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold w-12 text-center ${homeWins ? 'text-emerald-500' : 'text-white'}`}>{home}</div>
      <div className={`text-sm font-semibold w-12 text-center ${awayWins ? 'text-emerald-500' : 'text-white'}`}>{away}</div>
    </div>
  );
}
