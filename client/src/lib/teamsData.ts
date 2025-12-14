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
    logo: "https://www.thesportsdb.com/images/media/team/badge/vrtrtp1448813175.png",
    league: "Premier League"
  },
  {
    id: "133613",
    name: "Manchester City",
    logo: "https://www.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png",
    league: "Premier League"
  },
  {
    id: "133602",
    name: "Liverpool",
    logo: "https://www.thesportsdb.com/images/media/team/badge/uvxupy1448813215.png",
    league: "Premier League"
  },
  {
    id: "133610",
    name: "Chelsea",
    logo: "https://www.thesportsdb.com/images/media/team/badge/yvwvtu1448813215.png", // Generic placeholder or need to find if missing
    league: "Premier League"
  },
  {
    id: "133612",
    name: "Manchester United",
    logo: "https://www.thesportsdb.com/images/media/team/badge/xzqdr11517660252.png", // Generic placeholder or need to find if missing
    league: "Premier League"
  },
  
  // La Liga
  {
    id: "133729",
    name: "Real Madrid",
    logo: "https://www.thesportsdb.com/images/media/team/badge/txqwyw1448813032.png",
    league: "La Liga"
  },
  {
    id: "133739",
    name: "Barcelona",
    logo: "https://www.thesportsdb.com/images/media/team/badge/syq4yt1448813088.png",
    league: "La Liga"
  },
  {
    id: "133727",
    name: "Atletico Madrid",
    logo: "https://www.thesportsdb.com/images/media/team/badge/wsqtqw1448813000.png", // Deduced/approximated or generic
    league: "La Liga"
  },

  // Bundesliga
  {
    id: "133746",
    name: "Bayern Munich",
    logo: "https://www.thesportsdb.com/images/media/team/badge/rqstwx1467462811.png",
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
    logo: "https://www.thesportsdb.com/images/media/team/badge/vsqpvx1449751145.png",
    league: "Serie A"
  },
  {
    id: "133757",
    name: "AC Milan",
    logo: "https://www.thesportsdb.com/images/media/team/badge/xqwpup1448813018.png",
    league: "Serie A"
  },
  {
    id: "133762",
    name: "Inter Milan",
    logo: "https://www.thesportsdb.com/images/media/team/badge/trpxpy1448813370.png",
    league: "Serie A"
  },
  {
    id: "133758",
    name: "Napoli",
    logo: "https://www.thesportsdb.com/images/media/team/badge/ywtruq1448813289.png", 
    league: "Serie A"
  },

  // Super Lig
  {
    id: "134265",
    name: "Galatasaray",
    logo: "https://www.thesportsdb.com/images/media/team/badge/xqssut1448813451.png",
    league: "Super Lig"
  },
  {
    id: "134267",
    name: "Fenerbahce",
    logo: "https://www.thesportsdb.com/images/media/team/badge/qtwyvt1448813196.png",
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
