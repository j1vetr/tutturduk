/**
 * kickoffNotifier.ts
 * Her dakika çalışır, TR saatinde (UTC+3) maç saati gelen
 * published_matches için Telegram'a "maç başladı" bildirimi gönderir.
 */

import { pool } from './db';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GIF_PATH = './client/public/telegram-gifs/basladi.gif';

// In-memory set — restart edilince sıfırlanır ama bu yeterli
const notifiedMatchIds = new Set<number>();

async function getTelegramCreds(): Promise<{ token: string; chatId: string } | null> {
  const r = await pool.query(
    `SELECT key, value FROM app_settings WHERE key IN ('telegram_bot_token','telegram_chat_id')`
  );
  const s: Record<string, string> = {};
  for (const row of r.rows) s[row.key] = row.value;
  if (!s['telegram_bot_token'] || !s['telegram_chat_id']) return null;
  return { token: s['telegram_bot_token'], chatId: s['telegram_chat_id'] };
}

async function isSendKickoffEnabled(): Promise<boolean> {
  const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'auto_send_kickoff'`);
  return r.rows[0]?.value === 'true';
}

async function sendAnimation(token: string, chatId: string, caption: string): Promise<void> {
  const absPath = resolve(GIF_PATH);
  if (existsSync(absPath)) {
    const fileBuffer = readFileSync(absPath);
    const blob = new Blob([fileBuffer], { type: 'image/gif' });
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('animation', blob, 'basladi.gif');
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    const res = await fetch(`https://api.telegram.org/bot${token}/sendAnimation`, { method: 'POST', body: form });
    const data = await res.json() as any;
    if (!data.ok) throw new Error(data.description);
  } else {
    // GIF yoksa düz mesaj gönder
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: caption, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  }
}

function buildKickoffCaption(m: {
  home_team: string; away_team: string;
  league_name?: string; match_time?: string;
  bet_type?: string; odds?: string | number;
}): string {
  const LEAGUE_EMOJI: Record<string, string> = {
    'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'La Liga': '🇪🇸', 'Serie A': '🇮🇹',
    'Bundesliga': '🇩🇪', 'Ligue 1': '🇫🇷', 'Süper Lig': '🇹🇷',
    'Eredivisie': '🇳🇱', 'Champions League': '⭐', 'Europa League': '🌍',
    'Conference League': '🌐',
  };
  const leagueEmoji = Object.entries(LEAGUE_EMOJI).find(([k]) =>
    m.league_name?.toLowerCase().includes(k.toLowerCase())
  )?.[1] ?? '🏆';

  const time = m.match_time ? m.match_time.slice(0, 5) : '';
  const odds = m.odds ? `\n💰 Oran: <b>${parseFloat(String(m.odds)).toFixed(2)}</b>` : '';

  return [
    `🟡 <b>MAÇ BAŞLADI!</b>`,
    ``,
    `${leagueEmoji} <b>${m.league_name ?? 'Lig'}</b>`,
    ``,
    `🏠 <b>${m.home_team}</b>`,
    `        ⚔️`,
    `✈️ <b>${m.away_team}</b>`,
    ``,
    ...(time ? [`🕐 ${time}`] : []),
    `━━━━━━━━━━━━━━━━━━`,
    ...(m.bet_type ? [`💡 Tahminimiz: <b>${m.bet_type}</b>${odds}`] : []),
  ].join('\n');
}

async function checkAndNotify(): Promise<void> {
  try {
    const enabled = await isSendKickoffEnabled();
    if (!enabled) return;

    const creds = await getTelegramCreds();
    if (!creds) return;

    // TR saati = UTC+3
    const now = new Date(Date.now() + 3 * 3600 * 1000);
    const todayDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    const result = await pool.query(
      `SELECT pm.id, pm.home_team, pm.away_team, pm.league_name, pm.match_time,
              bb.bet_type, bb.odds
       FROM published_matches pm
       LEFT JOIN best_bets bb ON bb.match_id = pm.id AND COALESCE(bb.bet_category,'primary')='primary'
       WHERE pm.match_date::date = $1::date
         AND pm.match_time = $2
         AND pm.status = 'pending'`,
      [todayDate, currentTime]
    );

    for (const m of result.rows) {
      if (notifiedMatchIds.has(m.id)) continue;
      notifiedMatchIds.add(m.id);

      try {
        const caption = buildKickoffCaption(m);
        await sendAnimation(creds.token, creds.chatId, caption);
        console.log(`[Kickoff] Bildirim gönderildi: ${m.home_team} vs ${m.away_team} (${currentTime})`);
      } catch (err: any) {
        console.error(`[Kickoff] Gönderilemedi (maç ${m.id}):`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Kickoff] checkAndNotify error:', err.message);
  }
}

export function startKickoffNotifier(): void {
  // Hemen bir kere çalıştır, sonra her dakika
  checkAndNotify();
  setInterval(checkAndNotify, 60 * 1000);
  console.log('[Kickoff] Notifier started — her dakika TR saati kontrol ediliyor');
}
