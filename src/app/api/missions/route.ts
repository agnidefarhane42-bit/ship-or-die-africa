import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Créer une mission
export async function POST(req: NextRequest) {
  try {
    const { userId, title, description, repoUrl, url } = await req.json();

    if (!userId || !title) {
      return NextResponse.json({ error: "userId et title requis" }, { status: 400 });
    }

    const startedAt = new Date();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const mission = await prisma.mission.create({
      data: {
        userId,
        title,
        description: description || "",
        repoUrl: repoUrl || null,
        url: url || null,
        startedAt,
        deadline,
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json(mission, { status: 201 });
  } catch (err) {
    console.error("Create mission error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Récupérer les missions d'un user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const missions = await prisma.mission.findMany({
      where: { userId },
      include: { trophies: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ missions });
  } catch (err) {
    console.error("Get missions error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
