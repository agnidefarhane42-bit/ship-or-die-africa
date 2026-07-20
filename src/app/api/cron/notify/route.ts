import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

/** Jour civil Africa/Lagos (aligné avec commitsByDay). */
function toLagosDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

      const msLeft = mission.deadline.getTime() - now.getTime();
      const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      const safeTitle = escapeHtml(mission.title);

      if (user.notifyDailyReminder) {
        // Clé Lagos — pas toISOString() UTC
        const todayKey = toLagosDayKey(now);
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

      if (user.notifyDeadlineAlert) {
        const alerts = mission.deadlineAlertsNotified as string[] | null;
        const alreadyNotified = alerts || [];

        let alertLevel: string | null = null;
        if (daysLeft === 7) alertLevel = "J-7";
        else if (daysLeft === 3) alertLevel = "J-3";
        else if (daysLeft === 1) alertLevel = "J-1";

        if (alertLevel && !alreadyNotified.includes(alertLevel)) {
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
