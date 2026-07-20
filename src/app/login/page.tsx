"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
    } else if (res?.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleGitHub = () => {
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <main className="hero-bg min-h-screen flex items-center justify-center px-4">
      <div className="card-glow rounded-3xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2 mb-2">
            <img src="/logo.png" alt="Ship or Die Africa" className="w-16 h-16 object-contain" />
            <h1 className="text-2xl font-black gold-text">Ship or Die Africa</h1>
          </div>
          <p className="text-base-content/50 text-sm">Connexion à ta mission</p>
        </div>
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* ── GitHub OAuth ── */}
        <button
          onClick={handleGitHub}
          className="btn btn-outline w-full mb-4 gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Se connecter avec GitHub
        </button>

        <div className="divider text-base-content/30 text-xs">OU PAR EMAIL</div>

        <form className="space-y-4" onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered w-full bg-base-200"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-pirate w-full">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p className="text-center text-sm text-base-content/50 mt-6">
          Pas encore bâtisseur ? <a href="/register" className="text-warning font-semibold">Crée un compte</a>
        </p>
      </div>
    </main>
  );
}
