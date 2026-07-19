import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/auth/update-profile
 * Retourne le profil de l'utilisateur connecté (name, bio, github, préférences, telegram, avatar).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        image: true,
        avatarUrl: true,
        githubUsername: true,
        githubVerified: true,
        telegramChatId: true,
        notifyDailyReminder: true,
        notifyDeadlineAlert: true,
        notifyTrophyUnlocked: true,
        notifySomeoneShipped: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { name, bio, githubUsername } = body;

    // ── Préférences de notifications (optionnel) ──
    const notifyDailyReminder = typeof body.notifyDailyReminder === "boolean" ? body.notifyDailyReminder : undefined;
    const notifyDeadlineAlert = typeof body.notifyDeadlineAlert === "boolean" ? body.notifyDeadlineAlert : undefined;
    const notifyTrophyUnlocked = typeof body.notifyTrophyUnlocked === "boolean" ? body.notifyTrophyUnlocked : undefined;
    const notifySomeoneShipped = typeof body.notifySomeoneShipped === "boolean" ? body.notifySomeoneShipped : undefined;

    // Construire l'objet data — ne mettre à jour que les champs fournis
    const data: any = {};
    if (name !== undefined) data.name = name || null;
    if (bio !== undefined) data.bio = bio || null;
    if (githubUsername !== undefined) data.githubUsername = githubUsername || null;
    if (notifyDailyReminder !== undefined) data.notifyDailyReminder = notifyDailyReminder;
    if (notifyDeadlineAlert !== undefined) data.notifyDeadlineAlert = notifyDeadlineAlert;
    if (notifyTrophyUnlocked !== undefined) data.notifyTrophyUnlocked = notifyTrophyUnlocked;
    if (notifySomeoneShipped !== undefined) data.notifySomeoneShipped = notifySomeoneShipped;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      bio: updated.bio,
      image: updated.image,
      avatarUrl: updated.avatarUrl,
      githubUsername: updated.githubUsername,
      notifyDailyReminder: updated.notifyDailyReminder,
      notifyDeadlineAlert: updated.notifyDeadlineAlert,
      notifyTrophyUnlocked: updated.notifyTrophyUnlocked,
      notifySomeoneShipped: updated.notifySomeoneShipped,
      telegramChatId: updated.telegramChatId,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
