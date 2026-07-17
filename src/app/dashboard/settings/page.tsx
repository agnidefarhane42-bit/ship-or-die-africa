"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [name, setName] = useState("Agnide");
  const [bio, setBio] = useState("Dev full-stack, Bénin. Je shippe ou je meurs.");
  const [github, setGithub] = useState("agnidefarhane42-bit");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-black">⚙️ Paramètres</h1>

      {/* Profile */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Profil public</h2>
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="w-16 rounded-full bg-warning text-base-100"><span className="text-2xl">A</span></div>
          </div>
          <button className="btn btn-ghost btn-sm">Changer l'avatar</button>
        </div>
        <div>
          <label className="label"><span className="label-text text-base-content/60">Nom</span></label>
          <input className="input input-bordered w-full bg-base-200" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label"><span className="label-text text-base-content/60">Bio</span></label>
          <textarea className="textarea textarea-bordered w-full bg-base-200" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <button className="btn btn-gold btn-sm">💾 Sauvegarder</button>
      </div>

      {/* GitHub */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">🔗 Connexion GitHub</h2>
        <p className="text-sm text-base-content/50">Connecte ton GitHub pour tracker automatiquement tes commits et débloquer des trophées.</p>
        <div className="flex items-center justify-between p-4 bg-base-content/5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-base-content/10 flex items-center justify-center text-xl">🐙</div>
            <div>
              <p className="font-bold text-sm">{github}</p>
              <p className="text-xs text-success">✓ Connecté</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Déconnecter</button>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">🔔 Notifications</h2>
        {[
          { label: "Rappel quotidien (Telegram)", desc: "Te rappelle de committer chaque jour", on: true },
          { label: "Alerte deadline (J-7, J-3, J-1)", desc: "Te prévient quand la deadline approche", on: true },
          { label: "Nouveau trophée débloqué", desc: "Notification quand tu gagnes un badge", on: true },
          { label: "Someone shipped", desc: "Quand un pirate de ta cohorte ship", on: false },
        ].map((n, i) => (
          <div key={i} className="flex items-center justify-between border-b border-base-content/10 pb-3 last:border-0">
            <div>
              <p className="font-medium text-sm">{n.label}</p>
              <p className="text-xs text-base-content/40">{n.desc}</p>
            </div>
            <input type="checkbox" className="toggle toggle-warning" defaultChecked={n.on} />
          </div>
        ))}
      </div>

      {/* DANGER */}
      <div className="shame-card rounded-2xl p-6">
        <h2 className="font-bold text-lg text-error mb-2">⚠️ Zone de danger</h2>
        <p className="text-sm text-base-content/50 mb-4">
          Si tu quittes la cohorte, tu es marqué overboard et exclu à jamais. Pas de retour.
        </p>
        <button className="btn btn-error btn-sm">Abandonner la mission</button>
      </div>
    </div>
  );
}
