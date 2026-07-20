import { prisma } from "@/lib/prisma";
import { getAvatarUrl } from "@/lib/avatar";
import { getRank } from "@/lib/rank";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const LEAF_META: Record<string, { icon: string; label: string }> = {
  FIRST_COMMIT:    { icon: "🌱", label: "Première Graine plantée" },
  FIRST_DEPLOY:    { icon: "🌿", label: "Première Pousse" },
  FIFTY_COMMITS:   { icon: "🪵", label: "Racines qui s'enfoncent" },
  HUNDRED_COMMITS: { icon: "🌳", label: "Feuillage dense" },
  SHIPPED:         { icon: "🌰", label: "Fruit récolté" },
  EARLY_BIRD:      { icon: "🌅", label: "Premier au Cercle" },
};

type Props = {
  params: Promise<{ userId: string }>;
};

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  if (!isValidObjectId(userId)) {
    return { title: "Bâtisseur — Ship or Die Africa" };
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        bio: true,
        avatarUrl: true,
        image: true,
        githubUsername: true,
        githubVerified: true,
      },
    });
  } catch {
    return { title: "Bâtisseur — Ship or Die Africa" };
  }

  if (!user) {
    return { title: "Bâtisseur — Ship or Die Africa" };
  }

  const builderName = user.name || user.githubUsername || "Bâtisseur";

  // Compter les missions shippées et commits pour le résumé
  const [shippedCount, totalCommits] = await Promise.all([
    prisma.mission.count({ where: { userId, status: "SHIPPED" } }),
    prisma.mission.aggregate({ _sum: { commitCount: true }, where: { userId } }),
  ]);

  const rank = getRank(totalCommits._sum.commitCount ?? 0);
  const title = `${builderName} — ${rank.icon} ${rank.label} | Ship or Die Africa`;
  const description = user.bio
    ? `${user.bio} — ${shippedCount} projet(s) shippé(s), ${totalCommits._sum.commitCount ?? 0} commits.`
    : `Bâtisseur de la communauté Ship or Die Africa. ${shippedCount} projet(s) shippé(s), ${totalCommits._sum.commitCount ?? 0} commits.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "Ship or Die Africa",
    },
  };
}

export default async function BuilderProfilePage({ params }: Props) {
  const { userId } = await params;

  if (!isValidObjectId(userId)) {
    notFound();
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        image: true,
        githubUsername: true,
        githubVerified: true,
      },
    });
  } catch {
    notFound();
  }

  if (!user) {
    notFound();
  }

  // ── Récupérer toutes les missions + trophées pour les stats publiques ──
  const missions = await prisma.mission.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      tagline: true,
      screenshotUrl: true,
      status: true,
      isPublic: true,
      commitCount: true,
      currentStreak: true,
      shippedAt: true,
      startedAt: true,
      trophies: {
        select: { type: true, awardedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Calcul des statistiques ──
  const shippedMissions = missions.filter((m) => m.status === "SHIPPED");
  const shippedCount = shippedMissions.length;
  const totalCommits = missions.reduce((sum, m) => sum + (m.commitCount ?? 0), 0);
  const longestStreak = missions.reduce((max, m) => Math.max(max, m.currentStreak ?? 0), 0);

  // Tous les trophées débloqués (tous projets confondus, dédupliqués par type)
  const allTrophyTypes = new Set<string>();
  for (const m of missions) {
    for (const t of m.trophies) {
      allTrophyTypes.add(t.type);
    }
  }

  // Projets publics shippés (pour la liste)
  const publicProjects = missions.filter((m) => m.status === "SHIPPED" && m.isPublic);

  const builderName = user.name || user.githubUsername || "Bâtisseur";
  const avatarSrc = getAvatarUrl(user);
  const rank = getRank(totalCommits);

  const trophyOrder = ["EARLY_BIRD", "SHIPPED", "HUNDRED_COMMITS", "FIFTY_COMMITS", "FIRST_DEPLOY", "FIRST_COMMIT"];

  return (
    <main className="hero-bg min-h-screen">
      <PublicNavbar links={[{ href: "/recolte", label: "🌰 La Récolte" }]} />

      {/* HERO — Carte de visite */}
      <section className="px-4 sm:px-8 pt-8 pb-12 max-w-4xl mx-auto">
        <div className="card-glow rounded-3xl p-8 sm:p-10 text-center">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            {avatarSrc ? (
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-warning/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc} alt={builderName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-base-content/20 flex items-center justify-center ring-4 ring-warning/20">
                <span className="text-5xl font-black">{builderName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Nom + rang */}
          <h1 className="text-3xl sm:text-4xl font-black mb-3">{builderName}</h1>
          <div className="inline-flex items-center gap-2 badge badge-warning badge-lg gap-2 font-bold mb-4">
            {rank.icon} {rank.label}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-base-content/60 max-w-xl mx-auto mt-4">{user.bio}</p>
          )}

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="card-glow rounded-2xl p-4">
              <p className="text-2xl font-black gold-text">{shippedCount}</p>
              <p className="text-xs text-base-content/40 mt-1">projets shippés</p>
            </div>
            <div className="card-glow rounded-2xl p-4">
              <p className="text-2xl font-black gold-text">{totalCommits}</p>
              <p className="text-xs text-base-content/40 mt-1">commits total</p>
            </div>
            <div className="card-glow rounded-2xl p-4">
              <p className="text-2xl font-black gold-text">{longestStreak}j</p>
              <p className="text-xs text-base-content/40 mt-1">plus long streak</p>
            </div>
          </div>
        </div>
      </section>

      {/* TROPHÉES — Tous projets confondus */}
      <section className="px-4 sm:px-8 pb-12 max-w-4xl mx-auto">
        <h2 className="text-xl font-black mb-6 text-center">🌿 Feuilles débloquées</h2>
        {allTrophyTypes.size === 0 ? (
          <p className="text-center text-base-content/40 text-sm">Aucune feuille pour l&apos;instant — le baobab pousse 🌱</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {trophyOrder
              .filter((type) => allTrophyTypes.has(type))
              .map((type) => {
                const meta = LEAF_META[type];
                return (
                  <div key={type} className="card-glow rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-3xl trophy-icon">{meta.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{meta.label}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* PROJETS PUBLICS */}
      <section className="px-4 sm:px-8 pb-16 max-w-4xl mx-auto">
        <h2 className="text-xl font-black mb-6 text-center">🌰 Projets shippés</h2>
        {publicProjects.length === 0 ? (
          <p className="text-center text-base-content/40 text-sm">
            Aucun projet public pour l&apos;instant. Le premier fruit n&apos;est pas encore tombé 🌱
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {publicProjects.map((m) => (
              <Link
                key={m.id}
                href={`/recolte/${m.id}`}
                className="card-glow rounded-2xl overflow-hidden group block"
              >
                {m.screenshotUrl ? (
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.screenshotUrl}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-emerald-900/30">
                    <span className="text-5xl opacity-60">🌳</span>
                  </div>
                )}
                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-lg group-hover:text-warning transition-colors">{m.title}</h3>
                  {m.tagline && <p className="text-sm text-base-content/60 line-clamp-2">{m.tagline}</p>}
                  {m.shippedAt && (
                    <span className="badge badge-success badge-sm">
                      Shippé le {new Date(m.shippedAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="px-4 sm:px-8 py-12 max-w-4xl mx-auto border-t border-base-content/10 mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="font-black gold-text"><img src="/logo.png" alt="Logo" className="w-6 h-6 inline-block object-contain align-middle" /> Ship or Die Africa</Link>
          <Link href="/recolte" className="text-sm text-base-content/40 hover:text-base-content">🌰 Voir La Récolte</Link>
        </div>
      </footer>
    </main>
  );
}
