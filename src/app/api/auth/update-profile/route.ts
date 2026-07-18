import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name, bio, githubUsername } = await req.json();

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        bio: bio || null,
        githubUsername: githubUsername || null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      bio: updated.bio,
      githubUsername: updated.githubUsername,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
