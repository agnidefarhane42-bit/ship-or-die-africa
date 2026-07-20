import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

/**
 * GET /api/cron/notify
 * Cron de notifications Telegram.
 * Auth : Bearer CRON_SECRET OU header x-vercel-cron: 1
 * Planifié à 6h30 UTC (voir vercel.json), après sync-missions (6h UTC).
 *
 * Pour chaque mission IN_PROGRESS dont l'utilisateur a un telegramChatId :
 *   1. Rappel quotidien (si notifyDailyReminder)
 *   2. Alerte de deadline à J-7, J-3, J-1 (si notifyDeadlineAlert, sans doublon)
 *
 * Les paliers déjà notifiés sont stockés dans mission.deadlineAlertsNotified
 * AVANT l'envoi Telegram (mieux vaut un rappel manqué qu'un spam).
 */
function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isBearerOk = !!secret && authHeader === `Bearer ${secret}`;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  return isBearerOk || isVercelCron;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const missions = await prisma.mission.findMany({
      where: { status: "IN_PROGRESS" },
      include: { user: true },
    });

    let remindersSent = 0;
    let alertsSent = 0;

    const now = new Date();

    for (const mission of missions) {
      const user = mission.user;
      if (!user?.telegramChatId) continue;

      // ── Calcul des jours restants ──
      const msLeft = mission.deadline.getTime() - now.getTime();
      const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      const safeTitle = escapeHtml(mission.title);

      // ── Rappel quotidien (si autorisé) ──
      if (user.notifyDailyReminder) {
        const todayKey = now.toISOString().substring(0, 10);
        const commitsToday =
          (mission.commitsByDay as Record<string, number> | null)?.[todayKey] ?? 0;

        const message =
          `🌳 <b>Rappel du jour</b>\n\n` +
          `<b>${safeTitle}</b>\n` +
          `⏰ ${daysLeft} jours restants\n` +
          `💻 ${commitsToday} commit${commitsToday > 1 ? "s" : ""} aujourd'hui\n` +
          `🔥 Streak : ${mission.currentStreak} jour${mission.currentStreak > 1 ? "s" : ""}\n\n` +
          `Continue de pousser ! 💪`;

        await sendTelegramMessage(user.telegramChatId, message);
        remindersSent++;
      }

      // ── Alerte de deadline (J-7, J-3, J-1) ──
      // Ordre : 1) check  2) persist en DB  3) envoi Telegram
      // Si l'envoi échoue : on log, on ne retire pas le palier (anti-spam).
      if (user.notifyDeadlineAlert) {
        const alerts = mission.deadlineAlertsNotified as string[] | null;
        const alreadyNotified = alerts || [];

        let alertLevel: string | null = null;
        if (daysLeft === 7) alertLevel = "J-7";
        else if (daysLeft === 3) alertLevel = "J-3";
        else if (daysLeft === 1) alertLevel = "J-1";

        if (alertLevel && !alreadyNotified.includes(alertLevel)) {
          // 1. Persister d'abord pour éviter les doublons si Telegram réussit mais update échoue plus tard
          const updatedAlerts = [...alreadyNotified, alertLevel];
          await prisma.mission.update({
            where: { id: mission.id },
            data: { deadlineAlertsNotified: updatedAlerts },
          });

          const urgency =
            alertLevel === "J-7"
              ? "⚠️ Plus qu'une semaine !"
              : alertLevel === "J-3"
              ? "🔴 Plus que 3 jours !"
              : "🚨 DERNIER JOUR !";

          const message =
            `${urgency}\n\n` +
            `<b>${safeTitle}</b>\n` +
            `⏰ ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""} avant la deadline\n\n` +
            `C'est le moment de tout donner. 🌳`;

          try {
            await sendTelegramMessage(user.telegramChatId, message);
            alertsSent++;
          } catch (sendErr) {
            console.error(
              `Deadline alert Telegram failed (mission=${mission.id}, level=${alertLevel}):`,
              sendErr
            );
            // palier déjà en DB — pas de retry spam
          }
        }
      }
    }

    return NextResponse.json({
      total: missions.length,
      remindersSent,
      alertsSent,
    });
  } catch (err) {
    console.error("Cron notify error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
