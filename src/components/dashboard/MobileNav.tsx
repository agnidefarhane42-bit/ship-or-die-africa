"use client";

import { useSession } from "next-auth/react";

export default function MobileNav() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="sm:hidden sticky top-0 z-50 bg-base-200/90 backdrop-blur-xl border-b border-base-content/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Logo" className="w-7 h-7 inline-block object-contain align-middle" />
        <span className="font-black gold-text text-lg">Ship or Die</span>
      </div>
      <details className="dropdown dropdown-end">
        <summary className="btn btn-ghost btn-sm">☰</summary>
        <ul className="menu dropdown-content bg-base-200 rounded-box shadow-lg w-52 mt-2 z-50">
          <li><a href="/dashboard">📊 Dashboard</a></li>
          <li><a href="/dashboard/mission">🎯 Ma Mission</a></li>
          <li><a href="/dashboard/trophees">🌿 Feuilles</a></li>
          <li><a href="/dashboard/leaderboard">📈 Leaderboard</a></li>
          <li><a href="/dashboard/equipage">🌳 Le Cercle</a></li>
          {isAdmin && <li><a href="/dashboard/admin">🛡️ Admin</a></li>}
          <li><a href="/dashboard/settings">⚙️ Paramètres</a></li>
        </ul>
      </details>
    </div>
  );
}
