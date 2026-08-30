/**
 * Football Teams Import Script
 * Kullanım: npm run import:football
 *
 * Kaynaklar (ücretsiz, key gerektirmez):
 *  - Takım listeleri: github.com/oritzio/football-database
 *  - Logolar:        github.com/JoseArroyave/football-logos
 *  - UCL:            github.com/openfootball/champions-league
 */

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { URL, fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const LOGO_DIR = path.resolve(__dirname, "../client/public/team-logos");
const STATIC_JSON = path.resolve(__dirname, "../client/src/data/teams-static.json");
const SEASON = "2026-27";

// ── Lig → veri kaynağı eşleşmesi ─────────────────────────────
const LEAGUE_SOURCES = [
  { slug: "premier-league",   name: "Premier League",    country: "England",     type: "league", dbFile: "England_PremierLeague",   logoFolder: "england" },
  { slug: "la-liga",          name: "La Liga",           country: "Spain",       type: "league", dbFile: "Spain_LaLiga",            logoFolder: "spain" },
  { slug: "serie-a",          name: "Serie A",           country: "Italy",       type: "league", dbFile: "Italy_SerieA",            logoFolder: "italy" },
  { slug: "bundesliga",       name: "Bundesliga",        country: "Germany",     type: "league", dbFile: "Germany_Bundesliga",      logoFolder: "germany" },
  { slug: "ligue-1",          name: "Ligue 1",           country: "France",      type: "league", dbFile: "France_Ligue1",           logoFolder: "france" },
  { slug: "super-lig",        name: "Süper Lig",         country: "Turkey",      type: "league", dbFile: "Turkey_SuperLig",         logoFolder: "turkey" },
  { slug: "eredivisie",       name: "Eredivisie",        country: "Netherlands", type: "league", dbFile: "Netherlands_Eredivisie",  logoFolder: "netherlands" },
  { slug: "primeira-liga",    name: "Primeira Liga",     country: "Portugal",    type: "league", dbFile: "Portugal_LigaPortugal",   logoFolder: "portugal" },
  { slug: "pro-league",       name: "Belgian Pro League",country: "Belgium",     type: "league", dbFile: "Belgium_BelgianProLeague",logoFolder: "belgium" },
];

const UEFA_COMPS = [
  { slug: "champions-league",  name: "UEFA Champions League",    country: "Europe", type: "european" },
  { slug: "europa-league",     name: "UEFA Europa League",       country: "Europe", type: "european" },
  { slug: "conference-league", name: "UEFA Conference League",   country: "Europe", type: "european" },
];

// Admin paneli için kullanılan lig ID'leri (API-Football ID'leri)
const LEAGUE_ID_MAP: Record<string, number> = {
  "champions-league":  2,
  "europa-league":     3,
  "conference-league": 848,
  "premier-league":    39,
  "la-liga":           140,
  "serie-a":           135,
  "bundesliga":        78,
  "ligue-1":           61,
  "super-lig":         203,
  "eredivisie":        88,
  "primeira-liga":     94,
  "pro-league":        144,
};

// ── Manuel alias (normalize edilmiş takım adı → logo dosya adı, uzantısız) ───
// Anahtar: normalizeStr(takım adı) sonucu (küçük harf, aksansız, kulüp eki temizlenmiş)
// Değer:   GitHub logo reposundaki dosya adı (.svg hariç, büyük/küçük harf duyarlı)
const MANUAL_LOGO_ALIASES: Record<string, string> = {
  // Premier League
  "nottm forest":          "Nottingham_Forest",
  "leicester city":        "Leicester",
  "ipswich town":          "Ipswich",
  // La Liga
  "athletic club":         "Athletic_Club_Bilbao",
  "celta vigo":            "Celta",
  "ca osasuna":            "Osasuna",
  // Serie A
  "internazionale":        "Inter",
  "como":                  "Como_1907",
  // Bundesliga
  "bayern munich":         "Bayern_München",
  "hamburg":               "Hamburger_SV",
  "paderborn 07":          "SC_Paderborn",
  "mainz":                 "Mainz_05",
  // Ligue 1
  "auxerre":               "Auxerre",
  "lyon":                  "Olympique_Lyonnais",
  "paris saint-germain":   "Paris_Saint-Germain_(PSG)",
  "strasbourg":            "RC_Strasbourg_Alsace",
  // Süper Lig
  "erzurum bb":            "erzurumspor",
  "goztepe":               "Göztepe_Izmir",
  // Eredivisie
  "ajax amsterdam":        "AFC_Ajax",
  "excelsior":             "Excelsior_Rotterdam",
  "feyenoord rotterdam":   "Feyenoord",
  "nijmegen":              "N.E.C._Nijmegen",
  // Primeira Liga
  "estrela":               "Estrela_da_Amadora",
  "c.d. nacional":         "CD_Nacional",
  // Belgian Pro League
  "anderlecht":            "RSC_Anderlecht",
  "antwerp":               "Royal_Antwerp_FC",
  "racing genk":           "KRC_Genk",
  "royal charleroi":       "Royal_Charleroi_S.C.",
  "union st.-gilloise":    "Union_Saint-Gilloise",
};

// ── Normalize ─────────────────────────────────────────────────
const TR_MAP: Record<string, string> = {
  'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
  'ö': 'o', 'Ö': 'o', 'ı': 'i', 'İ': 'i', 'ç': 'c', 'Ç': 'c',
  'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u',
  'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'á': 'a', 'ä': 'a',
  'ñ': 'n', 'ó': 'o', 'ô': 'o', 'ú': 'u', 'ù': 'u', 'ü': 'u',
  'ı': 'i', 'ß': 'ss', 'æ': 'ae', 'ø': 'o', 'å': 'a',
  'ć': 'c', 'č': 'c', 'ž': 'z', 'š': 's', 'đ': 'd',
};

function normalizeStr(s: string): string {
  let r = s;
  for (const [k, v] of Object.entries(TR_MAP)) r = r.split(k).join(v);
  // Kulüp eklerini kaldır
  r = r
    .replace(/\b(FC|FK|SK|CF|AFC|AC|SSC|SC|AS|RC|RCD|UD|CD|SD|CE|IF|BK|NK|PFC|GD|SL|SV|FV|VfB|VfL|TSG|RB|SBV|VV|AZ|PEC|NAC|MVV|NEC|ADO|ADO|Heracles|Go|SBV)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return r;
}

function toSlug(s: string): string {
  return normalizeStr(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Levenshtein distance ──────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── HTTP fetch helper ─────────────────────────────────────────
function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    let data = '';
    const req = mod.get(url, { headers: { 'User-Agent': 'tutturduk-importer/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve(fetchText(res.headers.location!));
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} — ${url}`)); return; }
      res.setEncoding('utf8');
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'tutturduk-importer/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve(downloadFile(res.headers.location!, dest));
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => { out.close(); resolve(); });
      out.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

// ── Logo klasörü listesi (GitHub API) ─────────────────────────
async function fetchLogoList(country: string): Promise<{ name: string; download_url: string }[]> {
  const url = `https://api.github.com/repos/JoseArroyave/football-logos/contents/logos/${country}`;
  try {
    const text = await fetchText(url);
    const items = JSON.parse(text) as Array<{ name: string; download_url: string; type: string }>;
    return items.filter(x => x.type === 'file' && x.name.toLowerCase().endsWith('.svg'));
  } catch {
    return [];
  }
}

// ── Logo eşleştirme ───────────────────────────────────────────
function matchLogo(
  teamName: string,
  logos: { name: string; download_url: string }[]
): { logo: { name: string; download_url: string } | null; confident: boolean } {
  const normTeam = normalizeStr(teamName);

  // 1. Manuel alias kontrolü (en güvenilir)
  const aliasTarget = MANUAL_LOGO_ALIASES[normTeam];
  if (aliasTarget) {
    const found = logos.find(l => l.name.replace(/\.svg$/i, '') === aliasTarget);
    if (found) return { logo: found, confident: true };
  }

  // 2. Otomatik fuzzy eşleştirme
  const scored = logos.map(l => {
    const normFile = normalizeStr(l.name.replace(/\.svg$/i, '').replace(/_/g, ' '));
    const dist = levenshtein(normTeam, normFile);
    const maxLen = Math.max(normTeam.length, normFile.length);
    const similarity = 1 - dist / maxLen;
    return { l, similarity, normFile };
  }).sort((a, b) => b.similarity - a.similarity);

  if (scored.length === 0) return { logo: null, confident: false };
  const best = scored[0];
  if (best.similarity >= 0.85) return { logo: best.l, confident: true };
  if (best.similarity >= 0.70) return { logo: best.l, confident: false };
  return { logo: null, confident: false };
}

// ── football-database'den takım listesi çek ───────────────────
async function fetchLeagueTeams(dbFile: string): Promise<Array<{ team_name: string; team_abbreviation?: string; team_stadium?: string }>> {
  const url = `https://raw.githubusercontent.com/oritzio/football-database/master/${dbFile}.json`;
  const text = await fetchText(url);
  const data = JSON.parse(text);
  // Dizi veya obje olabilir
  if (Array.isArray(data)) return data;
  // Obje ise ilk değer (tüm takımlar tek sezonda)
  const vals = Object.values(data);
  if (Array.isArray(vals[0])) return vals[0] as any[];
  return [];
}

// ── UCL takımlarını openfootball cl.txt'ten çıkar ────────────
async function fetchUCLTeams(): Promise<string[]> {
  const url = 'https://raw.githubusercontent.com/openfootball/champions-league/master/2025-26/cl.txt';
  const text = await fetchText(url);
  const found = new Set<string>();
  const re = /([A-ZÀ-Ÿa-zÀ-ÿ][^\t\n(]+?)\s+\([A-Z]{2,3}\)\s+(?:v|-)|\bv\s+([A-ZÀ-Ÿa-zÀ-ÿ][^\t\n(]+?)\s+\([A-Z]{2,3}\)/g;
  for (const m of text.matchAll(/([A-Za-zÀ-ÿ][\w\s.\-']+?(?:FC|CF|SK|SC|AC|SL|BV|SV|IF|FK|NK|BC|KV)?)\s*\([A-Z]{2,3}\)/g)) {
    const name = m[1].trim().replace(/\s+/g, ' ');
    if (name.length > 2) found.add(name);
  }
  return Array.from(found);
}

// ── Upsert helpers ────────────────────────────────────────────
async function upsertCompetition(comp: { slug: string; name: string; country: string; type: string }): Promise<number> {
  const res = await pool.query(
    `INSERT INTO competitions (slug, name, country, type, season)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, season = EXCLUDED.season
     RETURNING id`,
    [comp.slug, comp.name, comp.country, comp.type, SEASON]
  );
  return res.rows[0].id;
}

async function upsertTeam(t: {
  slug: string; name: string; normalized_name: string;
  country: string; abbreviation?: string; stadium?: string;
  logo?: string; logo_source?: string;
}): Promise<number> {
  const res = await pool.query(
    `INSERT INTO football_teams (slug, name, normalized_name, country, abbreviation, stadium, logo, logo_source, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       normalized_name = EXCLUDED.normalized_name,
       country = COALESCE(EXCLUDED.country, football_teams.country),
       abbreviation = COALESCE(EXCLUDED.abbreviation, football_teams.abbreviation),
       stadium = COALESCE(EXCLUDED.stadium, football_teams.stadium),
       logo = COALESCE(EXCLUDED.logo, football_teams.logo),
       logo_source = COALESCE(EXCLUDED.logo_source, football_teams.logo_source),
       updated_at = NOW()
     RETURNING id`,
    [t.slug, t.name, t.normalized_name, t.country, t.abbreviation || null, t.stadium || null, t.logo || null, t.logo_source || null]
  );
  return res.rows[0].id;
}

async function upsertTeamCompetition(teamId: number, compId: number): Promise<void> {
  await pool.query(
    `INSERT INTO team_competitions (team_id, competition_id, season)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [teamId, compId, SEASON]
  );
}

// team_competitions'a unique constraint yoksa ekle
async function ensureUniqueConstraint() {
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'team_comp_unique'
      ) THEN
        ALTER TABLE team_competitions
          ADD CONSTRAINT team_comp_unique UNIQUE (team_id, competition_id, season);
      END IF;
    END $$;
  `).catch(() => {/* ignore if already exists */});
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  await ensureUniqueConstraint();

  let totalTeams = 0;
  let logosFound = 0;
  let logosMissing: string[] = [];
  let duplicatesMerged = 0;
  let totalComps = 0;

  // Slug → {id, apiLeagueId, name, country, shortName} for teams-static.json
  const compIdMap: Record<string, number> = {};

  // 1. Lig competition kayıtları
  console.log('\n📋  Ligler kaydediliyor...');
  for (const league of LEAGUE_SOURCES) {
    const id = await upsertCompetition({ slug: league.slug, name: league.name, country: league.country, type: league.type });
    compIdMap[league.slug] = id;
    totalComps++;
    console.log(`   ✓ ${league.name}`);
  }

  // UEFA competition kayıtları
  for (const comp of UEFA_COMPS) {
    const id = await upsertCompetition({ slug: comp.slug, name: comp.name, country: comp.country, type: comp.type });
    compIdMap[comp.slug] = id;
    totalComps++;
  }

  // 2. Logo listelerini önceden çek (rate limit için toplu)
  console.log('\n🖼   Logo listeleri çekiliyor...');
  const logoCache: Record<string, { name: string; download_url: string }[]> = {};
  for (const league of LEAGUE_SOURCES) {
    process.stdout.write(`   ${league.logoFolder}...`);
    logoCache[league.logoFolder] = await fetchLogoList(league.logoFolder);
    console.log(` ${logoCache[league.logoFolder].length} logo`);
    await new Promise(r => setTimeout(r, 300));
  }
  // UEFA için tüm ülke klasörlerinden ayrı logo arama yapmak zor;
  // UCL takımları zaten lig listelerinde olduğu için zaten eşleşecek.

  // 3. Her lig için takımları işle
  console.log('\n⚽  Takımlar işleniyor...');
  
  // teamSlug → { id, apiLeagueIds: number[] } — teams-static.json için
  const teamsForStatic: Record<string, {
    id: number; name: string; logo: string; country: string;
    abbreviation: string; stadium: string; leagueSlugs: string[];
  }> = {};

  for (const league of LEAGUE_SOURCES) {
    console.log(`\n   📌 ${league.name}`);
    let leagueTeams: Array<{ team_name: string; team_abbreviation?: string; team_stadium?: string }>;

    try {
      leagueTeams = await fetchLeagueTeams(league.dbFile);
    } catch (err: any) {
      console.error(`   ❌ Veri çekilemedi: ${err.message}`);
      continue;
    }

    const logos = logoCache[league.logoFolder] || [];
    const compId = compIdMap[league.slug];

    for (const rawTeam of leagueTeams) {
      const name = (rawTeam.team_name || '').trim();
      if (!name) continue;

      const slug = toSlug(name);
      const normalizedName = normalizeStr(name);

      // Logo eşleştir
      let logoPath: string | undefined;
      let logoSource: string | undefined;
      const { logo: matchedLogo, confident } = matchLogo(name, logos);

      if (matchedLogo && confident) {
        const ext = '.svg';
        const localFile = `${slug}${ext}`;
        const destPath = path.join(LOGO_DIR, localFile);

        if (!fs.existsSync(destPath)) {
          try {
            await downloadFile(matchedLogo.download_url, destPath);
          } catch {
            // İndirilemeyen logo CDN'e düşer
          }
        }

        if (fs.existsSync(destPath)) {
          logoPath = `/team-logos/${localFile}`;
          logoSource = 'local';
          logosFound++;
        }
      } else if (matchedLogo && !confident) {
        // Belirsiz eşleşme → logo = null
        logosMissing.push(`${name} (belirsiz eşleşme: ${matchedLogo.name})`);
      } else {
        logosMissing.push(name);
      }

      // DB upsert
      const existingRes = await pool.query('SELECT id FROM football_teams WHERE slug = $1', [slug]);
      if (existingRes.rows.length > 0) duplicatesMerged++;

      const teamId = await upsertTeam({
        slug, name, normalized_name: normalizedName,
        country: league.country,
        abbreviation: rawTeam.team_abbreviation,
        stadium: rawTeam.team_stadium,
        logo: logoPath,
        logo_source: logoSource,
      });

      await upsertTeamCompetition(teamId, compId);

      // teams-static.json için biriktir
      if (!teamsForStatic[slug]) {
        teamsForStatic[slug] = {
          id: teamId,
          name,
          logo: logoPath || '',
          country: league.country,
          abbreviation: rawTeam.team_abbreviation || '',
          stadium: rawTeam.team_stadium || '',
          leagueSlugs: [],
        };
        totalTeams++;
      }
      if (!teamsForStatic[slug].leagueSlugs.includes(league.slug)) {
        teamsForStatic[slug].leagueSlugs.push(league.slug);
      }

      process.stdout.write('.');
    }
    console.log('');
    await new Promise(r => setTimeout(r, 200));
  }

  // 4. UCL takımlarını ekle / bağla
  console.log('\n   🏆 UCL takımları bağlanıyor...');
  try {
    const uclTeams = await fetchUCLTeams();
    const uclCompId = compIdMap['champions-league'];
    for (const name of uclTeams) {
      const slug = toSlug(name);
      const existing = await pool.query('SELECT id FROM football_teams WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) {
        await upsertTeamCompetition(existing.rows[0].id, uclCompId);
        if (teamsForStatic[slug] && !teamsForStatic[slug].leagueSlugs.includes('champions-league')) {
          teamsForStatic[slug].leagueSlugs.push('champions-league');
        }
        process.stdout.write('.');
      }
    }
    console.log(` ${uclTeams.length} takım kontrol edildi`);
  } catch (err: any) {
    console.error(`   ⚠️  UCL verisi alınamadı: ${err.message}`);
  }

  // 5. teams-static.json güncelle
  console.log('\n📄  teams-static.json güncelleniyor...');
  const staticLeagues = [
    { id: 2,   slug: "champions-league",  name: "Şampiyonlar Ligi", shortName: "UCL",  logo: "https://media.api-sports.io/football/leagues/2.png" },
    { id: 3,   slug: "europa-league",     name: "Avrupa Ligi",       shortName: "UEL",  logo: "https://media.api-sports.io/football/leagues/3.png" },
    { id: 848, slug: "conference-league", name: "Konferans Ligi",     shortName: "UECL", logo: "https://media.api-sports.io/football/leagues/848.png" },
    { id: 39,  slug: "premier-league",    name: "Premier League",     shortName: "PL",   logo: "https://media.api-sports.io/football/leagues/39.png" },
    { id: 140, slug: "la-liga",           name: "La Liga",            shortName: "LL",   logo: "https://media.api-sports.io/football/leagues/140.png" },
    { id: 135, slug: "serie-a",           name: "Serie A",            shortName: "SA",   logo: "https://media.api-sports.io/football/leagues/135.png" },
    { id: 78,  slug: "bundesliga",        name: "Bundesliga",         shortName: "BL",   logo: "https://media.api-sports.io/football/leagues/78.png" },
    { id: 61,  slug: "ligue-1",           name: "Ligue 1",            shortName: "L1",   logo: "https://media.api-sports.io/football/leagues/61.png" },
    { id: 203, slug: "super-lig",         name: "Süper Lig",          shortName: "SL",   logo: "https://media.api-sports.io/football/leagues/203.png" },
    { id: 88,  slug: "eredivisie",        name: "Eredivisie",         shortName: "ERE",  logo: "https://media.api-sports.io/football/leagues/88.png" },
    { id: 94,  slug: "primeira-liga",     name: "Primeira Liga",      shortName: "PL1",  logo: "https://media.api-sports.io/football/leagues/94.png" },
    { id: 144, slug: "pro-league",        name: "Belgian Pro League", shortName: "BPL",  logo: "https://media.api-sports.io/football/leagues/144.png" },
  ];

  const staticTeams = Object.values(teamsForStatic)
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    .map(t => ({
      id: t.id,
      name: t.name,
      logo: t.logo || `https://media.api-sports.io/football/teams/${t.id}.png`,
      country: t.country,
      leagues: t.leagueSlugs
        .map(s => staticLeagues.find(l => l.slug === s)?.id)
        .filter(Boolean) as number[],
    }));

  fs.writeFileSync(STATIC_JSON, JSON.stringify({ leagues: staticLeagues, teams: staticTeams }, null, 2), 'utf-8');
  console.log(`   ✓ ${staticTeams.length} takım, ${staticLeagues.length} lig`);

  // 6. Özet rapor
  console.log('\n' + '═'.repeat(50));
  console.log('Football import completed\n');
  console.log(`Competitions:      ${totalComps}`);
  console.log(`Unique teams:      ${totalTeams}`);
  console.log(`Logos found:       ${logosFound}`);
  console.log(`Logos missing:     ${logosMissing.length}`);
  console.log(`Duplicates merged: ${duplicatesMerged}`);

  if (logosMissing.length > 0) {
    console.log('\nMissing logos:');
    logosMissing.slice(0, 30).forEach(n => console.log(`  • ${n}`));
    if (logosMissing.length > 30) console.log(`  ... ve ${logosMissing.length - 30} tane daha`);
  }
  console.log('═'.repeat(50));

  await pool.end();
}

main().catch(err => {
  console.error('\n❌  Kritik hata:', err.message);
  pool.end();
  process.exit(1);
});
