import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * GET /api/cron/notify
 * Cron de notifications Telegram — protégé par CRON_SECRET.
 * Planifié à 6h30 UTC (voir vercel.json), après sync-missions (6h UTC),
 * pour que les rappels utilisent des commits/streak déjà synchronisés.
 *
 * Pour chaque mission IN_PROGRESS dont l'utilisateur a un telegramChatId :
 *   1. Rappel quotidien (si notifyDailyReminder) : jours restants, commits du jour, streak
 *   2. Alerte de deadline à J-7, J-3, J-1 (si notifyDeadlineAlert, sans doublon)
 *
 * Les paliers déjà notifiés sont stockés dans mission.deadlineAlertsNotified.
 */
export async function GET(req: NextRequest) {
  // ── Vérification du secret ──
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
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
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // ── Rappel quotidien (si autorisé) ──
      if (user.notifyDailyReminder) {
        const todayKey = now.toISOString().substring(0, 10);
        const commitsToday =
          (mission.commitsByDay as Record<string, number> | null)?.[todayKey] ?? 0;

        const message =
          `🌳 <b>Rappel du jour</b>\n\n` +
          `<b>${mission.title}</b>\n` +
          `⏰ ${daysLeft} jours restants\n` +
          `💻 ${commitsToday} commit${commitsToday > 1 ? "s" : ""} aujourd'hui\n` +
          `🔥 Streak : ${mission.currentStreak} jour${mission.currentStreak > 1 ? "s" : ""}\n\n` +
          `Continue de pousser ! 💪`;

        await sendTelegramMessage(user.telegramChatId, message);
        remindersSent++;
      }

      // ── Alerte de deadline (J-7, J-3, J-1) ──
      if (user.notifyDeadlineAlert) {
        const alerts = mission.deadlineAlertsNotified as string[] | null;
        const alreadyNotified = alerts || [];

        let alertLevel: string | null = null;
        if (daysLeft === 7) alertLevel = "J-7";
        else if (daysLeft === 3) alertLevel = "J-3";
        else if (daysLeft === 1) alertLevel = "J-1";

        if (alertLevel && !alreadyNotified.includes(alertLevel)) {
          const urgency =
            alertLevel === "J-7"
              ? "⚠️ Plus qu'une semaine !"
              : alertLevel === "J-3"
              ? "🔴 Plus que 3 jours !"
              : "🚨 DERNIER JOUR !";

          const message =
            `${urgency}\n\n` +
            `<b>${mission.title}</b>\n` +
            `⏰ ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""} avant la deadline\n\n` +
            `C'est le moment de tout donner. 🌳`;

          await sendTelegramMessage(user.telegramChatId, message);

          // Enregistrer le palier comme notifié
          const updatedAlerts = [...alreadyNotified, alertLevel];
          await prisma.mission.update({
            where: { id: mission.id },
            data: { deadlineAlertsNotified: updatedAlerts },
          });
          alertsSent++;
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
