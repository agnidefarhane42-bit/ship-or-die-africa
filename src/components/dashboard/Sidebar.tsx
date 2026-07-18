"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/mission", label: "Ma Mission", icon: "🎯" },
  { href: "/dashboard/trophees", label: "Feuilles", icon: "🌿" },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "📈" },
  { href: "/dashboard/equipage", label: "Le Cercle", icon: "🌳" },
  { href: "/dashboard/settings", label: "Paramètres", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex flex-col w-64 min-h-screen border-r border-base-content/10 bg-base-200/50 backdrop-blur-xl fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-base-content/10">
        <Link href="/" className="text-xl font-black gold-text">🌳 Ship or Die</Link>
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
          <p className="text-xs text-base-content/40 mb-1">Days remaining</p>
          <p className="text-2xl font-black gold-text">18 jours</p>
          <div className="mt-2 h-2 bg-base-content/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-error to-warning" style={{ width: "40%" }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
