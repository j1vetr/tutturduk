import { useEffect, useState } from "react";
import { calculateScenario, getChaosColor, getConfidenceColor, getTimelineLabel, type ScenarioInput } from "@/lib/scenarioEngine";

interface ScenarioProps extends ScenarioInput {}

function RadarChart({ data, animProgress }: { 
  data: { stat: string; home: number; away: number }[]; 
  animProgress: number;
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
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const getLabelPoint = (index: number) => {
    const angle = startAngle + index * angleStep;
    const r = maxRadius + 15;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
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
        return <line key={i} x1={cx} y1={cy} x2={cx + maxRadius * Math.cos(angle)} y2={cy + maxRadius * Math.sin(angle)} stroke="#3f3f46" strokeWidth="1" />;
      })}
      <path d={homePath} fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="2" />
      <path d={awayPath} fill="#a1a1aa" fillOpacity="0.2" stroke="#a1a1aa" strokeWidth="2" />
      {data.map((d, i) => {
        const { x, y } = getLabelPoint(i);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-[10px]">{d.stat}</text>;
      })}
    </svg>
  );
}

export function PreMatchScenario(props: ScenarioProps) {
  const [animated, setAnimated] = useState(false);
  const [radarAnimProgress, setRadarAnimProgress] = useState(0);
  const [whatIf, setWhatIf] = useState<'home_early' | 'away_early' | 'ht_0_0' | undefined>(undefined);

  const scenario = calculateScenario(props, whatIf);

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
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">Maç senaryosu</span>
              {whatIf && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Simülasyon</span>}
            </div>
            <h3 className="text-lg font-bold text-white">{scenario.scenarioTitle}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-zinc-500">Güven:</span>
              <span className="text-[10px] font-bold" style={{ color: getConfidenceColor(scenario.confidence) }}>
                {scenario.confidenceLabel}
              </span>
            </div>
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
        <div className="space-y-2 mb-4">
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
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    segment.value > 0.65 ? 'bg-emerald-500' : segment.value >= 0.40 ? 'bg-emerald-600' : 'bg-emerald-700'
                  }`}
                  style={{ width: `${segment.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">What-if senaryoları</div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'home_early' as const, label: 'Ev erken gol' },
              { key: 'away_early' as const, label: 'Dep. erken gol' },
              { key: 'ht_0_0' as const, label: 'İY 0-0' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setWhatIf(whatIf === item.key ? undefined : item.key)}
                className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                  whatIf === item.key 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
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
              <RadarChart data={scenario.radarData} animProgress={radarAnimProgress} />
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
