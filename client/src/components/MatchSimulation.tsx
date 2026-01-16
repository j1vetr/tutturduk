import { useState, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Zap, Target, Users, Activity, TrendingUp, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchSimulationProps {
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  predictedScore: { home: number; away: number };
  scenario?: 'high_scoring' | 'low_scoring' | 'btts' | 'one_sided_home' | 'one_sided_away' | 'balanced';
  expectedGoals?: number;
}

interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'save' | 'shot' | 'corner' | 'foul' | 'offside' | 'substitution' | 'var';
  team: 'home' | 'away';
  description: string;
  goalType?: 'normal' | 'header' | 'penalty' | 'free_kick' | 'own_goal' | 'long_range';
  player?: string;
}

interface Player {
  id: number;
  x: number;
  y: number;
  team: 'home' | 'away';
  role: 'gk' | 'def' | 'mid' | 'att';
}

const GOAL_TYPES = ['normal', 'header', 'penalty', 'free_kick', 'long_range'] as const;
const GOAL_DESCRIPTIONS: Record<string, string[]> = {
  normal: ['Harika bir gol!', 'Ağları sarstı!', 'Muhteşem bitiriş!', 'Kaleciye şans yok!'],
  header: ['Kafa golü!', 'Havada yükseldi ve gol!', 'Kafa vuruşuyla ağlar!'],
  penalty: ['Penaltı golü!', '12 adımdan kayıpsız!', 'Penaltı uzmanı!'],
  free_kick: ['Serbest vuruştan gol!', 'Duvar aşıldı!', 'Harika frikik!'],
  long_range: ['Uzak mesafeden bomba!', 'Şutör efsane!', 'Roketi gönderdi!']
};

const EVENT_DESCRIPTIONS = {
  shot: ['Şut! Kalecide!', 'Tehlikeli şut!', 'Direğe çarptı!', 'Bloke edildi!', 'Üstten aştı!'],
  corner: ['Korner kazandı!', 'Tehlikeli korner!'],
  save: ['Muhteşem kurtarış!', 'Kaleci önledi!', 'Son anda müdahale!'],
  yellow: ['Sarı kart!', 'Sert müdahale!'],
  foul: ['Faul verildi', 'Tehlikeli faul'],
  offside: ['Ofsayt!', 'Bayrağı kaldırdı!'],
  var: ['VAR incelemesi...', 'VAR kararı bekleniyor...'],
};

function generateFormation(team: 'home' | 'away'): Player[] {
  const isHome = team === 'home';
  const baseX = isHome ? 25 : 75;
  const direction = isHome ? 1 : -1;
  
  return [
    { id: 1, x: isHome ? 5 : 95, y: 50, team, role: 'gk' },
    { id: 2, x: baseX - direction * 15, y: 20, team, role: 'def' },
    { id: 3, x: baseX - direction * 15, y: 40, team, role: 'def' },
    { id: 4, x: baseX - direction * 15, y: 60, team, role: 'def' },
    { id: 5, x: baseX - direction * 15, y: 80, team, role: 'def' },
    { id: 6, x: baseX, y: 25, team, role: 'mid' },
    { id: 7, x: baseX, y: 50, team, role: 'mid' },
    { id: 8, x: baseX, y: 75, team, role: 'mid' },
    { id: 9, x: baseX + direction * 15, y: 30, team, role: 'att' },
    { id: 10, x: baseX + direction * 15, y: 50, team, role: 'att' },
    { id: 11, x: baseX + direction * 15, y: 70, team, role: 'att' },
  ];
}

function generateMatchEvents(
  homeGoals: number, 
  awayGoals: number,
  scenario: string = 'balanced'
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const totalGoals = homeGoals + awayGoals;
  
  const goalMinutes: number[] = [];
  const preferredMinutes: number[] = [];
  
  if (scenario === 'high_scoring') {
    preferredMinutes.push(
      ...Array.from({ length: 20 }, () => Math.floor(Math.random() * 90) + 1)
    );
  } else if (scenario === 'low_scoring') {
    preferredMinutes.push(
      ...Array.from({ length: 5 }, () => 30 + Math.floor(Math.random() * 50))
    );
  } else if (scenario === 'btts') {
    preferredMinutes.push(15, 25, 55, 70, 85);
  }
  
  for (let i = 0; i < totalGoals; i++) {
    let minute: number;
    if (preferredMinutes.length > i) {
      minute = preferredMinutes[i] + Math.floor(Math.random() * 10) - 5;
      minute = Math.max(2, Math.min(88, minute));
    } else {
      do {
        minute = Math.floor(Math.random() * 86) + 2;
      } while (goalMinutes.some(m => Math.abs(m - minute) < 4));
    }
    goalMinutes.push(minute);
  }
  goalMinutes.sort((a, b) => a - b);
  
  let homeScored = 0;
  let awayScored = 0;
  
  goalMinutes.forEach((minute) => {
    const remainingHome = homeGoals - homeScored;
    const remainingAway = awayGoals - awayScored;
    let isHomeGoal: boolean;
    
    if (scenario === 'btts' && homeScored === 0 && awayScored === 0) {
      isHomeGoal = Math.random() < 0.5;
    } else if (scenario === 'btts' && (homeScored === 0 || awayScored === 0)) {
      isHomeGoal = homeScored === 0;
    } else if (scenario === 'one_sided_home') {
      isHomeGoal = Math.random() < 0.8;
    } else if (scenario === 'one_sided_away') {
      isHomeGoal = Math.random() < 0.2;
    } else {
      isHomeGoal = Math.random() < (remainingHome / (remainingHome + remainingAway));
    }
    
    if (isHomeGoal && homeScored < homeGoals) {
      homeScored++;
      const goalType = GOAL_TYPES[Math.floor(Math.random() * GOAL_TYPES.length)];
      const descriptions = GOAL_DESCRIPTIONS[goalType];
      events.push({ 
        minute, 
        type: 'goal', 
        team: 'home', 
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        goalType
      });
    } else if (awayScored < awayGoals) {
      awayScored++;
      const goalType = GOAL_TYPES[Math.floor(Math.random() * GOAL_TYPES.length)];
      const descriptions = GOAL_DESCRIPTIONS[goalType];
      events.push({ 
        minute, 
        type: 'goal', 
        team: 'away', 
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        goalType
      });
    }
  });
  
  const shotCount = scenario === 'high_scoring' ? 15 : scenario === 'low_scoring' ? 6 : 10;
  for (let i = 0; i < shotCount; i++) {
    const minute = Math.floor(Math.random() * 88) + 1;
    if (!events.some(e => e.minute === minute && e.type === 'goal')) {
      const team = Math.random() < (scenario === 'one_sided_home' ? 0.7 : scenario === 'one_sided_away' ? 0.3 : 0.5) ? 'home' : 'away';
      const descriptions = EVENT_DESCRIPTIONS.shot;
      events.push({ minute, type: 'shot', team, description: descriptions[Math.floor(Math.random() * descriptions.length)] });
    }
  }
  
  const cornerCount = Math.floor(Math.random() * 6) + 4;
  for (let i = 0; i < cornerCount; i++) {
    const minute = Math.floor(Math.random() * 88) + 1;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'corner', team, description: EVENT_DESCRIPTIONS.corner[Math.floor(Math.random() * 2)] });
  }
  
  const saveCount = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < saveCount; i++) {
    const minute = Math.floor(Math.random() * 85) + 3;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'save', team, description: EVENT_DESCRIPTIONS.save[Math.floor(Math.random() * 3)] });
  }
  
  const foulCount = Math.floor(Math.random() * 8) + 6;
  for (let i = 0; i < foulCount; i++) {
    const minute = Math.floor(Math.random() * 88) + 1;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'foul', team, description: EVENT_DESCRIPTIONS.foul[Math.floor(Math.random() * 2)] });
  }
  
  const yellowCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < yellowCount; i++) {
    const minute = Math.floor(Math.random() * 85) + 5;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'yellow', team, description: EVENT_DESCRIPTIONS.yellow[Math.floor(Math.random() * 2)] });
  }
  
  if (Math.random() < 0.15) {
    const minute = Math.floor(Math.random() * 60) + 20;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'red', team, description: 'Kırmızı kart! Oyuncu dışarı!' });
  }
  
  const offsideCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < offsideCount; i++) {
    const minute = Math.floor(Math.random() * 85) + 3;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'offside', team, description: EVENT_DESCRIPTIONS.offside[Math.floor(Math.random() * 2)] });
  }
  
  if (Math.random() < 0.25) {
    const minute = Math.floor(Math.random() * 70) + 15;
    events.push({ minute, type: 'var', team: 'home', description: EVENT_DESCRIPTIONS.var[Math.floor(Math.random() * 2)] });
  }
  
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

export function MatchSimulation({ 
  homeTeam, 
  awayTeam, 
  homeLogo, 
  awayLogo, 
  predictedScore,
  scenario = 'balanced',
  expectedGoals = 2.5
}: MatchSimulationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [showGoalAnimation, setShowGoalAnimation] = useState<{ team: 'home' | 'away'; type: string } | null>(null);
  const [recentEvent, setRecentEvent] = useState<MatchEvent | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [possession, setPossession] = useState({ home: 50, away: 50 });
  const [momentum, setMomentum] = useState(50);
  const [eventLog, setEventLog] = useState<MatchEvent[]>([]);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState({ 
    homeShots: 0, awayShots: 0, 
    homeCorners: 0, awayCorners: 0,
    homeYellows: 0, awayYellows: 0,
    homeFouls: 0, awayFouls: 0
  });

  useEffect(() => {
    setEvents(generateMatchEvents(predictedScore.home, predictedScore.away, scenario));
    setHomePlayers(generateFormation('home'));
    setAwayPlayers(generateFormation('away'));
  }, [predictedScore, scenario]);

  const movePlayers = useCallback((dominantTeam: 'home' | 'away' | null) => {
    const moveAmount = 3;
    
    setHomePlayers(prev => prev.map(p => ({
      ...p,
      x: Math.max(2, Math.min(48, p.x + (Math.random() - 0.5) * moveAmount + (dominantTeam === 'home' ? 1 : -0.5))),
      y: Math.max(5, Math.min(95, p.y + (Math.random() - 0.5) * moveAmount * 2))
    })));
    
    setAwayPlayers(prev => prev.map(p => ({
      ...p,
      x: Math.max(52, Math.min(98, p.x + (Math.random() - 0.5) * moveAmount + (dominantTeam === 'away' ? -1 : 0.5))),
      y: Math.max(5, Math.min(95, p.y + (Math.random() - 0.5) * moveAmount * 2))
    })));
  }, []);

  const moveBall = useCallback((team?: 'home' | 'away', isGoal?: boolean) => {
    if (isGoal) {
      setBallPosition({ x: team === 'home' ? 95 : 5, y: 50 });
      return;
    }
    
    let targetX: number, targetY: number;
    
    if (team === 'home') {
      targetX = 55 + Math.random() * 40;
      targetY = 20 + Math.random() * 60;
    } else if (team === 'away') {
      targetX = 5 + Math.random() * 40;
      targetY = 20 + Math.random() * 60;
    } else {
      targetX = 30 + Math.random() * 40;
      targetY = 20 + Math.random() * 60;
    }
    
    setBallPosition({ x: targetX, y: targetY });
  }, []);

  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const interval = setInterval(() => {
      setCurrentMinute(prev => {
        const next = prev + 1;
        
        if (next > 90) {
          setIsPlaying(false);
          setIsFinished(true);
          return 90;
        }
        
        const currentEvents = events.filter(e => e.minute === next);
        let dominantTeam: 'home' | 'away' | null = null;
        
        currentEvents.forEach(event => {
          setEventLog(log => [...log.slice(-9), event]);
          
          if (event.type === 'goal') {
            if (event.team === 'home') {
              setHomeScore(s => s + 1);
              setMomentum(m => Math.min(100, m + 15));
              dominantTeam = 'home';
            } else {
              setAwayScore(s => s + 1);
              setMomentum(m => Math.max(0, m - 15));
              dominantTeam = 'away';
            }
            moveBall(event.team, true);
            setShowGoalAnimation({ team: event.team, type: event.goalType || 'normal' });
            setTimeout(() => setShowGoalAnimation(null), 3000);
          } else if (event.type === 'shot') {
            setStats(s => event.team === 'home' 
              ? { ...s, homeShots: s.homeShots + 1 }
              : { ...s, awayShots: s.awayShots + 1 }
            );
            dominantTeam = event.team;
            moveBall(event.team);
          } else if (event.type === 'corner') {
            setStats(s => event.team === 'home'
              ? { ...s, homeCorners: s.homeCorners + 1 }
              : { ...s, awayCorners: s.awayCorners + 1 }
            );
            dominantTeam = event.team;
          } else if (event.type === 'yellow') {
            setStats(s => event.team === 'home'
              ? { ...s, homeYellows: s.homeYellows + 1 }
              : { ...s, awayYellows: s.awayYellows + 1 }
            );
          } else if (event.type === 'foul') {
            setStats(s => event.team === 'home'
              ? { ...s, homeFouls: s.homeFouls + 1 }
              : { ...s, awayFouls: s.awayFouls + 1 }
            );
          }
          
          if (event.type !== 'goal') {
            setRecentEvent(event);
            setTimeout(() => setRecentEvent(null), 2000);
          }
          
          if (event.team === 'home') {
            setMomentum(m => Math.min(100, m + 3));
            setPossession(p => ({ home: Math.min(65, p.home + 1), away: Math.max(35, p.away - 1) }));
          } else {
            setMomentum(m => Math.max(0, m - 3));
            setPossession(p => ({ home: Math.max(35, p.home - 1), away: Math.min(65, p.away + 1) }));
          }
        });
        
        if (next % 2 === 0) {
          moveBall(momentum > 55 ? 'home' : momentum < 45 ? 'away' : undefined);
          movePlayers(dominantTeam);
        }
        
        if (next % 5 === 0) {
          setMomentum(m => m + (Math.random() - 0.5) * 10);
          setPossession(p => ({
            home: Math.max(35, Math.min(65, p.home + (Math.random() - 0.5) * 4)),
            away: Math.max(35, Math.min(65, p.away + (Math.random() - 0.5) * 4))
          }));
        }
        
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, isFinished, events, moveBall, movePlayers, momentum]);

  const handleReset = () => {
    setCurrentMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setIsPlaying(false);
    setIsFinished(false);
    setBallPosition({ x: 50, y: 50 });
    setShowGoalAnimation(null);
    setRecentEvent(null);
    setPossession({ home: 50, away: 50 });
    setMomentum(50);
    setEventLog([]);
    setStats({ homeShots: 0, awayShots: 0, homeCorners: 0, awayCorners: 0, homeYellows: 0, awayYellows: 0, homeFouls: 0, awayFouls: 0 });
    setEvents(generateMatchEvents(predictedScore.home, predictedScore.away, scenario));
    setHomePlayers(generateFormation('home'));
    setAwayPlayers(generateFormation('away'));
  };

  const getHalfText = () => {
    if (currentMinute === 0) return "Başlamadı";
    if (currentMinute <= 45) return "1. Yarı";
    if (currentMinute <= 90) return "2. Yarı";
    return "Bitti";
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'header': return '⬆️';
      case 'penalty': return '🎯';
      case 'free_kick': return '🌀';
      case 'long_range': return '🚀';
      default: return '⚽';
    }
  };

  const getEventIcon = (event: MatchEvent) => {
    switch (event.type) {
      case 'goal': return '⚽';
      case 'yellow': return '🟨';
      case 'red': return '🟥';
      case 'shot': return '💨';
      case 'corner': return '🚩';
      case 'save': return '🧤';
      case 'foul': return '⚠️';
      case 'offside': return '🚫';
      case 'var': return '📺';
      default: return '📌';
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-white/10 overflow-hidden">
      <div className="relative bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2">
            {homeLogo ? (
              <img src={homeLogo} className="w-10 h-10 object-contain" alt={homeTeam} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {homeTeam.charAt(0)}
              </div>
            )}
            <div className="text-left">
              <p className="text-[10px] text-zinc-500">Ev Sahibi</p>
              <p className="text-xs font-bold text-white truncate max-w-[70px]">{homeTeam}</p>
            </div>
          </div>
          
          <div className="flex-shrink-0 text-center px-3">
            <div className={`text-3xl font-black transition-all duration-300 ${showGoalAnimation ? 'scale-110' : ''}`}>
              <span className={`transition-colors ${showGoalAnimation?.team === 'home' ? 'text-emerald-400' : 'text-white'}`}>{homeScore}</span>
              <span className="text-zinc-600 mx-1.5">:</span>
              <span className={`transition-colors ${showGoalAnimation?.team === 'away' ? 'text-blue-400' : 'text-white'}`}>{awayScore}</span>
            </div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : isFinished ? 'bg-zinc-500' : 'bg-yellow-500'}`} />
              <span className="text-[10px] text-zinc-400 font-medium">{currentMinute}' {getHalfText()}</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="text-right">
              <p className="text-[10px] text-zinc-500">Deplasman</p>
              <p className="text-xs font-bold text-white truncate max-w-[70px]">{awayTeam}</p>
            </div>
            {awayLogo ? (
              <img src={awayLogo} className="w-10 h-10 object-contain" alt={awayTeam} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                {awayTeam.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${(currentMinute / 90) * 100}%` }}
          />
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] text-emerald-400 font-bold w-8">{possession.home}%</span>
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${possession.home}%` }} />
            <div className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500" style={{ width: `${possession.away}%` }} />
          </div>
          <span className="text-[9px] text-blue-400 font-bold w-8 text-right">{possession.away}%</span>
        </div>
      </div>

      <div className="relative aspect-[16/9] bg-gradient-to-b from-green-700 via-green-800 to-green-900 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, transparent, transparent 9.9%, rgba(255,255,255,0.05) 9.9%, rgba(255,255,255,0.05) 10.1%),
            repeating-linear-gradient(0deg, transparent, transparent 16.5%, rgba(255,255,255,0.03) 16.5%, rgba(255,255,255,0.03) 16.8%)
          `,
        }} />
        
        <svg viewBox="0 0 100 56" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <rect x="0.5" y="0.5" width="99" height="55" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <line x1="50" y1="0" x2="50" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <circle cx="50" cy="28" r="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <circle cx="50" cy="28" r="0.8" fill="rgba(255,255,255,0.6)" />
          
          <rect x="0" y="14" width="16" height="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <rect x="0" y="20" width="6" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 16 22 A 6 6 0 0 1 16 34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          
          <rect x="84" y="14" width="16" height="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <rect x="94" y="20" width="6" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 84 22 A 6 6 0 0 0 84 34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          
          <path d="M 0 0 Q 4 4 0 8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 100 0 Q 96 4 100 8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 0 56 Q 4 52 0 48" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 100 56 Q 96 52 100 48" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
        </svg>

        {homePlayers.map(player => (
          <div
            key={`home-${player.id}`}
            className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300 shadow-sm transition-all duration-500 ease-out"
            style={{ 
              left: `${player.x}%`, 
              top: `${player.y * 0.56 + 22}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
        
        {awayPlayers.map(player => (
          <div
            key={`away-${player.id}`}
            className="absolute w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-300 shadow-sm transition-all duration-500 ease-out"
            style={{ 
              left: `${player.x}%`, 
              top: `${player.y * 0.56 + 22}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        <div 
          className="absolute transition-all duration-500 ease-out z-10"
          style={{ 
            left: `${ballPosition.x}%`, 
            top: `${ballPosition.y * 0.56 + 22}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="w-3 h-3 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500" />
          </div>
          {isPlaying && (
            <div className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
          )}
        </div>

        {showGoalAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative animate-bounce">
              <div className={`text-4xl font-black ${showGoalAnimation.team === 'home' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {getGoalTypeIcon(showGoalAnimation.type)} GOL!
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-2 h-2 rounded-full ${showGoalAnimation.team === 'home' ? 'bg-emerald-400' : 'bg-blue-400'}`}
                    style={{
                      animation: `explode 1.5s ease-out forwards`,
                      animationDelay: `${i * 0.04}s`,
                      transform: `rotate(${i * 22.5}deg) translateY(-40px)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {recentEvent && (
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-bold z-20 animate-fade-in backdrop-blur-sm ${
            recentEvent.team === 'home' ? 'bg-emerald-500/90 text-white' : 'bg-blue-500/90 text-white'
          }`}>
            {getEventIcon(recentEvent)} {recentEvent.description}
          </div>
        )}

        {isFinished && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-xl font-black text-white mb-1">MAÇ BİTTİ</p>
              <div className="text-4xl font-black">
                <span className="text-emerald-400">{homeScore}</span>
                <span className="text-zinc-400 mx-2">-</span>
                <span className="text-blue-400">{awayScore}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-1 left-1 right-1 flex justify-center">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
            <Activity className={`w-2.5 h-2.5 ${momentum > 55 ? 'text-emerald-400' : momentum < 45 ? 'text-blue-400' : 'text-zinc-400'}`} />
            <span className="text-[8px] text-zinc-300">Momentum</span>
            <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${momentum > 55 ? 'bg-emerald-400' : momentum < 45 ? 'bg-blue-400' : 'bg-zinc-400'}`}
                style={{ width: `${momentum}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 bg-zinc-900/80 grid grid-cols-4 gap-1 text-center text-[9px]">
        <div>
          <div className="flex justify-center gap-1 text-zinc-400">
            <span className="text-emerald-400">{stats.homeShots}</span>
            <Target className="w-3 h-3" />
            <span className="text-blue-400">{stats.awayShots}</span>
          </div>
          <p className="text-zinc-600">Şut</p>
        </div>
        <div>
          <div className="flex justify-center gap-1 text-zinc-400">
            <span className="text-emerald-400">{stats.homeCorners}</span>
            <Flag className="w-3 h-3" />
            <span className="text-blue-400">{stats.awayCorners}</span>
          </div>
          <p className="text-zinc-600">Korner</p>
        </div>
        <div>
          <div className="flex justify-center gap-1 text-zinc-400">
            <span className="text-emerald-400">{stats.homeYellows}</span>
            <span>🟨</span>
            <span className="text-blue-400">{stats.awayYellows}</span>
          </div>
          <p className="text-zinc-600">Kart</p>
        </div>
        <div>
          <div className="flex justify-center gap-1 text-zinc-400">
            <span className="text-emerald-400">{stats.homeFouls}</span>
            <Zap className="w-3 h-3" />
            <span className="text-blue-400">{stats.awayFouls}</span>
          </div>
          <p className="text-zinc-600">Faul</p>
        </div>
      </div>

      {eventLog.length > 0 && (
        <div className="max-h-24 overflow-y-auto bg-zinc-950/50 border-t border-zinc-800">
          <div className="p-2 space-y-1">
            {eventLog.slice().reverse().map((event, i) => (
              <div key={i} className={`flex items-center gap-2 text-[10px] py-0.5 px-2 rounded ${
                event.type === 'goal' ? 'bg-yellow-500/10' : ''
              }`}>
                <span className="text-zinc-500 w-6">{event.minute}'</span>
                <span>{getEventIcon(event)}</span>
                <span className={event.team === 'home' ? 'text-emerald-400' : 'text-blue-400'}>
                  {event.team === 'home' ? homeTeam : awayTeam}
                </span>
                <span className="text-zinc-400">{event.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-zinc-900/50 flex items-center justify-center gap-3 border-t border-zinc-800">
        {!isFinished ? (
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`gap-2 ${isPlaying ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'} text-white font-bold`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Duraklat
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {currentMinute > 0 ? 'Devam' : 'Simülasyonu Başlat'}
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleReset}
            className="gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold"
          >
            <RotateCcw className="w-4 h-4" />
            Yeniden İzle
          </Button>
        )}
        
        {!isFinished && currentMinute > 0 && (
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2 border-zinc-700 text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Sıfırla
          </Button>
        )}
      </div>

      <style>{`
        @keyframes explode {
          0% { opacity: 1; transform: rotate(var(--rotation)) translateY(0) scale(1); }
          100% { opacity: 0; transform: rotate(var(--rotation)) translateY(-80px) scale(0.3); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
