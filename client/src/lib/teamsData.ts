export type Team = {
  id: string;
  name: string;
  logo: string;
  league: string;
};

export const teams: Team[] = [
  // English Premier League
  {
    id: "133604",
    name: "Arsenal",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/200px-Arsenal_FC.svg.png",
    league: "Premier League"
  },
  {
    id: "133613",
    name: "Manchester City",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png",
    league: "Premier League"
  },
  {
    id: "133602",
    name: "Liverpool",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png",
    league: "Premier League"
  },
  {
    id: "133610",
    name: "Chelsea",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/200px-Chelsea_FC.svg.png", 
    league: "Premier League"
  },
  {
    id: "133612",
    name: "Manchester United",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png", 
    league: "Premier League"
  },
  
  // La Liga
  {
    id: "133729",
    name: "Real Madrid",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/200px-Real_Madrid_CF.svg.png",
    league: "La Liga"
  },
  {
    id: "133739",
    name: "Barcelona",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/200px-FC_Barcelona_%28crest%29.svg.png",
    league: "La Liga"
  },
  {
    id: "133727",
    name: "Atletico Madrid",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/200px-Atletico_Madrid_2017_logo.svg.png", 
    league: "La Liga"
  },

  // Bundesliga
  {
    id: "133746",
    name: "Bayern Munich",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/200px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png",
    league: "Bundesliga"
  },
  {
    id: "133747",
    name: "Borussia Dortmund",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png",
    league: "Bundesliga"
  },

  // Serie A
  {
    id: "133761",
    name: "Juventus",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/200px-Juventus_FC_2017_icon_%28black%29.svg.png",
    league: "Serie A"
  },
  {
    id: "133757",
    name: "AC Milan",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/200px-Logo_of_AC_Milan.svg.png",
    league: "Serie A"
  },
  {
    id: "133762",
    name: "Inter Milan",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/200px-FC_Internazionale_Milano_2021.svg.png",
    league: "Serie A"
  },
  {
    id: "133758",
    name: "Napoli",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/SSC_Neapel.svg/200px-SSC_Neapel.svg.png", 
    league: "Serie A"
  },

  // Super Lig
  {
    id: "134265",
    name: "Galatasaray",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Galatasaray_Sports_Club_Logo.png/200px-Galatasaray_Sports_Club_Logo.png",
    league: "Super Lig"
  },
  {
    id: "134267",
    name: "Fenerbahce",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/70/Fenerbah%C3%A7e_SK_logo_2024.png/200px-Fenerbah%C3%A7e_SK_logo_2024.png",
    league: "Super Lig"
  },
  {
    id: "134266",
    name: "Besiktas",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Besiktas_JK.svg/200px-Besiktas_JK.svg.png",
    league: "Super Lig"
  },
  {
    id: "134269",
    name: "Trabzonspor",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/23/Trabzonspor_Amblem.svg/200px-Trabzonspor_Amblem.svg.png",
    league: "Super Lig"
  }
];

export const getTeam = (name: string) => teams.find(t => t.name === name) || teams[0];
export const getTeamsByLeague = (league: string) => teams.filter(t => t.league === league);
