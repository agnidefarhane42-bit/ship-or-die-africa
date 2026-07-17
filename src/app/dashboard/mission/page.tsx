"use client";
import { useState } from "react";

export default function MissionPage() {
  const [editing, setEditing] = useState(false);
  const [mission, setMission] = useState({
    title: "Vendia",
    description: "AI messaging tool for WhatsApp sellers in West Africa",
    repoUrl: "https://github.com/agnidefarhane42-bit/Vendia",
    url: "https://vendia-ai.vercel.app",
    status: "IN_PROGRESS",
    day: 12,
    deadline: "15 août 2026",
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black">🎯 Ma Mission</h1>

      {/* Countdown */}
      <div className="card-glow rounded-2xl p-6 text-center">
        <p className="text-base-content/50 text-sm mb-2">Deadline</p>
        <p className="text-4xl font-black text-error mb-2">18 jours</p>
        <p className="text-base-content/40 text-sm">{mission.deadline}</p>
        <div className="h-3 bg-base-content/10 rounded-full overflow-hidden mt-4 max-w-md mx-auto">
          <div className="h-full bg-gradient-to-r from-error to-warning" style={{ width: "40%" }} />
        </div>
      </div>

      {/* Mission details */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Détails de la mission</h2>
          <button onClick={() => setEditing(!editing)} className="btn btn-ghost btn-sm">
            {editing ? "Annuler" : "✏️ Modifier"}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="label"><span className="label-text text-base-content/60">Nom du projet</span></label>
              <input className="input input-bordered w-full bg-base-200" defaultValue={mission.title} />
            </div>
            <div>
              <label className="label"><span className="label-text text-base-content/60">Description</span></label>
              <textarea className="textarea textarea-bordered w-full bg-base-200" rows={3} defaultValue={mission.description} />
            </div>
            <div>
              <label className="label"><span className="label-text text-base-content/60">Repo GitHub</span></label>
              <input className="input input-bordered w-full bg-base-200" defaultValue={mission.repoUrl} />
            </div>
            <div>
              <label className="label"><span className="label-text text-base-content/60">URL du projet</span></label>
              <input className="input input-bordered w-full bg-base-200" defaultValue={mission.url} placeholder="https://..." />
            </div>
            <button onClick={() => setEditing(false)} className="btn btn-gold w-full">💾 Sauvegarder</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between border-b border-base-content/10 pb-2">
              <span className="text-base-content/50 text-sm">Projet</span>
              <span className="font-bold">{mission.title}</span>
            </div>
            <div className="flex justify-between border-b border-base-content/10 pb-2">
              <span className="text-base-content/50 text-sm">Description</span>
              <span className="text-sm text-right max-w-xs">{mission.description}</span>
            </div>
            <div className="flex justify-between border-b border-base-content/10 pb-2">
              <span className="text-base-content/50 text-sm">Repo</span>
              <a href={mission.repoUrl} className="text-info text-sm hover:underline" target="_blank">{mission.repoUrl}</a>
            </div>
            <div className="flex justify-between border-b border-base-content/10 pb-2">
              <span className="text-base-content/50 text-sm">URL</span>
              <a href={mission.url} className="text-info text-sm hover:underline" target="_blank">{mission.url}</a>
            </div>
            <div className="flex justify-between border-b border-base-content/10 pb-2">
              <span className="text-base-content/50 text-sm">Statut</span>
              <span className="badge badge-warning">EN COURS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/50 text-sm">Deadline</span>
              <span className="text-error font-bold">{mission.deadline}</span>
            </div>
          </div>
        )}
      </div>

      {/* Checklist de validation */}
      <div className="card-glow rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">✅ Checklist de validation</h2>
        <div className="space-y-3">
          {[
            { label: "Une feature fonctionnelle", done: true },
            { label: "Un bouton d'achat / inscription", done: true },
            { label: "URL accessible publiquement", done: true },
            { label: "Présenté à la communauté", done: false },
            { label: "Au moins 1 utilisateur externe", done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.done ? "bg-success text-white" : "bg-base-content/10"}`}>
                {item.done ? "✓" : ""}
              </div>
              <span className={item.done ? "text-base-content/70 line-through" : "text-base-content/80"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="shame-card rounded-2xl p-6">
        <h2 className="font-bold text-lg text-error mb-2">💀 Zone de danger</h2>
        <p className="text-sm text-base-content/50 mb-4">
          Si tu ne ships pas avant le {mission.deadline}, tu es marqué overboard et exclu de la communauté à jamais.
        </p>
        <button className="btn btn-error btn-sm" disabled>🚢 Marquer comme shipper (bientôt disponible)</button>
      </div>
    </div>
  );
}
