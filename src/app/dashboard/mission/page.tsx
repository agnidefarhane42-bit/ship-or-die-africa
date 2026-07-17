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
  shippedAt: string | null;
  trophies: { id: string; type: string }[];
};

export default function MissionPage() {
  const { data: session, status } = useSession();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const userId = (session.user as any).id;
    if (!userId) return;

    (async () => {
      try {
        const res = await fetch(`/api/missions?userId=${userId}`);
        const data = await res.json();
        if (data.missions?.length > 0) {
          setMission(data.missions[0]);
          setTitle(data.missions[0].title);
          setDescription(data.missions[0].description);
          setRepoUrl(data.missions[0].repoUrl || "");
          setUrl(data.missions[0].url || "");
        }
      } catch (err) {
        console.error("Mission load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const userId = (session?.user as any)?.id;
    if (!userId) return;

    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, description, repoUrl, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        setSubmitting(false);
        return;
      }
      setMission(data);
      setCreating(false);
    } catch {
      setError("Erreur réseau");
      setSubmitting(false);
    }
  };

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

  // Si pas de mission → formulaire de création
  if (!mission && !creating) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-black">🎯 Ma Mission</h1>
        <div className="card-glow rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🏴‍☠️</div>
          <h2 className="text-xl font-bold mb-2">Prêt à shipper ?</h2>
          <p className="text-base-content/50 text-sm mb-6">Crée ta mission. Tu as 30 jours (+ 3 jours de pause) pour shipper ton projet.</p>
          <button onClick={() => setCreating(true)} className="btn btn-pirate">🎯 Créer ma mission</button>
        </div>
      </div>
    );
  }

  // Formulaire de création
  if (creating || (!mission && creating)) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-black">🎯 Créer ma mission</h1>
        {error && <div className="alert alert-error"><span>{error}</span></div>}
        <form onSubmit={handleCreate} className="card-glow rounded-2xl p-6 space-y-4">
          <div>
            <label className="label"><span className="label-text text-base-content/60">Nom du projet *</span></label>
            <input type="text" required placeholder="Ex: Vendia, PayGate, Marché Live..." value={title} onChange={(e) => setTitle(e.target.value)} className="input input-bordered w-full bg-base-200" />
          </div>
          <div>
            <label className="label"><span className="label-text text-base-content/60">Description</span></label>
            <textarea className="textarea textarea-bordered w-full bg-base-200" rows={3} placeholder="En une phrase, qu'est-ce que tu vas shipper ?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label"><span className="label-text text-base-content/60">Repo GitHub (optionnel)</span></label>
            <input type="url" placeholder="https://github.com/username/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="input input-bordered w-full bg-base-200" />
          </div>
          <div>
            <label className="label"><span className="label-text text-base-content/60">URL du projet (optionnel)</span></label>
            <input type="url" placeholder="https://ton-projet.vercel.app" value={url} onChange={(e) => setUrl(e.target.value)} className="input input-bordered w-full bg-base-200" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn btn-pirate flex-1">{submitting ? "Création..." : "🚀 Lancer ma mission"}</button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost">Annuler</button>
          </div>
        </form>
      </div>
    );
  }

  if (!mission) return null;

  const progress = Math.min(100, Math.round((day / 30) * 100));

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black">🎯 Ma Mission</h1>

      {/* Countdown */}
      <div className="card-glow rounded-2xl p-6 text-center">
        <p className="text-base-content/50 text-sm mb-2">Deadline</p>
        <p className="text-4xl font-black text-error mb-2">{daysLeft} jours</p>
        <p className="text-base-content/40 text-sm">{new Date(mission.deadline).toLocaleDateString("fr-FR")} · 3 jours de pause disponibles</p>
        <div className="h-3 bg-base-content/10 rounded-full overflow-hidden mt-4 max-w-md mx-auto">
          <div className="h-full bg-gradient-to-r from-error to-warning" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Mission details */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Détails de la mission</h2>
          <button onClick={() => setEditing(!editing)} className="btn btn-ghost btn-sm">{editing ? "Annuler" : "✏️ Modifier"}</button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between border-b border-base-content/10 pb-2">
            <span className="text-base-content/50 text-sm">Projet</span>
            <span className="font-bold">{mission.title}</span>
          </div>
          <div className="flex justify-between border-b border-base-content/10 pb-2">
            <span className="text-base-content/50 text-sm">Description</span>
            <span className="text-sm text-right max-w-xs">{mission.description || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-base-content/10 pb-2">
            <span className="text-base-content/50 text-sm">Repo</span>
            {mission.repoUrl ? <a href={mission.repoUrl} target="_blank" className="text-info text-sm hover:underline">{mission.repoUrl}</a> : <span className="text-base-content/30 text-sm">Non connecté</span>}
          </div>
          <div className="flex justify-between border-b border-base-content/10 pb-2">
            <span className="text-base-content/50 text-sm">URL</span>
            {mission.url ? <a href={mission.url} target="_blank" className="text-info text-sm hover:underline">{mission.url}</a> : <span className="text-base-content/30 text-sm">Pas encore déployé</span>}
          </div>
          <div className="flex justify-between border-b border-base-content/10 pb-2">
            <span className="text-base-content/50 text-sm">Statut</span>
            <span className="badge badge-warning">{mission.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/50 text-sm">Deadline</span>
            <span className="text-error font-bold">{new Date(mission.deadline).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">✅ Checklist de validation</h2>
        <div className="space-y-3">
          {[
            { label: "Une feature fonctionnelle", done: !!mission.url },
            { label: "Un bouton d'achat / inscription", done: !!mission.url },
            { label: "URL accessible publiquement", done: !!mission.url },
            { label: "Présenté à la communauté", done: false },
            { label: "Au moins 1 utilisateur externe", done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.done ? "bg-success text-white" : "bg-base-content/10"}`}>{item.done ? "✓" : ""}</div>
              <span className={item.done ? "text-base-content/70 line-through" : "text-base-content/80"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="shame-card rounded-2xl p-6">
        <h2 className="font-bold text-lg text-error mb-2">⚠️ Zone de danger</h2>
        <p className="text-sm text-base-content/50 mb-4">Si tu ne ships pas avant le {new Date(mission.deadline).toLocaleDateString("fr-FR")}, tu es marqué overboard.</p>
        <button className="btn btn-error btn-sm" disabled>🚢 Marquer comme shipper (bientôt)</button>
      </div>
    </div>
  );
}
