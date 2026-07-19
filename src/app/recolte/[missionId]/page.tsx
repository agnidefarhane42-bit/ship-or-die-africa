import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import CopyLinkButton from "./CopyLinkButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ missionId: string }>;
};

// Valider qu'un string est un ObjectId MongoDB valide (24 hex chars)
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// generateMetadata pour SEO dynamique
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { missionId } = await params;

  if (!isValidObjectId(missionId)) {
    return { title: "La Récolte — Ship or Die Africa" };
  }

  let mission;
  try {
    mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { user: { select: { name: true, githubUsername: true } } },
    });
  } catch {
    return { title: "La Récolte — Ship or Die Africa" };
  }

  if (!mission || mission.status !== "SHIPPED" || !mission.isPublic) {
    return { title: "La Récolte — Ship or Die Africa" };
  }

  const title = `${mission.tagline || mission.title} — ${mission.title} | La Récolte`;
  const description = mission.tagline || mission.description || "Un projet shippé en 30 jours par un bâtisseur du Cercle";

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Ship or Die Africa",
      ...(mission.screenshotUrl && { images: [{ url: mission.screenshotUrl }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(mission.screenshotUrl && { images: [mission.screenshotUrl] }),
    },
  };

  return metadata;
}

export default async function RecolteDetailPage({ params }: Props) {
  const { missionId } = await params;

  if (!isValidObjectId(missionId)) {
    notFound();
  }

  let mission;
  try {
    mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        user: { select: { name: true, githubUsername: true } },
        trophies: true,
      },
    });
  } catch {
    notFound();
  }

  if (!mission || mission.status !== "SHIPPED" || !mission.isPublic) {
    notFound();
  }

  const builderName = mission.user.name || mission.user.githubUsername || "Builder";
  const shippedDate = mission.shippedAt ? new Date(mission.shippedAt) : null;
  const startDate = new Date(mission.startedAt);
  const shipDays = shippedDate
    ? Math.max(1, Math.ceil((shippedDate.getTime() - startDate.getTime()) / 86400000))
    : 0;

  return (
    <main className="hero-bg min-h-screen">
      {/* NAVBAR */}
      <nav className="navbar px-4 sm:px-8 py-4 max-w-6xl mx-auto">
        <div className="flex-1">
          <Link href="/" className="text-2xl font-black tracking-tight">
            <span className="gold-text">🌳 Ship or Die</span>
            <span className="text-base-content/60 text-sm ml-1">Africa</span>
          </Link>
        </div>
        <div className="flex-none gap-2">
          <Link href="/recolte" className="btn btn-ghost btn-sm text-base-content/70">← La Récolte</Link>
          <Link href="/login" className="btn btn-gold btn-sm">Se connecter</Link>
        </div>
      </nav>

      {/* HERO Screenshot */}
      <section className="px-4 sm:px-8 pt-8 pb-4 max-w-4xl mx-auto">
        {mission.screenshotUrl ? (
          <div className="rounded-2xl overflow-hidden card-glow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mission.screenshotUrl}
              alt={mission.title}
              className="w-full aspect-video object-cover"
            />
          </div>
        ) : (
          <div className="rounded-2xl flex items-center justify-center aspect-video bg-gradient-to-br from-amber-900/30 to-emerald-900/30">
            <span className="text-7xl opacity-50">🌳</span>
          </div>
        )}
      </section>

      {/* Détails */}
      <section className="px-4 sm:px-8 pb-8 max-w-4xl mx-auto space-y-6">
        <div className="card-glow rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black">{mission.title}</h1>
              {mission.tagline && (
                <p className="text-lg text-base-content/60">{mission.tagline}</p>
              )}
            </div>
            <div className="badge badge-success gap-1 text-sm">
              🌰 Shippé en {shipDays} jour{shipDays > 1 ? "s" : ""}
            </div>
          </div>

          {/* Builder info */}
          <div className="flex items-center gap-3 pt-2 border-t border-base-content/10">
            <div className="avatar placeholder">
              <div className="bg-warning/30 text-warning-content rounded-full w-10">
                <span className="text-sm font-bold">{builderName.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div>
              <p className="font-bold text-sm">{builderName}</p>
              {mission.user.githubUsername && (
                <p className="text-xs text-base-content/40">@{mission.user.githubUsername}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {mission.description && (
            <div className="pt-4 border-t border-base-content/10">
              <h2 className="text-sm font-bold text-base-content/50 mb-2">Le projet</h2>
              <p className="text-base-content/80 leading-relaxed">{mission.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="pt-4 border-t border-base-content/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-black gold-text">{mission.commitCount}</p>
              <p className="text-xs text-base-content/40">commits</p>
            </div>
            <div>
              <p className="text-2xl font-black gold-text">{mission.currentStreak}</p>
              <p className="text-xs text-base-content/40">streak (j)</p>
            </div>
            <div>
              <p className="text-2xl font-black gold-text">{shipDays}</p>
              <p className="text-xs text-base-content/40">jours pour shipper</p>
            </div>
            <div>
              <p className="text-2xl font-black gold-text">{mission.trophies.length}</p>
              <p className="text-xs text-base-content/40">trophées</p>
            </div>
          </div>

          {/* Lien externe */}
          {mission.url && (
            <div className="pt-4 border-t border-base-content/10">
              <a
                href={mission.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-pirate btn-sm"
              >
                🔗 Voir le projet en ligne →
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-base-content/10 flex gap-3">
            <CopyLinkButton />
            <Link href="/recolte" className="btn btn-ghost btn-sm">
              ← Tous les projets
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 sm:px-8 py-12 max-w-4xl mx-auto border-t border-base-content/10 mt-20">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <Link href="/" className="font-black gold-text">🌳 Ship or Die Africa</Link>
            <p className="text-sm text-base-content/40 mt-1">Built by builders, for builders.</p>
          </div>
          <div className="flex gap-6 text-sm text-base-content/40">
            <Link href="/recolte" className="hover:text-base-content">🌰 La Récolte</Link>
            <Link href="/login" className="hover:text-base-content">Se connecter</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
