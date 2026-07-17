"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, githubUsername }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Erreur réseau. Réessaie.");
      setLoading(false);
    }
  };

  return (
    <main className="hero-bg min-h-screen flex items-center justify-center px-4">
      <div className="card-glow rounded-3xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black gold-text mb-2">☠️ Ship or Die Africa</h1>
          <p className="text-base-content/50 text-sm">Rejoins l'équipage</p>
        </div>
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label"><span className="label-text text-base-content/60">Nom</span></label>
            <input
              type="text"
              required
              placeholder="Ton nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full bg-base-200"
            />
          </div>
          <div>
            <label className="label"><span className="label-text text-base-content/60">Email</span></label>
            <input
              type="email"
              required
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered w-full bg-base-200"
            />
          </div>
          <div>
            <label className="label"><span className="label-text text-base-content/60">Mot de passe</span></label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="6 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered w-full bg-base-200"
            />
          </div>
          <div>
            <label className="label"><span className="label-text text-base-content/60">GitHub username (optionnel)</span></label>
            <input
              type="text"
              placeholder="username (sans @)"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="input input-bordered w-full bg-base-200"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-pirate w-full">
            {loading ? "Inscription..." : "🏴‍☠️ Rejoindre l'équipage"}
          </button>
        </form>
        <div className="divider text-base-content/30 text-xs">OU</div>
        <p className="text-center text-sm text-base-content/50">
          Déjà pirate ? <a href="/login" className="text-warning font-semibold">Se connecter</a>
        </p>
      </div>
    </main>
  );
}
