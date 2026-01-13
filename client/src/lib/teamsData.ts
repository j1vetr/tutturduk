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
  // ========== PREMIER LEAGUE (20 Takım - 2024/25 Sezonu) ==========
  { id: "ars", name: "Arsenal", logo: "https://resources.premierleague.com/premierleague/badges/rb/t3.svg", leagueId: "pl" },
  { id: "mci", name: "Manchester City", logo: "https://resources.premierleague.com/premierleague/badges/rb/t43.svg", leagueId: "pl" },
  { id: "liv", name: "Liverpool", logo: "https://resources.premierleague.com/premierleague/badges/rb/t14.svg", leagueId: "pl" },
  { id: "che", name: "Chelsea", logo: "https://resources.premierleague.com/premierleague/badges/rb/t8.svg", leagueId: "pl" },
  { id: "mun", name: "Manchester United", logo: "https://resources.premierleague.com/premierleague/badges/rb/t1.svg", leagueId: "pl" },
  { id: "tot", name: "Tottenham", logo: "https://resources.premierleague.com/premierleague/badges/rb/t6.svg", leagueId: "pl" },
  { id: "new", name: "Newcastle", logo: "https://resources.premierleague.com/premierleague/badges/rb/t4.svg", leagueId: "pl" },
  { id: "avl", name: "Aston Villa", logo: "https://resources.premierleague.com/premierleague/badges/rb/t7.svg", leagueId: "pl" },
  { id: "whu", name: "West Ham", logo: "https://resources.premierleague.com/premierleague/badges/rb/t21.svg", leagueId: "pl" },
  { id: "bha", name: "Brighton", logo: "https://resources.premierleague.com/premierleague/badges/rb/t36.svg", leagueId: "pl" },
  { id: "cry", name: "Crystal Palace", logo: "https://resources.premierleague.com/premierleague/badges/rb/t31.svg", leagueId: "pl" },
  { id: "bre", name: "Brentford", logo: "https://resources.premierleague.com/premierleague/badges/rb/t94.svg", leagueId: "pl" },
  { id: "ful", name: "Fulham", logo: "https://resources.premierleague.com/premierleague/badges/rb/t54.svg", leagueId: "pl" },
  { id: "wol", name: "Wolverhampton", logo: "https://resources.premierleague.com/premierleague/badges/rb/t39.svg", leagueId: "pl" },
  { id: "eve", name: "Everton", logo: "https://resources.premierleague.com/premierleague/badges/rb/t11.svg", leagueId: "pl" },
  { id: "bou", name: "Bournemouth", logo: "https://resources.premierleague.com/premierleague/badges/rb/t91.svg", leagueId: "pl" },
  { id: "nfo", name: "Nottingham Forest", logo: "https://resources.premierleague.com/premierleague/badges/rb/t17.svg", leagueId: "pl" },
  { id: "lei", name: "Leicester", logo: "https://resources.premierleague.com/premierleague/badges/rb/t13.svg", leagueId: "pl" },
  { id: "ips", name: "Ipswich Town", logo: "https://resources.premierleague.com/premierleague/badges/rb/t40.svg", leagueId: "pl" },
  { id: "sou", name: "Southampton", logo: "https://resources.premierleague.com/premierleague/badges/rb/t20.svg", leagueId: "pl" },

  // ========== LA LIGA (20 Takım - 2024/25 Sezonu) ==========
  { id: "rma", name: "Real Madrid", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/Th4fAVAZeCJWRcKoLW7koA_96x96.png", leagueId: "laliga" },
  { id: "bar", name: "Barcelona", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/paYnEE8hcrP96neHRNofhQ_96x96.png", leagueId: "laliga" },
  { id: "atm", name: "Atletico Madrid", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/TRpgKmVgnNG1RDcv1EaGXg_96x96.png", leagueId: "laliga" },
  { id: "sev", name: "Sevilla", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/g6URaOzfJ7vSCpWw6T_30A_96x96.png", leagueId: "laliga" },
  { id: "val", name: "Valencia", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/D5K7CBHUU9ZYXJ-jnlYK0w_96x96.png", leagueId: "laliga" },
  { id: "rso", name: "Real Sociedad", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/XYl0fMQc1R6F_FV90lHgWg_96x96.png", leagueId: "laliga" },
  { id: "bet", name: "Real Betis", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/CY3p4H07VPpv-6uk4r2zrw_96x96.png", leagueId: "laliga" },
  { id: "vil", name: "Villarreal", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/w0qqNKvPAv0FkU-3VBFMlg_96x96.png", leagueId: "laliga" },
  { id: "ath", name: "Athletic Bilbao", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/1kEhUSmkHRkKED9aBjJKxQ_96x96.png", leagueId: "laliga" },
  { id: "cel", name: "Celta Vigo", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/i2N0l4dJAhLsQr30gXCv_A_96x96.png", leagueId: "laliga" },
  { id: "gir", name: "Girona", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/AO6jzCqJcmJMoVdXLS6m9Q_96x96.png", leagueId: "laliga" },
  { id: "osa", name: "Osasuna", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/gD7zbXBG4ynY2EaJvfj6RA_96x96.png", leagueId: "laliga" },
  { id: "get", name: "Getafe", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/1c5m1KNLH8jmfBq0Aj_qVg_96x96.png", leagueId: "laliga" },
  { id: "ala", name: "Alaves", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/dLHoLLjPCpL0fCQShFl-CQ_96x96.png", leagueId: "laliga" },
  { id: "mal", name: "Mallorca", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/KNLoMSwgVlYyg3biLlwH0Q_96x96.png", leagueId: "laliga" },
  { id: "esp", name: "Espanyol", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/R-u2J9UkHs3N4bNOK6mE8Q_96x96.png", leagueId: "laliga" },
  { id: "ray", name: "Rayo Vallecano", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/9KPjJLiHfH7sF4VDC4UjPw_96x96.png", leagueId: "laliga" },
  { id: "las", name: "Las Palmas", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/1kc9dw7uSG8z0W3dPYCK4A_96x96.png", leagueId: "laliga" },
  { id: "leg", name: "Leganes", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/KjmZ9RMNyg_ywFhxE_Qb_A_96x96.png", leagueId: "laliga" },
  { id: "vll", name: "Real Valladolid", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/mS2SdcRjNJTlO_bKy_5CmQ_96x96.png", leagueId: "laliga" },

  // ========== BUNDESLIGA (18 Takım - 2024/25 Sezonu) ==========
  { id: "bay", name: "Bayern Munich", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/7fWRrDPoOLMxfhO2Vc2Ylg_96x96.png", leagueId: "bundesliga" },
  { id: "bvb", name: "Dortmund", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/u5ZA9b9iSMBXx1VKN4Lvhw_96x96.png", leagueId: "bundesliga" },
  { id: "lev", name: "Leverkusen", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/kkxGL7Ud16hLfxhbMx5uwg_96x96.png", leagueId: "bundesliga" },
  { id: "rbl", name: "RB Leipzig", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/JsOBrTfOxOgaCjkHZvnhSQ_96x96.png", leagueId: "bundesliga" },
  { id: "sge", name: "Eintracht Frankfurt", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/dH9plPtfKnVKfMY8t3KlqQ_96x96.png", leagueId: "bundesliga" },
  { id: "scf", name: "Freiburg", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/3c5yRGz_UL3O6rhnMGbYgA_96x96.png", leagueId: "bundesliga" },
  { id: "vfb", name: "Stuttgart", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/YH4YXpHTDNesLk-p1bw-_Q_96x96.png", leagueId: "bundesliga" },
  { id: "wob", name: "Wolfsburg", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/8Y6C0rwNbQq2EiGaHjlbTw_96x96.png", leagueId: "bundesliga" },
  { id: "bmg", name: "M'gladbach", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/9pBMjZGIDEfnZdNRprDVNQ_96x96.png", leagueId: "bundesliga" },
  { id: "m05", name: "Mainz 05", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/CZt0ZPEj1SXOYfEaIPu78A_96x96.png", leagueId: "bundesliga" },
  { id: "wer", name: "Werder Bremen", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/n2a8TpCZF_UzYuSVyEbJdA_96x96.png", leagueId: "bundesliga" },
  { id: "tsg", name: "Hoffenheim", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/Pw5PibKvP9t0PSBZ2u2E7g_96x96.png", leagueId: "bundesliga" },
  { id: "boc", name: "Bochum", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/nfuaUHG_vD2T_E7jg1AK6Q_96x96.png", leagueId: "bundesliga" },
  { id: "fcaug", name: "Augsburg", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/5iF_JxhNT_s37qgQG8L8Ew_96x96.png", leagueId: "bundesliga" },
  { id: "fcu", name: "Union Berlin", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/5rRsyMEPXNvp-V8-9PBkbg_96x96.png", leagueId: "bundesliga" },
  { id: "hei", name: "Heidenheim", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/O4RoTFLQo9x2-_u1tFoMFw_96x96.png", leagueId: "bundesliga" },
  { id: "stp", name: "St. Pauli", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/b9hpK1OQaXLYXw0c6XxZVw_96x96.png", leagueId: "bundesliga" },
  { id: "kiel", name: "Holstein Kiel", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/UrPD-dZqaxY_xPV_Wbr0_A_96x96.png", leagueId: "bundesliga" },

  // ========== SERIE A (20 Takım - 2024/25 Sezonu) ==========
  { id: "int", name: "Inter", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/4Bge8PEPV-3kDD1ebWj_Lg_96x96.png", leagueId: "seriea" },
  { id: "mil", name: "AC Milan", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/imLf2GIAf1ZZ6Fq1-lyccQ_96x96.png", leagueId: "seriea" },
  { id: "juv", name: "Juventus", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/1Y0A_nU0W7X24mxzwqf7Ow_96x96.png", leagueId: "seriea" },
  { id: "nap", name: "Napoli", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/aWmwrvLuLu77NddRVcWNxA_96x96.png", leagueId: "seriea" },
  { id: "rom", name: "Roma", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/FR_IZ6VOcwp4sFo8b1Qlvg_96x96.png", leagueId: "seriea" },
  { id: "laz", name: "Lazio", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/dPgQkY7V7BwXZe2A5XBYhw_96x96.png", leagueId: "seriea" },
  { id: "ata", name: "Atalanta", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/VQD0KfBzLjIQ4CT_VLeCYQ_96x96.png", leagueId: "seriea" },
  { id: "fio", name: "Fiorentina", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/v9jTRKANR_f6aVwxxlBTng_96x96.png", leagueId: "seriea" },
  { id: "tor", name: "Torino", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/8wldiOe6hxkCg98h5K-rEg_96x96.png", leagueId: "seriea" },
  { id: "bol", name: "Bologna", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/vdwCEGlPE1s_Cr3GWxJlZg_96x96.png", leagueId: "seriea" },
  { id: "mon", name: "Monza", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/aQ6qJ-BVjQKU4ebYJSxIyw_96x96.png", leagueId: "seriea" },
  { id: "udi", name: "Udinese", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/L4cLwpVMJM4wA2WBPI6vSA_96x96.png", leagueId: "seriea" },
  { id: "gen", name: "Genoa", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/56HQcNOaQxCEY4e7_tqXLA_96x96.png", leagueId: "seriea" },
  { id: "ver", name: "Hellas Verona", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/taoMwQd_Yc-5i4QawpNqpQ_96x96.png", leagueId: "seriea" },
  { id: "emp", name: "Empoli", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/eTKS1VqFEiH1PkBi2BZwRQ_96x96.png", leagueId: "seriea" },
  { id: "lec", name: "Lecce", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/4yX8fJJdDLsVHN-4bJ_3Hw_96x96.png", leagueId: "seriea" },
  { id: "cag", name: "Cagliari", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/OzqS7VK1lQUJYx-Z5gM42g_96x96.png", leagueId: "seriea" },
  { id: "par", name: "Parma", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/YaI6u-HVGFZNxyAYT7kLGA_96x96.png", leagueId: "seriea" },
  { id: "ven", name: "Venezia", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/8WiT2f1WZDYFbY4q1LG-Ng_96x96.png", leagueId: "seriea" },
  { id: "com", name: "Como", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/CjANwN8DmJr3jJuBNDxVXw_96x96.png", leagueId: "seriea" },

  // ========== SÜPER LİG (19 Takım - 2024/25 Sezonu) ==========
  { id: "gs", name: "Galatasaray", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/_bmJCFZBVxpEY6IJbVoL2A_96x96.png", leagueId: "superlig" },
  { id: "fb", name: "Fenerbahçe", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/tBDyaHPMPFl_phXPFw7KrA_96x96.png", leagueId: "superlig" },
  { id: "bjk", name: "Beşiktaş", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/s5xgLLDKxhFME-0NLLCOcw_96x96.png", leagueId: "superlig" },
  { id: "ts", name: "Trabzonspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/ZCnU-0C46cvLdgWiFKJ6LA_96x96.png", leagueId: "superlig" },
  { id: "bsk", name: "Başakşehir", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/5sIFFHoK3NTpILCEWKl7GQ_96x96.png", leagueId: "superlig" },
  { id: "aly", name: "Alanyaspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/Pj6sTF8JhbYOKwfI94r04A_96x96.png", leagueId: "superlig" },
  { id: "ant", name: "Antalyaspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/8jYCQ4yVWQKNH-RzT9y3Ug_96x96.png", leagueId: "superlig" },
  { id: "goz", name: "Göztepe", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/yDHWQ-i__6hWBJkBMa4VzQ_96x96.png", leagueId: "superlig" },
  { id: "kay", name: "Kayserispor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/0FkMDHlOtCMJYn7ZTz5ueQ_96x96.png", leagueId: "superlig" },
  { id: "kny", name: "Konyaspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/v9v9xtKkPPB-Ld0ic8SLhQ_96x96.png", leagueId: "superlig" },
  { id: "svs", name: "Sivasspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/AMCQX9p7q7c-Mn1xD0_NfQ_96x96.png", leagueId: "superlig" },
  { id: "riz", name: "Rizespor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/WOuKT-S5a7gYzuIcWLfMYQ_96x96.png", leagueId: "superlig" },
  { id: "sam", name: "Samsunspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/rW28e16Y3TfZwQd0YqGv4A_96x96.png", leagueId: "superlig" },
  { id: "kas", name: "Kasımpaşa", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/JuG8hqJGJLWN5aLGqy5J5A_96x96.png", leagueId: "superlig" },
  { id: "hat", name: "Hatayspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/2i-g3JVXrqRW6rjnSJ15TQ_96x96.png", leagueId: "superlig" },
  { id: "bod", name: "Bodrumspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/32ZfPH79aH1cqJ_w4i-kkg_96x96.png", leagueId: "superlig" },
  { id: "ank", name: "Ankaragücü", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/-G8bM4B8PAJgD5dUF1CZKA_96x96.png", leagueId: "superlig" },
  { id: "gaz", name: "Gaziantep FK", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/mAqEHlkkCEGEblm7dXbZNQ_96x96.png", leagueId: "superlig" },
  { id: "eyi", name: "Eyüpspor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/l7vd4epmZNb4Hj_t-s6Rhg_96x96.png", leagueId: "superlig" }
];

export const getTeam = (name: string) => teams.find(t => t.name === name) || { id: "unknown", name: name, logo: "", leagueId: "" };
export const getTeamsByLeague = (leagueId: string) => teams.filter(t => t.leagueId === leagueId);
export const getLeague = (id: string) => leagues.find(l => l.id === id);
