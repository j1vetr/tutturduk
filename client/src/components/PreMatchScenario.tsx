import { useEffect, useState } from "react";

interface ScenarioProps {
  homePercent: number;
  drawPercent: number;
  awayPercent: number;
  homeTeam: string;
  awayTeam: string;
  comparison?: {
    att?: { home: string; away: string };
    def?: { home: string; away: string };
    form?: { home: string; away: string };
    goals?: { home: string; away: string };
    h2h?: { home: string; away: string };
  };
  expectedGoalsHome?: string;
  expectedGoalsAway?: string;
  lineups?: { formation: string }[];
}

interface ScenarioData {
  title: string;
  titleTr: string;
  reasons: string[];
  chaos: number;
  chaosLabel: string;
  di: number;
  bal: number;
  gi: number;
  bi: number;
  sg: number;
  timeline: { s0_30: number; s30_60: number; s60_90: number };
  comparisonData: { label: string; home: number; away: number }[];
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function parsePercent(val?: string): number {
  if (!val) return 50;
  return parseInt(val.replace('%', '')) || 50;
}

function calculateScenario(props: ScenarioProps): ScenarioData {
  const P_home = props.homePercent / 100;
  const P_draw = props.drawPercent / 100;
  const P_away = props.awayPercent / 100;

  const DI = P_home - P_away;
  const BAL = 1 - Math.abs(DI);
  const DRW = P_draw;

  const expectedTotal = (parseFloat(props.expectedGoalsHome || '1') + parseFloat(props.expectedGoalsAway || '1'));
  const GI = clamp(expectedTotal / 3.2, 0, 1);
  const BI = clamp(0.5 * GI + 0.2 * BAL, 0, 1);

  const c = props.comparison || {};
  const GAP_attack = (parsePercent(c.att?.home) - parsePercent(c.att?.away)) / 100;
  const GAP_def = (parsePercent(c.def?.home) - parsePercent(c.def?.away)) / 100;
  const GAP_form = (parsePercent(c.form?.home) - parsePercent(c.form?.away)) / 100;
  const GAP_goals = (parsePercent(c.goals?.home) - parsePercent(c.goals?.away)) / 100;
  const SG = 0.35 * GAP_attack + 0.25 * GAP_def + 0.25 * GAP_form + 0.15 * GAP_goals;

  const Chaos = 100 * clamp(0.45 * BAL + 0.25 * BI + 0.20 * GI + 0.10 * DRW, 0, 1);
  let chaosLabel = "Düşük";
  if (Chaos >= 34 && Chaos < 67) chaosLabel = "Orta";
  if (Chaos >= 67) chaosLabel = "Yüksek";

  let title = "balanced";
  let titleTr = "Dengeli mücadele";

  if (Math.abs(DI) >= 0.25 && Math.abs(SG) >= 0.15) {
    title = "one-sided";
    titleTr = DI > 0 ? `${props.homeTeam} baskısı` : `${props.awayTeam} baskısı`;
  } else if (GI <= 0.45 && DRW >= 0.30) {
    title = "tight";
    titleTr = "Sıkı maç";
  } else if (GI >= 0.62) {
    if (BI >= 0.58) {
      title = "btts-goals";
      titleTr = "Karşılıklı gol beklentisi";
    } else {
      title = "goals-likely";
      titleTr = "Gollü maç beklentisi";
    }
  } else if (Math.abs(DI) < 0.15 && BAL > 0.85) {
    title = "balanced";
    titleTr = "Dengeli mücadele";
  } else if (Chaos >= 67 && Math.abs(DI) < 0.22) {
    title = "upset-prone";
    titleTr = "Sürpriz potansiyeli";
  }

  const reasons: string[] = [];
  if (Math.abs(DI) >= 0.25) reasons.push("Kazanma olasılıkları bir tarafa belirgin şekilde kayıyor.");
  if (GI >= 0.62) reasons.push("Gol beklentisi yüksek.");
  if (GI <= 0.45) reasons.push("Düşük skorlu maç profili öne çıkıyor.");
  if (BI >= 0.58) reasons.push("Her iki takımın da gol atması muhtemel.");
  if (Chaos >= 67) reasons.push("Olasılıklar birbirine yakın, sürpriz potansiyeli yüksek.");
  if (reasons.length === 0) reasons.push("Maç dengeli bir seyir izleyebilir.");

  const TEMPO = clamp(0.6 * GI + 0.4 * BI, 0, 1);
  const EARLY = clamp(0.55 * Math.abs(DI) + 0.25 * Math.abs(SG) - 0.20 * DRW, 0, 1);
  const s0_30 = 0.45 * TEMPO + 0.55 * EARLY;
  const s30_60 = 0.70 * TEMPO + 0.15 * EARLY + 0.15 * DRW;
  const s60_90 = 0.85 * TEMPO + 0.15 * (1 - EARLY);

  const comparisonData = [
    { label: "Form", home: parsePercent(c.form?.home), away: parsePercent(c.form?.away) },
    { label: "Atak", home: parsePercent(c.att?.home), away: parsePercent(c.att?.away) },
    { label: "Defans", home: parsePercent(c.def?.home), away: parsePercent(c.def?.away) },
    { label: "Gol", home: parsePercent(c.goals?.home), away: parsePercent(c.goals?.away) },
    { label: "H2H", home: parsePercent(c.h2h?.home), away: parsePercent(c.h2h?.away) },
  ];

  return {
    title, titleTr, reasons: reasons.slice(0, 3), chaos: Math.round(Chaos), chaosLabel,
    di: DI, bal: BAL, gi: GI, bi: BI, sg: SG,
    timeline: { s0_30, s30_60, s60_90 },
    comparisonData
  };
}

function getTimelineLabel(val: number): string {
  if (val < 0.40) return "Kontrollü";
  if (val <= 0.65) return "Dengeli";
  return "Yüksek tempo";
}

export function PreMatchScenario(props: ScenarioProps) {
  const [animated, setAnimated] = useState(false);
  const scenario = calculateScenario(props);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold mb-1">Maç senaryosu</div>
            <h3 className="text-lg font-bold text-white">{scenario.titleTr}</h3>
          </div>
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#27272a" strokeWidth="4" fill="none" />
              <circle 
                cx="32" cy="32" r="28" 
                stroke={scenario.chaos >= 67 ? "#f59e0b" : scenario.chaos >= 34 ? "#10b981" : "#3b82f6"}
                strokeWidth="4" 
                fill="none"
                strokeDasharray={`${animated ? (scenario.chaos / 100) * 176 : 0} 176`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-white">{scenario.chaos}</span>
              <span className="text-[8px] text-zinc-500">Kaos</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {scenario.reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span className="text-xs text-zinc-400">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Maç akışı tahmini</div>
        <div className="space-y-3">
          {[
            { label: "0-30 dk", value: scenario.timeline.s0_30 },
            { label: "30-60 dk", value: scenario.timeline.s30_60 },
            { label: "60-90 dk", value: scenario.timeline.s60_90 },
          ].map((segment, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-zinc-400">{segment.label}</span>
                <span className="text-[10px] text-zinc-500">{getTimelineLabel(segment.value)}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    segment.value > 0.65 ? 'bg-emerald-500' : segment.value >= 0.40 ? 'bg-emerald-600' : 'bg-emerald-700'
                  }`}
                  style={{ width: animated ? `${segment.value * 100}%` : '0%', transitionDelay: `${i * 150}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Takım DNA karşılaştırması</div>
        <div className="flex items-center justify-between mb-3 text-[10px]">
          <span className="text-emerald-400 font-medium">{props.homeTeam}</span>
          <span className="text-zinc-400 font-medium">{props.awayTeam}</span>
        </div>
        <div className="space-y-3">
          {scenario.comparisonData.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-emerald-400">{item.home}%</span>
                <span className="text-[10px] text-zinc-500">{item.label}</span>
                <span className="text-xs font-bold text-zinc-400">{item.away}%</span>
              </div>
              <div className="flex gap-1">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
                  <div 
                    className="bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: animated ? `${item.home}%` : '0%', transitionDelay: `${i * 100}ms` }}
                  />
                </div>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="bg-zinc-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: animated ? `${item.away}%` : '0%', transitionDelay: `${i * 100}ms` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
