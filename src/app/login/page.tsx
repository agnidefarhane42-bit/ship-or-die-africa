"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="hero-bg min-h-screen flex items-center justify-center px-4">
      <div className="card-glow rounded-3xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black gold-text mb-2">☠️ Ship or Die Africa</h1>
          <p className="text-base-content/50 text-sm">Connexion à ta mission</p>
        </div>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
          <button type="submit" className="btn btn-pirate w-full">Se connecter</button>
        </form>
        <div className="divider text-base-content/30 text-xs">OU</div>
        <p className="text-center text-sm text-base-content/50">
          Pas encore pirate ? <a href="/#pricing" className="text-warning font-semibold">Réserve ta place</a>
        </p>
      </div>
    </main>
  );
}
