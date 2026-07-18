"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "");
      if (res.ok) setSubmitted(true);
    } catch {
      setMessage("Erreur réseau. Réessaie.");
    }
    setLoading(false);
  };

  return (
    <main className="hero-bg min-h-screen">
      {/* NAVBAR */}
      <nav className="navbar px-4 sm:px-8 py-4 max-w-6xl mx-auto">
        <div className="flex-1">
          <span className="text-2xl font-black tracking-tight">
            <span className="gold-text">🌳 Ship or Die</span>
            <span className="text-base-content/60 text-sm ml-1">Africa</span>
          </span>
        </div>
        <div className="flex-none gap-2">
          <a href="#pricing" className="btn btn-ghost btn-sm text-base-content/70">Pricing</a>
          <a href="#how" className="btn btn-ghost btn-sm text-base-content/70">Comment ça marche</a>
          <a href="/login" className="btn btn-gold btn-sm">Se connecter</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-4 sm:px-8 pt-16 pb-20 max-w-4xl mx-auto text-center section-fade">
        <div className="badge badge-error gap-2 mb-6 text-xs font-semibold uppercase tracking-wider">
          🌱 Première cohorte — Octobre 2026
        </div>
        <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-6">
          Grandis ton projet en <span className="gold-text">30 jours</span>
          <br />ou sors pour toujours.
        </h1>
        <p className="text-lg sm:text-xl text-base-content/60 mb-10 max-w-2xl mx-auto">
          Pas un cours. Pas un bootcamp. Un deadline, une communauté, et la pression positive pour finir.
          <br /><br />
          App, site, bot, API — tant que c'est utilisable par quelqu'un d'autre que toi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="#pricing" className="btn btn-pirate btn-lg px-8">
            🌳 Rejoindre le Cercle
          </a>
          <a href="#how" className="btn btn-ghost btn-lg text-base-content/60">
            Comment ça marche →
          </a>
        </div>
        <p className="text-sm text-base-content/40 mt-6">
          10.000 FCFA early bird · 30 places · Pas de remboursement
        </p>
      </section>

      {/* PROBLEM */}
      <section className="px-4 sm:px-8 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-4">"Je suis à deux semaines du lancement."</h2>
          <p className="text-xl text-base-content/50">Ça fait 4 mois que tu dis ça. 🌵</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="card-glow rounded-2xl p-6">
            <div className="text-4xl mb-4">🔬</div>
            <h3 className="font-bold text-lg mb-2">Polish en privé</h3>
            <p className="text-base-content/50 text-sm">Tu peaufines ton design, tes variables, ta CI/CD... mais personne ne peut encore cliquer sur ton app.</p>
          </div>
          <div className="card-glow rounded-2xl p-6">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="font-bold text-lg mb-2">Overthinking</h3>
            <p className="text-base-content/50 text-sm">Tu as 5 idées, tu commences aucune. Ou tu commences une, tu changes après 3 jours.</p>
          </div>
          <div className="card-glow rounded-2xl p-6">
            <div className="text-4xl mb-4">🏝️</div>
            <h3 className="font-bold text-lg mb-2">Solo</h3>
            <p className="text-base-content/50 text-sm">Personne ne te demande "tu as bossé quoi aujourd'hui ?". Donc tu ne finis rien.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-4 sm:px-8 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-black text-center mb-16">
          Grandis un projet tous les <span className="gold-text">30 jours</span>
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center text-3xl mb-4">🌳</div>
            <h3 className="font-bold text-xl mb-3">01 · Rejoins le Cercle</h3>
            <p className="text-base-content/50 text-sm">Un groupe de bâtisseurs africains qui livrent. Check-in quotidien : "j'ai bossé sur X aujourd'hui". GitHub optionnel — ce qui compte c'est la progression, pas l'outil.</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center text-3xl mb-4">🎯</div>
            <h3 className="font-bold text-xl mb-3">02 · Un petit pari</h3>
            <p className="text-base-content/50 text-sm">Une feature qui marche. Un lien que quelqu'un peut ouvrir. C'est tout ce qu'il faut pour valider. On te guide étape par étape.</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-success/10 border border-success/30 flex items-center justify-center text-3xl mb-4">🌱</div>
            <h3 className="font-bold text-xl mb-3">03 · Fais pousser</h3>
            <p className="text-base-content/50 text-sm">Profil public. Deadline de 30 jours (avec 3 jours de pause pour les imprévus). Feuilles quand tu ships. Le Cercle te pousse quand tu faiblis.</p>
          </div>
        </div>
      </section>

      {/* DEADLINE — softened */}
      <section className="px-4 sm:px-8 py-16 max-w-3xl mx-auto">
        <div className="card-glow rounded-3xl p-8 sm:p-12 text-center border border-warning/20">
          <div className="text-5xl mb-6">⚠️</div>
          <h2 className="text-2xl sm:text-3xl font-black mb-4">Deadline manquée = Racines coupées</h2>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            On est compréhensifs — coupure de courant, internet instable, boulot à côté. C'est pour ça que tu as <b className="text-warning">3 jours de pause</b> à utiliser quand tu veux.
          </p>
          <ul className="text-left max-w-md mx-auto space-y-3 text-base-content/60">
            <li className="flex gap-3"><span className="text-warning">⚠️</span> Profil marqué "racines coupées" (en mémoire, pas en honte)</li>
            <li className="flex gap-3"><span className="text-warning">⚠️</span> Accès suspendu à la communauté</li>
            <li className="flex gap-3"><span className="text-warning">⚠️</span> Pas de remboursement</li>
            <li className="flex gap-3"><span className="text-success">✓</span> Tu peux revenir dans une prochaine cohorte (en repayant)</li>
          </ul>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="px-4 sm:px-8 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">Ce que tu obtiens</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: "💬", text: "Groupe Telegram privé de la cohorte" },
            { icon: "📊", text: "Profil public avec tous tes projets" },
            { icon: "🌿", text: "Feuilles automatiques (première graine, premier déploiement...)" },
            { icon: "🔗", text: "Connexion GitHub (optionnel) pour tracker tes commits" },
            { icon: "⏰", text: "Deadline de 30 jours + 3 jours de pause" },
            { icon: "🤝", text: "Accountability quotidienne avec d'autres bâtisseurs" },
          ].map((item, i) => (
            <div key={i} className="card-glow rounded-xl p-5 flex items-center gap-4">
              <span className="text-3xl">{item.icon}</span>
              <span className="text-base-content/70">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IS THIS FOR */}
      <section className="px-4 sm:px-8 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">C'est pour qui ?</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-glow rounded-2xl p-6">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="font-bold text-lg mb-3">Pour toi si...</h3>
            <ul className="space-y-2 text-sm text-base-content/60">
              <li>• Tu as un projet en cours que tu ne finis jamais</li>
              <li>• Tu codes seul et personne ne te push</li>
              <li>• Tu as besoin d'un deadline pour avancer</li>
              <li>• App, site, bot, API, outil — tous les projets sont bienvenus</li>
              <li>• Tu veux faire partie d'une communauté de bâtisseurs africains</li>
            </ul>
          </div>
          <div className="card-glow rounded-2xl p-6">
            <div className="text-3xl mb-3">❌</div>
            <h3 className="font-bold text-lg mb-3">Pas pour toi si...</h3>
            <ul className="space-y-2 text-sm text-base-content/60">
              <li>• Tu cherches un cours ou un tuto</li>
              <li>• Tu veux qu'on code à ta place</li>
              <li>• Tu n'as pas 1h par jour à consacrer</li>
              <li>• Tu n'as pas encore de projet en tête</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-4 sm:px-8 py-20 max-w-3xl mx-auto">
        <div className="card-glow rounded-3xl p-8 sm:p-12 text-center">
          <div className="badge badge-warning mb-6 text-xs font-bold uppercase">Early Bird — 30 places</div>
          <h2 className="text-4xl font-black mb-2">10.000 FCFA</h2>
          <p className="text-base-content/40 mb-2 line-through">25.000 FCFA (prix normal)</p>
          <p className="text-base-content/60 mb-8 text-sm">Paiement unique · ~15$ · Mobile Money ou carte</p>
          
          <div className="text-left max-w-md mx-auto space-y-3 mb-10">
            <p className="flex gap-3"><span className="text-success">✓</span> Accès communauté privée Telegram</p>
            <p className="flex gap-3"><span className="text-success">✓</span> Mission gamifiée de 30 jours + 3 jours de pause</p>
            <p className="flex gap-3"><span className="text-success">✓</span> Profil public avec tes projets</p>
            <p className="flex gap-3"><span className="text-success">✓</span> Tracker GitHub (optionnel) ou check-in manuel</p>
            <p className="flex gap-3"><span className="text-success">✓</span> Feuilles et badges</p>
            <p className="flex gap-3"><span className="text-success">✓</span> Paiement Mobile Money (MoMo, Orange Money, Wave) ou carte</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <input
                type="email"
                required
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full bg-base-200 mb-4"
              />
              <button type="submit" disabled={loading} className="btn btn-pirate w-full btn-lg">
                {loading ? "..." : "🌳 Réserver ma place"}
              </button>
              <p className="text-xs text-base-content/40 mt-4">Tu paies uniquement quand la cohorte démarre. Pas avant.</p>
            </form>
          ) : (
            <div className="max-w-sm mx-auto alert alert-success">
              <span>✅ {message}</span>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-8 py-16 max-w-3xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">Questions fréquentes</h2>
        <div className="space-y-4">
          {[
            { q: "Je n'utilise pas GitHub, je peux quand même participer ?", a: "Oui. Le check-in manuel suffit : 'j'ai bossé sur X aujourd'hui'. GitHub est optionnel pour ceux qui veulent tracker automatiquement leurs commits." },
            { q: "C'est seulement pour le SaaS ?", a: "Non. App mobile, site web, bot WhatsApp, API, outil interne — tout compte. Tant que quelqu'un d'autre que toi peut l'utiliser." },
            { q: "Et si j'ai une coupure de courant ou pas d'internet ?", a: "Tu as 3 jours de pause à utiliser quand tu veux. Pas besoin de justifier. Après 3 jours non utilisés, ils sont perdus." },
            { q: "Je paie comment ?", a: "Mobile Money (MoMo, Orange Money, Wave) ou carte bancaire via FedaPay. Le paiement se fait quand la cohorte démarre, pas à la pré-inscription." },
            { q: "Il y a combien de places ?", a: "30 places pour la première cohorte. Petit groupe = meilleure accountability." },
          ].map((item, i) => (
            <div key={i} className="card-glow rounded-xl p-5">
              <h3 className="font-bold mb-2">{item.q}</h3>
              <p className="text-base-content/60 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS BAR */}
      <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-black gold-text">30</div>
            <div className="text-sm text-base-content/40">jours pour grandir</div>
          </div>
          <div>
            <div className="text-3xl font-black gold-text">∞</div>
            <div className="text-sm text-base-content/40">projets possibles</div>
          </div>
          <div>
            <div className="text-3xl font-black gold-text">0</div>
            <div className="text-sm text-base-content/40">excuse acceptée</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 sm:px-8 py-12 max-w-4xl mx-auto border-t border-base-content/10 mt-20">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="font-black gold-text">🌳 Ship or Die Africa</span>
            <p className="text-sm text-base-content/40 mt-1">Built by builders, for builders.</p>
          </div>
          <div className="flex gap-6 text-sm text-base-content/40">
            <a href="/login" className="hover:text-base-content">Se connecter</a>
            <span>·</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
