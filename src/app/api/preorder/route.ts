import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Check si email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ 
        message: "Tu es déjà sur la liste, pirate ! 🏴‍☠️" 
      }, { status: 200 });
    }

    // Créer un user sans password (pré-inscription)
    await prisma.user.create({
      data: {
        email,
        name: null,
        password: null,
        role: "USER",
      },
    });

    return NextResponse.json({ 
      message: "Place réservée ! On te contacte au lancement. 🏴‍☠️" 
    }, { status: 201 });
  } catch (err) {
    console.error("Preorder error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
