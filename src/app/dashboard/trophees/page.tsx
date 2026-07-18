"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Trophy = {
  id: string;
  type: string;
  awardedAt: string;
};

const TROPHY_META: Record<string, { icon: string; label: string; desc: string }> = {
  FIRST_COMMIT:    { icon: "🥇", label: "First Commit",    desc: "Ton premier commit sur ta mission" },
  FIRST_DEPLOY:    { icon: "🚀", label: "First Deploy",    desc: "Ton premier déploiement en ligne" },
  FIFTY_COMMITS:   { icon: "🔥", label: "50 Commits",      desc: "50 commits sur ton repo" },
  HUNDRED_COMMITS: { icon: "💯", label: "100 Commits",     desc: "100 commits sur ton repo" },
  SHIPPED:         { icon: "🏴‍☠️", label: "Shipped",        desc: "Mission complétée et lien live" },
  EARLY_BIRD:      { icon: "⚡", label: "Early Bird",      desc: "Premier de la cohorte à shipper" },
};

const ALL_TYPES = Object.keys(TROPHY_META);

export default function TropheesPage() {
  const { data: session, status } = useSession();
  const [unlockedTypes, setUnlockedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const userId = (session.user as any).id;
    if (!userId) return;

    (async () => {
      try {
        const res = await fetch(`/api/missions?userId=${userId}`);
        const data = await res.json();
        const trophies: Trophy[] = data.missions?.[0]?.trophies || [];
        setUnlockedTypes(trophies.map((t) => t.type));
      } catch (err) {
        console.error("Trophees load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black">🏆 Trophées</h1>
      <p className="text-base-content/50 text-sm">
        Débloque des badges en progressant sur ta mission. Ils sont visibles publiquement sur ton profil.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {ALL_TYPES.map((type) => {
          const meta = TROPHY_META[type];
          const unlocked = unlockedTypes.includes(type);
          return (
            <div
              key={type}
              className={`rounded-2xl p-6 ${
                unlocked
                  ? "card-glow border border-warning/30 bg-warning/5"
                  : "bg-base-content/5 border border-base-content/10 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`text-5xl ${unlocked ? "" : "grayscale opacity-50"}`}>
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{meta.label}</h3>
                  <p className="text-base-content/50 text-sm mb-2">{meta.desc}</p>
                  {unlocked ? (
                    <span className="badge badge-warning badge-sm">Débloqué ✓</span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">Verrouillé</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
