export interface TeamStats {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  last5: ("W" | "D" | "L")[];
}

export interface Prediction {
  id: string;
  league: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  prediction: string;
  odds: number;
  confidence: "low" | "medium" | "high";
  status: "pending" | "won" | "lost";
  comment?: string;
  analysis?: string;
  homeStats?: TeamStats;
  awayStats?: TeamStats;
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
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    date: "Bugün",
    time: "22:00",
    prediction: "KG Var",
    odds: 1.65,
    confidence: "high",
    status: "pending",
    comment: "Liverpool deplasmanda gol bulur, City evinde boş geçmez.",
    analysis: "İki takım arasındaki son 5 maçın 4'ünde karşılıklı goller atıldı. City evinde oynadığı son 20 maçta gol atmayı başardı. Liverpool ise Salah önderliğinde ligin en çok gol pozisyonuna giren takımı. Erken bir gol maçı çok açık bir hale getirecektir.",
    homeStats: { wins: 15, draws: 3, losses: 2, goalsFor: 45, goalsAgainst: 18, last5: ["W", "W", "D", "W", "L"] },
    awayStats: { wins: 14, draws: 4, losses: 2, goalsFor: 42, goalsAgainst: 20, last5: ["W", "D", "W", "W", "W"] }
  },
  {
    id: "2",
    league: "La Liga",
    match: "Real Madrid - Barcelona",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    date: "Bugün",
    time: "23:00",
    prediction: "MS 1",
    odds: 2.10,
    confidence: "medium",
    status: "pending",
    comment: "El Clasico'da ev sahibi avantajı ağır basıyor.",
    analysis: "Bernabeu'da oynanan son 3 El Clasico'yu Real Madrid kazandı. Barcelona'nın savunma zaafiyetleri ve sakat oyuncuları (Gavi, Pedri) bu maçta belirleyici olacak. Real Madrid'in orta saha dinamizmi maçı domine etmelerini sağlayacaktır.",
    homeStats: { wins: 18, draws: 1, losses: 1, goalsFor: 48, goalsAgainst: 12, last5: ["W", "W", "W", "W", "D"] },
    awayStats: { wins: 16, draws: 3, losses: 1, goalsFor: 40, goalsAgainst: 15, last5: ["W", "W", "D", "W", "W"] }
  },
  {
    id: "3",
    league: "Süper Lig",
    match: "Galatasaray - Fenerbahçe",
    homeTeam: "Galatasaray",
    awayTeam: "Fenerbahçe",
    date: "Yarın",
    time: "19:00",
    prediction: "2.5 Üst",
    odds: 1.85,
    confidence: "high",
    status: "pending",
    comment: "Derbi atmosferi yüksek skorlu bir maça işaret ediyor.",
    analysis: "Ligin en çok gol atan iki takımı karşılaşıyor. Icardi ve Dzeko formda. İki takımın da savunma hatlarında bireysel hatalar görüyoruz. Erken gol kilidi açar ve maç 3-4 gole rahat gider.",
    homeStats: { wins: 20, draws: 1, losses: 0, goalsFor: 55, goalsAgainst: 10, last5: ["W", "W", "W", "W", "W"] },
    awayStats: { wins: 19, draws: 2, losses: 0, goalsFor: 58, goalsAgainst: 14, last5: ["W", "W", "W", "D", "W"] }
  },
  {
    id: "4",
    league: "Bundesliga",
    match: "Bayern Munich - Dortmund",
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    date: "Dün",
    time: "20:30",
    prediction: "MS 1 & 3.5 Üst",
    odds: 2.40,
    confidence: "high",
    status: "won",
    comment: "Bayern evinde şov yaptı.",
    analysis: "Bayern Münih, Der Klassiker'de evinde Dortmund'a karşı büyük üstünlük kuruyor. Son 5 iç saha maçında Dortmund'a ortalama 3 gol attılar.",
    homeStats: { wins: 14, draws: 2, losses: 4, goalsFor: 50, goalsAgainst: 25, last5: ["L", "W", "W", "L", "W"] },
    awayStats: { wins: 10, draws: 6, losses: 4, goalsFor: 38, goalsAgainst: 30, last5: ["D", "W", "D", "L", "W"] }
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
