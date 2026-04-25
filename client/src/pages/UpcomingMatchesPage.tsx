import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Search, RefreshCcw } from "lucide-react";

interface UpcomingMatch {
  id: number;
  date: string;
  localDate: string;
  localTime: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string };
  prediction?: {
    advice?: string;
    percent?: { home: string; draw: string; away: string };
    homeForm?: string;
    awayForm?: string;
  };
}

export default function UpcomingMatchesPage() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const today = new Date();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/football/all-predictions");
      if (res.ok) setMatches(await res.json());
    } finally { setLoading(false); }
  }

  const filtered = matches.filter(
    (m) =>
      m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.league.name.toLowerCase().includes(search.toLowerCase()),
  );
  const grouped = filtered.reduce((acc, m) => {
    (acc[m.localDate] = acc[m.localDate] || []).push(m);
    return acc;
  }, {} as Record<string, UpcomingMatch[]>);
  const todayStr = today.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  const tomorrowStr = new Date(today.getTime() + 86400000).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

  return (
    <MobileLayout activeTab="predictions">
      <div className="space-y-7 pt-3">
        <header className="pt-2 flex items-start justify-between">
          <div>
            <span className="label-meta-sm">Bülten</span>
            <h1 className="font-serif-display text-[30px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
              Yaklaşan <span className="italic text-white/85">karşılaşmalar</span>.
            </h1>
            <span className="text-[11px] text-white/45 mt-2 inline-block num-display">
              {format(today, "d MMMM yyyy", { locale: tr })}
            </span>
          </div>
          <button
            onClick={load}
            className="h-9 w-9 rounded-full border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-white/55 transition-all flex-shrink-0"
          >
            <RefreshCcw className="w-[14px] h-[14px]" strokeWidth={1.8} />
          </button>
        </header>

        <div className="premium-card rounded-full px-4 h-11 flex items-center gap-2.5">
          <Search className="w-3.5 h-3.5 text-white/40" strokeWidth={1.8} />
          <input
            placeholder="Takım veya lig ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[12px] text-white placeholder:text-white/35"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border border-white/[0.10] border-t-white/60 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="premium-card rounded-[18px] py-12 text-center">
            <p className="font-serif-display text-[18px] text-white/75 italic">Maç bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <span className="label-meta">{date === todayStr ? "Bugün" : date === tomorrowStr ? "Yarın" : date}</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="label-meta-sm num-display">{items.length.toString().padStart(2, "0")}</span>
                </div>
                <div className="premium-card rounded-[18px] divide-y divide-white/[0.05] overflow-hidden">
                  {items.map((m) => {
                    const hp = parseInt(m.prediction?.percent?.home?.replace("%", "") || "0");
                    const dp = parseInt(m.prediction?.percent?.draw?.replace("%", "") || "0");
                    const ap = parseInt(m.prediction?.percent?.away?.replace("%", "") || "0");
                    const hasProb = hp > 0 || ap > 0;
                    return (
                      <div key={m.id} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[10px] text-white/40 truncate uppercase tracking-[0.14em] font-medium max-w-[200px]">
                            {m.league.country} · {m.league.name}
                          </span>
                          <span className="text-[10.5px] text-white/45 num-display tracking-wider">{m.localTime}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-white/95 font-medium leading-tight truncate">{m.homeTeam.name}</p>
                            <p className="text-[14px] text-white/95 font-medium leading-tight truncate mt-0.5">{m.awayTeam.name}</p>
                          </div>
                        </div>
                        {hasProb && (
                          <>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-[10px] text-white/55 num-display">%{hp}</span>
                              <span className="text-[10px] text-white/35 num-display">%{dp}</span>
                              <span className="text-[10px] text-white/55 num-display">%{ap}</span>
                            </div>
                            <div className="h-[2px] flex rounded-full overflow-hidden bg-white/[0.05]">
                              <div className="bg-white/80" style={{ width: `${hp}%` }} />
                              <div className="bg-white/30" style={{ width: `${dp}%` }} />
                              <div className="bg-white/55" style={{ width: `${ap}%` }} />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
