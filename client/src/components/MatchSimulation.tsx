import { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchSimulationProps {
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  predictedScore: { home: number; away: number };
}

interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'save' | 'chance';
  team: 'home' | 'away';
  description: string;
}

function generateMatchEvents(homeGoals: number, awayGoals: number): MatchEvent[] {
  const events: MatchEvent[] = [];
  const totalGoals = homeGoals + awayGoals;
  
  const goalMinutes: number[] = [];
  for (let i = 0; i < totalGoals; i++) {
    let minute: number = 0;
    do {
      minute = Math.floor(Math.random() * 88) + 2;
    } while (goalMinutes.some(m => Math.abs(m - minute) < 5));
    goalMinutes.push(minute);
  }
  goalMinutes.sort((a, b) => a - b);
  
  let homeScored = 0;
  let awayScored = 0;
  
  goalMinutes.forEach((minute) => {
    const remainingHome = homeGoals - homeScored;
    const remainingAway = awayGoals - awayScored;
    const isHomeGoal = Math.random() < (remainingHome / (remainingHome + remainingAway));
    
    if (isHomeGoal && homeScored < homeGoals) {
      homeScored++;
      events.push({ minute, type: 'goal', team: 'home', description: 'GOL!' });
    } else if (awayScored < awayGoals) {
      awayScored++;
      events.push({ minute, type: 'goal', team: 'away', description: 'GOL!' });
    }
  });
  
  const chanceCount = Math.floor(Math.random() * 4) + 3;
  for (let i = 0; i < chanceCount; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const team = Math.random() < 0.5 ? 'home' : 'away';
    events.push({ minute, type: 'chance', team, description: 'Tehlikeli atak!' });
  }
  
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

export function MatchSimulation({ homeTeam, awayTeam, homeLogo, awayLogo, predictedScore }: MatchSimulationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [showGoalAnimation, setShowGoalAnimation] = useState<'home' | 'away' | null>(null);
  const [recentEvent, setRecentEvent] = useState<MatchEvent | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setEvents(generateMatchEvents(predictedScore.home, predictedScore.away));
  }, [predictedScore]);

  const moveBall = useCallback(() => {
    const targetX = 20 + Math.random() * 60;
    const targetY = 15 + Math.random() * 70;
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
        currentEvents.forEach(event => {
          if (event.type === 'goal') {
            if (event.team === 'home') {
              setHomeScore(s => s + 1);
              setBallPosition({ x: 88, y: 50 });
            } else {
              setAwayScore(s => s + 1);
              setBallPosition({ x: 12, y: 50 });
            }
            setShowGoalAnimation(event.team);
            setTimeout(() => setShowGoalAnimation(null), 2000);
          }
          setRecentEvent(event);
          setTimeout(() => setRecentEvent(null), 2500);
        });
        
        if (next % 3 === 0) moveBall();
        
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isFinished, events, moveBall]);

  const handleReset = () => {
    setCurrentMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setIsPlaying(false);
    setIsFinished(false);
    setBallPosition({ x: 50, y: 50 });
    setShowGoalAnimation(null);
    setRecentEvent(null);
    setEvents(generateMatchEvents(predictedScore.home, predictedScore.away));
  };

  const getHalfText = () => {
    if (currentMinute === 0) return "Başlamadı";
    if (currentMinute <= 45) return "1. Yarı";
    if (currentMinute === 45) return "Devre";
    if (currentMinute <= 90) return "2. Yarı";
    return "Bitti";
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-white/10 overflow-hidden">
      <div className="relative bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex-1 flex items-center gap-3">
            {homeLogo ? (
              <img src={homeLogo} className="w-12 h-12 object-contain" alt={homeTeam} />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                {homeTeam.charAt(0)}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs text-zinc-400 font-medium">Ev Sahibi</p>
              <p className="text-sm font-bold text-white truncate max-w-[80px]">{homeTeam}</p>
            </div>
          </div>
          
          <div className="flex-shrink-0 text-center px-4">
            <div className={`text-4xl font-black transition-all duration-300 ${showGoalAnimation ? 'scale-125' : ''}`}>
              <span className={showGoalAnimation === 'home' ? 'text-emerald-400' : 'text-white'}>{homeScore}</span>
              <span className="text-zinc-600 mx-2">-</span>
              <span className={showGoalAnimation === 'away' ? 'text-blue-400' : 'text-white'}>{awayScore}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : isFinished ? 'bg-zinc-500' : 'bg-yellow-500'}`} />
              <span className="text-xs text-zinc-400">{currentMinute}' • {getHalfText()}</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-xs text-zinc-400 font-medium">Deplasman</p>
              <p className="text-sm font-bold text-white truncate max-w-[80px]">{awayTeam}</p>
            </div>
            {awayLogo ? (
              <img src={awayLogo} className="w-12 h-12 object-contain" alt={awayTeam} />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                {awayTeam.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${(currentMinute / 90) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative aspect-[16/10] bg-gradient-to-b from-green-800 to-green-900 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.03) 10%, rgba(255,255,255,0.03) 10.5%)`,
        }} />
        
        <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full">
          <rect x="0" y="0" width="100" height="60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <line x1="50" y1="0" x2="50" y2="60" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <circle cx="50" cy="30" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <circle cx="50" cy="30" r="0.5" fill="rgba(255,255,255,0.5)" />
          
          <rect x="0" y="18" width="14" height="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <rect x="0" y="24" width="5" height="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <circle cx="10" cy="30" r="0.4" fill="rgba(255,255,255,0.5)" />
          
          <rect x="86" y="18" width="14" height="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <rect x="95" y="24" width="5" height="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <circle cx="90" cy="30" r="0.4" fill="rgba(255,255,255,0.5)" />
          
          <path d="M 0 0 Q 3 3 0 6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" transform="translate(0,0)" />
          <path d="M 0 0 Q -3 3 0 6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" transform="translate(100,0)" />
          <path d="M 0 0 Q 3 -3 0 -6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" transform="translate(0,60)" />
          <path d="M 0 0 Q -3 -3 0 -6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" transform="translate(100,60)" />
        </svg>

        <div 
          className="absolute w-3 h-3 transition-all duration-700 ease-out"
          style={{ 
            left: `${ballPosition.x}%`, 
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="w-full h-full rounded-full bg-white shadow-lg shadow-black/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400" />
          </div>
          {isPlaying && (
            <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
          )}
        </div>

        {showGoalAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              <div className={`text-5xl font-black animate-bounce ${showGoalAnimation === 'home' ? 'text-emerald-400' : 'text-blue-400'}`}>
                GOL!
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-yellow-400"
                    style={{
                      animation: `explode 1s ease-out forwards`,
                      animationDelay: `${i * 0.05}s`,
                      transform: `rotate(${i * 30}deg) translateY(-30px)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {recentEvent && recentEvent.type !== 'goal' && (
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold animate-fade-in ${
            recentEvent.team === 'home' ? 'bg-emerald-500/80 text-white' : 'bg-blue-500/80 text-white'
          }`}>
            {recentEvent.description}
          </div>
        )}

        {isFinished && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-black text-white mb-2">MAÇ BİTTİ</p>
              <div className="text-4xl font-black">
                <span className="text-emerald-400">{homeScore}</span>
                <span className="text-zinc-400 mx-2">-</span>
                <span className="text-blue-400">{awayScore}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-zinc-900/50 flex items-center justify-center gap-3">
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
          0% { opacity: 1; transform: rotate(var(--rotation)) translateY(0); }
          100% { opacity: 0; transform: rotate(var(--rotation)) translateY(-60px); }
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
