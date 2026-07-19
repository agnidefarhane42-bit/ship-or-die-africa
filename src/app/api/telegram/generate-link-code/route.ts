import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateLinkCode } from "@/lib/telegram";

/**
 * GET /api/telegram/generate-link-code
 * Génère un code de liaison à usage unique, le sauvegarde sur l'utilisateur connecté,
 * et le renvoie au frontend pour construire le lien t.me/BOT?start=CODE.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Générer un code unique (réessayer si collision)
    let code = generateLinkCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.user.findUnique({
        where: { telegramLinkCode: code },
      });
      if (!existing) break;
      code = generateLinkCode();
      attempts++;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramLinkCode: code },
    });

    return NextResponse.json({ code });
  } catch (err) {
    console.error("Generate link code error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
