import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Select explicite — ne charge jamais password/email/telegramChatId
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        name: true,
        githubUsername: true,
        githubVerified: true,
        avatarUrl: true,
        image: true,
        missions: {
          select: {
            status: true,
            title: true,
            startedAt: true,
            commitCount: true,
            currentStreak: true,
            trophies: { select: { id: true, type: true } },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    const builders = users
      .map((u) => {
        // Priorité : mission IN_PROGRESS, sinon la plus récente
        const mission =
          u.missions.find((m) => m.status === "IN_PROGRESS") || u.missions[0];
        if (!mission) return null;

        const day = Math.floor(
          (Date.now() - mission.startedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const isOverboard = day > 30 && mission.status !== "SHIPPED";
        const trophies = mission.trophies?.length || 0;

        // Ne calculer les commits/streak que pour les utilisateurs vérifiés GitHub
        const commits = u.githubVerified ? mission.commitCount : 0;
        const streak = u.githubVerified ? mission.currentStreak : 0;

        return {
          id: u.id,
          name: u.name || "Anonyme",
          project: mission.title,
          commits,
          day: Math.min(day, 30),
          streak,
          shipped: mission.status === "SHIPPED",
          overboard: isOverboard,
          trophies,
          githubUsername: u.githubUsername,
          githubVerified: u.githubVerified,
          avatarUrl: u.avatarUrl,
          image: u.image,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.overboard && !b.overboard) return 1;
        if (!a.overboard && b.overboard) return -1;
        return b.commits - a.commits;
      });

    return NextResponse.json({ builders });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
