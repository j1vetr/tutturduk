import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import logoLight from "@assets/tutturduk_1777158124987.png";

interface PredictionItem {
  bet_type: string;
  confidence: number;
  bet_category: string;
  reasoning?: string;
  odds?: number;
}

interface AIAnalysis {
  analysis: string;
  predictions: PredictionItem[];
  avoidBets: (string | { bet?: string; reason?: string })[];
  expertTip: string;
  expectedGoalRange: string;
}

interface PublishedMatch {
  id: number;
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  league_logo?: string;
  match_date: string;
  match_time: string;
  predictions?: PredictionItem[];
}

type LiveScore = {
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  status: string;
  statusShort: string;
};

export default function MatchDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<PublishedMatch | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showAvoid, setShowAvoid] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/matches/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
          loadAI();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!match) return;
    const fetchLive = async () => {
      try {
        const res = await fetch("/api/matches/live-scores");
        if (res.ok) {
          const data = await res.json();
          if (data.scores?.[match.fixture_id]) setLiveScore(data.scores[match.fixture_id]);
        }
      } catch {}
    };
    fetchLive();
    const i = setInterval(fetchLive, 180000);
    return () => clearInterval(i);
  }, [match]);

  async function loadAI() {
    setLoadingAI(true);
    try {
      const res = await fetch(`/api/matches/${id}/ai-analysis`);
      if (res.ok) setAiAnalysis(await res.json());
    } finally {
      setLoadingAI(false);
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });

  const predictions = match?.predictions || [];
  const primaryBet = predictions.find((p) => p.bet_category === "primary");
  const altBet = predictions.find((p) => p.bet_category === "alternative");
  const isLive = liveScore && ["1H", "2H", "HT", "ET", "P", "BT"].includes(liveScore.statusShort);
  const isFinished = liveScore && ["FT", "AET", "PEN"].includes(liveScore.statusShort);

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 rounded-full border border-white/[0.10] border-t-white/60 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!match) {
    return (
      <PageShell>
        <div className="text-center py-24">
          <p className="font-serif-display text-[20px] text-white/80 italic mb-2">Maç bulunamadı.</p>
          <button
            onClick={() => setLocation("/tahminler")}
            className="mt-6 px-6 py-3 rounded-full border border-white/[0.10] hover:border-white/[0.22] text-[12px] text-white/85 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Geri dön
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell onBack={() => setLocation("/tahminler")} league={match.league_name} leagueLogo={match.league_logo}>
      <div className="space-y-5 pt-2">

        {/* ── MASTHEAD: Takımlar yan yana ── */}
        <header>
          {/* Tarih + saat */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-[11px] text-white/40 uppercase tracking-widest">
              {formatDate(match.match_date)}
            </span>
            {isLive ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-emerald-300 font-bold tracking-widest uppercase">
                  {liveScore?.statusShort === "HT" ? "Devre arası" : `${liveScore?.elapsed}'`}
                </span>
              </span>
            ) : isFinished ? (
              <span className="text-[11px] text-white/40 uppercase tracking-widest">· Maç sonu</span>
            ) : (
              <span className="text-[11px] text-white/55 font-mono">{match.match_time}</span>
            )}
          </div>

          {/* Takımlar yan yana */}
          <div className="flex items-center justify-between gap-3">
            {/* Ev sahibi */}
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-2">
                {match.home_logo ? (
                  <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-contain drop-shadow-lg" onError={(e) => { e.currentTarget.style.opacity = '0.2'; }} />
                ) : (
                  <span className="text-2xl font-bold text-white/40">{match.home_team.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[13px] font-semibold text-white text-center leading-tight line-clamp-2 px-1">{match.home_team}</span>
            </div>

            {/* Orta: skor veya VS */}
            <div className="flex flex-col items-center gap-1 px-2">
              {(isLive || isFinished) ? (
                <div className="flex items-center gap-2">
                  <span className="text-[38px] font-black text-white leading-none num-display">{liveScore?.homeGoals ?? 0}</span>
                  <span className="text-[22px] text-white/25 font-light">–</span>
                  <span className="text-[38px] font-black text-white leading-none num-display">{liveScore?.awayGoals ?? 0}</span>
                </div>
              ) : (
                <span className="text-[28px] font-display font-black text-white/[0.08] italic select-none">VS</span>
              )}
            </div>

            {/* Deplasman */}
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-2">
                {match.away_logo ? (
                  <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-contain drop-shadow-lg" onError={(e) => { e.currentTarget.style.opacity = '0.2'; }} />
                ) : (
                  <span className="text-2xl font-bold text-white/40">{match.away_team.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[13px] font-semibold text-white text-center leading-tight line-clamp-2 px-1">{match.away_team}</span>
            </div>
          </div>
        </header>

        {/* ── TAHMİNLER ── */}
        {(primaryBet || altBet) && (
          <section>
            <SectionLabel left="Tahminler" />
            <div className="premium-card rounded-[18px] divide-y divide-white/[0.05]">
              {primaryBet && <BetRow bet={primaryBet} category="Ana Tahmin" />}
              {altBet && <BetRow bet={altBet} category="Alternatif" />}
            </div>
          </section>
        )}

        {/* ── BEKLENEN GOL ── */}
        {aiAnalysis?.expectedGoalRange && (
          <section className="premium-card rounded-[18px] p-5 flex items-center justify-between">
            <span className="label-meta">Beklenen Gol Aralığı</span>
            <span className="font-serif-display italic text-[18px] text-white num-display">{aiAnalysis.expectedGoalRange}</span>
          </section>
        )}

        {/* ── UZMAN GÖRÜŞü ── */}
        {aiAnalysis?.expertTip && (
          <section>
            <SectionLabel left="Uzman Görüşü" />
            <div className="premium-card-elevated rounded-[18px] p-5">
              <p className="font-serif-display text-[17px] text-white/95 leading-[1.45] -tracking-[0.005em]">
                <span className="italic text-white/55">"</span>
                {aiAnalysis.expertTip}
                <span className="italic text-white/55">"</span>
              </p>
            </div>
          </section>
        )}

        {/* ── DETAYLI ANALİZ ── */}
        {aiAnalysis?.analysis && (
          <section>
            <button onClick={() => setShowAnalysis(!showAnalysis)} className="w-full flex items-center justify-between px-1 mb-3 group">
              <span className="label-meta">Detaylı Analiz</span>
              {showAnalysis
                ? <ChevronUp className="w-3.5 h-3.5 text-white/45 group-hover:text-white/75 transition-colors" strokeWidth={1.8} />
                : <ChevronDown className="w-3.5 h-3.5 text-white/45 group-hover:text-white/75 transition-colors" strokeWidth={1.8} />}
            </button>
            {showAnalysis && (
              <div className="premium-card rounded-[18px] p-5">
                <p className="text-[13.5px] text-white/75 leading-[1.65] font-light">{aiAnalysis.analysis}</p>
              </div>
            )}
          </section>
        )}

        {/* ── UZAK DURUN ── */}
        {aiAnalysis?.avoidBets && aiAnalysis.avoidBets.length > 0 && (
          <section>
            <button onClick={() => setShowAvoid(!showAvoid)} className="w-full flex items-center justify-between px-1 mb-3 group">
              <div className="flex items-center gap-2.5">
                <span className="label-meta">Uzak Durun</span>
                <span className="text-[10px] text-white/35 num-display">{aiAnalysis.avoidBets.length.toString().padStart(2, "0")}</span>
              </div>
              {showAvoid
                ? <ChevronUp className="w-3.5 h-3.5 text-white/45 group-hover:text-white/75 transition-colors" strokeWidth={1.8} />
                : <ChevronDown className="w-3.5 h-3.5 text-white/45 group-hover:text-white/75 transition-colors" strokeWidth={1.8} />}
            </button>
            {showAvoid && (
              <div className="premium-card rounded-[18px] divide-y divide-white/[0.05]">
                {aiAnalysis.avoidBets.map((bet, i) => {
                  const obj = typeof bet === "string" ? { bet, reason: "" } : (bet as any);
                  return (
                    <div key={i} className="px-5 py-4 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-serif-display italic text-[14px] text-white/90">{obj.bet || JSON.stringify(bet)}</span>
                        <span className="label-meta-sm text-white/30">Geç</span>
                      </div>
                      {obj.reason && <p className="text-[12px] text-white/45 leading-relaxed">{obj.reason}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {loadingAI && !aiAnalysis && (
          <div className="premium-card rounded-[18px] p-8 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border border-white/[0.10] border-t-white/60 animate-spin" />
            <p className="text-[12px] text-white/45 font-light">Analiz yükleniyor…</p>
          </div>
        )}

        {!loadingAI && !aiAnalysis && !primaryBet && !altBet && (
          <div className="premium-card rounded-[18px] p-8 text-center">
            <p className="font-serif-display text-[18px] text-white/75 italic mb-4">Analiz henüz hazır değil.</p>
            <button onClick={loadAI} className="px-5 py-2.5 rounded-full border border-white/[0.10] hover:border-white/[0.22] text-[12px] text-white/85 transition-colors">
              Tekrar dene
            </button>
          </div>
        )}

        <div className="text-center pt-2 pb-2">
          <span className="label-meta-sm font-serif-display italic text-white/30 normal-case tracking-normal">tutturduk · veri merkezi</span>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Helpers ── */

function PageShell({ children, onBack, league, leagueLogo }: {
  children: React.ReactNode;
  onBack?: () => void;
  league?: string;
  leagueLogo?: string;
}) {
  return (
    <div className="min-h-screen text-white font-sans" style={{ background: "#0a0a0c" }}>
      <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-2xl" style={{ background: "rgba(10,10,12,0.78)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="h-[58px] flex items-center justify-between px-5 max-w-[480px] mx-auto">
          <button onClick={onBack} className="h-9 w-9 rounded-full flex items-center justify-center border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] active:scale-95 transition-all">
            <ArrowLeft className="w-[15px] h-[15px] text-white/75" strokeWidth={1.8} />
          </button>
          <img src={logoLight} alt="tutturduk" className="h-6 w-auto object-contain opacity-90" />
          <div className="h-9 w-9" />
        </div>
        {league && (
          <div className="px-5 pb-2.5 max-w-[480px] mx-auto flex items-center justify-center gap-1.5">
            {leagueLogo && <img src={leagueLogo} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />}
            <p className="text-center text-[10px] text-white/40 truncate uppercase tracking-[0.16em] font-medium">{league}</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </header>
      <div className={league ? "h-[80px]" : "h-[58px]"} />
      <main className="px-5 pb-12 max-w-[480px] mx-auto animate-fade-in relative z-10">{children}</main>
    </div>
  );
}

function SectionLabel({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mb-3">
      <span className="label-meta">{left}</span>
      {right}
    </div>
  );
}

function BetRow({ bet, category }: { bet: PredictionItem; category: string }) {
  const riskLabel = bet.confidence >= 75 ? "Düşük Risk" : bet.confidence >= 70 ? "Orta Risk" : "Yüksek Risk";
  const pct = Math.min(100, Math.max(0, ((bet.confidence - 60) / 40) * 100));
  return (
    <div className="px-5 py-5">
      <div className="flex items-center justify-between mb-3">
        <span className="label-meta-sm">{category}</span>
        <span className="text-[10px] text-white/40 num-display tracking-wider">{riskLabel}</span>
      </div>
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-serif-display text-[24px] text-white italic -tracking-[0.01em] leading-none">{bet.bet_type}</span>
        <span className="num-display text-[20px] text-white leading-none">%{bet.confidence}</span>
      </div>
      {bet.odds && (
        <div className="flex items-center justify-between mb-3">
          <span className="label-meta-sm">Oran</span>
          <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl px-3 py-1.5 border border-white/[0.08]">
            <img src="/iddaa-logo.png" alt="iddaa" className="w-5 h-5 object-contain" />
            <span className="num-display text-[18px] font-bold text-white">{Number(bet.odds).toFixed(2)}</span>
            <span className="text-[9px] text-white/30 font-medium tracking-tight">iddaa.com</span>
          </div>
        </div>
      )}
      <div className="h-[2px] bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full bg-white/85 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-white/30 num-display">%70 eşik</span>
        <span className="text-[9px] text-white/30 num-display">%100</span>
      </div>
      {bet.reasoning && (
        <p className="text-[12.5px] text-white/55 leading-relaxed mt-4 pt-4 border-t border-white/[0.05] font-light">{bet.reasoning}</p>
      )}
    </div>
  );
}
