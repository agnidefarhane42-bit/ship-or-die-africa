import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route temporaire : passe le premier user (Farhane) en ADMIN.
// Sécurité : identifie par email. À supprimer après exécution.
export async function GET() {
  // L'email de Farhane — on cherche par GitHub username pour être sûr
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { githubUsername: { equals: "agnidefarhane42-bit", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User non trouvé" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ message: "Déjà admin", user });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ message: "Admin activé ✓", user: updated });
}
