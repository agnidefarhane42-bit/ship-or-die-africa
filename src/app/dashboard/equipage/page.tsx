"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getAvatarUrl } from "@/lib/avatar";

type Builder = {
  id: string;
  name: string;
  project: string;
  commits: number;
  day: number;
  streak: number;
  shipped: boolean;
  overboard: boolean;
  trophies: number;
  githubUsername?: string;
  githubVerified?: boolean;
  avatarUrl?: string | null;
  image?: string | null;
};

export default function EquipagePage() {
  const { data: session } = useSession();
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setBuilders(data.builders || []);
        } else {
          setError("Impossible de charger la cohorte");
        }
      } catch {
        setError("Erreur réseau");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-black">🌳 Le Cercle</h1>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const currentUserId = session?.user?.id;
  const activeBuilders = builders.filter((b) => !b.overboard);
  const overboardBuilders = builders.filter((b) => b.overboard);
  const onlyMe = activeBuilders.length <= 1 && activeBuilders[0]?.id === currentUserId;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl sm:text-3xl font-black">🌳 Le Cercle</h1>
        <span className="badge badge-warning gap-2">
          {activeBuilders.length} bâtisseur{activeBuilders.length > 1 ? "s" : ""}
          {overboardBuilders.length > 0 && ` · ${overboardBuilders.length} flétri${overboardBuilders.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <p className="text-base-content/50 text-sm">
        Ta cohorte. Vous êtes sous le même baobab. Check-ins quotidiens, entraide, et accountability.
      </p>

      {onlyMe && (
        <div className="card-glow rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-base-content/60 text-sm">
            Tu es seul dans ta cohorte pour l'instant. Les autres bâtisseurs apparaîtront ici dès qu'ils rejoindront le Cercle.
          </p>
        </div>
      )}

      {builders.length === 0 ? (
        <div className="card-glow rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🌳</div>
          <p className="text-base-content/60 text-sm">Aucun bâtisseur dans la cohorte pour le moment.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {builders.map((m, i) => {
            const avatarSrc = getAvatarUrl(m);
            return (
              <div
                key={m.id || i}
                className={`rounded-2xl p-5 ${
                  m.id === currentUserId
                    ? "card-glow border border-warning/30"
                    : m.overboard
                    ? "shame-card"
                    : "bg-base-content/5 border border-base-content/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`avatar ${m.overboard ? "opacity-40" : ""}`}>
                    {avatarSrc ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarSrc} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-12 rounded-full ${m.id === currentUserId ? "bg-warning text-base-100" : "bg-base-content/20 text-base-content"}`}>
                        <span className="text-lg">{m.name?.[0]?.toUpperCase() || "?"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${m.overboard ? "text-error line-through" : ""}`}>
                        {m.name}
                        {m.id === currentUserId && <span className="text-warning text-xs ml-1">(toi)</span>}
                      </h3>
                      {m.overboard && <span className="text-xl">🥀</span>}
                      {m.shipped && <span className="text-xl">🌰</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2">
                      <span className="badge badge-sm badge-ghost">{m.project}</span>
                      {!m.overboard && (
                        <>
                          <span className="badge badge-sm">J{m.day}</span>
                          {m.githubVerified && (
                            <span className="badge badge-sm badge-success">🔥 {m.commits} commits</span>
                          )}
                          <span className="badge badge-sm badge-warning">🌿 {m.trophies}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Telegram CTA */}
      <div className="card-glow rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">💬</div>
        <h2 className="font-bold text-lg mb-2">Groupe Telegram de la cohorte</h2>
        <p className="text-sm text-base-content/50 mb-4">Check-ins quotidiens, entraide, et accountability en temps réel.</p>
        <span className="text-sm text-base-content/40 italic">Bientôt disponible — le lien sera partagé au lancement de la cohorte.</span>
      </div>
    </div>
  );
}
