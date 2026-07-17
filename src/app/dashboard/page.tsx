"use client";

import { useState } from "react";

export default function DashboardPage() {
  // Mock data — sera connecté à Prisma + GitHub API
  const [mission] = useState({
    title: "Vendia",
    status: "IN_PROGRESS",
    day: 12,
    totalDays: 30,
    commits: 23,
    streak: 5,
  });

  const daysLeft = mission.totalDays - mission.day;
  const progress = Math.round((mission.day / mission.totalDays) * 100);

  const recentCommits = [
    { msg: "feat: add pricing page", time: "2h", sha: "a3f2c1d" },
    { msg: "fix: auth redirect bug", time: "5h", sha: "b8e4d2a" },
    { msg: "feat: landing page hero", time: "1j", sha: "c2a9f5e" },
    { msg: "chore: update deps", time: "2j", sha: "d7b3c8f" },
  ];

  const trophies = [
    { type: "FIRST_COMMIT", icon: "🥇", label: "First Commit", unlocked: true },
    { type: "FIRST_DEPLOY", icon: "🚀", label: "First Deploy", unlocked: true },
    { type: "FIFTY_COMMITS", icon: "🔥", label: "50 Commits", unlocked: false },
    { type: "HUNDRED_COMMITS", icon: "💯", label: "100 Commits", unlocked: false },
    { type: "SHIPPED", icon: "🏴‍☠️", label: "Shipped", unlocked: false },
    { type: "EARLY_BIRD", icon: "⚡", label: "Early Bird", unlocked: false },
  ];

  const leaderboard = [
    { rank: 1, name: "Toi", commits: 23, day: 12, shipped: false, isMe: true },
    { rank: 2, name: "Kossi", commits: 19, day: 10, shipped: false },
    { rank: 3, name: "Awa", commits: 15, day: 8, shipped: false },
    { rank: 4, name: "Moussa", commits: 8, day: 15, shipped: false },
    { rank: 5, name: "Jean", commits: 2, day: 30, shipped: false, overboard: true },
  ];

  // Heatmap — 30 jours
  const heatmap = Array.from({ length: 30 }, (_, i) => {
    if (i >= mission.day) return 0;
    // mock intensity
    const levels = [0, 1, 2, 3, 4];
    return levels[Math.floor(Math.random() * (i < 5 ? 2 : 5))];
  });

  const heatColors = ["bg-base-content/5", "bg-success/20", "bg-success/40", "bg-success/60", "bg-success"];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Salut pirate 👋</h1>
          <p className="text-base-content/50 text-sm mt-1">Jour {mission.day} sur {mission.totalDays} · {daysLeft} jours restants</p>
        </div>
        <div className="badge badge-warning badge-lg gap-2 font-bold">
          ⏰ {daysLeft} jours
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-glow rounded-2xl p-5">
          <div className="text-3xl mb-2">⏰</div>
          <p className="text-2xl font-black gold-text">{daysLeft}</p>
          <p className="text-xs text-base-content/40">jours restants</p>
        </div>
        <div className="card-glow rounded-2xl p-5">
          <div className="text-3xl mb-2">🔥</div>
          <p className="text-2xl font-black gold-text">{mission.streak}</p>
          <p className="text-xs text-base-content/40">jours de streak</p>
        </div>
        <div className="card-glow rounded-2xl p-5">
          <div className="text-3xl mb-2">💻</div>
          <p className="text-2xl font-black gold-text">{mission.commits}</p>
          <p className="text-xs text-base-content/40">commits totaux</p>
        </div>
        <div className="card-glow rounded-2xl p-5">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-2xl font-black gold-text">2/6</p>
          <p className="text-xs text-base-content/40">trophées</p>
        </div>
      </div>

      {/* PROGRESSION BAR */}
      <div className="card-glow rounded-2xl p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">📊 Progression de ta mission</h2>
          <span className="text-2xl font-black gold-text">{progress}%</span>
        </div>
        <div className="h-4 bg-base-content/10 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-gradient-to-r from-error via-warning to-success transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-base-content/40">
          <span>Jour 1</span>
          <span className="text-warning font-bold">Jour {mission.day} ← toi ici</span>
          <span>Jour {mission.totalDays} (deadline)</span>
        </div>
      </div>

      {/* HEATMAP */}
      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">🔥 Heatmap des commits</h2>
        <div className="flex gap-1 flex-wrap">
          {heatmap.map((level, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded ${heatColors[level]} ${i === mission.day - 1 ? "ring-2 ring-warning" : ""}`}
              title={`Jour ${i + 1}: ${level} commits`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-base-content/40">
          <span>Moins</span>
          {heatColors.map((c, i) => <div key={i} className={`w-4 h-4 rounded ${c}`} />)}
          <span>Plus</span>
          <span className="ml-4">Streak: <b className="text-success">{mission.streak} jours 🔥</b></span>
        </div>
      </div>

      {/* TWO COLUMNS */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* MISSION */}
        <div className="card-glow rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">🎯 Ma Mission</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-base-content/50 text-sm">Projet</span>
              <span className="font-bold">{mission.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/50 text-sm">Statut</span>
              <span className="badge badge-warning badge-sm">EN COURS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/50 text-sm">Repo</span>
              <a href="#" className="text-info text-sm hover:underline">github.com/...</a>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/50 text-sm">URL</span>
              <a href="#" className="text-info text-sm hover:underline">vendia-ai.vercel.app</a>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/50 text-sm">Deadline</span>
              <span className="text-error font-semibold">15 août 2026</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm mt-4 w-full">Modifier ma mission</button>
        </div>

        {/* RECENT COMMITS */}
        <div className="card-glow rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">🔥 Activité GitHub</h2>
          <div className="space-y-3">
            {recentCommits.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-success flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.msg}</p>
                  <p className="text-xs text-base-content/40">{c.sha} · {c.time}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="#" className="btn btn-ghost btn-sm mt-4 w-full">Voir tout sur GitHub →</a>
        </div>
      </div>

      {/* TROPHÉES */}
      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">🏆 Trophées débloqués (2/6)</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {trophies.map((t, i) => (
            <div key={i} className={`text-center p-3 rounded-xl ${t.unlocked ? "bg-warning/10 border border-warning/30" : "bg-base-content/5 opacity-40"}`}>
              <div className={`text-3xl mb-1 ${t.unlocked ? "trophy-icon" : "grayscale"}`}>{t.icon}</div>
              <p className="text-xs text-base-content/50">{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LEADERBOARD */}
      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">📈 Leaderboard de la cohorte</h2>
        <div className="space-y-2">
          {leaderboard.map((p) => (
            <div 
              key={p.rank}
              className={`flex items-center gap-4 p-3 rounded-xl ${
                p.isMe ? "bg-warning/10 border border-warning/30" : p.overboard ? "shame-card" : "bg-base-content/5"
              }`}
            >
              <span className={`text-lg font-black w-6 ${
                p.rank === 1 ? "text-warning" : p.rank === 2 ? "text-base-content/60" : p.rank === 3 ? "text-error" : "text-base-content/30"
              }`}>
                {p.overboard ? "💀" : p.rank}
              </span>
              <div className="flex-1">
                <p className={`font-bold text-sm ${p.overboard ? "text-error line-through" : ""}`}>
                  {p.name}
                  {p.isMe && <span className="text-warning ml-2">(toi)</span>}
                </p>
              </div>
              <span className="text-xs text-base-content/40">{p.overboard ? "Overboard" : `${p.commits} commits`}</span>
              {!p.overboard && <span className="text-xs text-base-content/40">J{p.day}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
