import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, githubUsername } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    // Validation basique du mot de passe
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit faire au moins 8 caractères" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Si l'utilisateur a déjà un mot de passe → vrai compte → conflit
      if (existing.password) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé" },
          { status: 409 }
        );
      }

      // Pas de password → c'est une entrée de preorder → on upgrade
      const hashed = await bcrypt.hash(password, 12);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name || null,
          password: hashed,
          githubUsername: githubUsername || existing.githubUsername || null,
          role: "USER",
        },
      });

      return NextResponse.json(
        { id: updated.id, email: updated.email, name: updated.name },
        { status: 201 }
      );
    }

    // Nouvel utilisateur
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashed,
        githubUsername: githubUsername || null,
        role: "USER",
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
