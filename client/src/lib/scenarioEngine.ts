export interface ScenarioInput {
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

export interface ScenarioResult {
  scenarioKey: string;
  scenarioTitle: string;
  badges: string[];
  chaos: number;
  chaosLabel: string;
  confidence: number;
  confidenceLabel: string;
  di: number;
  bal: number;
  gi: number;
  bi: number;
  sg: number;
  drw: number;
  timeline: { s0_30: number; s30_60: number; s60_90: number };
  reasons: string[];
  hasComparisonData: boolean;
  radarData: { stat: string; home: number; away: number }[];
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

export function calculateScenario(input: ScenarioInput, whatIf?: 'home_early' | 'away_early' | 'ht_0_0'): ScenarioResult {
  const P_home = input.homePercent / 100;
  const P_draw = input.drawPercent / 100;
  const P_away = input.awayPercent / 100;

  let DI = P_home - P_away;
  let BAL = 1 - Math.abs(DI);
  const DRW = P_draw;

  let GI: number;
  if (input.over25Percent !== undefined && input.over25Percent > 0) {
    GI = input.over25Percent / 100;
  } else {
    const expectedTotal = (parseFloat(input.expectedGoalsHome || '1') + parseFloat(input.expectedGoalsAway || '1'));
    GI = clamp(expectedTotal / 3.2, 0, 1);
  }

  let BI: number;
  if (input.bttsYesPercent !== undefined && input.bttsYesPercent > 0) {
    BI = input.bttsYesPercent / 100;
  } else {
    BI = clamp(0.5 * GI + 0.2 * BAL, 0, 1);
  }

  const c = input.comparison || {};
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

  let confidenceScore = 60;
  if ((DI > 0 && SG > 0) || (DI < 0 && SG < 0)) confidenceScore += 20;
  if (Math.abs(DI) >= 0.25) confidenceScore += 10;
  if (Chaos >= 67) confidenceScore -= 15;
  confidenceScore = clamp(confidenceScore, 0, 100);

  let confidenceLabel = "Düşük";
  if (confidenceScore >= 40 && confidenceScore < 70) confidenceLabel = "Orta";
  if (confidenceScore >= 70) confidenceLabel = "Yüksek";

  let scenarioKey = "balanced";
  let scenarioTitle = "Dengeli mücadele";
  const badges: string[] = [];

  if (Math.abs(DI) >= 0.25 && Math.abs(SG) >= 0.15) {
    scenarioKey = "one-sided";
    scenarioTitle = DI > 0 ? `${input.homeTeam} baskısı` : `${input.awayTeam} baskısı`;
    badges.push("Tek Taraflı");
  } else if (GI <= 0.45 && DRW >= 0.30) {
    scenarioKey = "tight";
    scenarioTitle = "Sıkı maç";
    badges.push("Kilit Maç");
  } else if (GI >= 0.62) {
    if (BI >= 0.58) {
      scenarioKey = "btts-goals";
      scenarioTitle = "Karşılıklı gol beklentisi";
      badges.push("Gollü Maç");
    } else {
      scenarioKey = "goals-likely";
      scenarioTitle = "Gollü maç beklentisi";
      badges.push("Gollü Maç");
    }
  } else if (Math.abs(DI) < 0.15 && BAL > 0.85) {
    scenarioKey = "balanced";
    scenarioTitle = "Dengeli mücadele";
    badges.push("Dengeli");
  } else if (Chaos >= 67 && Math.abs(DI) < 0.22) {
    scenarioKey = "upset-prone";
    scenarioTitle = "Sürpriz potansiyeli";
    badges.push("Sürprize Açık");
  } else {
    badges.push("Dengeli");
  }

  if (GI >= 0.62 && !badges.includes("Gollü Maç")) badges.push("Gollü Maç");
  if (GI <= 0.45 && !badges.includes("Kilit Maç")) badges.push("Kilit Maç");

  const reasons: string[] = [];
  if (Math.abs(DI) >= 0.25) reasons.push("Kazanma olasılıkları bir tarafa belirgin şekilde kayıyor.");
  if (GI >= 0.62) reasons.push("Gol beklentisi yüksek.");
  if (GI <= 0.45) reasons.push("Düşük skorlu maç profili öne çıkıyor.");
  if (BI >= 0.58) reasons.push("Her iki takımın da gol atması muhtemel.");
  if (Chaos >= 67) reasons.push("Olasılıklar birbirine yakın, sürpriz potansiyeli yüksek.");

  const homeFormationTweak = getFormationTempoAdjust(input.homeFormation);
  const awayFormationTweak = getFormationTempoAdjust(input.awayFormation);
  if (homeFormationTweak.reason) reasons.push(homeFormationTweak.reason);
  else if (awayFormationTweak.reason) reasons.push(awayFormationTweak.reason);

  if (reasons.length === 0) reasons.push("Maç dengeli bir seyir izleyebilir.");

  let TEMPO = clamp(0.6 * GI + 0.4 * BI, 0, 1);
  TEMPO = clamp(TEMPO + homeFormationTweak.adjust + awayFormationTweak.adjust, 0, 1);

  let EARLY = clamp(0.55 * Math.abs(DI) + 0.25 * Math.abs(SG) - 0.20 * DRW, 0, 1);

  if (whatIf === 'home_early') {
    EARLY = clamp(EARLY + 0.12, 0, 1);
    BAL = clamp(BAL - 0.05, 0, 1);
  } else if (whatIf === 'away_early') {
    EARLY = clamp(EARLY + 0.10, 0, 1);
    BAL = clamp(BAL - 0.05, 0, 1);
  } else if (whatIf === 'ht_0_0') {
    GI = clamp(GI - 0.08, 0, 1);
  }

  let s0_30 = 0.45 * TEMPO + 0.55 * EARLY;
  let s30_60 = 0.70 * TEMPO + 0.15 * EARLY + 0.15 * DRW;
  let s60_90 = 0.85 * TEMPO + 0.15 * (1 - EARLY);

  if (whatIf === 'ht_0_0') {
    s60_90 = clamp(s60_90 + 0.10, 0, 1);
  }

  const radarData = [
    { stat: "Form", home: formHome ?? 0, away: formAway ?? 0 },
    { stat: "Atak", home: attHome ?? 0, away: attAway ?? 0 },
    { stat: "Defans", home: defHome ?? 0, away: defAway ?? 0 },
    { stat: "Gol", home: goalsHome ?? 0, away: goalsAway ?? 0 },
    { stat: "H2H", home: h2hHome ?? 0, away: h2hAway ?? 0 },
  ];

  return {
    scenarioKey,
    scenarioTitle,
    badges: badges.slice(0, 2),
    chaos: Math.round(Chaos),
    chaosLabel,
    confidence: Math.round(confidenceScore),
    confidenceLabel,
    di: DI,
    bal: BAL,
    gi: GI,
    bi: BI,
    sg: SG,
    drw: DRW,
    timeline: { s0_30, s30_60, s60_90 },
    reasons: reasons.slice(0, 3),
    hasComparisonData,
    radarData
  };
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "#10b981";
  if (confidence >= 40) return "#f59e0b";
  return "#ef4444";
}

export function getChaosColor(chaos: number): string {
  if (chaos >= 67) return "#ef4444";
  if (chaos >= 34) return "#f59e0b";
  return "#10b981";
}

export function getTimelineLabel(val: number): string {
  if (val < 0.40) return "Kontrollü";
  if (val <= 0.65) return "Dengeli";
  return "Yüksek tempo";
}
