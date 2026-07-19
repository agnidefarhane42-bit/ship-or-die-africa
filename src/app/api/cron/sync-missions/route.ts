import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMission } from "@/lib/sync-mission";

// Route cron — protégée par CRON_SECRET (Bearer) OU header x-vercel-cron
// Appelée 1×/jour à 6h UTC par Vercel Cron (voir vercel.json).
// Tourne avant /api/cron/notify (6h30 UTC) pour que les rappels
// utilisent des commits/streak à jour.
function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isBearerOk = !!secret && authHeader === `Bearer ${secret}`;
  // Header injecté automatiquement par Vercel Cron
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
      select: { id: true },
    });

    const results = await Promise.allSettled(
      missions.map((m) => syncMission(m.id))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      total: missions.length,
      succeeded,
      failed,
    });
  } catch (err) {
    console.error("Cron sync-missions error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
