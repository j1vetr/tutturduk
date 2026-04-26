// ============================================================
// PREDICTION SYSTEM — Tek Doğruluk Kaynağı
// FAZ 1-4 refactor sonrası tüm eşikler ve sabitler burada.
// Kodda hard-coded değer KOYMAYIN — buradan import edin.
// ============================================================

// ─── GÜNLÜK YAYINLAMA LİMİTLERİ ──────────────────────────────
// Multi-pass cron (01:00 / 10:00 / 14:00 / 17:00) toplamda bu cap'e kadar yayın yapar.
export const MAX_DAILY_MATCHES = 40;
export const MAX_PREFETCH_BUFFER = 80;

// ─── MULTI-PASS YAYIN GEÇİŞ SAATLERİ (Türkiye) ───────────────
// Pass 1: gece — tüm gün taranır (sabah/öğle maçlarının oranları hazırdır).
// Pass 2-4: o saatten itibaren başlayacak maçlara odaklanır (oranlar gün içinde açıldıkça).
// futureOnlyMinutes: pass başlangıcına bu kadar dk kala başlayacak maçlar elenir (oranı stabilize olmamış olabilir).
export const PUBLISH_PASSES = [
  { hour: 1,  label: '1/4 (01:00)', futureOnlyMinutes: null, refreshCache: false },
  { hour: 10, label: '2/4 (10:00)', futureOnlyMinutes: 5,    refreshCache: true  },
  { hour: 14, label: '3/4 (14:00)', futureOnlyMinutes: 5,    refreshCache: true  },
  { hour: 17, label: '4/4 (17:00)', futureOnlyMinutes: 5,    refreshCache: true  },
] as const;

// Coupon scheduler: Pass 4 (17:00 başlar, 15-30 dk sürebilir) bittikten güvenli aralıkla sonra 18:30'da çalışır.
// Ek koruma: scheduler advisory lock'u test eder; pass hâlâ çalışıyorsa retry yapar.
export const COUPON_SCHEDULE_HOUR = 18;
export const COUPON_SCHEDULE_MINUTE = 30;

// ─── İSTATİSTİK KALİTE EŞİĞİ ─────────────────────────────────
export const MIN_STATS_SCORE = 35;

// ─── ODDS SWEET SPOT (Erken-elek için) ───────────────────────
export const ODDS_SWEET_MIN = 1.55;
export const ODDS_SWEET_MAX = 2.20;

// ─── BAHİS KALİTE EŞİKLERİ ───────────────────────────────────
export const MIN_ODDS = 1.40;
export const MIN_VALUE_PERCENT = 0.05;
export const MIN_CONFIDENCE = 70;
export const RISK_LOW_CONFIDENCE = 75;

// Düşük oran (1.40-1.49) için sıkı eşikler
export const LOW_ODDS_THRESHOLD = 1.50;
export const LOW_ODDS_MIN_EDGE = 0.08;
export const LOW_ODDS_MIN_CONFIDENCE = 75;

// ─── AI ÇAĞRILARI ────────────────────────────────────────────
export const AI_BATCH_SIZE = 5;
export const AI_BATCH_DELAY_MS = 1500;

// ─── ODDS REFRESH (FAZ 4.1) ──────────────────────────────────
// Maç başlamadan önce sweet-spot içindeki maçların oranlarını yenile.
export const ODDS_REFRESH_LOOKAHEAD_MAX = 180;      // Lookahead penceresi: 180 dk (3 saat)
export const ODDS_REFRESH_DRIFT_THRESHOLD = 0.10;   // %10 oran kayması → AI re-run
export const ODDS_REFRESH_TICK_MS = 30 * 60 * 1000; // Cron tick: 30 dk

// ─── POISSON / xG (FAZ 4) ────────────────────────────────────
export const HOME_ADVANTAGE_FACTOR = 1.10;
export const LEAGUE_AVG_GOALS = 2.65;

// ─── DÜŞÜK GOL ORTALAMALI LİGLER (FAZ 3) ─────────────────────
// Bu liglerde 2.5 Üst yerine 1.5 Üst / 2.5 Alt tercih edilir.
export const LOW_SCORING_LEAGUE_IDS = new Set<number>([
  197,
  286,
  106,
  119,
  113,
  103,
  207,
  235,
  244,
  281,
  292,
  140,
]);

export const LOW_SCORING_LEAGUE_KEYWORDS = [
  'super league greece',
  'super lig greece',
  'serbia',
  'srbija',
  'norway',
  'norwegen',
  'sweden',
  'allsvenskan',
  'denmark',
  'finland',
  'veikkausliiga',
  'ireland',
  'iceland',
  'estonia',
  'latvia',
  'lithuania',
  'mls',
];

export function isLowScoringLeague(leagueId?: number, leagueName?: string): boolean {
  if (leagueId && LOW_SCORING_LEAGUE_IDS.has(leagueId)) return true;
  if (leagueName) {
    const lower = leagueName.toLowerCase();
    return LOW_SCORING_LEAGUE_KEYWORDS.some(k => lower.includes(k));
  }
  return false;
}

// ─── KORELASYON MATRİSİ (FAZ 3) ──────────────────────────────
// Pozitif korelasyon = aynı senaryoda her iki bahis de tutar.
// Bunları kupona koymak diversifikasyon değil, çift bahis demek.
const POSITIVE_CORRELATIONS: Record<string, string[]> = {
  '2.5 ust':   ['kg var', '1.5 ust', '3.5 ust', '0.5 ust'],
  '1.5 ust':   ['2.5 ust', 'kg var', '0.5 ust'],
  '3.5 ust':   ['2.5 ust', 'kg var', '1.5 ust'],
  'kg var':    ['2.5 ust', '1.5 ust', '3.5 ust'],
  '2.5 alt':   ['kg yok', '1.5 alt', '0.5 alt'],
  '1.5 alt':   ['2.5 alt', 'kg yok', '0.5 alt'],
  'kg yok':    ['2.5 alt', '1.5 alt'],
  'ms1':       ['1x', '12', 'dnb ev'],
  'ms2':       ['x2', '12', 'dnb dep'],
  'msx':       ['1x', 'x2'],
  '1x':        ['ms1', 'dnb ev'],
  'x2':        ['ms2', 'dnb dep'],
  '12':        ['ms1', 'ms2'],
  'dnb ev':    ['ms1', '1x'],
  'dnb dep':   ['ms2', 'x2'],
};

function normalizeBetKey(bet: string): string {
  return bet
    .toLowerCase()
    .trim()
    .replace(/ü/g, 'u')
    .replace(/i̇/g, 'i')
    .replace(/[ı]/g, 'i')
    .replace(/[ş]/g, 's')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ö]/g, 'o')
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ');
}

export function arePositivelyCorrelated(primaryBet: string, alternativeBet: string): boolean {
  const p = normalizeBetKey(primaryBet);
  const a = normalizeBetKey(alternativeBet);
  if (p === a) return true;
  for (const [key, correlated] of Object.entries(POSITIVE_CORRELATIONS)) {
    if (p.includes(key)) {
      if (correlated.some(c => a.includes(c))) return true;
    }
  }
  return false;
}
