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
  over25Percent?: number;
  bttsYesPercent?: number;
  homeFormation?: string;
  awayFormation?: string;
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
  radarData: { stat: string; home: number; away: number }[];
  hasComparisonData: boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function parsePercent(val?: string): number | null {
  if (!val) return null;
  const parsed = parseInt(val.replace('%', ''));
  return isNaN(parsed) ? null : parsed;
}

function getFormationTempoAdjust(formation?: string): { adjust: number; reason?: string } {
  if (!formation) return { adjust: 0 };
  const f = formation.trim();
  if (f === '5-4-1' || f === '5-3-2') {
    return { adjust: -0.08, reason: "Diziliş temkinli bir yaklaşımı destekliyor." };
  }
  if (f === '4-3-3' || f === '3-4-3') {
    return { adjust: 0.05, reason: "Diziliş ofansif bir yaklaşımı destekliyor." };
  }
  return { adjust: 0 };
}

function calculateScenario(props: ScenarioProps): ScenarioData {
  const P_home = props.homePercent / 100;
  const P_draw = props.drawPercent / 100;
  const P_away = props.awayPercent / 100;

  const DI = P_home - P_away;
  const BAL = 1 - Math.abs(DI);
  const DRW = P_draw;

  let GI: number;
  if (props.over25Percent !== undefined && props.over25Percent > 0) {
    GI = props.over25Percent / 100;
  } else {
    const expectedTotal = (parseFloat(props.expectedGoalsHome || '1') + parseFloat(props.expectedGoalsAway || '1'));
    GI = clamp(expectedTotal / 3.2, 0, 1);
  }

  let BI: number;
  if (props.bttsYesPercent !== undefined && props.bttsYesPercent > 0) {
    BI = props.bttsYesPercent / 100;
  } else {
    BI = clamp(0.5 * GI + 0.2 * BAL, 0, 1);
  }

  const c = props.comparison || {};
  const attHome = parsePercent(c.att?.home);
  const attAway = parsePercent(c.att?.away);
  const defHome = parsePercent(c.def?.home);
  const defAway = parsePercent(c.def?.away);
  const formHome = parsePercent(c.form?.home);
  const formAway = parsePercent(c.form?.away);
  const goalsHome = parsePercent(c.goals?.home);
  const goalsAway = parsePercent(c.goals?.away);
  const h2hHome = parsePercent(c.h2h?.home);
  const h2hAway = parsePercent(c.h2h?.away);

  const hasComparisonData = attHome !== null && defHome !== null && formHome !== null;

  let SG = 0;
  if (hasComparisonData) {
    const GAP_attack = ((attHome || 50) - (attAway || 50)) / 100;
    const GAP_def = ((defHome || 50) - (defAway || 50)) / 100;
    const GAP_form = ((formHome || 50) - (formAway || 50)) / 100;
    const GAP_goals = ((goalsHome || 50) - (goalsAway || 50)) / 100;
    SG = 0.35 * GAP_attack + 0.25 * GAP_def + 0.25 * GAP_form + 0.15 * GAP_goals;
  }

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

  const homeFormationTweak = getFormationTempoAdjust(props.homeFormation);
  const awayFormationTweak = getFormationTempoAdjust(props.awayFormation);
  if (homeFormationTweak.reason) reasons.push(homeFormationTweak.reason);
  else if (awayFormationTweak.reason) reasons.push(awayFormationTweak.reason);

  if (reasons.length === 0) reasons.push("Maç dengeli bir seyir izleyebilir.");

  let TEMPO = clamp(0.6 * GI + 0.4 * BI, 0, 1);
  TEMPO = clamp(TEMPO + homeFormationTweak.adjust + awayFormationTweak.adjust, 0, 1);

  const EARLY = clamp(0.55 * Math.abs(DI) + 0.25 * Math.abs(SG) - 0.20 * DRW, 0, 1);
  const s0_30 = 0.45 * TEMPO + 0.55 * EARLY;
  const s30_60 = 0.70 * TEMPO + 0.15 * EARLY + 0.15 * DRW;
  const s60_90 = 0.85 * TEMPO + 0.15 * (1 - EARLY);

  const radarData = [
    { stat: "Form", home: formHome ?? 0, away: formAway ?? 0 },
    { stat: "Atak", home: attHome ?? 0, away: attAway ?? 0 },
    { stat: "Defans", home: defHome ?? 0, away: defAway ?? 0 },
    { stat: "Gol", home: goalsHome ?? 0, away: goalsAway ?? 0 },
    { stat: "H2H", home: h2hHome ?? 0, away: h2hAway ?? 0 },
  ];

  return {
    title, titleTr, reasons: reasons.slice(0, 3), chaos: Math.round(Chaos), chaosLabel,
    di: DI, bal: BAL, gi: GI, bi: BI, sg: SG,
    timeline: { s0_30, s30_60, s60_90 },
    radarData,
    hasComparisonData
  };
}

function getTimelineLabel(val: number): string {
  if (val < 0.40) return "Kontrollü";
  if (val <= 0.65) return "Dengeli";
  return "Yüksek tempo";
}

function getChaosColor(chaos: number): string {
  if (chaos >= 67) return "#ef4444";
  if (chaos >= 34) return "#f59e0b";
  return "#10b981";
}

function RadarChart({ data, animProgress, homeTeam, awayTeam }: { 
  data: { stat: string; home: number; away: number }[]; 
  animProgress: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const cx = 100;
  const cy = 100;
  const maxRadius = 70;
  const levels = 5;
  const angleStep = (2 * Math.PI) / data.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 100) * maxRadius * animProgress;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = startAngle + index * angleStep;
    const r = maxRadius + 15;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const homePoints = data.map((d, i) => getPoint(i, d.home));
  const awayPoints = data.map((d, i) => getPoint(i, d.away));

  const homePath = homePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  const awayPath = awayPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {[...Array(levels)].map((_, i) => {
        const r = ((i + 1) / levels) * maxRadius;
        const points = data.map((_, j) => {
          const angle = startAngle + j * angleStep;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={i} points={points} fill="none" stroke="#3f3f46" strokeWidth="1" />;
      })}

      {data.map((_, i) => {
        const angle = startAngle + i * angleStep;
        const x2 = cx + maxRadius * Math.cos(angle);
        const y2 = cy + maxRadius * Math.sin(angle);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#3f3f46" strokeWidth="1" />;
      })}

      <path 
        d={homePath} 
        fill="#10b981" 
        fillOpacity="0.3" 
        stroke="#10b981" 
        strokeWidth="2"
        className="transition-all duration-500"
      />
      <path 
        d={awayPath} 
        fill="#a1a1aa" 
        fillOpacity="0.2" 
        stroke="#a1a1aa" 
        strokeWidth="2"
        className="transition-all duration-500"
      />

      {data.map((d, i) => {
        const { x, y } = getLabelPoint(i);
        return (
          <text 
            key={i} 
            x={x} 
            y={y} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            className="fill-zinc-500 text-[10px]"
          >
            {d.stat}
          </text>
        );
      })}
    </svg>
  );
}

export function PreMatchScenario(props: ScenarioProps) {
  const [animated, setAnimated] = useState(false);
  const [radarAnimProgress, setRadarAnimProgress] = useState(0);
  const scenario = calculateScenario(props);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!animated) return;
    let frame = 0;
    const totalFrames = 30;
    const interval = setInterval(() => {
      frame++;
      setRadarAnimProgress(frame / totalFrames);
      if (frame >= totalFrames) clearInterval(interval);
    }, 33);
    return () => clearInterval(interval);
  }, [animated]);

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
                stroke={getChaosColor(scenario.chaos)}
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
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Senaryo DNA</div>
        {scenario.hasComparisonData ? (
          <>
            <div className="flex items-center justify-center gap-6 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-zinc-400">{props.homeTeam}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-zinc-400" />
                <span className="text-[10px] text-zinc-400">{props.awayTeam}</span>
              </div>
            </div>
            <div className="h-48">
              <RadarChart 
                data={scenario.radarData} 
                animProgress={radarAnimProgress}
                homeTeam={props.homeTeam}
                awayTeam={props.awayTeam}
              />
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-500">Karşılaştırma verisi mevcut değil</p>
            <p className="text-xs text-zinc-600 mt-1">Maç yaklaştıkça veriler güncellenebilir</p>
          </div>
        )}
      </div>
    </div>
  );
}
