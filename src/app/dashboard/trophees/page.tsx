"use client";

export default function TropheesPage() {
  const trophies = [
    { type: "FIRST_COMMIT", icon: "🥇", label: "First Commit", desc: "Ton premier commit sur ta mission", unlocked: true, date: "Jour 1" },
    { type: "FIRST_DEPLOY", icon: "🚀", label: "First Deploy", desc: "Ton premier déploiement en ligne", unlocked: true, date: "Jour 3" },
    { type: "FIFTY_COMMITS", icon: "🔥", label: "50 Commits", desc: "50 commits sur ton repo", unlocked: false, progress: "23/50" },
    { type: "HUNDRED_COMMITS", icon: "💯", label: "100 Commits", desc: "100 commits sur ton repo", unlocked: false, progress: "23/100" },
    { type: "SHIPPED", icon: "🏴‍☠️", label: "Shipped", desc: "Mission complétée et lien live", unlocked: false },
    { type: "EARLY_BIRD", icon: "⚡", label: "Early Bird", desc: "Premier de la cohorte à shipper", unlocked: false },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black">🏆 Trophées</h1>
      <p className="text-base-content/50 text-sm">Débloque des badges en progressant sur ta mission. Ils sont visibles publiquement sur ton profil.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {trophies.map((t, i) => (
          <div
            key={i}
            className={`rounded-2xl p-6 ${
              t.unlocked
                ? "card-glow border border-warning/30 bg-warning/5"
                : "bg-base-content/5 border border-base-content/10 opacity-60"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`text-5xl ${t.unlocked ? "trophy-icon" : "grayscale opacity-50"}`}>{t.icon}</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t.label}</h3>
                <p className="text-sm text-base-content/50 mt-1">{t.desc}</p>
                {t.unlocked ? (
                  <p className="text-xs text-success mt-2">✓ Débloqué · {t.date}</p>
                ) : t.progress ? (
                  <div className="mt-2">
                    <p className="text-xs text-base-content/40 mb-1">{t.progress}</p>
                    <div className="h-2 bg-base-content/10 rounded-full overflow-hidden">
                      <div className="h-full bg-warning" style={{ width: `${(parseInt(t.progress.split("/")[0]) / parseInt(t.progress.split("/")[1])) * 100}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-base-content/40 mt-2">🔒 Verrouillé</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
