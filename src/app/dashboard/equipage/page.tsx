"use client";

export default function EquipagePage() {
  const crew = [
    { name: "Toi", project: "Vendia", bio: "Dev full-stack, Bénin", day: 12, commits: 23, shipped: false, isMe: true, trophies: 2, status: "active" },
    { name: "Kossi", project: "PayGate", bio: "Indie hacker, Côte d'Ivoire", day: 10, commits: 19, shipped: false, trophies: 2, status: "active" },
    { name: "Awa", project: "Marché Live", bio: "Designer/dev, Sénégal", day: 8, commits: 15, shipped: false, trophies: 1, status: "active" },
    { name: "Moussa", project: "Sango Dev", bio: "Backend dev, Mali", day: 15, commits: 12, shipped: false, trophies: 1, status: "active" },
    { name: "Fatou", project: "TutorMatch", bio: "Frontend dev, Burkina", day: 6, commits: 9, shipped: false, trophies: 1, status: "active" },
    { name: "Ibrahim", project: "AgriPrice", bio: "Full-stack, Niger", day: 14, commits: 7, shipped: false, trophies: 1, status: "active" },
    { name: "Jean", project: "NonCommencé", bio: "Etait là au début...", day: 30, commits: 2, shipped: false, trophies: 0, status: "overboard" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl sm:text-3xl font-black">🌳 Le Cercle</h1>
        <span className="badge badge-warning gap-2">6 bâtisseurs · 1 flétri</span>
      </div>

      <p className="text-base-content/50 text-sm">
        Ta cohorte. Vous êtes sous le même baobab. Check-ins quotidiens, entraide, et accountability.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {crew.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-5 ${
              m.isMe ? "card-glow border border-warning/30" : m.status === "overboard" ? "shame-card" : "bg-base-content/5 border border-base-content/10"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`avatar placeholder ${m.status === "overboard" ? "opacity-40" : ""}`}>
                <div className={`w-12 rounded-full ${m.isMe ? "bg-warning text-base-100" : "bg-base-content/20 text-base-content"}`}>
                  <span className="text-lg">{m.name[0]}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${m.status === "overboard" ? "text-error line-through" : ""}`}>
                    {m.name}
                    {m.isMe && <span className="text-warning text-xs ml-1">(toi)</span>}
                  </h3>
                  {m.status === "overboard" && <span className="text-xl">🥀</span>}
                </div>
                <p className="text-xs text-base-content/40 mb-2">{m.bio}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="badge badge-sm badge-ghost">{m.project}</span>
                  {!m.shipped && m.status !== "overboard" && (
                    <>
                      <span className="badge badge-sm">J{m.day}</span>
                      <span className="badge badge-sm badge-success">🔥 {m.commits} commits</span>
                      <span className="badge badge-sm badge-warning">🌿 {m.trophies}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Telegram CTA */}
      <div className="card-glow rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">💬</div>
        <h2 className="font-bold text-lg mb-2">Groupe Telegram de la cohorte</h2>
        <p className="text-sm text-base-content/50 mb-4">Check-ins quotidiens, entraide, et accountability en temps réel.</p>
        <a href="#" className="btn btn-gold btn-sm">Rejoindre le groupe Telegram →</a>
      </div>
    </div>
  );
}
