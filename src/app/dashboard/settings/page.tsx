"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const githubConnected = (session?.user as any)?.githubVerified === true;
  const githubUsername = (session?.user as any)?.githubUsername;

  // Pré-remplir avec les données de la session
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setGithub((session.user as any).githubUsername || "");
    }
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, githubUsername: github }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la sauvegarde");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-black">⚙️ Paramètres</h1>

      {/* Profile */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Profil public</h2>

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success text-sm">
            <span>✅ Profil sauvegardé !</span>
          </div>
        )}

        <div>
          <label className="label">
            <span className="label-text text-base-content/60">Nom</span>
          </label>
          <input
            className="input input-bordered w-full bg-base-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton nom"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text text-base-content/60">Bio</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full bg-base-200"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Dev full-stack, Bénin. Je grandis ou je tombe."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-warning btn-sm"
        >
          {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
        </button>
      </div>

      {/* GitHub */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">🔗 Connexion GitHub</h2>
        <p className="text-sm text-base-content/50">
          Connecte ton GitHub pour tracker automatiquement tes commits sur le leaderboard.
          Sans cette connexion, ton compte n'apparaîtra pas dans le tracking automatique.
        </p>

        {githubConnected ? (
          <div className="flex items-center justify-between p-4 bg-base-content/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-base-content/10 flex items-center justify-center text-xl">🐙</div>
              <div>
                <p className="font-bold text-sm">{githubUsername || "GitHub"}</p>
                <p className="text-xs text-success">✅ Vérifié</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" disabled>Connecté</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center text-2xl opacity-50">🔒</div>
            <p className="text-xs text-base-content/40 text-center max-w-xs">
              Ton compte n'apparaîtra pas dans le tracking automatique tant que GitHub n'est pas connecté.
            </p>
            <button
              onClick={() => signIn("github")}
              className="btn btn-pirate"
            >
              🔗 Connecter mon GitHub
            </button>
          </div>
        )}

        {/* Saisie manuelle du username (fallback si pas d'OAuth) */}
        <div className="border-t border-base-content/10 pt-4 mt-2">
          <label className="label">
            <span className="label-text text-base-content/60">Username GitHub (manuel)</span>
          </label>
          <input
            className="input input-bordered w-full bg-base-200"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="username (sans @)"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-ghost btn-sm mt-2"
          >
            {saving ? "Sauvegarde..." : "💾 Sauvegarder GitHub"}
          </button>
        </div>
      </div>

      {/* Notifications — bientôt disponible */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">🔔 Notifications</h2>
        <p className="text-sm text-base-content/40 italic">Notifications — bientôt disponible.</p>
      </div>

      {/* Email (lecture seule) */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">📧 Email</h2>
        <p className="text-base-content/70 font-mono text-sm bg-base-200 rounded-xl px-4 py-3">
          {session?.user?.email || "—"}
        </p>
        <p className="text-xs text-base-content/40">L'email ne peut pas être modifié.</p>
      </div>

      {/* DANGER */}
      <div className="shame-card rounded-2xl p-6">
        <h2 className="font-bold text-lg text-error mb-2">⚠️ Zone de danger</h2>
        <p className="text-sm text-base-content/50 mb-4">
          Si tu quittes la cohorte, tu es marqué "racines coupées" et exclu à jamais. Pas de retour.
        </p>
        <button className="btn btn-error btn-sm">Abandonner la mission</button>
      </div>
    </div>
  );
}
