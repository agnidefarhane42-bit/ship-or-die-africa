import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { userId, name, bio, githubUsername } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
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
      githubUsername: updated.githubUsername 
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
