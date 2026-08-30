---
name: Static Teams DB
description: API-Football bağımlılığı kaldırıldı, takımlar statik JSON'da tutulur.
---

Admin artık API-Football'a bağımlı değil. Takımlar `client/src/data/teams-static.json` dosyasında: 9 lig, ~200 takım.

Logo URL formatı: `https://media.api-sports.io/football/teams/{id}.png` — bu CDN'e API key olmadan erişilir (HEAD request ile doğrulandı: HTTP 200).

Manuel maç yayınlama endpoint'i: `POST /api/admin/matches/publish-manual`
- fixture_id olarak `Math.floor(Date.now() / 1000) + 2000000000` kullanılır (gerçek API-Football ID'leri ile çakışmaz).
- published_matches + best_bets tablolarına aynı transaction içinde yazılır.

**Why:** Kullanıcı API-Football aboneliğini iptal etmek istedi; günlük limit (100 istek/gün) de yetersizdi.

**How to apply:** Takım listesini güncellemek için teams-static.json'u elle düzenle veya API limit sıfırlandığında mevcut bir endpoint üzerinden yenile.
