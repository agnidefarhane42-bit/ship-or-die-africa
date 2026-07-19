/**
 * Système de rang Baobab pour les bâtisseurs.
 *
 * Échelle de progression basée sur le nombre total de commits (toutes missions confondues),
 * alignée sur les paliers de trophées existants (FIRST_COMMIT → 1, FIFTY_COMMITS → 50, HUNDRED_COMMITS → 100).
 *
 * Graine 🌱       — 0 à 9 commits     : tu commences à peine
 * Pousse 🌿       — 10 à 49 commits    : ça pousse
 * Jeune Pousse 🌳 — 50 à 99 commits    : solide
 * Baobab 🌳       — 100+ commits        : immense et immuable
 */

export type BuilderRank = {
  key: "GRAINE" | "POUSSE" | "JEUNE_POUSSE" | "BAOBAB";
  label: string;
  icon: string;
  minCommits: number;
};

const RANKS: BuilderRank[] = [
  { key: "BAOBAB",       label: "Baobab",       icon: "🌳", minCommits: 100 },
  { key: "JEUNE_POUSSE", label: "Jeune Pousse",  icon: "🌳", minCommits: 50 },
  { key: "POUSSE",       label: "Pousse",        icon: "🌿", minCommits: 10 },
  { key: "GRAINE",       label: "Graine",        icon: "🌱", minCommits: 0 },
];

/**
 * Retourne le rang correspondant à un nombre de commits.
 * Les rangs sont ordonnés du plus élevé au plus bas, on prend le premier qui match.
 */
export function getRank(totalCommits: number): BuilderRank {
  return RANKS.find((r) => totalCommits >= r.minCommits) ?? RANKS[RANKS.length - 1];
}

/**
 * Retourne le libellé complet (ex: "🌳 Baobab").
 */
export function getRankLabel(totalCommits: number): string {
  const r = getRank(totalCommits);
  return `${r.icon} ${r.label}`;
}
