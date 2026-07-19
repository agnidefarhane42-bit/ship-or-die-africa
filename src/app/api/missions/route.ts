import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendTelegramMessage, sendGroupMessage, escapeHtml } from "@/lib/telegram";

/** Libellés Baobab pour les trophées attribués au ship */
const TROPHY_LABELS: Record<string, string> = {
  SHIPPED: "Fruit récolté",
  EARLY_BIRD: "Premier au Cercle",
};

/** Notifie l'utilisateur qui a débloqué une feuille (pas les autres membres). */
async function notifyTrophyUnlocked(
  user: {
    telegramChatId?: string | null;
    notifyTrophyUnlocked?: boolean;
  } | null | undefined,
  type: string,
  missionTitle?: string
) {
  if (!user?.notifyTrophyUnlocked || !user.telegramChatId) return;
  try {
    const label = TROPHY_LABELS[type] || type;
    const safeTitle = missionTitle ? escapeHtml(missionTitle) : "";
    const message =
      `🌿 <b>Nouvelle feuille débloquée !</b>\n\n` +
      `${label}\n` +
      (safeTitle ? `<i>${safeTitle}</i>\n\n` : "\n") +
      `Continue de pousser. 🌳`;
    await sendTelegramMessage(user.telegramChatId, message);
  } catch (err) {
    console.error("notifyTrophyUnlocked error:", err);
  }
}

// Créer une mission
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // ── Gate de paiement ──
    // Un utilisateur doit avoir au moins un Payment PAID pour créer une mission.
    // Soft alternative possible : autoriser la création mais bloquer le ship.
    // Choix actuel : hard gate pour garder l'intégrité de la cohorte.
    const paid = await prisma.payment.findFirst({
      where: { userId: session.user.id, status: "PAID" },
    });
    if (!paid) {
      return NextResponse.json(
        { error: "Paiement requis pour créer une mission. Rejoins le Cercle d'abord." },
        { status: 402 }
      );
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
        pauseDaysUsed: 0,
      },
    });

    return NextResponse.json(mission, { status: 201 });
  } catch (err) {
    console.error("Create mission error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Récupérer les missions du user connecté (IN_PROGRESS en premier)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const missions = await prisma.mission.findMany({
      where: { userId: session.user.id },
      include: { trophies: true },
      // orderBy status est un pré-tri approximatif ; le .sort() JS ci-dessous
      // garantit IN_PROGRESS en premier, puis par createdAt desc.
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Garantir que la mission IN_PROGRESS (si existe) est en première position
    missions.sort((a, b) => {
      if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
      if (b.status === "IN_PROGRESS" && a.status !== "IN_PROGRESS") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ missions });
  } catch (err) {
    console.error("Get missions error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Mettre à jour une mission (statut + champs Récolte + pause)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { missionId, status, tagline, screenshotUrl, isPublic, url, usePauseDay } = body;

    if (!missionId) {
      return NextResponse.json({ error: "missionId requis" }, { status: 400 });
    }

    // Vérifier que la mission appartient à l'utilisateur connecté
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { user: true },
    });

    if (!mission) {
      return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    }

    if (mission.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // ── Cas pause : consommer 1 jour de pause ──
    if (usePauseDay === true) {
      if (mission.status !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Pause uniquement possible sur une mission en cours" }, { status: 400 });
      }
      if (mission.pauseDaysUsed >= 3) {
        return NextResponse.json({ error: "Tu as déjà utilisé tes 3 jours de pause" }, { status: 400 });
      }

      const newDeadline = new Date(mission.deadline);
      newDeadline.setDate(newDeadline.getDate() + 1);

      const updated = await prisma.mission.update({
        where: { id: missionId },
        data: {
          pauseDaysUsed: mission.pauseDaysUsed + 1,
          deadline: newDeadline,
        },
        include: { trophies: true },
      });

      return NextResponse.json({
        mission: updated,
        message: `1 jour de pause utilisé. Deadline prolongée au ${newDeadline.toLocaleDateString("fr-FR")}. Il te reste ${3 - updated.pauseDaysUsed} jour(s) de pause.`,
      });
    }

    // ── Cas 1 : changement de statut (SHIPPED ou FAILED) ──
    if (status !== undefined) {
      if (!["SHIPPED", "FAILED"].includes(status)) {
        return NextResponse.json({ error: "Statut non autorisé" }, { status: 400 });
      }

      // Empêcher le re-ship / re-abandon d'une mission déjà terminée
      if (mission.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { error: "Cette mission est déjà terminée (shippée ou abandonnée)." },
          { status: 400 }
        );
      }

      // Pour SHIPPED, exiger une URL renseignée (soit déjà sur la mission, soit passée dans la requête)
      const effectiveUrl = url || mission.url;
      if (status === "SHIPPED" && !effectiveUrl) {
        return NextResponse.json({ error: "URL du projet requise pour shipper" }, { status: 400 });
      }

      const updateData: any = { status };
      if (status === "SHIPPED") {
        updateData.shippedAt = new Date();

        // Set l'URL si fournie dans le ship
        if (url) {
          updateData.url = url;
        }

        // Accepter les champs Récolte au moment du ship
        if (tagline !== undefined) {
          if (!tagline || tagline.trim().length === 0) {
            return NextResponse.json({ error: "Tagline requise pour shipper" }, { status: 400 });
          }
          if (tagline.length > 100) {
            return NextResponse.json({ error: "Tagline trop longue (max 100 caractères)" }, { status: 400 });
          }
          updateData.tagline = tagline.trim();
        }
        if (screenshotUrl !== undefined) {
          updateData.screenshotUrl = screenshotUrl || null;
        }
        if (isPublic !== undefined) {
          updateData.isPublic = isPublic;
        }
      }

      await prisma.mission.update({
        where: { id: missionId },
        data: updateData,
        include: { trophies: true },
      });

      // Attribuer le trophée SHIPPED (@@unique protège les doublons par mission)
      if (status === "SHIPPED") {
        try {
          await prisma.trophy.create({
            data: { missionId, type: "SHIPPED" },
          });
          // Notif uniquement si create réussi
          await notifyTrophyUnlocked(mission.user, "SHIPPED", mission.title);
        } catch {
          // déjà existant grâce à @@unique([missionId, type])
        }

        // ── EARLY_BIRD global (au plus un dans toute la base) ──
        // Check + create défensif compatible MongoDB (pas de transaction multi-doc fiable).
        // findFirst sur type=EARLY_BIRD (global), pas count(missions SHIPPED).
        // Si deux ships concurrent → le second create échoue ou voit déjà un EARLY_BIRD.
        try {
          const existingEarlyBird = await prisma.trophy.findFirst({
            where: { type: "EARLY_BIRD" },
            select: { id: true },
          });

          if (!existingEarlyBird) {
            await prisma.trophy.create({
              data: { missionId, type: "EARLY_BIRD" },
            });
            // Notif uniquement si create réussi
            await notifyTrophyUnlocked(mission.user, "EARLY_BIRD", mission.title);
          }
        } catch {
          // Course : un autre ship a créé EARLY_BIRD entre le findFirst et le create
          // (ou @@unique missionId+type) — ignorer silencieusement
        }

        // ── notifySomeoneShipped ──
        // Notifier les autres users qui ont activé cette préférence
        try {
          const interestedUsers = await prisma.user.findMany({
            where: {
              notifySomeoneShipped: true,
              telegramChatId: { not: null },
              id: { not: session.user.id }, // pas l'auteur
            },
            select: { telegramChatId: true, name: true },
          });

          const shipperName = escapeHtml(mission.user?.name || "Un bâtisseur");
          const safeTitle = escapeHtml(mission.title);
          const message =
            `🌰 <b>${shipperName}</b> a shippé <b>${safeTitle}</b> !\n\n` +
            `Un fruit de plus dans La Récolte. 🌳`;

          for (const u of interestedUsers) {
            if (u.telegramChatId) {
              await sendTelegramMessage(u.telegramChatId, message);
            }
          }
        } catch (notifyErr) {
          console.error("notifySomeoneShipped error:", notifyErr);
          // ne bloque pas le ship
        }

        // ── Annonce dans le groupe Telegram ──
        // Poste un message festif dans le groupe communautaire.
        // Respecte user.notifyGroupOnShipFail (opt-out).
        // Non-bloquant : si Telegram est indisponible, le ship réussit quand même.
        if (mission.user?.notifyGroupOnShipFail) {
          try {
            const baseUrl = process.env.NEXTAUTH_URL || "";
            const shipperName = escapeHtml(mission.user?.name || "Un bâtisseur");
            const safeTitle = escapeHtml(mission.title);
            const safeTagline = tagline ? escapeHtml(tagline.trim()) : "";
            const builderLink = `${baseUrl}/builders/${session.user.id}`;
            const recolteLink = `${baseUrl}/recolte/${missionId}`;

            const groupMsg =
              `🌰 <b>${shipperName}</b> a shippé <b>${safeTitle}</b> !\n\n` +
              (safeTagline ? `<i>${safeTagline}</i>\n\n` : "") +
              `👉 Voir le profil : ${builderLink}\n` +
              `👉 Voir la fiche : ${recolteLink}\n\n` +
              `Un fruit de plus sous le baobab. 🌳`;

            await sendGroupMessage(groupMsg);
          } catch (groupErr) {
            console.error("Group announcement (ship) error:", groupErr);
            // ne bloque pas le ship
          }
        }
      }

      // Recharger avec trophées à jour
      const final = await prisma.mission.findUnique({
        where: { id: missionId },
        include: { trophies: true },
      });

      return NextResponse.json({ mission: final });
    }

    // ── Cas 2 : mise à jour des champs (pas de changement de statut) ──
    const updateData: any = {};
    if (url !== undefined) {
      updateData.url = url || null;
    }
    if (tagline !== undefined) {
      if (tagline && tagline.length > 100) {
        return NextResponse.json({ error: "Tagline trop longue (max 100 caractères)" }, { status: 400 });
      }
      updateData.tagline = tagline ? tagline.trim() : null;
    }
    if (screenshotUrl !== undefined) {
      updateData.screenshotUrl = screenshotUrl || null;
    }
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    }

    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: { trophies: true },
    });

    return NextResponse.json({ mission: updated });
  } catch (err) {
    console.error("Update mission error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
