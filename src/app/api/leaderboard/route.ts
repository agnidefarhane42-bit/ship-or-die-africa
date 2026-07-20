import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
            deadline: true,
            commitCount: true,
            currentStreak: true,
            trophies: { select: { id: true, type: true } },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    interface LeaderboardBuilder {
      id: string;
      name: string;
      project: string;
      commits: number;
      day: number;
      streak: number;
      shipped: boolean;
      overboard: boolean;
      trophies: number;
      githubUsername: string | null;
      githubVerified: boolean;
      avatarUrl: string | null;
      image: string | null;
    }

    const now = Date.now();

    const builders = users
      .map((u): LeaderboardBuilder | null => {
        const mission =
          u.missions.find((m) => m.status === "IN_PROGRESS") || u.missions[0];
        if (!mission) return null;

        // Jour 1 = premier jour civil (aligné dashboard)
        const day = Math.min(
          30,
          Math.floor((now - mission.startedAt.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        // Overboard = FAILED ou deadline dépassée sans SHIPPED (respecte les pauses)
        const isOverboard =
          mission.status === "FAILED" ||
          (mission.status !== "SHIPPED" && now > mission.deadline.getTime());

        const trophies = mission.trophies?.length || 0;
        const commits = u.githubVerified ? mission.commitCount : 0;
        const streak = u.githubVerified ? mission.currentStreak : 0;

        return {
          id: u.id,
          name: u.name || "Anonyme",
          project: mission.title,
          commits,
          day,
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
      .filter((b): b is LeaderboardBuilder => !!b)
      .sort((a, b) => {
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
