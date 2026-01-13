import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MobileLayout } from "@/components/MobileLayout";
import { ArrowLeft, BrainCircuit, BarChart, Sparkles, Trophy, Clock, Loader2, TrendingUp, Target, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import stadiumBg from "@assets/generated_images/dark_cinematic_stadium_atmosphere_background.png";

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
  api_comparison?: any;
  api_h2h?: any[];
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

  return (
    <MobileLayout>
      <div className="pb-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative h-[300px] -mt-20 -mx-4 mb-6 overflow-hidden">
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

          <div className="absolute inset-0 flex items-center justify-center z-10 pt-10">
            <div className="w-full px-6 flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-4 animate-in slide-in-from-left-8 duration-700">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                  <div className="relative w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 duration-300">
                    {match.home_logo ? (
                      <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {match.home_team.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-display font-black text-white leading-none mb-1 tracking-wide">{match.home_team.split(' ')[0]}</h2>
                  <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-white/60">EV SAHİBİ</Badge>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 -mt-8">
                <div className="text-4xl font-display font-black italic text-white/10 select-none">VS</div>
                <div className="flex items-center gap-1 px-3 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-bold tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                  <Clock className="w-3 h-3" />
                  {match.match_time}
                </div>
                <span className="text-xs text-white/40">{new Date(match.match_date).toLocaleDateString('tr-TR')}</span>
              </div>

              <div className="flex flex-col items-center gap-4 animate-in slide-in-from-right-8 duration-700">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                  <div className="relative w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 duration-300">
                    {match.away_logo ? (
                      <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {match.away_team.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-display font-black text-white leading-none mb-1 tracking-wide">{match.away_team.split(' ')[0]}</h2>
                  <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-white/60">DEPLASMAN</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {match.api_advice && (
          <div className="relative mx-1 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent blur-xl" />
            <Card className="relative bg-black/40 border-primary/20 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <span className="text-sm font-bold text-primary uppercase tracking-widest">Uzman Tavsiyesi</span>
                </div>
                <p className="text-xl font-display font-bold text-white leading-relaxed">
                  {match.api_advice}
                </p>
                {match.api_winner_name && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Trophy className="w-3 h-3 mr-1" /> Favori: {match.api_winner_name}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Maç Analizi</h2>
            <Badge variant="outline" className="text-primary border-primary/30 ml-auto">
              <TrendingUp className="w-3 h-3 mr-1" /> API Destekli
            </Badge>
          </div>

          <Card className="bg-card/50 border-border/50 p-5">
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" /> Kazanma Olasılıkları
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{match.home_team} (Ev)</span>
                  <span className="font-bold text-green-400">{match.api_percent_home || '0%'}</span>
                </div>
                <Progress value={homePercent} className="h-3" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Beraberlik</span>
                  <span className="font-bold text-yellow-400">{match.api_percent_draw || '0%'}</span>
                </div>
                <Progress value={drawPercent} className="h-3 [&>div]:bg-yellow-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{match.away_team} (Dep)</span>
                  <span className="font-bold text-blue-400">{match.api_percent_away || '0%'}</span>
                </div>
                <Progress value={awayPercent} className="h-3 [&>div]:bg-blue-500" />
              </div>
            </div>
          </Card>

          {match.api_under_over && (
            <Card className="bg-card/50 border-border/50 p-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Gol Tahmini
              </h3>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <span className="text-xs text-zinc-500 block mb-1">Alt/Üst</span>
                  <Badge className="bg-primary/20 text-primary text-lg px-4 py-2">{match.api_under_over}</Badge>
                </div>
                {match.api_goals_home && match.api_goals_away && (
                  <div className="text-center flex-1 border-l border-white/5 pl-4">
                    <span className="text-xs text-zinc-500 block mb-1">Beklenen Skor</span>
                    <div className="text-2xl font-bold text-white">
                      {match.api_goals_home} - {match.api_goals_away}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {comparison && Object.keys(comparison).length > 0 && (
            <Card className="bg-card/50 border-border/50 p-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <BarChart className="w-4 h-4" /> Takım Karşılaştırması
              </h3>
              <div className="space-y-3">
                {Object.entries(comparison).slice(0, 5).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-zinc-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-green-400">{value?.home || '-'}</span>
                      <span className="text-xs text-zinc-600">vs</span>
                      <span className="text-sm font-medium text-blue-400">{value?.away || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {h2h.length > 0 && (
            <Card className="bg-card/50 border-border/50 p-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Son Karşılaşmalar
              </h3>
              <div className="space-y-2">
                {h2h.slice(0, 5).map((game: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="text-xs text-zinc-500">{new Date(game.date).toLocaleDateString('tr-TR')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{game.homeTeam}</span>
                      <span className="font-bold text-primary">{game.homeGoals} - {game.awayGoals}</span>
                      <span className="text-sm text-white">{game.awayTeam}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="bg-card/50 border-border/50 p-5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-24 h-24" />
            </div>
            
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <BarChart className="w-4 h-4" /> Maç Bilgileri
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-zinc-400">Lig</span>
                <span className="text-sm font-medium text-white">{match.league_name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-zinc-400">Tarih</span>
                <span className="text-sm font-medium text-white">{new Date(match.match_date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-zinc-400">Saat</span>
                <span className="text-sm font-medium text-white">{match.match_time}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}

function PredictionDetail({ prediction, onBack }: { prediction: Prediction; onBack: () => void }) {
  const confidence = (prediction.confidence || 'medium') as 'low' | 'medium' | 'high';
  const oddsValue = typeof prediction.odds === 'number' ? prediction.odds : parseFloat(prediction.odds as any) || 0;

  return (
    <MobileLayout>
      <div className="pb-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative h-[300px] -mt-20 -mx-4 mb-6 overflow-hidden">
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
