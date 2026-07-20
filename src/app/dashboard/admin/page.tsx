"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type AdminData = {
  stats: {
    totalUsers: number;
    totalMissions: number;
    inProgressMissions: number;
    shippedMissions: number;
    failedMissions: number;
    totalPayments: number;
    paidPayments: number;
    totalTrophies: number;
    revenue: number;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    githubUsername: string | null;
    githubVerified: boolean;
    role: string;
    createdAt: string;
    missions: Array<{ id: string; title: string; status: string }>;
    payments: Array<{ id: string; status: string; amount: number; createdAt: string }>;
  }>;
  missions: Array<{
    id: string;
    title: string;
    status: string;
    commitCount: number;
    startedAt: string;
    deadline: string;
    url: string | null;
    user: { id: string; name: string | null; email: string | null };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    user: { name: string | null; email: string | null };
  }>;
};

const STATUS_BADGE: Record<string, string> = {
  IN_PROGRESS: "badge-warning",
  SHIPPED: "badge-success",
  FAILED: "badge-error",
};

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "En cours",
  SHIPPED: "Shippé",
  FAILED: "Abandonné",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "missions" | "payments">("overview");
  const [now] = useState(() => Date.now());

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    let cancelled = false;

    (async () => {
      if (!isAdmin) {
        if (!cancelled) {
          setError("Accès refusé — tu n'es pas admin.");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 403) {
          if (!cancelled) setError("Accès refusé — tu n'es pas admin.");
          return;
        }
        if (!res.ok) throw new Error("Erreur serveur");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Impossible de charger les données admin.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [status, session, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error text-lg font-semibold">{error}</p>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">← Retour au dashboard</Link>
      </div>
    );
  }

  if (!data) return null;

  const s = data.stats;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            🛡️ Admin
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            Vue d&apos;ensemble de Ship or Die Africa
          </p>
        </div>
        <span className="badge badge-warning badge-lg">ADMIN</span>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed gap-1">
        {([
          ["overview", "📊 Vue d'ensemble"],
          ["users", "👥 Utilisateurs"],
          ["missions", "🎯 Missions"],
          ["payments", "💳 Paiements"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`tab ${tab === key ? "tab-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="👥" label="Utilisateurs" value={s.totalUsers} />
          <StatCard icon="🎯" label="Missions" value={s.totalMissions} />
          <StatCard icon="🚀" label="Shippées" value={s.shippedMissions} />
          <StatCard icon="🍂" label="Abandonnées" value={s.failedMissions} />
          <StatCard icon="🔄" label="En cours" value={s.inProgressMissions} />
          <StatCard icon="🌿" label="Trophées" value={s.totalTrophies} />
          <StatCard icon="💳" label="Paiements" value={s.paidPayments} subtitle={`${s.totalPayments} total`} />
          <StatCard icon="💰" label="Revenus" value={s.revenue.toLocaleString("fr-FR")} subtitle="FCFA" />
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>GitHub</th>
                <th>Rôle</th>
                <th>Mission</th>
                <th>Paiement</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">
                    <Link href={`/builders/${u.id}`} className="link link-hover">
                      {u.name || "—"}
                    </Link>
                  </td>
                  <td className="text-sm text-base-content/60">{u.email || "—"}</td>
                  <td className="text-sm">
                    {u.githubUsername ? (
                      <span className={u.githubVerified ? "text-success" : "text-warning"}>
                        {u.githubUsername}
                      </span>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    )}
                  </td>
                  <td>
                    {u.role === "ADMIN" ? (
                      <span className="badge badge-warning badge-sm">ADMIN</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">USER</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {u.missions.length > 0 ? (
                      <span className={`badge badge-sm ${STATUS_BADGE[u.missions[0].status] || "badge-ghost"}`}>
                        {STATUS_LABEL[u.missions[0].status] || u.missions[0].status}
                      </span>
                    ) : (
                      <span className="text-base-content/30">Aucune</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {u.payments.some((p) => p.status === "PAID") ? (
                      <span className="text-success">✓ Payé</span>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    )}
                  </td>
                  <td className="text-sm text-base-content/40">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Missions ── */}
      {tab === "missions" && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Builder</th>
                <th>Statut</th>
                <th>Commits</th>
                <th>Début</th>
                <th>Deadline</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {data.missions.map((m) => {
                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(m.deadline).getTime() - now) / 86400000)
                );
                return (
                  <tr key={m.id}>
                    <td className="font-medium">{m.title}</td>
                    <td className="text-sm">{m.user.name || m.user.email || "—"}</td>
                    <td>
                      <span className={`badge badge-sm ${STATUS_BADGE[m.status] || "badge-ghost"}`}>
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                    </td>
                    <td className="text-sm">{m.commitCount}</td>
                    <td className="text-sm text-base-content/40">
                      {new Date(m.startedAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="text-sm text-base-content/40">
                      {new Date(m.deadline).toLocaleDateString("fr-FR")}
                      {m.status === "IN_PROGRESS" && (
                        <span className="ml-1 text-warning">({daysLeft}j)</span>
                      )}
                    </td>
                    <td className="text-sm">
                      {m.url ? (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="link link-hover">
                          Voir ↗
                        </a>
                      ) : (
                        <span className="text-base-content/30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Payments ── */}
      {tab === "payments" && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-base-content/40 py-8">
                    Aucun paiement enregistré
                  </td>
                </tr>
              ) : (
                data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.user.name || p.user.email || "—"}</td>
                    <td className="text-sm">{p.amount.toLocaleString("fr-FR")} FCFA</td>
                    <td>
                      <span className={`badge badge-sm ${p.status === "PAID" ? "badge-success" : "badge-ghost"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-sm text-base-content/40">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtitle }: { icon: string; label: string; value: number | string; subtitle?: string }) {
  return (
    <div className="rounded-2xl p-5 bg-base-content/5 border border-base-content/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-base-content/50 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      {subtitle && <p className="text-xs text-base-content/40 mt-1">{subtitle}</p>}
    </div>
  );
}
