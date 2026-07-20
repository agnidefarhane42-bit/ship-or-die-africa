"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/mission", label: "Ma Mission", icon: "🎯" },
  { href: "/dashboard/trophees", label: "Feuilles", icon: "🌿" },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "📈" },
  { href: "/dashboard/equipage", label: "Le Cercle", icon: "🌳" },
  { href: "/recolte", label: "La Récolte", icon: "🌰" },
  { href: "/dashboard/settings", label: "Paramètres", icon: "⚙️" },
];

const adminLink = { href: "/dashboard/admin", label: "Admin", icon: "🛡️" };

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [pauseLeft, setPauseLeft] = useState(3);

  const isAdmin = session?.user?.role === "ADMIN";
  const links = isAdmin ? [...baseLinks.slice(0, -1), adminLink, baseLinks[baseLinks.length - 1]] : baseLinks;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/missions");
        if (!res.ok) return;
        const data = await res.json();
        const mission = data.missions?.[0];
        if (!mission || mission.status !== "IN_PROGRESS") {
          setDaysLeft(null);
          return;
        }
        const now = new Date();
        const left = Math.max(
          0,
          Math.floor((new Date(mission.deadline).getTime() - now.getTime()) / 86400000)
        );
        const day = Math.min(
          30,
          Math.floor(
            (now.getTime() - new Date(mission.startedAt).getTime()) / 86400000
          ) + 1
        );
        setDaysLeft(left);
        setProgress(Math.min(100, Math.round((day / 30) * 100)));
        setPauseLeft(Math.max(0, 3 - (mission.pauseDaysUsed ?? 0)));
      } catch {
        // silencieux
      }
    })();
  }, [pathname]);

  return (
    <aside className="hidden sm:flex flex-col w-64 min-h-screen border-r border-base-content/10 bg-base-200/50 backdrop-blur-xl fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-base-content/10">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
          <span className="text-xl font-black gold-text">Ship or Die</span>
        </Link>
        <p className="text-xs text-base-content/40 mt-1">Africa</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active
                  ? "bg-warning/10 border border-warning/30 text-warning font-semibold"
                  : "text-base-content/50 hover:bg-base-content/5 hover:text-base-content"
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-base-content/10">
        <div className="card-glow rounded-xl p-4">
          {daysLeft !== null ? (
            <>
              <p className="text-xs text-base-content/40 mb-1">Jours restants</p>
              <p className="text-2xl font-black gold-text">{daysLeft} jour{daysLeft > 1 ? "s" : ""}</p>
              <div className="mt-2 h-2 bg-base-content/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-error to-warning"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {pauseLeft > 0 && (
                <p className="text-xs text-base-content/40 mt-2">
                  ⏸ {pauseLeft} jour{pauseLeft > 1 ? "s" : ""} de pause restant{pauseLeft > 1 ? "s" : ""}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-base-content/40 mb-1">Mission</p>
              <p className="text-sm text-base-content/60">Aucune mission active</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
