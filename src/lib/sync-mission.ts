// ============================================================================
// sync-mission.ts — CŒUR DE LA MÉCANIQUE PRODUIT
// ============================================================================
// Ce fichier est le moteur de gamification de Ship or Die Africa.
// Il synchronise les missions avec l'API GitHub :
//   1. Récupère les commits du repo lié à la mission (uniquement depuis startedAt)
//   2. Calcule le nombre total de commits, le streak et la date du dernier commit
//   3. Construit l'historique commitsByDay pour la heatmap
//   4. Attribue les trophées correspondants (sans doublon grâce à @@unique)
//   5. Marque la mission FAILED si la deadline est dépassée
//
// Appelé par le cron /api/cron/sync-missions (1×/jour à 6h UTC, voir vercel.json).
//
// Timezone : Africa/Lagos (WAT, UTC+1, sans DST).
// Les builders sont principalement en Afrique de l'Ouest / Centrale.
// Bucketisation des jours (streak, commitsByDay) en jour civil Lagos,
// PAS en UTC via toISOString() — sinon un commit à 23h30 Cotonou bascule au jour suivant.
// Limite connue : pas encore de User.timezone ; tous les users utilisent Africa/Lagos.
// Les DateTime startedAt / deadline restent des instants absolus (UTC) en base.
// ============================================================================

import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

/** Timezone produit par défaut (WAT). */
const DEFAULT_TZ = "Africa/Lagos";

/** Libellés Baobab pour chaque TrophyType (affichage / notifications) */
const TROPHY_LABELS: Record<string, string> = {
  FIRST_COMMIT: "Première Graine plantée 🌱",
  FIRST_DEPLOY: "Première Pousse",
  FIFTY_COMMITS: "Racines qui s'enfoncent",
  HUNDRED_COMMITS: "Feuillage dense",
  SHIPPED: "Fruit récolté",
  EARLY_BIRD: "Premier au Cercle",
};

/**
 * Jour civil YYYY-MM-DD dans DEFAULT_TZ (Africa/Lagos).
 * Utilise Intl — pas toISOString() (qui est toujours UTC).
 */
function toLocalDayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Ajoute n jours civils à une clé YYYY-MM-DD (arithmétique pure sur la date).
 * Valide pour Africa/Lagos (pas de DST).
 */
function addDaysToKey(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + n * 86_400_000;
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Extrait le owner et le repo depuis une URL GitHub.
 * Ex: https://github.com/agnidefarhane42-bit/ship-or-die-africa → { owner: "agnidefarhane42-bit", repo: "ship-or-die-africa" }
 */
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

/**
 * Récupère tous les commits d'un repo GitHub (par pages de 100).
 * Filtre ensuite ceux >= since (mission.startedAt).
 */
async function fetchAllCommits(
  owner: string,
  repo: string,
  since?: Date
): Promise<{ date: string }[]> {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const allCommits: { date: string }[] = [];
  let page = 1;
  let hasMore = true;

  // since ISO pour l'API GitHub (évite de tout paginer inutilement)
  const sinceParam = since ? `&since=${since.toISOString()}` : "";

  while (hasMore && page <= 10) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${page}${sinceParam}`,
      { headers, next: { revalidate: 0 } }
    );

    if (!res.ok) break;
    const commits = await res.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      hasMore = false;
      break;
    }

    for (const c of commits) {
      if (c.commit?.author?.date) {
        allCommits.push({ date: c.commit.author.date });
      }
    }

    if (commits.length < 100) hasMore = false;
    page++;
  }

  // Double filtre côté code pour être sûr (API since est inclusive)
  if (since) {
    const sinceMs = since.getTime();
    return allCommits.filter((c) => new Date(c.date).getTime() >= sinceMs);
  }

  return allCommits;
}

/**
 * Calcule le streak de jours consécutifs avec au moins un commit.
 * Jours civils en Africa/Lagos.
 * Si le dernier jour de commit n'est ni aujourd'hui ni hier (Lagos), retourne 0.
 */
function calculateStreak(commitDates: string[]): number {
  if (commitDates.length === 0) return 0;

  const days = new Set(commitDates.map((d) => toLocalDayKey(d)));
  const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

  const today = toLocalDayKey(new Date());
  const yesterday = addDaysToKey(today, -1);

  // Streak courant uniquement si le dernier commit est aujourd'hui ou hier (Lagos)
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  let streak = 0;
  let expected = sortedDays[0];

  for (const day of sortedDays) {
    if (day === expected) {
      streak++;
      expected = addDaysToKey(expected, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Construit un objet commitsByDay à partir des dates de commits.
 * Format: { "2026-07-01": 3, "2026-07-02": 0, ... }
 * Clés = jours civils Africa/Lagos.
 * Couvre la période startedAt → deadline (bucketisés en jour local).
 */
function buildCommitsByDay(
  commitDates: string[],
  startedAt: Date,
  deadline: Date
): Record<string, number> {
  const result: Record<string, number> = {};

  // Compter les commits par jour civil Lagos
  const counts: Record<string, number> = {};
  for (const d of commitDates) {
    const day = toLocalDayKey(d);
    counts[day] = (counts[day] || 0) + 1;
  }

  const startKey = toLocalDayKey(startedAt);
  const endKey = toLocalDayKey(deadline);

  let cursor = startKey;
  // Garde-fou : max ~400 jours pour éviter une boucle infinie si données absurdes
  let guard = 0;
  while (cursor <= endKey && guard < 400) {
    result[cursor] = counts[cursor] || 0;
    cursor = addDaysToKey(cursor, 1);
    guard++;
  }

  return result;
}

/**
 * Attribue un trophée à une mission s'il n'existe pas déjà.
 * @@unique([missionId, type]) protège contre les doublons.
 * En cas de création réussie, notifie l'utilisateur si notifyTrophyUnlocked + telegramChatId.
 */
async function awardTrophyIfNew(missionId: string, type: string): Promise<void> {
  try {
    await prisma.trophy.create({
      data: { missionId, type: type as any },
    });

    // Nouveau trophée réellement créé → notification « feuille débloquée »
    try {
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        select: {
          title: true,
          user: {
            select: {
              telegramChatId: true,
              notifyTrophyUnlocked: true,
              name: true,
            },
          },
        },
      });

      const user = mission?.user;
      if (user?.notifyTrophyUnlocked && user.telegramChatId) {
        const label = TROPHY_LABELS[type] || type;
        const safeTitle = mission?.title ? escapeHtml(mission.title) : "";
        const message =
          `🌿 <b>Nouvelle feuille débloquée !</b>\n\n` +
          `${label}\n` +
          (safeTitle ? `<i>${safeTitle}</i>\n\n` : "\n") +
          `Continue de pousser. 🌳`;

        await sendTelegramMessage(user.telegramChatId, message);
      }
    } catch (notifyErr) {
      console.error("notifyTrophyUnlocked error:", notifyErr);
      // ne bloque pas l'attribution du trophée
    }
  } catch {
    // déjà existant (unique constraint)
  }
}

/**
 * Synchronise une mission avec GitHub : commits, streak, trophées, statut.
 */
export async function syncMission(missionId: string): Promise<void> {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { user: true },
  });

  if (!mission || !mission.repoUrl || !mission.user?.githubUsername || !mission.user?.githubVerified) return;
  if (mission.status !== "IN_PROGRESS") return;

  const repoInfo = parseRepoUrl(mission.repoUrl);
  if (!repoInfo) return;

  // Récupérer uniquement les commits depuis le début de la mission
  const commits = await fetchAllCommits(repoInfo.owner, repoInfo.repo, mission.startedAt);
  const commitCount = commits.length;
  const lastCommitAt =
    commits.length > 0 ? new Date(commits[0].date) : null;
  const streak = calculateStreak(commits.map((c) => c.date));

  // Construire commitsByDay pour la heatmap (jours Africa/Lagos)
  const commitsByDay = buildCommitsByDay(
    commits.map((c) => c.date),
    mission.startedAt,
    mission.deadline
  );

  // Mettre à jour la mission
  await prisma.mission.update({
    where: { id: missionId },
    data: {
      commitCount,
      currentStreak: streak,
      lastCommitAt,
      commitsByDay,
    },
  });

  // Attribuer les trophées
  if (commitCount >= 1) {
    await awardTrophyIfNew(missionId, "FIRST_COMMIT");
  }
  if (commitCount >= 50) {
    await awardTrophyIfNew(missionId, "FIFTY_COMMITS");
  }
  if (commitCount >= 100) {
    await awardTrophyIfNew(missionId, "HUNDRED_COMMITS");
  }
  if (mission.url) {
    await awardTrophyIfNew(missionId, "FIRST_DEPLOY");
  }

  // Vérifier la deadline (instant absolu — inchangé)
  if (new Date() > mission.deadline && mission.status === "IN_PROGRESS") {
    await prisma.mission.update({
      where: { id: missionId },
      data: { status: "FAILED" },
    });
  }
}
