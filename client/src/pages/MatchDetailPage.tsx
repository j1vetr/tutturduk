import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, BrainCircuit, BarChart, Sparkles, Trophy, Clock, Loader2, TrendingUp, Target, Users, Zap, Shield, Swords, Activity, Percent, Goal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

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
    fixtures: { wins: { total: number }; draws: { total: number }; loses: { total: number }; played: { total: number } };
    clean_sheet: { total: number };
    failed_to_score: { total: number };
    penalty: { scored: { total: number }; missed: { total: number } };
    lineups: { formation: string; played: number }[];
    biggest: { wins: { home: string; away: string }; loses: { home: string; away: string }; streak: { wins: number; loses: number } };
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
  created_at?: string;
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

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [publishedMatch, setPublishedMatch] = useState<PublishedMatch | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMatch();
    }
  }, [id]);

  const loadMatch = async () => {
    setLoading(true);
    try {
      const matchRes = await fetch(`/api/matches/${id}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPublishedMatch(data);
      } else {
        const predRes = await fetch(`/api/predictions/${id}`);
        if (predRes.ok) {
          const data = await predRes.json();
          setPrediction(data);
        }
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!publishedMatch && !prediction) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-zinc-500">Maç bulunamadı.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Ana Sayfaya Dön
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (publishedMatch) {
    return <PublishedMatchDetail match={publishedMatch} onBack={() => setLocation('/')} />;
  }

  if (prediction) {
    return <PredictionDetail prediction={prediction} onBack={() => setLocation('/')} />;
  }

  return null;
}

function PublishedMatchDetail({ match, onBack }: { match: PublishedMatch; onBack: () => void }) {
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

  const FormBadge = ({ result }: { result: string }) => {
    const colors: Record<string, string> = {
      'W': 'bg-green-500',
      'D': 'bg-yellow-500',
      'L': 'bg-red-500'
    };
    return (
      <span className={`w-6 h-6 rounded-full ${colors[result] || 'bg-zinc-600'} flex items-center justify-center text-[10px] font-bold text-white`}>
        {result === 'W' ? 'G' : result === 'D' ? 'B' : 'M'}
      </span>
    );
  };

  const ComparisonBar = ({ label, homeVal, awayVal }: { label: string; homeVal: string; awayVal: string }) => {
    const home = parsePercent(homeVal);
    const away = parsePercent(awayVal);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-green-400 font-medium">{homeVal}</span>
          <span className="text-zinc-400">{label}</span>
          <span className="text-blue-400 font-medium">{awayVal}</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
          <div className="bg-green-500 transition-all" style={{ width: `${home}%` }} />
          <div className="bg-blue-500 transition-all" style={{ width: `${away}%` }} />
        </div>
      </div>
    );
  };

  return (
    <MobileLayout>
      <div className="pb-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative h-[280px] -mt-20 -mx-4 mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-black">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
              style={{ backgroundImage: `url(${stadiumBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
          </div>
          
          <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center justify-between z-20">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/5">
              {match.league_logo && <img src={match.league_logo} className="w-4 h-4 object-contain" />}
              <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                {match.league_name}
              </span>
            </div>
            <div className="w-10" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center z-10 pt-8">
            <div className="w-full px-4 flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
                  {match.home_logo ? (
                    <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-contain relative" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-xl font-bold text-white relative">
                      {match.home_team.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-sm font-display font-black text-white leading-tight">{match.home_team}</h2>
                  <div className="flex gap-1 mt-2 justify-center">
                    {homeForm.map((r, i) => <FormBadge key={i} result={r} />)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="text-3xl font-display font-black italic text-white/20">VS</div>
                <div className="flex items-center gap-1 px-3 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-bold">
                  <Clock className="w-3 h-3" />
                  {match.match_time}
                </div>
                <span className="text-[10px] text-white/40">{new Date(match.match_date).toLocaleDateString('tr-TR')}</span>
              </div>

              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                  {match.away_logo ? (
                    <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-contain relative" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-xl font-bold text-white relative">
                      {match.away_team.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-sm font-display font-black text-white leading-tight">{match.away_team}</h2>
                  <div className="flex gap-1 mt-2 justify-center">
                    {awayForm.map((r, i) => <FormBadge key={i} result={r} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {match.api_advice && (
          <div className="relative mx-1 mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent blur-xl" />
            <Card className="relative bg-black/40 border-primary/20 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Uzman Analizi</span>
                </div>
                <p className="text-lg font-display font-bold text-white leading-relaxed mb-2">
                  {match.api_advice}
                </p>
                {match.api_winner_comment && (
                  <p className="text-sm text-zinc-400 italic">"{match.api_winner_comment}"</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {match.api_winner_name && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Trophy className="w-3 h-3 mr-1" /> Favori: {match.api_winner_name}
                    </Badge>
                  )}
                  {match.api_under_over && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      <Goal className="w-3 h-3 mr-1" /> {match.api_under_over}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="w-full bg-zinc-900/50 border border-white/5 mb-4">
            <TabsTrigger value="analysis" className="flex-1 text-xs">Analiz</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 text-xs">İstatistik</TabsTrigger>
            <TabsTrigger value="h2h" className="flex-1 text-xs">H2H</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            <Card className="bg-card/50 border-border/50 p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Kazanma Olasılıkları
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">{match.api_percent_home || '0%'}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">EV SAHİBİ</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{match.api_percent_draw || '0%'}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">BERABERLİK</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400">{match.api_percent_away || '0%'}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">DEPLASMAN</div>
                </div>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div className="bg-green-500 transition-all" style={{ width: `${homePercent}%` }} />
                <div className="bg-yellow-500 transition-all" style={{ width: `${drawPercent}%` }} />
                <div className="bg-blue-500 transition-all" style={{ width: `${awayPercent}%` }} />
              </div>
            </Card>

            {Object.keys(comparison).length > 0 && (
              <Card className="bg-card/50 border-border/50 p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-primary" /> Detaylı Karşılaştırma
                </h3>
                <div className="space-y-4">
                  {comparison.att && <ComparisonBar label="Atak Gücü" homeVal={comparison.att.home} awayVal={comparison.att.away} />}
                  {comparison.def && <ComparisonBar label="Defans Gücü" homeVal={comparison.def.home} awayVal={comparison.def.away} />}
                  {comparison.form && <ComparisonBar label="Form" homeVal={comparison.form.home} awayVal={comparison.form.away} />}
                  {comparison.goals && <ComparisonBar label="Gol Gücü" homeVal={comparison.goals.home} awayVal={comparison.goals.away} />}
                  {comparison.h2h && <ComparisonBar label="H2H Avantajı" homeVal={comparison.h2h.home} awayVal={comparison.h2h.away} />}
                  {comparison.poisson_distribution && <ComparisonBar label="Poisson Dağılımı" homeVal={comparison.poisson_distribution.home} awayVal={comparison.poisson_distribution.away} />}
                </div>
                {comparison.total && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Genel Avantaj</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-400">{comparison.total.home}</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-lg font-bold text-blue-400">{comparison.total.away}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {match.api_goals_home && match.api_goals_away && (
              <Card className="bg-card/50 border-border/50 p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Beklenen Gol
                </h3>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{match.api_goals_home?.replace('-', '')}</div>
                    <div className="text-xs text-zinc-500">{match.home_team}</div>
                  </div>
                  <div className="text-2xl text-zinc-600">-</div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{match.api_goals_away?.replace('-', '')}</div>
                    <div className="text-xs text-zinc-500">{match.away_team}</div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {homeTeam?.league && awayTeam?.league && (
              <>
                <Card className="bg-card/50 border-border/50 p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Sezon İstatistikleri
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={match.home_logo} className="w-5 h-5" />
                        <span className="text-xs font-bold text-white">{match.home_team}</span>
                      </div>
                      <StatRow label="Maç" value={homeTeam.league.fixtures.played.total} />
                      <StatRow label="Galibiyet" value={homeTeam.league.fixtures.wins.total} color="text-green-400" />
                      <StatRow label="Beraberlik" value={homeTeam.league.fixtures.draws.total} color="text-yellow-400" />
                      <StatRow label="Mağlubiyet" value={homeTeam.league.fixtures.loses.total} color="text-red-400" />
                      <StatRow label="Atılan Gol" value={homeTeam.league.goals.for.total.total} color="text-green-400" />
                      <StatRow label="Yenilen Gol" value={homeTeam.league.goals.against.total.total} color="text-red-400" />
                      <StatRow label="Temiz Kale" value={homeTeam.league.clean_sheet.total} />
                      <StatRow label="Gol Atamadığı" value={homeTeam.league.failed_to_score.total} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={match.away_logo} className="w-5 h-5" />
                        <span className="text-xs font-bold text-white">{match.away_team}</span>
                      </div>
                      <StatRow label="Maç" value={awayTeam.league.fixtures.played.total} />
                      <StatRow label="Galibiyet" value={awayTeam.league.fixtures.wins.total} color="text-green-400" />
                      <StatRow label="Beraberlik" value={awayTeam.league.fixtures.draws.total} color="text-yellow-400" />
                      <StatRow label="Mağlubiyet" value={awayTeam.league.fixtures.loses.total} color="text-red-400" />
                      <StatRow label="Atılan Gol" value={awayTeam.league.goals.for.total.total} color="text-green-400" />
                      <StatRow label="Yenilen Gol" value={awayTeam.league.goals.against.total.total} color="text-red-400" />
                      <StatRow label="Temiz Kale" value={awayTeam.league.clean_sheet.total} />
                      <StatRow label="Gol Atamadığı" value={awayTeam.league.failed_to_score.total} />
                    </div>
                  </div>
                </Card>

                <Card className="bg-card/50 border-border/50 p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" /> Gol Ortalamaları
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-500 mb-2">{match.home_team}</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Maç Başı Atılan</span>
                        <span className="text-green-400 font-bold">{homeTeam.league.goals.for.average.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Maç Başı Yenilen</span>
                        <span className="text-red-400 font-bold">{homeTeam.league.goals.against.average.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Evde Atılan</span>
                        <span className="text-white font-bold">{homeTeam.league.goals.for.average.home}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-500 mb-2">{match.away_team}</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Maç Başı Atılan</span>
                        <span className="text-green-400 font-bold">{awayTeam.league.goals.for.average.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Maç Başı Yenilen</span>
                        <span className="text-red-400 font-bold">{awayTeam.league.goals.against.average.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Deplasmanda Atılan</span>
                        <span className="text-white font-bold">{awayTeam.league.goals.for.average.away}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card/50 border-border/50 p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-primary" /> Tercih Edilen Dizilişler
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500 mb-2">{match.home_team}</div>
                      <div className="space-y-1">
                        {homeTeam.league.lineups?.slice(0, 3).map((l, i) => (
                          <div key={i} className="flex justify-between text-sm bg-black/20 rounded px-2 py-1">
                            <span className="text-white font-mono">{l.formation}</span>
                            <span className="text-zinc-500">{l.played} maç</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-2">{match.away_team}</div>
                      <div className="space-y-1">
                        {awayTeam.league.lineups?.slice(0, 3).map((l, i) => (
                          <div key={i} className="flex justify-between text-sm bg-black/20 rounded px-2 py-1">
                            <span className="text-white font-mono">{l.formation}</span>
                            <span className="text-zinc-500">{l.played} maç</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card/50 border-border/50 p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" /> Dikkat Çeken Veriler
                  </h3>
                  <div className="space-y-2">
                    {homeTeam.league.biggest.streak.wins > 2 && (
                      <HighlightRow icon="🔥" text={`${match.home_team} son ${homeTeam.league.biggest.streak.wins} maçını kazandı`} type="positive" />
                    )}
                    {awayTeam.league.biggest.streak.wins > 2 && (
                      <HighlightRow icon="🔥" text={`${match.away_team} son ${awayTeam.league.biggest.streak.wins} maçını kazandı`} type="positive" />
                    )}
                    {homeTeam.league.biggest.streak.loses > 2 && (
                      <HighlightRow icon="📉" text={`${match.home_team} son ${homeTeam.league.biggest.streak.loses} maçını kaybetti`} type="negative" />
                    )}
                    {awayTeam.league.biggest.streak.loses > 2 && (
                      <HighlightRow icon="📉" text={`${match.away_team} son ${awayTeam.league.biggest.streak.loses} maçını kaybetti`} type="negative" />
                    )}
                    {homeTeam.league.clean_sheet.total > 5 && (
                      <HighlightRow icon="🧤" text={`${match.home_team} ${homeTeam.league.clean_sheet.total} kez kalesini gole kapattı`} type="neutral" />
                    )}
                    {awayTeam.league.failed_to_score.total > 5 && (
                      <HighlightRow icon="⚠️" text={`${match.away_team} ${awayTeam.league.failed_to_score.total} maçta gol atamadı`} type="warning" />
                    )}
                    {homeTeam.league.failed_to_score.total > 5 && (
                      <HighlightRow icon="⚠️" text={`${match.home_team} ${homeTeam.league.failed_to_score.total} maçta gol atamadı`} type="warning" />
                    )}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="h2h" className="space-y-4">
            {h2h.length > 0 ? (
              <Card className="bg-card/50 border-border/50 p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Son Karşılaşmalar
                </h3>
                <div className="space-y-2">
                  {h2h.map((game, i) => {
                    const homeWin = game.homeGoals > game.awayGoals;
                    const awayWin = game.awayGoals > game.homeGoals;
                    const draw = game.homeGoals === game.awayGoals;
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="text-xs text-zinc-500 w-20">{new Date(game.date).toLocaleDateString('tr-TR')}</div>
                        <div className="flex items-center gap-2 flex-1 justify-center">
                          <span className={`text-sm ${homeWin ? 'text-green-400 font-bold' : 'text-white'}`}>{game.homeTeam}</span>
                          <div className={`px-3 py-1 rounded font-bold text-sm ${draw ? 'bg-yellow-500/20 text-yellow-400' : homeWin ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {game.homeGoals} - {game.awayGoals}
                          </div>
                          <span className={`text-sm ${awayWin ? 'text-blue-400 font-bold' : 'text-white'}`}>{game.awayTeam}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-around text-center">
                    <div>
                      <div className="text-lg font-bold text-green-400">{h2h.filter(g => g.homeGoals > g.awayGoals).length}</div>
                      <div className="text-[10px] text-zinc-500">Ev Sahibi Galibiyeti</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-yellow-400">{h2h.filter(g => g.homeGoals === g.awayGoals).length}</div>
                      <div className="text-[10px] text-zinc-500">Beraberlik</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">{h2h.filter(g => g.awayGoals > g.homeGoals).length}</div>
                      <div className="text-[10px] text-zinc-500">Deplasman Galibiyeti</div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-card/50 border-border/50 p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-500">Bu takımlar daha önce karşılaşmamış</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}

function StatRow({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function HighlightRow({ icon, text, type }: { icon: string; text: string; type: 'positive' | 'negative' | 'neutral' | 'warning' }) {
  const colors = {
    positive: 'bg-green-500/10 border-green-500/20 text-green-400',
    negative: 'bg-red-500/10 border-red-500/20 text-red-400',
    neutral: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
  };
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${colors[type]}`}>
      <span>{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function PredictionDetail({ prediction, onBack }: { prediction: Prediction; onBack: () => void }) {
  const confidence = (prediction.confidence || 'medium') as 'low' | 'medium' | 'high';
  const oddsValue = typeof prediction.odds === 'number' ? prediction.odds : parseFloat(prediction.odds as any) || 0;

  return (
    <MobileLayout>
      <div className="pb-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative h-[280px] -mt-20 -mx-4 mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-black">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
              style={{ backgroundImage: `url(${stadiumBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
          </div>
          
          <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center justify-between z-20">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/5">
              {prediction.league_logo && <img src={prediction.league_logo} className="w-4 h-4 object-contain" />}
              <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                {prediction.league_name || prediction.league_id}
              </span>
            </div>
            <div className="w-10" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center z-10 pt-10">
            <div className="w-full px-6 flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                  <div className="relative w-full h-full">
                    {prediction.home_logo ? (
                      <img src={prediction.home_logo} alt={prediction.home_team} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {prediction.home_team.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-display font-black text-white">{prediction.home_team.split(' ')[0]}</h2>
                  <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-white/60">EV SAHİBİ</Badge>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 -mt-8">
                <div className="text-4xl font-display font-black italic text-white/10 select-none">VS</div>
                <div className="flex items-center gap-1 px-3 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-bold">
                  <Clock className="w-3 h-3" />
                  {prediction.match_time}
                </div>
                {prediction.match_date && (
                  <span className="text-xs text-white/40">
                    {new Date(prediction.match_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                  <div className="relative w-full h-full">
                    {prediction.away_logo ? (
                      <img src={prediction.away_logo} alt={prediction.away_team} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {prediction.away_team.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-display font-black text-white">{prediction.away_team.split(' ')[0]}</h2>
                  <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-white/60">DEPLASMAN</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-1 mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent blur-xl" />
          <Card className="relative bg-black/40 border-primary/20 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Uzman Tahmini</span>
                </div>
                <div className="text-3xl font-display font-black text-white">
                  {prediction.prediction}
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-muted-foreground uppercase">Bahis Oranı</span>
                <div className="text-3xl font-display font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                  {oddsValue.toFixed(2)}
                </div>
              </div>
            </div>
            
            {prediction.analysis && (
              <div className="px-5 pb-5 pt-0">
                <p className="text-sm text-gray-400 border-l-2 border-white/10 pl-3 italic">
                  "{prediction.analysis}"
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <div className="bg-card/50 border border-border/50 p-6 rounded-2xl space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <span className="text-xs text-zinc-500 block mb-1">Durum</span>
                <span className={`text-sm font-bold ${prediction.result === 'won' ? 'text-green-500' : prediction.result === 'lost' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {prediction.result === 'won' ? 'KAZANDI' : prediction.result === 'lost' ? 'KAYBETTİ' : 'BEKLENİYOR'}
                </span>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <span className="text-xs text-zinc-500 block mb-1">Güven</span>
                <span className={`text-sm font-bold ${confidence === 'high' ? 'text-primary' : confidence === 'medium' ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {confidence === 'high' ? 'BANKO' : confidence === 'medium' ? 'GÜÇLÜ' : 'NORMAL'}
                </span>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <span className="text-xs text-zinc-500 block mb-1">Oran</span>
                <span className="text-sm font-bold text-primary">{oddsValue.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
