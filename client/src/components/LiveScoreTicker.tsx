import { useLocation } from "wouter";
import { useLiveMatches } from "@/lib/rapidApi";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

export function LiveScoreTicker() {
  const [, setLocation] = useLocation();
  const { data: matches, isLoading, error } = useLiveMatches();

  if (error) {
     return null;
  }

  if (isLoading) {
     return (
        <div className="w-full bg-black/90 border-b border-white/10 py-2 flex justify-center">
           <Skeleton className="h-4 w-1/2 bg-white/10" />
        </div>
     );
  }

  const liveMatches = matches || [];
  const displayMatches = liveMatches.length > 0 ? [...liveMatches, ...liveMatches] : []; // Duplicate for marquee effect if enough items

  if (displayMatches.length === 0) return null;

  return (
    <div className="w-full bg-black/90 border-b border-white/10 overflow-hidden py-2 relative z-40">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center gap-2 px-3 absolute left-0 bg-black z-20 h-full border-r border-white/10">
         <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
         <span className="text-[10px] font-black text-white uppercase tracking-wider">CANLI</span>
      </div>

      <div className="animate-marquee whitespace-nowrap flex items-center gap-8 pl-24">
        {displayMatches.map((match, idx) => (
          <button 
            key={`${match.fixture.id}-${idx}`}
            onClick={() => setLocation("/live")}
            className="flex items-center gap-3 group hover:bg-white/5 px-2 py-0.5 rounded transition-colors"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300">
              <span className="group-hover:text-white transition-colors">{match.teams.home.name}</span>
              <span className="text-primary font-mono text-xs">{match.goals.home ?? 0}-{match.goals.away ?? 0}</span>
              <span className="group-hover:text-white transition-colors">{match.teams.away.name}</span>
            </div>
            <span className="text-[9px] font-mono text-red-500 animate-pulse">{match.fixture.status.elapsed}'</span>
          </button>
        ))}
      </div>
    </div>
  );
}
