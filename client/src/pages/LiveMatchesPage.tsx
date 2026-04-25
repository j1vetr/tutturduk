import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Search, RefreshCcw } from "lucide-react";

interface FinishedMatch {
  id: number;
  date: string;
  localDate: string;
  localTime: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string };
  score: { home: number; away: number };
  status: string;
}

type DateFilter = "all" | "today" | "yesterday";

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState<FinishedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/football/finished");
      if (res.ok) setMatches(await res.json());
    } finally { setLoading(false); }
  }

  const today = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

  const filtered = matches.filter((m) => {
    const ms = m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.league.name.toLowerCase().includes(search.toLowerCase());
    if (!ms) return false;
    if (dateFilter === "today") return m.localDate === today;
    if (dateFilter === "yesterday") return m.localDate === yesterday;
    return true;
  });

  const grouped = filtered.reduce((acc, m) => {
    (acc[m.localDate] = acc[m.localDate] || []).push(m);
    return acc;
  }, {} as Record<string, FinishedMatch[]>);

  const todayCount = matches.filter((m) => m.localDate === today).length;
  const yestCount = matches.filter((m) => m.localDate === yesterday).length;

  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-7 pt-3">
        <header className="pt-2 flex items-start justify-between">
          <div>
            <span className="label-meta-sm">Sonuçlar</span>
            <h1 className="font-serif-display text-[30px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
              Biten <span className="italic text-white/85">maçlar</span>.
            </h1>
            <span className="text-[11px] text-white/40 mt-2 inline-block">Dün ve bugün oynanan karşılaşmalar.</span>
          </div>
          <button
            onClick={load}
            className="h-9 w-9 rounded-full border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-white/55 transition-all flex-shrink-0"
          >
            <RefreshCcw className="w-[14px] h-[14px]" strokeWidth={1.8} />
          </button>
        </header>

        {/* Filter pills */}
        <div className="flex gap-2">
          {[
            { k: "all" as DateFilter, l: "Tümü", c: matches.length },
            { k: "today" as DateFilter, l: "Bugün", c: todayCount },
            { k: "yesterday" as DateFilter, l: "Dün", c: yestCount },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => setDateFilter(p.k)}
              className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                dateFilter === p.k
                  ? "bg-white text-black"
                  : "border border-white/[0.08] text-white/65 hover:border-white/[0.18] hover:text-white/90"
              }`}
            >
              {p.l}
              <span className={`text-[10px] num-display ${dateFilter === p.k ? "text-black/55" : "text-white/35"}`}>{p.c}</span>
            </button>
          ))}
        </div>

        {/* Search */}
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
            <p className="font-serif-display text-[18px] text-white/75 italic">Bitmiş maç yok.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <span className="label-meta">{date === today ? "Bugün" : date === yesterday ? "Dün" : date}</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="label-meta-sm num-display">{items.length.toString().padStart(2, "0")}</span>
                </div>
                <div className="premium-card rounded-[18px] divide-y divide-white/[0.05] overflow-hidden">
                  {items.map((m) => (
                    <div key={m.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] text-white/40 truncate uppercase tracking-[0.14em] font-medium max-w-[200px]">
                          {m.league.country} · {m.league.name}
                        </span>
                        <span className="text-[10.5px] text-white/45 num-display tracking-wider">{m.localTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-white/95 font-medium leading-tight truncate">{m.homeTeam.name}</p>
                          <p className="text-[14px] text-white/95 font-medium leading-tight truncate mt-0.5">{m.awayTeam.name}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="num-display text-[16px] text-white leading-none">{m.score.home}</span>
                          <span className="num-display text-[16px] text-white leading-none mt-0.5">{m.score.away}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
