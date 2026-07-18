import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Créer une mission
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { title, description, repoUrl, url } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "title requis" }, { status: 400 });
    }

    const startedAt = new Date();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const mission = await prisma.mission.create({
      data: {
        userId: session.user.id,
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

// Récupérer les missions du user connecté
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const missions = await prisma.mission.findMany({
      where: { userId: session.user.id },
      include: { trophies: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ missions });
  } catch (err) {
    console.error("Get missions error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Mettre à jour le statut d'une mission (SHIPPED ou FAILED)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { missionId, status } = await req.json();

    if (!missionId) {
      return NextResponse.json({ error: "missionId requis" }, { status: 400 });
    }

    // Seuls SHIPPED et FAILED sont autorisés depuis le frontend
    if (!["SHIPPED", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Statut non autorisé" }, { status: 400 });
    }

    // Vérifier que la mission appartient à l'utilisateur connecté
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    }

    if (mission.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Pour SHIPPED, exiger une URL renseignée
    if (status === "SHIPPED" && !mission.url) {
      return NextResponse.json({ error: "URL du projet requise pour shipper" }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === "SHIPPED") {
      updateData.shippedAt = new Date();
    }

    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: { trophies: true },
    });

    // Attribuer le trophée SHIPPED
    if (status === "SHIPPED") {
      const existingShipped = await prisma.trophy.findFirst({
        where: { missionId, type: "SHIPPED" },
      });
      if (!existingShipped) {
        await prisma.trophy.create({
          data: { missionId, type: "SHIPPED" },
        });
      }

      // Attribuer EARLY_BIRD à la toute première mission shippée sur la plateforme
      const shippedCount = await prisma.mission.count({
        where: { status: "SHIPPED" },
      });
      if (shippedCount === 1) {
        const existingEarlyBird = await prisma.trophy.findFirst({
          where: { missionId, type: "EARLY_BIRD" },
        });
        if (!existingEarlyBird) {
          await prisma.trophy.create({
            data: { missionId, type: "EARLY_BIRD" },
          });
        }
      }
    }

    return NextResponse.json({ mission: updated });
  } catch (err) {
    console.error("Update mission status error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
