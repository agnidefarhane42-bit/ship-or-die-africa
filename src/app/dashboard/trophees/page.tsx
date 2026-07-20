"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Trophy = {
  id: string;
  type: string;
  awardedAt: string;
};

const LEAF_META: Record<string, { icon: string; label: string; desc: string }> = {
  FIRST_COMMIT:    { icon: "🌱", label: "Première Graine plantée", desc: "Ton premier commit sur ta mission" },
  FIRST_DEPLOY:    { icon: "🌿", label: "Première Pousse",         desc: "Ton premier déploiement en ligne" },
  FIFTY_COMMITS:   { icon: "🪵", label: "Racines qui s'enfoncent",  desc: "50 commits sur ton repo" },
  HUNDRED_COMMITS: { icon: "🌳", label: "Feuillage dense",         desc: "100 commits sur ton repo" },
  SHIPPED:         { icon: "🌰", label: "Fruit récolté",            desc: "Mission complétée et lien live" },
  EARLY_BIRD:      { icon: "🌅", label: "Premier au Cercle",        desc: "Premier de la cohorte à shipper" },
};

const ALL_TYPES = Object.keys(LEAF_META);

export default function TropheesPage() {
  const { data: session, status } = useSession();
  const [unlockedTypes, setUnlockedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    (async () => {
      try {
        const res = await fetch("/api/missions");
        const data = await res.json();
        // ── Agréger les trophées de TOUTES les missions ──
        // Avant: data.missions?.[0]?.trophies (ne montrait que la 1ère mission)
        // Maintenant: on parcourt toutes les missions pour collecter tous les types
        const missions = data.missions || [];
        const types = new Set<string>();
        for (const m of missions) {
          for (const t of (m.trophies || [])) {
            types.add(t.type);
          }
        }
        setUnlockedTypes(Array.from(types));
      } catch (err) {
        console.error("Feuilles load error:", err);
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
      <h1 className="text-2xl sm:text-3xl font-black">🌿 Feuilles</h1>
      <p className="text-base-content/50 text-sm">
        Débloque des feuilles en progressant sur ta mission. Elles sont visibles publiquement sur ton profil.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {ALL_TYPES.map((type) => {
          const meta = LEAF_META[type];
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
                <div className={`text-5xl ${unlocked ? "trophy-icon" : "grayscale opacity-50"}`}>
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
