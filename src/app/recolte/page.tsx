import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PAGE_SIZE = 24;
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function RecoltePage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [missions, total] = await Promise.all([
    prisma.mission.findMany({
      where: {
        status: "SHIPPED",
        isPublic: true,
      },
      include: {
        user: {
          select: { name: true, githubUsername: true },
        },
      },
      orderBy: { shippedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.mission.count({
      where: {
        status: "SHIPPED",
        isPublic: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
          <Link href="/login" className="btn btn-gold btn-sm">Se connecter</Link>
        </div>
      </nav>

      {/* HEADER */}
      <section className="px-4 sm:px-8 pt-12 pb-8 max-w-4xl mx-auto text-center section-fade">
        <div className="text-5xl mb-4">🌰</div>
        <h1 className="text-3xl sm:text-5xl font-black mb-4">La Récolte</h1>
        <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
          Chaque projet ici a été shippé en moins de 30 jours par un bâtisseur du Cercle.
          Preuve que ça peut se faire. 🌱
        </p>
      </section>

      {/* GRID */}
      <section className="px-4 sm:px-8 pb-16 max-w-6xl mx-auto">
        {missions.length === 0 ? (
          <div className="card-glow rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-base-content/60 text-sm">
              Le premier fruit n'est pas encore tombé de l'arbre. Reviens bientôt.
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {missions.map((m) => (
                <Link
                  key={m.id}
                  href={`/recolte/${m.id}`}
                  className="card-glow rounded-2xl overflow-hidden group block"
                >
                  {/* Screenshot ou placeholder */}
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

                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-lg group-hover:text-warning transition-colors">
                      {m.title}
                    </h3>
                    {m.tagline && (
                      <p className="text-sm text-base-content/60 line-clamp-2">
                        {m.tagline}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-base-content/40">
                      <span>
                        {m.user.name || m.user.githubUsername || "Builder"}
                      </span>
                      {m.shippedAt && (
                        <span className="badge badge-success badge-sm">
                          Shippé le {new Date(m.shippedAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {page > 1 && (
                  <Link
                    href={`/recolte?page=${page - 1}`}
                    className="btn btn-ghost btn-sm"
                  >
                    ← Précédent
                  </Link>
                )}
                <span className="text-sm text-base-content/50">
                  Page {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/recolte?page=${page + 1}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Suivant →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* FOOTER */}
      <footer className="px-4 sm:px-8 py-12 max-w-4xl mx-auto border-t border-base-content/10 mt-20">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <Link href="/" className="font-black gold-text">🌳 Ship or Die Africa</Link>
            <p className="text-sm text-base-content/40 mt-1">Built by builders, for builders.</p>
          </div>
          <div className="flex gap-6 text-sm text-base-content/40">
            <Link href="/login" className="hover:text-base-content">Se connecter</Link>
            <Link href="/recolte" className="hover:text-base-content">🌰 La Récolte</Link>
            <span>·</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
