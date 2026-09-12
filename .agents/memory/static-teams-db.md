---
name: Static Teams DB
description: teams-static.json yapısı, logo kaynakları ve sezon güncelleme notları
---

## Yapı
- Dosya: `client/src/data/teams-static.json`
- Her takım: `{ id, name, logo, country, leagues[] }`
- `leagues` dizisi lig ID'lerini tutar (2=UCL, 3=UEL, 848=UECL, 39=PL, 78=Bundesliga, vb.)

## Logo kaynakları
- **162 takım**: `client/public/team-logos/xxx.svg` (local, GitHub script artık yok, elle eklenmiş)
- **Yeni eklenen takımlar**: `https://media.api-sports.io/football/teams/{id}.png` (CDN, API key gerekmez, tüm ID'ler HTTP 200 döner)
- Yeni takım eklerken CDN URL kullanmak yeterli; local SVG şart değil.

## ID kuralı
- CDN'den logo çekmek için ID = gerçek API-Football ID'si olmalı.
- Local SVG kullanan takımlarda ID herhangi bir değer olabilir (CDN'e gerek yok).
- Çakışma örneği: Málaga (id:3001), Le Mans (id:3002) — local SVG, ID önemsiz.

## Sezon 2026-27 güncel UCL kadrosu (41 takım — 36 league phase + qualifying katılımcılar)
Arsenal, Aston Villa (UEL şampiyonu), Liverpool, Man City, Man United (ENG×5)
Inter, Napoli, Roma, Como (ITA×4)
Barcelona, Real Madrid, Atletico, Villarreal, Real Betis (ESP×5)
Bayern, RB Leipzig, Stuttgart, Borussia Dortmund (GER×4)
PSG, Lens, Lille, Lyon (FRA×4)
PSV, Feyenoord, NEC Nijmegen (NED×3)
Porto, Sporting CP (POR×2)
Club Brugge, Union St-Gilloise (BEL×2)
Galatasaray, Fenerbahçe (TUR×2)
Celtic, Shakhtar, Slovan Bratislava, SK Slavia Prague
+ Qualifying: Bodø/Glimt, Viking FK, AEK Athens, LASK, NK Celje, Sabah FK, Olympiacos

## Sezon güncellemesi yaparken dikkat
- UCL'e giren takımlar UEL/UECL'den çıkarılmalı (çakışma olmamalı).
- Monaco 2026-27 UCL'de değil (sadece Ligue 1 id:61).
- Sparta Prague (id:261) yerine Slavia Prague (id:1051) 2026-27'de var.
- Her sezon başında (Temmuz-Ağustos) Wikipedia'dan `2026-27 UEFA Champions League` vb. sayfası çekilerek güncelleme yapılmalı.
