export interface Prediction {
  id: string;
  league: string;
  match: string;
  date: string;
  time: string;
  prediction: string;
  odds: number;
  confidence: "low" | "medium" | "high";
  status: "pending" | "won" | "lost";
  comment?: string;
}

export interface Coupon {
  id: string;
  title: string;
  date: string;
  totalOdds: number;
  status: "won" | "lost";
  matches: string[];
  imageUrl?: string;
}

export const MOCK_PREDICTIONS: Prediction[] = [
  {
    id: "1",
    league: "Premier League",
    match: "Manchester City - Liverpool",
    date: "Bugün",
    time: "22:00",
    prediction: "KG Var",
    odds: 1.65,
    confidence: "high",
    status: "pending",
    comment: "Liverpool deplasmanda gol bulur, City evinde boş geçmez."
  },
  {
    id: "2",
    league: "La Liga",
    match: "Real Madrid - Barcelona",
    date: "Bugün",
    time: "23:00",
    prediction: "MS 1",
    odds: 2.10,
    confidence: "medium",
    status: "pending",
    comment: "El Clasico'da ev sahibi avantajı ağır basıyor."
  },
  {
    id: "3",
    league: "Süper Lig",
    match: "Galatasaray - Fenerbahçe",
    date: "Yarın",
    time: "19:00",
    prediction: "2.5 Üst",
    odds: 1.85,
    confidence: "high",
    status: "pending",
    comment: "Derbi atmosferi yüksek skorlu bir maça işaret ediyor."
  },
  {
    id: "4",
    league: "Bundesliga",
    match: "Bayern Munich - Dortmund",
    date: "Dün",
    time: "20:30",
    prediction: "MS 1 & 3.5 Üst",
    odds: 2.40,
    confidence: "high",
    status: "won",
    comment: "Bayern evinde şov yaptı."
  }
];

export const MOCK_COUPONS: Coupon[] = [
  {
    id: "1",
    title: "Haftasonu Kazananı",
    date: "12 Aralık 2025",
    totalOdds: 12.45,
    status: "won",
    matches: ["Man Utd - Chelsea (MS 0)", "Milan - Inter (KG Var)", "Lyon - PSG (2.5 Üst)"]
  },
  {
    id: "2",
    title: "Sürpriz Kupon",
    date: "10 Aralık 2025",
    totalOdds: 45.20,
    status: "won",
    matches: ["Lille - Lens (MS 1)", "Sevilla - Betis (MS 0)", "Ajax - Feyenoord (KG Var)"]
  }
];
