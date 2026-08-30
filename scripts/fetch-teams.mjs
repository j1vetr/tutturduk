/**
 * Tek seferlik çalıştırma scripti.
 * API-Football'dan 9 lig için güncel takım listesi çeker ve
 * client/src/data/teams-static.json dosyasına yazar.
 *
 * Kullanım:
 *   node scripts/fetch-teams.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error("❌  API_FOOTBALL_KEY ortam değişkeni bulunamadı.");
  process.exit(1);
}

const LEAGUES = [
  { id: 2,   name: "Şampiyonlar Ligi", shortName: "UCL"  },
  { id: 3,   name: "Avrupa Ligi",       shortName: "UEL"  },
  { id: 848, name: "Konferans Ligi",     shortName: "UECL" },
  { id: 39,  name: "Premier League",     shortName: "PL"   },
  { id: 140, name: "La Liga",            shortName: "LL"   },
  { id: 135, name: "Serie A",            shortName: "SA"   },
  { id: 78,  name: "Bundesliga",         shortName: "BL"   },
  { id: 61,  name: "Ligue 1",            shortName: "L1"   },
  { id: 203, name: "Süper Lig",          shortName: "SL"   },
];

// Lig logoları API'den çekilmiyor, CDN URL'si tahmin edilebilir
const leagueLogoUrl = (id) => `https://media.api-sports.io/football/leagues/${id}.png`;
const teamLogoUrl   = (id) => `https://media.api-sports.io/football/teams/${id}.png`;

async function fetchTeams(leagueId, season) {
  const url = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — league ${leagueId}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API hatası: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}

async function main() {
  // Ücretsiz plan 2022-2024 sezonlarını destekliyor.
  // 2024/25 sezonu → en güncel ücretsiz veri.
  const SEASONS = [2024];

  // teamId → { id, name, logo, country, leagues: Set }
  const teamMap = new Map();

  for (const league of LEAGUES) {
    let entries = [];
    let usedSeason = null;

    for (const season of SEASONS) {
      process.stdout.write(`  Çekiliyor: ${league.shortName} (${league.id}) sezon ${season}...`);
      try {
        const raw = await fetchTeams(league.id, season);
        if (raw.length > 0) {
          entries = raw;
          usedSeason = season;
          process.stdout.write(` ${raw.length} takım ✓\n`);
          break;
        } else {
          process.stdout.write(` boş, sonraki sezon deneniyor...\n`);
        }
      } catch (err) {
        process.stdout.write(` HATA: ${err.message}\n`);
      }
      // API rate limit aşmamak için bekle
      await new Promise(r => setTimeout(r, 500));
    }

    if (entries.length === 0) {
      console.warn(`  ⚠️  ${league.shortName} için hiç takım bulunamadı, atlanıyor.`);
      continue;
    }

    for (const entry of entries) {
      const t = entry.team;
      if (!t?.id) continue;
      if (!teamMap.has(t.id)) {
        teamMap.set(t.id, {
          id: t.id,
          name: t.name,
          // API'nin kendi logo URL'si yerine CDN URL'sini kullan (key gerektirmez)
          logo: teamLogoUrl(t.id),
          country: t.country ?? "",
          leagues: new Set(),
        });
      }
      teamMap.get(t.id).leagues.add(league.id);
    }

    // API rate limit için kısa bekleme
    await new Promise(r => setTimeout(r, 300));
  }

  // Set'leri diziye çevir, ada göre sırala
  const teams = Array.from(teamMap.values())
    .map(t => ({ ...t, leagues: Array.from(t.leagues).sort((a, b) => a - b) }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const output = {
    leagues: LEAGUES.map(l => ({
      id: l.id,
      name: l.name,
      shortName: l.shortName,
      logo: leagueLogoUrl(l.id),
    })),
    teams,
  };

  const outPath = resolve(__dirname, "../client/src/data/teams-static.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅  ${teams.length} takım → ${outPath}`);
  console.log(`    ${LEAGUES.length} lig kaydedildi.`);
}

main().catch(err => {
  console.error("❌  Beklenmedik hata:", err);
  process.exit(1);
});
