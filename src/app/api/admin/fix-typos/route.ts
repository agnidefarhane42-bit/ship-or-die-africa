import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route temporaire de correction des fautes dans les données mission.
// À supprimer après exécution.
export async function GET() {
  const results: { id: string; before: string; after: string; field: string }[] = [];

  // 1. Fetch toutes les missions SHIPPED
  const missions = await prisma.mission.findMany({
    where: { status: "SHIPPED" },
    select: { id: true, title: true, tagline: true, description: true },
  });

  for (const m of missions) {
    const updates: Record<string, string> = {};

    // ── Corriger le titre ──
    if (m.title) {
      let fixedTitle = m.title;
      // "Shop or die" → "Shop or Die" (capitalisation correcte)
      if (fixedTitle === "Shop or die") {
        fixedTitle = "Shop or Die";
      }
      if (fixedTitle !== m.title) {
        updates.title = fixedTitle;
        results.push({ id: m.id, before: m.title, after: fixedTitle, field: "title" });
      }
    }

    // ── Corriger le tagline ──
    if (m.tagline) {
      let fixedTagline = m.tagline;
      // "Une Site pour les développeur" → "Un site pour les développeurs"
      fixedTagline = fixedTagline.replace(
        /Une Site pour les développeur/i,
        "Un site pour les développeurs"
      );
      // "rack la honte" → "racks la honte" (ou "racke")
      fixedTagline = fixedTagline.replace(
        /qui te rack la honte/i,
        "qui te racks la honte"
      );
      // "aujourd hui" → "aujourd'hui" (apostrophe manquante)
      fixedTagline = fixedTagline.replace(/aujourd\s+hui/gi, "aujourd'hui");
      // "ne codes pas" → "ne codes pas" (déjà correct mais check)
      // "ne code pas" → "ne codes pas" (accord)
      fixedTagline = fixedTagline.replace(/ne code pas aujourd'hui/i, "ne codes pas aujourd'hui");

      if (fixedTagline !== m.tagline) {
        updates.tagline = fixedTagline;
        results.push({ id: m.id, before: m.tagline, after: fixedTagline, field: "tagline" });
      }
    }

    // ── Correr la description ──
    if (m.description) {
      let fixedDesc = m.description;
      fixedDesc = fixedDesc.replace(/aujourd\s+hui/gi, "aujourd'hui");
      fixedDesc = fixedDesc.replace(/qui te rack la honte/i, "qui te racks la honte");

      if (fixedDesc !== m.description) {
        updates.description = fixedDesc;
        results.push({ id: m.id, before: m.description, after: fixedDesc, field: "description" });
      }
    }

    // ── Appliquer les corrections ──
    if (Object.keys(updates).length > 0) {
      await prisma.mission.update({
        where: { id: m.id },
        data: updates,
      });
    }
  }

  return NextResponse.json({
    message: `Correction terminée. ${results.length} champ(s) modifié(s).`,
    corrections: results,
  });
}
