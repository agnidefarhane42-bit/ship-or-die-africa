"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvatarUploader from "@/components/AvatarUploader";
import { getAvatarUrl } from "@/lib/avatar";

type Mission = {
  id: string;
  title: string;
  status: string;
  isPublic: boolean;
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mission, setMission] = useState<Mission | null>(null);
  const [abandoning, setAbandoning] = useState(false);
  const [abandonMsg, setAbandonMsg] = useState("");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [oauthImage, setOauthImage] = useState<string | null>(null);
  const [githubVerified, setGithubVerified] = useState(false);

  // Telegram state
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLinking, setTelegramLinking] = useState(false);
  const [telegramError, setTelegramError] = useState("");

  // Notification preferences state
  const [notifyDailyReminder, setNotifyDailyReminder] = useState(true);
  const [notifyDeadlineAlert, setNotifyDeadlineAlert] = useState(true);
  const [notifyTrophyUnlocked, setNotifyTrophyUnlocked] = useState(true);
  const [notifySomeoneShipped, setNotifySomeoneShipped] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);
  const [isPublicSaving, setIsPublicSaving] = useState(false);
  const [isPublicSuccess, setIsPublicSuccess] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const githubConnected = session?.user?.githubVerified === true || githubVerified;
  const githubUsername = session?.user?.githubUsername || github;

  const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "ShipOrDieAfricaBot";

  const displayAvatarUrl = getAvatarUrl({
    avatarUrl,
    image: oauthImage,
    githubUsername,
    githubVerified: githubConnected,
  });

  const isGitHubFallback = !avatarUrl && !!displayAvatarUrl;

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setGithub(session.user.githubUsername || "");
      setTelegramConnected(!!session.user.telegramChatId);
    }

    (async () => {
      try {
        const res = await fetch("/api/missions");
        const data = await res.json();
        if (data.missions?.length > 0) {
          setMission(data.missions[0]);
        }

        const profileRes = await fetch("/api/auth/update-profile");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          // Toujours assigner (y compris null) pour permettre un reset légitime
          setName(profileData.name ?? "");
          setBio(profileData.bio ?? "");
          setGithub(profileData.githubUsername ?? "");
          setAvatarUrl(profileData.avatarUrl ?? null);
          setOauthImage(profileData.image ?? null);
          setGithubVerified(!!profileData.githubVerified);
          if (profileData.notifyDailyReminder !== undefined) setNotifyDailyReminder(profileData.notifyDailyReminder);
          if (profileData.notifyDeadlineAlert !== undefined) setNotifyDeadlineAlert(profileData.notifyDeadlineAlert);
          if (profileData.notifyTrophyUnlocked !== undefined) setNotifyTrophyUnlocked(profileData.notifyTrophyUnlocked);
          if (profileData.notifySomeoneShipped !== undefined) setNotifySomeoneShipped(profileData.notifySomeoneShipped);
          setTelegramConnected(!!profileData.telegramChatId);
        }
      } catch {
        // silencieux
      }
    })();
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

  const handleSaveNotifPrefs = async () => {
    setNotifySaving(true);
    setNotifySuccess(false);

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyDailyReminder,
          notifyDeadlineAlert,
          notifyTrophyUnlocked,
          notifySomeoneShipped,
        }),
      });

      if (res.ok) {
        setNotifySuccess(true);
        setTimeout(() => setNotifySuccess(false), 3000);
      }
    } catch {
      // silencieux
    } finally {
      setNotifySaving(false);
    }
  };

  const handleLinkTelegram = async () => {
    setTelegramLinking(true);
    setTelegramError("");

    try {
      const res = await fetch("/api/telegram/generate-link-code");
      const data = await res.json();
      if (!res.ok) {
        setTelegramError(data.error || "Erreur");
        return;
      }
      window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${data.code}`, "_blank");
    } catch {
      setTelegramError("Erreur réseau");
    } finally {
      setTelegramLinking(false);
    }
  };

  const handleAbandon = async () => {
    if (!mission) return;
    if (!confirm("Es-tu sûr ? Cette action marque ta mission comme abandonnée définitivement.")) return;

    setAbandoning(true);
    setAbandonMsg("");

    try {
      const res = await fetch("/api/missions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id, status: "FAILED" }),
      });

      if (res.ok) {
        setAbandonMsg("🥀 Mission abandonnée. Tu es marqué 'racines coupées'.");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        const data = await res.json();
        setAbandonMsg(data.error || "Erreur lors de l'abandon");
      }
    } catch {
      setAbandonMsg("Erreur réseau");
    } finally {
      setAbandoning(false);
    }
  };

  const handleTogglePublic = async (value: boolean) => {
    if (!mission) return;
    setIsPublicSaving(true);
    setIsPublicSuccess(false);

    try {
      const res = await fetch("/api/missions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id, isPublic: value }),
      });
      if (res.ok) {
        setMission((m) => (m ? { ...m, isPublic: value } : m));
        setIsPublicSuccess(true);
        setTimeout(() => setIsPublicSuccess(false), 3000);
      }
    } catch {
      // silencieux
    } finally {
      setIsPublicSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  const canAbandon = mission && mission.status === "IN_PROGRESS";

  const notifToggles = [
    { key: "notifyDailyReminder", label: "📅 Rappel quotidien", desc: "Reçois un récap chaque jour (jours restants, commits, streak)", value: notifyDailyReminder, setter: setNotifyDailyReminder },
    { key: "notifyDeadlineAlert", label: "⏰ Alertes de deadline", desc: "Notification à J-7, J-3 et J-1 avant la deadline", value: notifyDeadlineAlert, setter: setNotifyDeadlineAlert },
    { key: "notifyTrophyUnlocked", label: "🌿 Feuilles débloquées", desc: "Notification quand tu gagnes une nouvelle feuille", value: notifyTrophyUnlocked, setter: setNotifyTrophyUnlocked },
    { key: "notifySomeoneShipped", label: "🌰 Quelqu'un a shippé", desc: "Notification quand un autre bâtisseur termine sa mission", value: notifySomeoneShipped, setter: setNotifySomeoneShipped },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-black">⚙️ Paramètres</h1>

      {/* Photo de profil */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Photo de profil</h2>
        <AvatarUploader
          currentUrl={displayAvatarUrl}
          fallbackInitials={name || session?.user?.name || "?"}
          canDelete={!!avatarUrl}
          onUploaded={(url) => setAvatarUrl(url)}
          onDeleted={() => setAvatarUrl(null)}
        />
        {isGitHubFallback && (
          <p className="text-xs text-base-content/40">
            Avatar récupéré depuis GitHub — uploade une photo pour le remplacer.
          </p>
        )}
      </div>

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

      {/* Telegram */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">📨 Connexion Telegram</h2>
        <p className="text-sm text-base-content/50">
          Lie ton compte Telegram pour recevoir tes rappels quotidiens et tes alertes de deadline.
        </p>

        {telegramError && (
          <div className="alert alert-error text-sm">
            <span>{telegramError}</span>
          </div>
        )}

        {telegramConnected ? (
          <div className="flex items-center justify-between p-4 bg-base-content/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-base-content/10 flex items-center justify-center text-xl">📨</div>
              <div>
                <p className="font-bold text-sm">Telegram</p>
                <p className="text-xs text-success">✅ Connecté</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" disabled>Connecté</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center text-2xl opacity-50">📨</div>
            <p className="text-xs text-base-content/40 text-center max-w-xs">
              Clique sur le bouton, puis envoie le message pré-rempli au bot Telegram pour lier ton compte.
            </p>
            <button
              onClick={handleLinkTelegram}
              disabled={telegramLinking}
              className="btn btn-pirate"
            >
              {telegramLinking ? "Génération..." : "📨 Lier mon Telegram"}
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">🔔 Préférences de notifications</h2>
        <p className="text-sm text-base-content/50">
          Choisis les notifications que tu veux recevoir sur Telegram.
        </p>

        {notifySuccess && (
          <div className="alert alert-success text-sm">
            <span>✅ Préférences sauvegardées !</span>
          </div>
        )}

        <div className="space-y-4">
          {notifToggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 p-3 bg-base-content/5 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{t.label}</p>
                <p className="text-xs text-base-content/40">{t.desc}</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-warning"
                checked={t.value}
                onChange={(e) => t.setter(e.target.checked)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveNotifPrefs}
          disabled={notifySaving}
          className="btn btn-warning btn-sm"
        >
          {notifySaving ? "Sauvegarde..." : "💾 Sauvegarder les préférences"}
        </button>
      </div>

      {/* La Récolte — visibilité */}
      {mission && mission.status === "SHIPPED" && (
        <div className="card-glow rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">🌰 La Récolte</h2>
          <p className="text-sm text-base-content/50">
            Contrôle si ton projet shippé apparaît sur la page publique La Récolte.
          </p>

          {isPublicSuccess && (
            <div className="alert alert-success text-sm">
              <span>✅ Visibilité mise à jour !</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 p-3 bg-base-content/5 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Afficher sur La Récolte</p>
              <p className="text-xs text-base-content/40">Ton projet sera visible publiquement sur /recolte</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-warning"
              checked={mission.isPublic ?? true}
              onChange={(e) => handleTogglePublic(e.target.checked)}
              disabled={isPublicSaving}
            />
          </div>
        </div>
      )}

      {/* Email */}
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

        {abandonMsg && (
          <div className="alert alert-error text-sm mb-3">
            <span>{abandonMsg}</span>
          </div>
        )}

        {canAbandon ? (
          <button
            onClick={handleAbandon}
            disabled={abandoning}
            className="btn btn-error btn-sm"
          >
            {abandoning ? "Abandon en cours..." : "Abandonner la mission"}
          </button>
        ) : mission ? (
          <p className="text-xs text-base-content/40">
            Mission {mission.status === "SHIPPED" ? "shippée 🌰" : "déjà abandonnée 🥀"}.
          </p>
        ) : (
          <p className="text-xs text-base-content/40">Aucune mission active à abandonner.</p>
        )}
      </div>
    </div>
  );
}
