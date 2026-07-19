import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo

function isBlobUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(".public.blob.vercel-storage.com");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format non supporté. Utilise JPEG, PNG ou WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 2 Mo)." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Récupérer l'ancien avatarUrl pour le supprimer s'il est sur notre Blob
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const filename = `avatars/${userId}-${Date.now()}.webp`;
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    // Mettre à jour UNIQUEMENT avatarUrl (jamais image — réservé à OAuth)
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: blob.url },
    });

    // Supprimer l'ancien blob s'il appartenait à notre store
    if (isBlobUrl(existing?.avatarUrl)) {
      try {
        await del(existing!.avatarUrl!);
      } catch (err) {
        console.error("Failed to delete old avatar blob:", err);
        // non bloquant
      }
    }

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: "Erreur serveur lors de l'upload" }, { status: 500 });
  }
}

/**
 * DELETE /api/upload/avatar
 * Supprime la photo custom (avatarUrl). Ne touche jamais à User.image.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!existing?.avatarUrl) {
      return NextResponse.json({ error: "Aucune photo custom à supprimer" }, { status: 400 });
    }

    // Supprimer le blob uniquement s'il est sur notre store
    if (isBlobUrl(existing.avatarUrl)) {
      try {
        await del(existing.avatarUrl);
      } catch (err) {
        console.error("Failed to delete avatar blob:", err);
        // on continue quand même pour nettoyer la base
      }
    }

    // Ne touche JAMAIS à image (OAuth)
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Avatar delete error:", err);
    return NextResponse.json({ error: "Erreur serveur lors de la suppression" }, { status: 500 });
  }
}
