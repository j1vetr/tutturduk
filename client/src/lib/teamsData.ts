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
    logo: "https://upload.wikimedia.org/wikipedia/tr/1/11/Süper_Lig_logo.png" 
  }
];

export const teams: Team[] = [
  // ========== PREMIER LEAGUE (20 Takım) ==========
  { id: "ars", name: "Arsenal", logo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg", leagueId: "pl" },
  { id: "mci", name: "Manchester City", logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg", leagueId: "pl" },
  { id: "liv", name: "Liverpool", logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg", leagueId: "pl" },
  { id: "che", name: "Chelsea", logo: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg", leagueId: "pl" },
  { id: "mun", name: "Manchester United", logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg", leagueId: "pl" },
  { id: "tot", name: "Tottenham", logo: "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg", leagueId: "pl" },
  { id: "new", name: "Newcastle", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg", leagueId: "pl" },
  { id: "avl", name: "Aston Villa", logo: "https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg", leagueId: "pl" },
  { id: "whu", name: "West Ham", logo: "https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg", leagueId: "pl" },
  { id: "bha", name: "Brighton", logo: "https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg", leagueId: "pl" },
  { id: "cry", name: "Crystal Palace", logo: "https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg", leagueId: "pl" },
  { id: "bre", name: "Brentford", logo: "https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg", leagueId: "pl" },
  { id: "ful", name: "Fulham", logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg", leagueId: "pl" },
  { id: "wol", name: "Wolverhampton", logo: "https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg", leagueId: "pl" },
  { id: "eve", name: "Everton", logo: "https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg", leagueId: "pl" },
  { id: "bou", name: "Bournemouth", logo: "https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg", leagueId: "pl" },
  { id: "nfo", name: "Nottingham Forest", logo: "https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg", leagueId: "pl" },
  { id: "lei", name: "Leicester", logo: "https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg", leagueId: "pl" },
  { id: "ips", name: "Ipswich Town", logo: "https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg", leagueId: "pl" },
  { id: "sou", name: "Southampton", logo: "https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg", leagueId: "pl" },

  // ========== LA LIGA (20 Takım) ==========
  { id: "rma", name: "Real Madrid", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg", leagueId: "laliga" },
  { id: "bar", name: "Barcelona", logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg", leagueId: "laliga" },
  { id: "atm", name: "Atletico Madrid", logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg", leagueId: "laliga" },
  { id: "sev", name: "Sevilla", logo: "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg", leagueId: "laliga" },
  { id: "val", name: "Valencia", logo: "https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg", leagueId: "laliga" },
  { id: "rso", name: "Real Sociedad", logo: "https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg", leagueId: "laliga" },
  { id: "bet", name: "Real Betis", logo: "https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg", leagueId: "laliga" },
  { id: "vil", name: "Villarreal", logo: "https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo.svg", leagueId: "laliga" },
  { id: "ath", name: "Athletic Bilbao", logo: "https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg", leagueId: "laliga" },
  { id: "cel", name: "Celta Vigo", logo: "https://upload.wikimedia.org/wikipedia/en/1/12/RC_Celta_de_Vigo_logo.svg", leagueId: "laliga" },
  { id: "gir", name: "Girona", logo: "https://upload.wikimedia.org/wikipedia/en/9/90/For_article_Girona_FC.svg", leagueId: "laliga" },
  { id: "osa", name: "Osasuna", logo: "https://upload.wikimedia.org/wikipedia/en/d/db/CA_Osasuna_logo.svg", leagueId: "laliga" },
  { id: "get", name: "Getafe", logo: "https://upload.wikimedia.org/wikipedia/en/4/46/Getafe_logo.svg", leagueId: "laliga" },
  { id: "ala", name: "Alaves", logo: "https://upload.wikimedia.org/wikipedia/en/a/ab/Deportivo_Alav%C3%A9s_logo_%282020%29.svg", leagueId: "laliga" },
  { id: "mal", name: "Mallorca", logo: "https://upload.wikimedia.org/wikipedia/en/e/e0/Rcd_mallorca.svg", leagueId: "laliga" },
  { id: "esp", name: "Espanyol", logo: "https://upload.wikimedia.org/wikipedia/en/d/d5/RCD_Espanyol_logo.svg", leagueId: "laliga" },
  { id: "ray", name: "Rayo Vallecano", logo: "https://upload.wikimedia.org/wikipedia/en/1/12/Rayo_Vallecano_logo.svg", leagueId: "laliga" },
  { id: "las", name: "Las Palmas", logo: "https://upload.wikimedia.org/wikipedia/en/c/c4/UD_Las_Palmas_logo.svg", leagueId: "laliga" },
  { id: "leg", name: "Leganes", logo: "https://upload.wikimedia.org/wikipedia/en/a/a7/CD_Legan%C3%A9s_logo.svg", leagueId: "laliga" },
  { id: "vll", name: "Real Valladolid", logo: "https://upload.wikimedia.org/wikipedia/en/6/6e/Real_Valladolid_Logo.svg", leagueId: "laliga" },

  // ========== BUNDESLIGA (18 Takım) ==========
  { id: "bay", name: "Bayern Munich", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg", leagueId: "bundesliga" },
  { id: "bvb", name: "Dortmund", logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg", leagueId: "bundesliga" },
  { id: "lev", name: "Leverkusen", logo: "https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg", leagueId: "bundesliga" },
  { id: "rbl", name: "RB Leipzig", logo: "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg", leagueId: "bundesliga" },
  { id: "sge", name: "Eintracht Frankfurt", logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg", leagueId: "bundesliga" },
  { id: "scf", name: "Freiburg", logo: "https://upload.wikimedia.org/wikipedia/en/6/6d/SC_Freiburg_logo.svg", leagueId: "bundesliga" },
  { id: "vfb", name: "Stuttgart", logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg", leagueId: "bundesliga" },
  { id: "wob", name: "Wolfsburg", logo: "https://upload.wikimedia.org/wikipedia/commons/c/ce/VfL_Wolfsburg_Logo.svg", leagueId: "bundesliga" },
  { id: "bmg", name: "Borussia Mönchengladbach", logo: "https://upload.wikimedia.org/wikipedia/commons/8/81/Borussia_M%C3%B6nchengladbach_logo.svg", leagueId: "bundesliga" },
  { id: "m05", name: "Mainz 05", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Logo_Mainz_05.svg", leagueId: "bundesliga" },
  { id: "wer", name: "Werder Bremen", logo: "https://upload.wikimedia.org/wikipedia/commons/b/be/SV-Werder-Bremen-Logo.svg", leagueId: "bundesliga" },
  { id: "tsg", name: "Hoffenheim", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Logo_TSG_Hoffenheim.svg", leagueId: "bundesliga" },
  { id: "boc", name: "Bochum", logo: "https://upload.wikimedia.org/wikipedia/commons/7/72/VfL_Bochum_logo.svg", leagueId: "bundesliga" },
  { id: "fcaug", name: "Augsburg", logo: "https://upload.wikimedia.org/wikipedia/en/c/c5/FC_Augsburg_logo.svg", leagueId: "bundesliga" },
  { id: "fcu", name: "Union Berlin", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/1._FC_Union_Berlin_Logo.svg", leagueId: "bundesliga" },
  { id: "hei", name: "Heidenheim", logo: "https://upload.wikimedia.org/wikipedia/commons/9/99/FC-Heidenheim-Logo.svg", leagueId: "bundesliga" },
  { id: "stp", name: "St. Pauli", logo: "https://upload.wikimedia.org/wikipedia/en/8/8f/FC_St._Pauli_logo_%282018%29.svg", leagueId: "bundesliga" },
  { id: "kiel", name: "Holstein Kiel", logo: "https://upload.wikimedia.org/wikipedia/en/5/5f/Holstein_Kiel_Logo.svg", leagueId: "bundesliga" },

  // ========== SERIE A (20 Takım) ==========
  { id: "int", name: "Inter", logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg", leagueId: "seriea" },
  { id: "mil", name: "AC Milan", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg", leagueId: "seriea" },
  { id: "juv", name: "Juventus", logo: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg", leagueId: "seriea" },
  { id: "nap", name: "Napoli", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg", leagueId: "seriea" },
  { id: "rom", name: "Roma", logo: "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg", leagueId: "seriea" },
  { id: "laz", name: "Lazio", logo: "https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg", leagueId: "seriea" },
  { id: "ata", name: "Atalanta", logo: "https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg", leagueId: "seriea" },
  { id: "fio", name: "Fiorentina", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8b/ACF_Fiorentina_-_stemma.svg", leagueId: "seriea" },
  { id: "tor", name: "Torino", logo: "https://upload.wikimedia.org/wikipedia/en/2/2e/Torino_FC_Logo.svg", leagueId: "seriea" },
  { id: "bol", name: "Bologna", logo: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Bologna_F.C._1909_logo.svg", leagueId: "seriea" },
  { id: "mon", name: "Monza", logo: "https://upload.wikimedia.org/wikipedia/en/d/d5/AC_Monza_logo_%282019%29.svg", leagueId: "seriea" },
  { id: "udi", name: "Udinese", logo: "https://upload.wikimedia.org/wikipedia/en/c/ce/Udinese_Calcio_logo.svg", leagueId: "seriea" },
  { id: "gen", name: "Genoa", logo: "https://upload.wikimedia.org/wikipedia/en/2/23/Genoa_CFC_crest.svg", leagueId: "seriea" },
  { id: "sas", name: "Sassuolo", logo: "https://upload.wikimedia.org/wikipedia/en/1/1b/US_Sassuolo_Calcio_logo.svg", leagueId: "seriea" },
  { id: "ver", name: "Hellas Verona", logo: "https://upload.wikimedia.org/wikipedia/en/9/92/Hellas_Verona_FC_logo_%282020%29.svg", leagueId: "seriea" },
  { id: "emp", name: "Empoli", logo: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Empoli_FC.svg", leagueId: "seriea" },
  { id: "lec", name: "Lecce", logo: "https://upload.wikimedia.org/wikipedia/en/e/ea/US_Lecce_logo.svg", leagueId: "seriea" },
  { id: "cag", name: "Cagliari", logo: "https://upload.wikimedia.org/wikipedia/en/6/61/Cagliari_Calcio_1920.svg", leagueId: "seriea" },
  { id: "par", name: "Parma", logo: "https://upload.wikimedia.org/wikipedia/en/4/4f/Parma_Calcio_1913_logo.svg", leagueId: "seriea" },
  { id: "ven", name: "Venezia", logo: "https://upload.wikimedia.org/wikipedia/en/1/1f/Venezia_FC_2015_logo.svg", leagueId: "seriea" },
  { id: "com", name: "Como", logo: "https://upload.wikimedia.org/wikipedia/en/5/5f/Como_1907_logo.svg", leagueId: "seriea" },

  // ========== SÜPER LİG (19 Takım) ==========
  { id: "gs", name: "Galatasaray", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.png", leagueId: "superlig" },
  { id: "fb", name: "Fenerbahçe", logo: "https://upload.wikimedia.org/wikipedia/tr/8/86/Fenerbahçe_SK.png", leagueId: "superlig" },
  { id: "bjk", name: "Beşiktaş", logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_of_Be%C5%9Fikta%C5%9F_JK.svg", leagueId: "superlig" },
  { id: "ts", name: "Trabzonspor", logo: "https://upload.wikimedia.org/wikipedia/en/2/23/Trabzonspor_Amblem.svg", leagueId: "superlig" },
  { id: "bsk", name: "Başakşehir", logo: "https://upload.wikimedia.org/wikipedia/en/8/87/%C4%B0stanbul_Ba%C5%9Fak%C5%9Fehir_FK.svg", leagueId: "superlig" },
  { id: "aly", name: "Alanyaspor", logo: "https://upload.wikimedia.org/wikipedia/tr/b/b3/Alanyaspor_logo.png", leagueId: "superlig" },
  { id: "ant", name: "Antalyaspor", logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Antalyaspor_logo.svg", leagueId: "superlig" },
  { id: "goz", name: "Göztepe", logo: "https://upload.wikimedia.org/wikipedia/en/2/2f/Göztepe_S.K._logo.svg", leagueId: "superlig" },
  { id: "kay", name: "Kayserispor", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Kayserispor_logo.svg", leagueId: "superlig" },
  { id: "kny", name: "Konyaspor", logo: "https://upload.wikimedia.org/wikipedia/en/4/41/Konyaspor_logo.svg", leagueId: "superlig" },
  { id: "svs", name: "Sivasspor", logo: "https://upload.wikimedia.org/wikipedia/en/0/0e/Sivasspor_logo.svg", leagueId: "superlig" },
  { id: "riz", name: "Rizespor", logo: "https://upload.wikimedia.org/wikipedia/en/b/b2/Rizespor_logo.svg", leagueId: "superlig" },
  { id: "sam", name: "Samsunspor", logo: "https://upload.wikimedia.org/wikipedia/en/0/02/Samsunspor_logo.svg", leagueId: "superlig" },
  { id: "kas", name: "Kasımpaşa", logo: "https://upload.wikimedia.org/wikipedia/en/8/88/Kasimpasa_SK_logo.svg", leagueId: "superlig" },
  { id: "hat", name: "Hatayspor", logo: "https://upload.wikimedia.org/wikipedia/en/1/17/Hatayspor_logo.svg", leagueId: "superlig" },
  { id: "bol", name: "Bodrumspor", logo: "https://upload.wikimedia.org/wikipedia/tr/2/26/Bodrumspor_logo.png", leagueId: "superlig" },
  { id: "ank", name: "Ankaragücü", logo: "https://upload.wikimedia.org/wikipedia/en/1/14/MKE_Ankaragücü_logo.svg", leagueId: "superlig" },
  { id: "gaz", name: "Gaziantep FK", logo: "https://upload.wikimedia.org/wikipedia/en/8/8e/Gaziantep_FK_logo.svg", leagueId: "superlig" },
  { id: "eyi", name: "Eyüpspor", logo: "https://upload.wikimedia.org/wikipedia/en/1/18/Eyüpspor_logo.svg", leagueId: "superlig" }
];

export const getTeam = (name: string) => teams.find(t => t.name === name) || { id: "unknown", name: name, logo: "", leagueId: "" };
export const getTeamsByLeague = (leagueId: string) => teams.filter(t => t.leagueId === leagueId);
export const getLeague = (id: string) => leagues.find(l => l.id === id);
