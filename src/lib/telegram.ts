// ============================================================================
// telegram.ts — Intégration Telegram Bot pour les notifications
// ============================================================================
// Fonctions :
//   - escapeHtml(s) : échappe le contenu user pour parse_mode HTML
//   - sendTelegramMessage(chatId, text) : envoyer un message HTML à un chat
//   - generateLinkCode() : générer un code court à usage unique pour lier un compte
// ============================================================================

/**
 * Échappe les caractères spéciaux HTML pour parse_mode: "HTML" Telegram.
 * À appliquer sur toute chaîne dynamique (title, name, etc.), pas sur les balises contrôlées.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&#39;");
}

/**
 * Envoie un message à un chat Telegram via le Bot API.
 * Utilise parse_mode: "HTML" pour supporter le formatage HTML dans les messages.
 *
 * @param chatId  L'identifiant de conversation Telegram (ex: "123456789")
 * @param text    Le contenu du message (HTML supporté)
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN manquant — impossible d'envoyer un message");
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`Telegram sendMessage failed (${res.status}):`, errBody);
  }
}

/**
 * Génère un code aléatoire court (6 caractères alphanumériques majuscules).
 * Utilisé pour lier un compte Ship or Die Africa à un chat Telegram.
 * Le code est à usage unique et stocké dans user.telegramLinkCode.
 */
export function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0, O, I, 1)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
