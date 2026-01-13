import { useEffect, useState } from "react";

interface FormTrendProps {
  homeTeam: string;
  awayTeam: string;
  homeForm?: string;
  awayForm?: string;
}

function getFormPoints(form?: string): number[] {
  if (!form) return [];
  return form.split('').slice(-10).map(r => {
    const letter = r.toUpperCase();
    if (letter === 'W' || letter === 'G') return 3;
    if (letter === 'D' || letter === 'B') return 1;
    if (letter === 'L' || letter === 'M') return 0;
    return 0;
  });
}

function Sparkline({ data, color, animated }: { data: number[]; color: string; animated: boolean }) {
  if (data.length === 0) return null;

  const max = 3;
  const width = 100;
  const height = 24;
  const padding = 2;
  const step = (width - padding * 2) / (data.length - 1 || 1);

  const points = data.map((val, i) => ({
    x: padding + i * step,
    y: height - padding - (val / max) * (height - padding * 2)
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-6">
      <path 
        d={pathData} 
        fill="none" 
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? "200" : "0"}
        strokeDashoffset={animated ? "0" : "0"}
        className="transition-all duration-1000"
        style={{ 
          strokeDasharray: 200,
          strokeDashoffset: animated ? 0 : 200,
          transition: 'stroke-dashoffset 1s ease-out'
        }}
      />
      {points.map((p, i) => (
        <circle 
          key={i} 
          cx={p.x} 
          cy={p.y} 
          r="2" 
          fill={color}
          className={animated ? 'opacity-100' : 'opacity-0'}
          style={{ transition: `opacity 0.3s ease-out ${i * 0.1}s` }}
        />
      ))}
    </svg>
  );
}

export function FormTrendGraph({ homeTeam, awayTeam, homeForm, awayForm }: FormTrendProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const homePoints = getFormPoints(homeForm);
  const awayPoints = getFormPoints(awayForm);

  if (homePoints.length < 3 && awayPoints.length < 3) return null;

  const homeTotal = homePoints.reduce((a, b) => a + b, 0);
  const awayTotal = awayPoints.reduce((a, b) => a + b, 0);
  const homeAvg = homePoints.length > 0 ? (homeTotal / homePoints.length).toFixed(1) : '-';
  const awayAvg = awayPoints.length > 0 ? (awayTotal / awayPoints.length).toFixed(1) : '-';

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Form Trend (Son 10 Maç)</div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-20 text-xs text-white font-medium truncate">{homeTeam}</div>
          <div className="flex-1">
            <Sparkline data={homePoints} color="#10b981" animated={animated} />
          </div>
          <div className="text-xs text-emerald-400 font-bold w-8 text-right">{homeAvg}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-20 text-xs text-zinc-400 font-medium truncate">{awayTeam}</div>
          <div className="flex-1">
            <Sparkline data={awayPoints} color="#a1a1aa" animated={animated} />
          </div>
          <div className="text-xs text-zinc-400 font-bold w-8 text-right">{awayAvg}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-[9px] text-zinc-600">
        <span>G=3 puan, B=1 puan, M=0 puan</span>
        <span>Ort. puan/maç</span>
      </div>
    </div>
  );
}
