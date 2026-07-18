import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMission } from "@/lib/sync-mission";

// Route cron — protégée par CRON_SECRET
// Appelée toutes les heures par Vercel Cron.
export async function GET(req: NextRequest) {
  // Vérification du secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
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
