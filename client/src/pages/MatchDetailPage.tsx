import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, Clock, Loader2, MapPin, Users, BarChart3, Target, History, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
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
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!match) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-zinc-500">Maç bulunamadı.</p>
          <Button variant="ghost" className="mt-4 text-amber-500" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
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

  const formatPrediction = () => {
    if (match.api_winner_name) {
      return `${match.api_winner_name} Kazanır`;
    }
    if (match.api_under_over) {
      const isOver = match.api_under_over.toLowerCase().includes('over');
      const value = match.api_under_over.match(/[\d.]+/)?.[0] || '2.5';
      return isOver ? `${value} ÜST` : `${value} ALT`;
    }
    return match.api_advice || 'Analiz Bekleniyor';
  };

  return (
    <MobileLayout>
      <div className="pb-6 -mx-4 -mt-20">
        <div className="bg-zinc-900 pt-6 pb-4 px-4">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {match.league_logo && <img src={match.league_logo} className="w-5 h-5" />}
              <span className="text-sm text-zinc-400">{match.league_name}</span>
            </div>
            <div className="w-9" />
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-16 bg-zinc-800 rounded-full p-2 flex items-center justify-center">
                {match.home_logo ? (
                  <img src={match.home_logo} alt="" className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-xl font-bold text-white">{match.home_team.substring(0, 2)}</span>
                )}
              </div>
              <span className="text-sm font-medium text-white text-center leading-tight">{match.home_team}</span>
              <div className="flex gap-1">
                {homeForm.map((r, i) => (
                  <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${r === 'W' ? 'bg-green-600 text-white' : r === 'D' ? 'bg-zinc-600 text-white' : 'bg-red-600 text-white'}`}>
                    {r === 'W' ? 'G' : r === 'D' ? 'B' : 'M'}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 px-4">
              <div className="text-2xl font-bold text-white">VS</div>
              <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{match.match_time}</span>
              </div>
              <span className="text-xs text-zinc-500">{new Date(match.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
              {match.venue_name && (
                <div className="flex items-center gap-1 text-zinc-600 text-[10px] mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{match.venue_name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-16 bg-zinc-800 rounded-full p-2 flex items-center justify-center">
                {match.away_logo ? (
                  <img src={match.away_logo} alt="" className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-xl font-bold text-white">{match.away_team.substring(0, 2)}</span>
                )}
              </div>
              <span className="text-sm font-medium text-white text-center leading-tight">{match.away_team}</span>
              <div className="flex gap-1">
                {awayForm.map((r, i) => (
                  <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${r === 'W' ? 'bg-green-600 text-white' : r === 'D' ? 'bg-zinc-600 text-white' : 'bg-red-600 text-white'}`}>
                    {r === 'W' ? 'G' : r === 'D' ? 'B' : 'M'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 -mt-2">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="text-center">
              <span className="text-[10px] text-amber-500/70 uppercase tracking-widest font-medium">Uzman Tahmini</span>
              <div className="text-xl font-bold text-white mt-1">{formatPrediction()}</div>
              {match.api_winner_comment && (
                <p className="text-xs text-zinc-500 mt-2 italic">"{match.api_winner_comment}"</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 mt-4">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1 h-auto">
              <TabsTrigger value="analysis" className="flex-1 text-[11px] py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <BarChart3 className="w-3.5 h-3.5 mr-1" /> Analiz
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-1 text-[11px] py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Target className="w-3.5 h-3.5 mr-1" /> İstatistik
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex-1 text-[11px] py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                Goller
              </TabsTrigger>
              <TabsTrigger value="h2h" className="flex-1 text-[11px] py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <History className="w-3.5 h-3.5 mr-1" /> H2H
              </TabsTrigger>
              <TabsTrigger value="lineups" className="flex-1 text-[11px] py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Shirt className="w-3.5 h-3.5 mr-1" /> Kadro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="mt-4 space-y-4">
              <Section title="Kazanma Olasılığı">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-3 bg-zinc-900 rounded-lg">
                    <div className="text-xl font-bold text-white">{match.api_percent_home || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Ev Sahibi</div>
                  </div>
                  <div className="text-center p-3 bg-zinc-900 rounded-lg">
                    <div className="text-xl font-bold text-zinc-400">{match.api_percent_draw || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Beraberlik</div>
                  </div>
                  <div className="text-center p-3 bg-zinc-900 rounded-lg">
                    <div className="text-xl font-bold text-white">{match.api_percent_away || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Deplasman</div>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                  <div className="bg-amber-500" style={{ width: `${homePercent}%` }} />
                  <div className="bg-zinc-500" style={{ width: `${drawPercent}%` }} />
                  <div className="bg-white" style={{ width: `${awayPercent}%` }} />
                </div>
              </Section>

              {match.api_under_over && (
                <Section title="Gol Tahmini">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-lg border ${match.api_under_over.toLowerCase().includes('over') ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-white">ÜST</span>
                        <span className="text-lg text-zinc-400 ml-1">{match.api_under_over.match(/[\d.]+/)?.[0] || '2.5'}</span>
                        {match.api_under_over.toLowerCase().includes('over') && (
                          <div className="text-[10px] text-amber-500 mt-1 font-medium">TAVSİYE</div>
                        )}
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg border ${!match.api_under_over.toLowerCase().includes('over') ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-white">ALT</span>
                        <span className="text-lg text-zinc-400 ml-1">{match.api_under_over.match(/[\d.]+/)?.[0] || '2.5'}</span>
                        {!match.api_under_over.toLowerCase().includes('over') && (
                          <div className="text-[10px] text-amber-500 mt-1 font-medium">TAVSİYE</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {match.api_goals_home && match.api_goals_away && (
                    <div className="mt-3 p-3 bg-zinc-900 rounded-lg text-center">
                      <span className="text-xs text-zinc-500">Beklenen Skor: </span>
                      <span className="text-lg font-bold text-white">{match.api_goals_home?.replace('-', '')} - {match.api_goals_away?.replace('-', '')}</span>
                    </div>
                  )}
                </Section>
              )}

              {Object.keys(comparison).length > 0 && (
                <Section title="Karşılaştırma">
                  <div className="space-y-3">
                    {comparison.form && <CompBar label="Form" home={comparison.form.home} away={comparison.form.away} />}
                    {comparison.att && <CompBar label="Atak" home={comparison.att.home} away={comparison.att.away} />}
                    {comparison.def && <CompBar label="Defans" home={comparison.def.home} away={comparison.def.away} />}
                    {comparison.goals && <CompBar label="Gol Gücü" home={comparison.goals.home} away={comparison.goals.away} />}
                    {comparison.h2h && <CompBar label="H2H" home={comparison.h2h.home} away={comparison.h2h.away} />}
                  </div>
                </Section>
              )}
            </TabsContent>

            <TabsContent value="stats" className="mt-4 space-y-4">
              {homeTeam?.league && awayTeam?.league && (
                <>
                  <Section title="Sezon Özeti">
                    <div className="grid grid-cols-2 gap-4">
                      <TeamStatColumn team={match.home_team} logo={match.home_logo} stats={homeTeam.league} />
                      <TeamStatColumn team={match.away_team} logo={match.away_logo} stats={awayTeam.league} />
                    </div>
                  </Section>

                  <Section title="Diziliş Tercihi">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        {homeTeam.league.lineups?.slice(0, 3).map((l, i) => (
                          <div key={i} className="flex justify-between text-sm bg-zinc-900 rounded px-3 py-2">
                            <span className="font-mono text-white">{l.formation}</span>
                            <span className="text-zinc-500">{l.played}x</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {awayTeam.league.lineups?.slice(0, 3).map((l, i) => (
                          <div key={i} className="flex justify-between text-sm bg-zinc-900 rounded px-3 py-2">
                            <span className="font-mono text-white">{l.formation}</span>
                            <span className="text-zinc-500">{l.played}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Section>

                  <Section title="Penaltı">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900 rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-2">{match.home_team}</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Atılan</span>
                          <span className="text-green-500">{homeTeam.league.penalty.scored.total}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-zinc-400">Kaçan</span>
                          <span className="text-red-500">{homeTeam.league.penalty.missed.total}</span>
                        </div>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-2">{match.away_team}</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Atılan</span>
                          <span className="text-green-500">{awayTeam.league.penalty.scored.total}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-zinc-400">Kaçan</span>
                          <span className="text-red-500">{awayTeam.league.penalty.missed.total}</span>
                        </div>
                      </div>
                    </div>
                  </Section>
                </>
              )}
            </TabsContent>

            <TabsContent value="goals" className="mt-4 space-y-4">
              {homeTeam?.league && awayTeam?.league && (
                <>
                  <Section title="Gol Analizi">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500 text-center mb-2">{match.home_team} (Evinde)</div>
                        <StatBox label="Atılan" value={homeTeam.league.goals.for.total.home} color="text-green-500" />
                        <StatBox label="Yenilen" value={homeTeam.league.goals.against.total.home} color="text-red-500" />
                        <StatBox label="Ort. Atılan" value={homeTeam.league.goals.for.average.home} />
                        <StatBox label="Temiz Kale" value={homeTeam.league.clean_sheet.home} />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500 text-center mb-2">{match.away_team} (Deplasmanda)</div>
                        <StatBox label="Atılan" value={awayTeam.league.goals.for.total.away} color="text-green-500" />
                        <StatBox label="Yenilen" value={awayTeam.league.goals.against.total.away} color="text-red-500" />
                        <StatBox label="Ort. Atılan" value={awayTeam.league.goals.for.average.away} />
                        <StatBox label="Temiz Kale" value={awayTeam.league.clean_sheet.away} />
                      </div>
                    </div>
                  </Section>

                  <Section title="Gol Beklentisi">
                    <div className="bg-zinc-900 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-amber-500">{homeTeam.league.goals.for.average.home}</div>
                          <div className="text-[10px] text-zinc-500">{match.home_team} Atar</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {(parseFloat(homeTeam.league.goals.for.average.home) + parseFloat(awayTeam.league.goals.for.average.away)).toFixed(1)}
                          </div>
                          <div className="text-[10px] text-zinc-500">Toplam Beklenen</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-amber-500">{awayTeam.league.goals.for.average.away}</div>
                          <div className="text-[10px] text-zinc-500">{match.away_team} Atar</div>
                        </div>
                      </div>
                    </div>
                  </Section>
                </>
              )}
            </TabsContent>

            <TabsContent value="h2h" className="mt-4 space-y-4">
              {h2h.length > 0 ? (
                <>
                  <Section title="Son Karşılaşmalar">
                    <div className="space-y-2">
                      {h2h.map((game, i) => {
                        const homeWin = game.homeGoals > game.awayGoals;
                        const awayWin = game.awayGoals > game.homeGoals;
                        return (
                          <div key={i} className="flex items-center bg-zinc-900 rounded-lg p-3">
                            <span className="text-[10px] text-zinc-500 w-16">{new Date(game.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                            <div className="flex-1 flex items-center justify-center gap-2">
                              <span className={`text-xs ${homeWin ? 'text-white font-medium' : 'text-zinc-500'} truncate max-w-[70px]`}>{game.homeTeam}</span>
                              <span className="text-sm font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">{game.homeGoals}-{game.awayGoals}</span>
                              <span className={`text-xs ${awayWin ? 'text-white font-medium' : 'text-zinc-500'} truncate max-w-[70px]`}>{game.awayTeam}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>

                  <Section title="H2H Özeti">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-zinc-900 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-500">{h2h.filter(g => g.homeGoals > g.awayGoals).length}</div>
                        <div className="text-[10px] text-zinc-500">Ev Galibiyet</div>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-zinc-400">{h2h.filter(g => g.homeGoals === g.awayGoals).length}</div>
                        <div className="text-[10px] text-zinc-500">Beraberlik</div>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-blue-500">{h2h.filter(g => g.awayGoals > g.homeGoals).length}</div>
                        <div className="text-[10px] text-zinc-500">Dep Galibiyet</div>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-amber-500">{(h2h.reduce((sum, g) => sum + g.homeGoals + g.awayGoals, 0) / h2h.length).toFixed(1)}</div>
                        <div className="text-[10px] text-zinc-500">Ort. Gol</div>
                      </div>
                    </div>
                  </Section>
                </>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Karşılaşma geçmişi bulunamadı</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lineups" className="mt-4 space-y-4">
              {lineups.length > 0 ? (
                lineups.map((lineup, idx) => (
                  <Section key={idx} title={`${lineup.team.name} (${lineup.formation})`}>
                    <div className="flex items-center gap-2 mb-3">
                      <img src={lineup.team.logo} className="w-6 h-6" />
                      {lineup.coach && (
                        <span className="text-xs text-zinc-500">Teknik Direktör: {lineup.coach.name}</span>
                      )}
                    </div>
                    <div className="mb-3">
                      <div className="text-xs text-zinc-500 mb-2">İlk 11</div>
                      <div className="grid grid-cols-2 gap-1">
                        {lineup.startXI?.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-zinc-900 rounded px-2 py-1.5">
                            <span className="text-xs text-amber-500 font-bold w-5">{p.player.number}</span>
                            <span className="text-xs text-white truncate">{p.player.name}</span>
                            <span className="text-[10px] text-zinc-600 ml-auto">{p.player.pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lineup.substitutes?.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-2">Yedekler</div>
                        <div className="grid grid-cols-2 gap-1">
                          {lineup.substitutes?.slice(0, 8).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 bg-zinc-900/50 rounded px-2 py-1.5">
                              <span className="text-xs text-zinc-500 font-bold w-5">{p.player.number}</span>
                              <span className="text-xs text-zinc-400 truncate">{p.player.name}</span>
                              <span className="text-[10px] text-zinc-700 ml-auto">{p.player.pos}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Shirt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Kadro bilgisi henüz açıklanmadı</p>
                  <p className="text-xs text-zinc-600 mt-1">Maçtan önce güncellenecektir</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function CompBar({ label, home, away }: { label: string; home: string; away: string }) {
  const h = parseInt(home?.replace('%', '') || '0');
  const a = parseInt(away?.replace('%', '') || '0');
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white font-medium">{home}</span>
        <span className="text-zinc-500">{label}</span>
        <span className="text-white font-medium">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
        <div className="bg-amber-500" style={{ width: `${h}%` }} />
        <div className="bg-white" style={{ width: `${a}%` }} />
      </div>
    </div>
  );
}

function TeamStatColumn({ team, logo, stats }: { team: string; logo?: string; stats: any }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        {logo && <img src={logo} className="w-5 h-5" />}
        <span className="text-xs font-medium text-white truncate">{team}</span>
      </div>
      <StatRow label="Maç" value={stats.fixtures.played.total} />
      <StatRow label="Galibiyet" value={stats.fixtures.wins.total} color="text-green-500" />
      <StatRow label="Beraberlik" value={stats.fixtures.draws.total} />
      <StatRow label="Mağlubiyet" value={stats.fixtures.loses.total} color="text-red-500" />
      <StatRow label="Atılan Gol" value={stats.goals.for.total.total} color="text-green-500" />
      <StatRow label="Yenilen Gol" value={stats.goals.against.total.total} color="text-red-500" />
    </div>
  );
}

function StatRow({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex justify-between text-xs bg-zinc-900 rounded px-2 py-1.5">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex justify-between text-sm bg-zinc-900 rounded-lg px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
