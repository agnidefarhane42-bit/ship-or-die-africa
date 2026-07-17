"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Mission = {
  id: string;
  title: string;
  description: string;
  url: string | null;
  repoUrl: string | null;
  status: string;
  startedAt: string;
  deadline: string;
  trophies: { id: string; type: string }[];
};

type Commit = {
  sha: string;
  message: string;
  date: string;
  author: string;
};

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
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [mission, setMission] = useState<Mission | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [leaderboard, setLeaderboard] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const userId = (session.user as any).id;
    if (!userId) return;

    (async () => {
      try {
        // Charger la mission de l'utilisateur
        const missionRes = await fetch(`/api/missions?userId=${userId}`);
        const missionData = await missionRes.json();
        if (missionData.missions?.length > 0) {
          setMission(missionData.missions[0]);
        }

        // Charger les commits GitHub si l'utilisateur a un repo
        if (missionData.missions?.[0]?.repoUrl) {
          const repoMatch = missionData.missions[0].repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
          if (repoMatch) {
            const [, username, repo] = repoMatch;
            const commitsRes = await fetch(`/api/github/commits?username=${username}&repo=${repo}`);
            if (commitsRes.ok) {
              const commitsData = await commitsRes.json();
              setCommits(commitsData.commits || []);
            }
          }
        }

        // Charger le leaderboard
        const lbRes = await fetch("/api/leaderboard");
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(lbData.builders || []);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  const now = new Date();
  const day = mission ? Math.floor((now.getTime() - new Date(mission.startedAt).getTime()) / 86400000) + 1 : 0;
  const daysLeft = mission ? Math.max(0, Math.ceil((new Date(mission.deadline).getTime() - now.getTime()) / 86400000)) : 30;
  const progress = mission ? Math.min(100, Math.round((day / 30) * 100)) : 0;
  const trophyCount = mission?.trophies?.length || 0;
  const commitCount = commits.length;

  const heatColors = ["bg-base-content/5", "bg-success/20", "bg-success/40", "bg-success/60", "bg-success"];
  const heatmap = Array.from({ length: 30 }, (_, i) => {
    if (i >= day) return 0;
    return Math.floor(Math.random() * 4) + 1; // sera remplacé par vraies données plus tard
  });

  const trophyDefs = [
    { type: "FIRST_COMMIT", icon: "🥇", label: "First Commit" },
    { type: "FIRST_DEPLOY", icon: "🚀", label: "First Deploy" },
    { type: "FIFTY_COMMITS", icon: "🔥", label: "50 Commits" },
    { type: "HUNDRED_COMMITS", icon: "💯", label: "100 Commits" },
    { type: "SHIPPED", icon: "🏴‍☠️", label: "Shipped" },
    { type: "EARLY_BIRD", icon: "⚡", label: "Early Bird" },
  ];
  const userTrophies = mission?.trophies?.map((t) => t.type) || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Salut pirate 👋</h1>
          <p className="text-base-content/50 text-sm mt-1">
            {mission ? `Jour ${day} sur 30 · ${daysLeft} jours restants` : "Aucune mission active"}
          </p>
        </div>
        {mission && (
          <div className="badge badge-warning badge-lg gap-2 font-bold">⏰ {daysLeft} jours</div>
        )}
      </div>

      {!mission ? (
        <div className="card-glow rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-xl font-bold mb-2">Aucune mission active</h2>
          <p className="text-base-content/50 text-sm mb-4">Crée ta mission pour commencer les 30 jours.</p>
          <a href="/dashboard/mission" className="btn btn-pirate btn-sm">Créer ma mission →</a>
        </div>
      ) : (
        <>
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">⏰</div>
              <p className="text-2xl font-black gold-text">{daysLeft}</p>
              <p className="text-xs text-base-content/40">jours restants</p>
            </div>
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">💻</div>
              <p className="text-2xl font-black gold-text">{commitCount}</p>
              <p className="text-xs text-base-content/40">commits récents</p>
            </div>
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">🏆</div>
              <p className="text-2xl font-black gold-text">{trophyCount}/6</p>
              <p className="text-xs text-base-content/40">trophées</p>
            </div>
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-2xl font-black gold-text">{progress}%</p>
              <p className="text-xs text-base-content/40">progression</p>
            </div>
          </div>

          {/* PROGRESSION BAR */}
          <div className="card-glow rounded-2xl p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">📊 Progression de ta mission</h2>
              <span className="text-2xl font-black gold-text">{progress}%</span>
            </div>
            <div className="h-4 bg-base-content/10 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-error via-warning to-success transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-base-content/40">
              <span>Jour 1</span>
              <span className="text-warning font-bold">Jour {day} ← toi ici</span>
              <span>Jour 30 (deadline)</span>
            </div>
          </div>

          {/* HEATMAP */}
          <div className="card-glow rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">🔥 Heatmap des commits</h2>
            <div className="flex gap-1 flex-wrap">
              {heatmap.map((level, i) => (
                <div key={i} className={`w-7 h-7 rounded ${heatColors[level]} ${i === day - 1 ? "ring-2 ring-warning" : ""}`} title={`Jour ${i + 1}`} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-base-content/40">
              <span>Moins</span>
              {heatColors.map((c, i) => <div key={i} className={`w-4 h-4 rounded ${c}`} />)}
              <span>Plus</span>
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
                  <span className="badge badge-warning badge-sm">{mission.status}</span>
                </div>
                {mission.repoUrl && (
                  <div className="flex justify-between">
                    <span className="text-base-content/50 text-sm">Repo</span>
                    <a href={mission.repoUrl} target="_blank" className="text-info text-sm hover:underline">GitHub →</a>
                  </div>
                )}
                {mission.url && (
                  <div className="flex justify-between">
                    <span className="text-base-content/50 text-sm">URL</span>
                    <a href={mission.url} target="_blank" className="text-info text-sm hover:underline">{mission.url}</a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-base-content/50 text-sm">Deadline</span>
                  <span className="text-error font-semibold">{new Date(mission.deadline).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
              <a href="/dashboard/mission" className="btn btn-ghost btn-sm mt-4 w-full">Modifier ma mission</a>
            </div>

            {/* RECENT COMMITS */}
            <div className="card-glow rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4">🔥 Activité GitHub</h2>
              {commits.length > 0 ? (
                <div className="space-y-3">
                  {commits.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-success flex-none" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.message}</p>
                        <p className="text-xs text-base-content/40">{c.sha} · {new Date(c.date).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/40 text-center py-8">
                  {mission.repoUrl ? "Aucun commit récent. Commits en attente..." : "Connecte un repo GitHub dans ta mission pour voir l'activité."}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* TROPHÉES */}
      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">🏆 Trophées ({trophyCount}/6)</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {trophyDefs.map((t, i) => {
            const unlocked = userTrophies.includes(t.type);
            return (
              <div key={i} className={`text-center p-3 rounded-xl ${unlocked ? "bg-warning/10 border border-warning/30" : "bg-base-content/5 opacity-40"}`}>
                <div className={`text-3xl mb-1 ${unlocked ? "trophy-icon" : "grayscale"}`}>{t.icon}</div>
                <p className="text-xs text-base-content/50">{t.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEADERBOARD */}
      {leaderboard.length > 0 && (
        <div className="card-glow rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">📈 Leaderboard de la cohorte</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 p-3 rounded-xl ${p.id === (session?.user as any)?.id ? "bg-warning/10 border border-warning/30" : p.overboard ? "shame-card" : "bg-base-content/5"}`}>
                <span className="text-lg font-black w-6">{p.overboard ? "💀" : i + 1}</span>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${p.overboard ? "text-error line-through" : ""}`}>
                    {p.name}
                    {p.id === (session?.user as any)?.id && <span className="text-warning ml-2">(toi)</span>}
                  </p>
                </div>
                <span className="text-xs text-base-content/40">{p.overboard ? "Overboard" : `${p.commits} commits`}</span>
                {!p.overboard && <span className="text-xs text-base-content/40">J{p.day}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
