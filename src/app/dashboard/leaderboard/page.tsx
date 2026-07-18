"use client";

export default function LeaderboardPage() {
  const builders = [
    { rank: 1, name: "Toi", project: "Vendia", commits: 23, day: 12, streak: 5, shipped: false, isMe: true, trophies: 2 },
    { rank: 2, name: "Kossi", project: "PayGate", commits: 19, day: 10, streak: 7, shipped: false, trophies: 2 },
    { rank: 3, name: "Awa", project: "Marché Live", commits: 15, day: 8, streak: 3, shipped: false, trophies: 1 },
    { rank: 4, name: "Moussa", project: "Sango Dev", commits: 12, day: 15, streak: 0, shipped: false, trophies: 1 },
    { rank: 5, name: "Fatou", project: "TutorMatch", commits: 9, day: 6, streak: 4, shipped: false, trophies: 1 },
    { rank: 6, name: "Ibrahim", project: "AgriPrice", commits: 7, day: 14, streak: 2, shipped: false, trophies: 1 },
    { rank: 7, name: "Jean", project: "NonCommencé", commits: 2, day: 30, streak: 0, shipped: false, trophies: 0, overboard: true },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black">📈 Leaderboard</h1>
      <p className="text-base-content/50 text-sm">Classement par nombre de commits. Le premier à shipper gagne la feuille "Premier au Cercle" 🌅</p>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 0, 2].map((idx) => {
          const b = builders[idx];
          const heights = ["h-32", "h-40", "h-24"];
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={idx} className="flex flex-col items-center justify-end">
              <div className={`text-3xl mb-2`}>{medals[idx === 1 ? 0 : idx === 0 ? 1 : 2]}</div>
              <div className={`text-sm font-bold ${b.isMe ? "text-warning" : ""}`}>{b.name}</div>
              <div className="text-xs text-base-content/40 mb-2">{b.commits} commits</div>
              <div className={`w-full ${heights[idx === 1 ? 0 : idx === 0 ? 1 : 2]} rounded-t-xl ${
                idx === 1 ? "bg-warning/20 border-2 border-warning/40 border-b-0" : idx === 0 ? "bg-base-content/15 border-2 border-base-content/30 border-b-0" : "bg-error/15 border-2 border-error/30 border-b-0"
              } flex items-center justify-center`}>
                <span className="text-2xl font-black">{b.rank}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full ranking */}
      <div className="card-glow rounded-2xl p-4 sm:p-6">
        <div className="space-y-2">
          {builders.map((b) => (
            <div
              key={b.rank}
              className={`flex items-center gap-3 sm:gap-4 p-3 rounded-xl ${
                b.isMe ? "bg-warning/10 border border-warning/30" : b.overboard ? "shame-card" : "bg-base-content/5"
              }`}
            >
              <span className="text-lg font-black w-6 text-center">
                {b.overboard ? "🥀" : b.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${b.overboard ? "text-error line-through" : ""}`}>
                  {b.name}
                  {b.isMe && <span className="text-warning ml-2">(toi)</span>}
                </p>
                <p className="text-xs text-base-content/40 truncate">{b.project}</p>
              </div>
              <div className="hidden sm:flex gap-4 text-xs text-base-content/40">
                <span>🔥 {b.streak}j</span>
                <span>🌿 {b.trophies}/6</span>
                <span>J{b.day}</span>
              </div>
              <span className="text-sm font-bold">{b.overboard ? "—" : `${b.commits}`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* In Memoriam */}
      <div className="shame-card rounded-2xl p-6">
        <h2 className="font-bold text-lg text-error mb-3">🥀 In Memoriam</h2>
        <p className="text-sm text-base-content/50">
          Ceux qui n'ont pas pu faire pousser leur projet à temps. On se souvient d'eux. Ils peuvent revenir dans une prochaine cohorte.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-2xl">🥀</span>
          <span className="text-error font-bold line-through">Jean</span>
          <span className="text-xs text-base-content/40">— Racines coupées le jour 30</span>
        </div>
      </div>
    </div>
  );
}
