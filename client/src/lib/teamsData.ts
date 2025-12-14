export type League = {
  id: string;
  name: string;
  logo: string;
};

export type Team = {
  id: string;
  name: string;
  logo: string;
  leagueId: string;
};

export const leagues: League[] = [
  { 
    id: "pl", 
    name: "Premier League", 
    logo: "https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg" 
  },
  { 
    id: "laliga", 
    name: "La Liga", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/LaLiga_logo_2023.svg/1200px-LaLiga_logo_2023.svg.png" 
  },
  { 
    id: "bundesliga", 
    name: "Bundesliga", 
    logo: "https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg" 
  },
  { 
    id: "seriea", 
    name: "Serie A", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Serie_A_logo_2019.svg" 
  },
  { 
    id: "superlig", 
    name: "Süper Lig", 
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/S%C3%BCper_Lig_logo.svg/800px-S%C3%BCper_Lig_logo.svg.png" 
  }
];

export const teams: Team[] = [
  // Premier League
  { id: "ars", name: "Arsenal", logo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg", leagueId: "pl" },
  { id: "mci", name: "Manchester City", logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg", leagueId: "pl" },
  { id: "liv", name: "Liverpool", logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg", leagueId: "pl" },
  { id: "che", name: "Chelsea", logo: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg", leagueId: "pl" },
  { id: "mun", name: "Manchester United", logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg", leagueId: "pl" },
  { id: "tot", name: "Tottenham", logo: "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg", leagueId: "pl" },
  { id: "new", name: "Newcastle", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg", leagueId: "pl" },
  { id: "av", name: "Aston Villa", logo: "https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg", leagueId: "pl" },

  // La Liga
  { id: "rma", name: "Real Madrid", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg", leagueId: "laliga" },
  { id: "bar", name: "Barcelona", logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg", leagueId: "laliga" },
  { id: "atm", name: "Atletico Madrid", logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg", leagueId: "laliga" },
  { id: "sev", name: "Sevilla", logo: "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg", leagueId: "laliga" },
  { id: "val", name: "Valencia", logo: "https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg", leagueId: "laliga" },
  { id: "rso", name: "Real Sociedad", logo: "https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg", leagueId: "laliga" },

  // Bundesliga
  { id: "bay", name: "Bayern Munich", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg", leagueId: "bundesliga" },
  { id: "bvb", name: "Dortmund", logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg", leagueId: "bundesliga" },
  { id: "lev", name: "Leverkusen", logo: "https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg", leagueId: "bundesliga" },
  { id: "rbl", name: "RB Leipzig", logo: "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg", leagueId: "bundesliga" },
  { id: "sge", name: "Eintracht Frankfurt", logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg", leagueId: "bundesliga" },

  // Serie A
  { id: "juv", name: "Juventus", logo: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg", leagueId: "seriea" },
  { id: "mil", name: "AC Milan", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg", leagueId: "seriea" },
  { id: "int", name: "Inter", logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg", leagueId: "seriea" },
  { id: "nap", name: "Napoli", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg", leagueId: "seriea" },
  { id: "rom", name: "Roma", logo: "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg", leagueId: "seriea" },
  { id: "laz", name: "Lazio", logo: "https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg", leagueId: "seriea" },

  // Süper Lig
  { id: "gs", name: "Galatasaray", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.png", leagueId: "superlig" },
  { id: "fb", name: "Fenerbahçe", logo: "https://upload.wikimedia.org/wikipedia/en/7/70/Fenerbah%C3%A7e_SK_logo_2024.png", leagueId: "superlig" },
  { id: "bjk", name: "Beşiktaş", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Logo_of_Be%C5%9Fikta%C5%9F_JK.svg/1200px-Logo_of_Be%C5%9Fikta%C5%9F_JK.svg.png", leagueId: "superlig" },
  { id: "ts", name: "Trabzonspor", logo: "https://upload.wikimedia.org/wikipedia/en/2/23/Trabzonspor_Amblem.svg", leagueId: "superlig" },
  { id: "ads", name: "Adana Demirspor", logo: "https://upload.wikimedia.org/wikipedia/en/0/07/Adana_Demirspor_logo.svg", leagueId: "superlig" },
  { id: "bsk", name: "Başakşehir", logo: "https://upload.wikimedia.org/wikipedia/en/8/87/%C4%B0stanbul_Ba%C5%9Fak%C5%9Fehir_FK.svg", leagueId: "superlig" }
];

export const getTeam = (name: string) => teams.find(t => t.name === name) || teams[0];
export const getTeamsByLeague = (leagueId: string) => teams.filter(t => t.leagueId === leagueId);
export const getLeague = (id: string) => leagues.find(l => l.id === id);
