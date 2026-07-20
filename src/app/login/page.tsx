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
        <div className="divider text-base-content/30 text-xs">OU</div>
        <p className="text-center text-sm text-base-content/50">
          Pas encore bâtisseur ? <a href="/register" className="text-warning font-semibold">Crée un compte</a>
        </p>
      </div>
    </main>
  );
}
