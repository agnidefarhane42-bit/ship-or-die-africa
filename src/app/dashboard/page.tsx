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
  commitCount?: number;
  commitsByDay?: Record<string, number> | null;
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

/** Jour civil Africa/Lagos — aligné avec commitsByDay (sync-mission). */
function toLagosDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysToKey(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + n * 86_400_000;
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [mission, setMission] = useState<Mission | null>(null);
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [leaderboard, setLeaderboard] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    (async () => {
      try {
        const missionRes = await fetch(`/api/missions`);
        const missionData = await missionRes.json();
        if (missionData.missions?.length > 0) {
          setAllMissions(missionData.missions);
          const active = missionData.missions.find((m: Mission) => m.status === "IN_PROGRESS");
          setMission(active || missionData.missions[0]);
        }

        const activeOrFirst =
          missionData.missions?.find((m: Mission) => m.status === "IN_PROGRESS") ||
          missionData.missions?.[0];
        if (activeOrFirst?.repoUrl) {
          const repoMatch = activeOrFirst.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
          if (repoMatch) {
            const [, username, repo] = repoMatch;
            const commitsRes = await fetch(`/api/github/commits?username=${username}&repo=${repo}`);
            if (commitsRes.ok) {
              const commitsData = await commitsRes.json();
              setCommits(commitsData.commits || []);
            }
          }
        }

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
  const day = mission
    ? Math.min(30, Math.floor((now.getTime() - new Date(mission.startedAt).getTime()) / 86400000) + 1)
    : 0;
  const daysLeft = mission
    ? Math.max(0, Math.floor((new Date(mission.deadline).getTime() - now.getTime()) / 86400000))
    : 30;
  const progress = mission ? Math.min(100, Math.round((day / 30) * 100)) : 0;
  // Trophées de toutes les missions (aligné page /trophees)
  const allTrophyTypes = new Set(
    allMissions.flatMap((m) => (m.trophies || []).map((t) => t.type))
  );
  const trophyCount = allTrophyTypes.size;
  const shippedCount = allMissions.filter((m) => m.status === "SHIPPED").length;
  const commitCount = mission?.commitCount ?? 0;

  const heatColors = ["bg-base-content/5", "bg-success/20", "bg-success/40", "bg-success/60", "bg-success"];

  function getHeatLevel(commitsOnDay: number | undefined): number {
    if (!commitsOnDay || commitsOnDay === 0) return 0;
    if (commitsOnDay <= 2) return 1;
    if (commitsOnDay <= 5) return 2;
    if (commitsOnDay <= 10) return 3;
    return 4;
  }

  // Heatmap : clés Lagos (comme sync-mission), pas UTC
  const startKey = mission ? toLagosDayKey(new Date(mission.startedAt)) : "";
  const heatmap = Array.from({ length: 30 }, (_, i) => {
    if (i >= day) return 0;
    if (!mission?.commitsByDay || !startKey) return 0;
    const key = addDaysToKey(startKey, i);
    return getHeatLevel(mission.commitsByDay[key]);
  });

  const trophyDefs = [
    { type: "FIRST_COMMIT", icon: "🌱", label: "Première Graine" },
    { type: "FIRST_DEPLOY", icon: "🌿", label: "Première Pousse" },
    { type: "FIFTY_COMMITS", icon: "🪵", label: "Racines" },
    { type: "HUNDRED_COMMITS", icon: "🌳", label: "Feuillage" },
    { type: "SHIPPED", icon: "🌰", label: "Fruit récolté" },
    { type: "EARLY_BIRD", icon: "🌅", label: "Premier au Cercle" },
  ];
  const userTrophies = Array.from(allTrophyTypes);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Salut bâtisseur 👋</h1>
          <p className="text-base-content/50 text-sm mt-1">
            {mission && mission.status === "IN_PROGRESS"
              ? `Jour ${day} sur 30 · ${daysLeft} jours restants`
              : "Aucune mission active"}
          </p>
        </div>
        {mission && mission.status === "IN_PROGRESS" && (
          <div className="badge badge-warning badge-lg gap-2 font-bold">⏰ {daysLeft} jour{daysLeft > 1 ? "s" : ""}</div>
        )}
      </div>

      {(!mission || mission.status !== "IN_PROGRESS") ? (
        <div className="card-glow rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">{shippedCount > 0 ? "🌰" : "🎯"}</div>
          <h2 className="text-xl font-bold mb-2">
            {shippedCount > 0
              ? `Prêt pour ta ${shippedCount + 1}e mission ?`
              : "Aucune mission active"}
          </h2>
          <p className="text-base-content/50 text-sm mb-4">
            {shippedCount > 0
              ? `Tu as déjà shippé ${shippedCount} projet${shippedCount > 1 ? "s" : ""}. Continue de pousser !`
              : "Crée ta mission pour commencer les 30 jours."}
          </p>
          <a href="/dashboard/mission" className="btn btn-pirate btn-sm">
            {shippedCount > 0 ? "🌱 Lancer ma prochaine mission →" : "Créer ma mission →"}
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">⏰</div>
              <p className="text-2xl font-black gold-text">{daysLeft}</p>
              <p className="text-xs text-base-content/40">jours restants</p>
            </div>
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">💻</div>
              <p className="text-2xl font-black gold-text">{commitCount}</p>
              <p className="text-xs text-base-content/40">commits</p>
            </div>
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">🌿</div>
              <p className="text-2xl font-black gold-text">{trophyCount}/6</p>
              <p className="text-xs text-base-content/40">feuilles</p>
            </div>
            <div className="card-glow rounded-2xl p-5">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-2xl font-black gold-text">{progress}%</p>
              <p className="text-xs text-base-content/40">progression</p>
            </div>
          </div>

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
            {!mission.commitsByDay && (
              <p className="text-xs text-base-content/30 mt-2 italic">
                La heatmap se remplira après la première synchronisation GitHub.
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
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
                    <a href={mission.repoUrl} target="_blank" rel="noreferrer" className="text-info text-sm hover:underline">GitHub →</a>
                  </div>
                )}
                {mission.url && (
                  <div className="flex justify-between">
                    <span className="text-base-content/50 text-sm">URL</span>
                    <a href={mission.url} target="_blank" rel="noreferrer" className="text-info text-sm hover:underline">{mission.url}</a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-base-content/50 text-sm">Deadline</span>
                  <span className="text-error font-semibold">{new Date(mission.deadline).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
              <a href="/dashboard/mission" className="btn btn-ghost btn-sm mt-4 w-full">Modifier ma mission</a>
            </div>

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

      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">🌿 Feuilles ({trophyCount}/6)</h2>
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

      {leaderboard.length > 0 && (
        <div className="card-glow rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">📈 Leaderboard de la cohorte</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 p-3 rounded-xl ${p.id === session?.user?.id ? "bg-warning/10 border border-warning/30" : p.overboard ? "shame-card" : "bg-base-content/5"}`}>
                <span className="text-lg font-black w-6">{p.overboard ? "🥀" : i + 1}</span>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${p.overboard ? "text-error line-through" : ""}`}>
                    {p.name}
                    {p.id === session?.user?.id && <span className="text-warning ml-2">(toi)</span>}
                  </p>
                </div>
                <span className="text-xs text-base-content/40">{p.overboard ? "Flétri" : `${p.commits} commits`}</span>
                {!p.overboard && <span className="text-xs text-base-content/40">J{p.day}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
