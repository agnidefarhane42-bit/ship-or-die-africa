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
// Note timezone : les clés de jours utilisent toISOString() → UTC.
// Pour les users WAT (UTC+1) un commit après 23h locale peut basculer au jour suivant.
// ============================================================================

import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

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
 * Si le dernier jour de commit n'est ni aujourd'hui ni hier (UTC), retourne 0.
 */
function calculateStreak(commitDates: string[]): number {
  if (commitDates.length === 0) return 0;

  // Extraire les jours uniques (YYYY-MM-DD) et trier du plus récent au plus ancien
  const days = new Set(commitDates.map((d) => d.substring(0, 10)));
  const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

  const lastDay = sortedDays[0];
  const today = new Date().toISOString().substring(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().substring(0, 10);

  // Streak courant uniquement si le dernier commit est aujourd'hui ou hier
  if (lastDay !== today && lastDay !== yesterday) {
    return 0;
  }

  let streak = 0;
  let expected = new Date(sortedDays[0] + "T00:00:00.000Z");

  for (const day of sortedDays) {
    const dayDate = new Date(day + "T00:00:00.000Z");
    const diffDays = Math.round(
      (expected.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      streak++;
      expected = new Date(dayDate);
      expected.setUTCDate(expected.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Construit un objet commitsByDay à partir des dates de commits.
 * Format: { "2026-07-01": 3, "2026-07-02": 0, ... }
 * Ne couvre que la période de la mission (startedAt → deadline).
 * Clés en UTC (YYYY-MM-DD).
 */
function buildCommitsByDay(
  commitDates: string[],
  startedAt: Date,
  deadline: Date
): Record<string, number> {
  const result: Record<string, number> = {};

  // Compter les commits par jour
  const counts: Record<string, number> = {};
  for (const d of commitDates) {
    const day = d.substring(0, 10);
    counts[day] = (counts[day] || 0) + 1;
  }

  // Remplir tous les jours de la mission (startedAt à deadline)
  const start = new Date(startedAt);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setUTCHours(0, 0, 0, 0);

  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().substring(0, 10);
    result[key] = counts[key] || 0;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
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

  // Construire commitsByDay pour la heatmap
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

  // Vérifier la deadline (peut avoir été prolongée par des jours de pause)
  if (new Date() > mission.deadline && mission.status === "IN_PROGRESS") {
    await prisma.mission.update({
      where: { id: missionId },
      data: { status: "FAILED" },
    });
  }
}
