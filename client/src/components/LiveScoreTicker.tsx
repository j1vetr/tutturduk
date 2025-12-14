import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { useLocation } from "wouter";

// Mock live data structure mirroring API-Football response
const LIVE_SCORES = [
  { id: 101, home: "Galatasaray", away: "Fenerbahçe", score: "1-1", time: "78'", status: "LIVE" },
  { id: 102, home: "Man City", away: "Liverpool", score: "2-1", time: "42'", status: "LIVE" },
  { id: 103, home: "Bayern", away: "Dortmund", score: "0-0", time: "12'", status: "LIVE" },
  { id: 104, home: "Milan", away: "Inter", score: "1-2", time: "88'", status: "LIVE" },
  { id: 105, home: "Real Madrid", away: "Atletico", score: "0-0", time: "5'", status: "LIVE" },
];

export function LiveScoreTicker() {
  const [, setLocation] = useLocation();

  return (
    <div className="w-full bg-black/90 border-b border-white/10 overflow-hidden py-2 relative z-40">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center gap-2 px-3 absolute left-0 bg-black z-20 h-full border-r border-white/10">
         <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
         <span className="text-[10px] font-black text-white uppercase tracking-wider">CANLI</span>
      </div>

      <div className="animate-marquee whitespace-nowrap flex items-center gap-8 pl-24">
        {[...LIVE_SCORES, ...LIVE_SCORES].map((match, idx) => (
          <button 
            key={`${match.id}-${idx}`}
            onClick={() => setLocation("/live")}
            className="flex items-center gap-3 group hover:bg-white/5 px-2 py-0.5 rounded transition-colors"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300">
              <span className="group-hover:text-white transition-colors">{match.home}</span>
              <span className="text-primary font-mono text-xs">{match.score}</span>
              <span className="group-hover:text-white transition-colors">{match.away}</span>
            </div>
            <span className="text-[9px] font-mono text-red-500 animate-pulse">{match.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
