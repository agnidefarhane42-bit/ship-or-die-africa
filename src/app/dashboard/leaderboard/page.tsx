"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getAvatarUrl } from "@/lib/avatar";
import Link from "next/link";

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

export default function LeaderboardPage() {
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
          setError("Impossible de charger le classement");
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
        <h1 className="text-2xl sm:text-3xl font-black">📈 Leaderboard</h1>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const currentUserId = session?.user?.id;
  const activeBuilders = builders.filter((b) => !b.overboard);
  const overboardBuilders = builders.filter((b) => b.overboard);
  const podium = activeBuilders.slice(0, 3);

  const medals = ["🥇", "🥈", "🥉"];
  const heights = ["h-40", "h-32", "h-24"];
  const podiumOrder = [1, 0, 2]; // 2e, 1er, 3e visuellement

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black">📈 Leaderboard</h1>
      <p className="text-base-content/50 text-sm">Classement par nombre de commits. Le premier à shipper gagne la feuille "Premier au Cercle" 🌅</p>

      {builders.length === 0 ? (
        <div className="card-glow rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-base-content/60 text-sm">Aucun bâtisseur dans le classement pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium.length >= 3 && (
            <div className="grid grid-cols-3 gap-4">
              {podiumOrder.map((idx) => {
                const b = podium[idx];
                if (!b) return null;
                const visualIdx = idx === 1 ? 0 : idx === 0 ? 1 : 2;
                const avatarSrc = getAvatarUrl(b);
                return (
                  <div key={b.id} className="flex flex-col items-center justify-end">
                    <div className="text-3xl mb-2">{medals[visualIdx]}</div>
                    {avatarSrc ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden mb-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarSrc} alt={b.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-base-content/20 flex items-center justify-center mb-1 text-sm font-bold">
                        {b.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <Link href={`/builders/${b.id}`} className={`text-sm font-bold hover:text-warning transition-colors ${b.id === currentUserId ? "text-warning" : ""}`}>
                      {b.name}
                    </Link>
                    <div className="text-xs text-base-content/40 mb-2">{b.commits} commits</div>
                    <div className={`w-full ${heights[visualIdx]} rounded-t-xl ${
                      visualIdx === 0 ? "bg-warning/20 border-2 border-warning/40 border-b-0" :
                      visualIdx === 1 ? "bg-base-content/15 border-2 border-base-content/30 border-b-0" :
                      "bg-error/15 border-2 border-error/30 border-b-0"
                    } flex items-center justify-center`}>
                      <span className="text-2xl font-black">{idx + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full ranking */}
          <div className="card-glow rounded-2xl p-4 sm:p-6">
            <div className="space-y-2">
              {builders.map((b, i) => {
                const avatarSrc = getAvatarUrl(b);
                return (
                  <div
                    key={b.id || i}
                    className={`flex items-center gap-3 sm:gap-4 p-3 rounded-xl ${
                      b.id === currentUserId
                        ? "bg-warning/10 border border-warning/30"
                        : b.overboard
                        ? "shame-card"
                        : "bg-base-content/5"
                    }`}
                  >
                    <span className="text-lg font-black w-6 text-center">
                      {b.overboard ? "🥀" : i + 1}
                    </span>
                    {avatarSrc ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarSrc} alt={b.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-base-content/20 flex items-center justify-center flex-none text-xs font-bold">
                        {b.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/builders/${b.id}`} className={`font-bold text-sm hover:text-warning transition-colors ${b.overboard ? "text-error line-through" : ""}`}>
                        {b.name}
                        {b.id === currentUserId && <span className="text-warning ml-2">(toi)</span>}
                        {b.shipped && <span className="text-success ml-2">🌰</span>}
                      </Link>
                      <p className="text-xs text-base-content/40 truncate">{b.project}</p>
                    </div>
                    <div className="hidden sm:flex gap-4 text-xs text-base-content/40">
                      {b.githubVerified && <span>🔥 {b.streak}j</span>}
                      <span>🌿 {b.trophies}</span>
                      <span>J{b.day}</span>
                    </div>
                    <span className="text-sm font-bold">{b.overboard ? "—" : `${b.commits}`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* In Memoriam */}
          {overboardBuilders.length > 0 && (
            <div className="shame-card rounded-2xl p-6">
              <h2 className="font-bold text-lg text-error mb-3">🥀 In Memoriam</h2>
              <p className="text-sm text-base-content/50">
                Ceux qui n'ont pas pu faire pousser leur projet à temps. On se souvient d'eux. Ils peuvent revenir dans une prochaine cohorte.
              </p>
              <div className="mt-4 space-y-3">
                {overboardBuilders.map((b, i) => (
                  <div key={b.id || i} className="flex items-center gap-3">
                    <span className="text-2xl">🥀</span>
                    <Link href={`/builders/${b.id}`} className="text-error font-bold line-through hover:text-warning transition-colors">
                      {b.name}
                    </Link>
                    <span className="text-xs text-base-content/40">— Racines coupées le jour {b.day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
