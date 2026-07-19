import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/telegram/webhook
 * Reçoit les messages entrants du bot Telegram.
 *
 * Quand un utilisateur clique sur un lien t.me/BOT?start=CODE, Telegram envoie
 * un message au webhook avec /start CODE dans le texte.
 * On cherche l'utilisateur par telegramLinkCode, on enregistre le chat.id,
 * on vide le code, et on envoie un message de confirmation.
 *
 * Sécurité : vérifie le header X-Telegram-Bot-Api-Secret-Token contre
 * process.env.TELEGRAM_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  // ── Vérification du secret Telegram ──
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== secret) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    // Le webhook Telegram envoie { message: { text, chat: { id }, from: { ... } } }
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true }); // Ignorer les updates non-message
    }

    const text: string = message.text;
    const chatId: string = String(message.chat.id);

    // ── Commande /start CODE ──
    if (text.startsWith("/start ")) {
      const code = text.substring(7).trim().toUpperCase();

      const user = await prisma.user.findUnique({
        where: { telegramLinkCode: code },
      });

      if (!user) {
        await sendTelegramMessage(
          chatId,
          "❌ Code de liaison invalide ou expiré. Génère un nouveau code dans tes paramètres Ship or Die Africa."
        );
        return NextResponse.json({ ok: true });
      }

      // Lier le compte
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: chatId,
          telegramLinkCode: null,
        },
      });

      await sendTelegramMessage(
        chatId,
        "🌳 <b>Compte lié !</b>\n\nTu recevras tes rappels et alertes de deadline ici. Bon courage pour ta mission !"
      );

      return NextResponse.json({ ok: true });
    }

    // ── Commande /start seule (sans code) ──
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        "👋 Bienvenue sur <b>Ship or Die Africa</b> !\n\nPour lier ton compte, va dans Paramètres → Connexion Telegram, génère un code, puis clique sur le lien."
      );
      return NextResponse.json({ ok: true });
    }

    // Ignorer les autres messages
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
