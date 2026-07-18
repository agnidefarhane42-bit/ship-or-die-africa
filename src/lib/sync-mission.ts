// ============================================================================
// sync-mission.ts — CŒUR DE LA MÉCANIQUE PRODUIT
// ============================================================================
// Ce fichier est le moteur de gamification de Ship or Die Africa.
// Il synchronise les missions avec l'API GitHub :
//   1. Récupère les commits du repo lié à la mission
//   2. Calcule le nombre total de commits, le streak et la date du dernier commit
//   3. Attribue les trophées correspondants (sans doublon)
//   4. Marque la mission FAILED si la deadline est dépassée
//
// Appelé par le cron /api/cron/sync-missions (toutes les heures).
// ============================================================================

import { prisma } from "@/lib/prisma";

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
 */
async function fetchAllCommits(owner: string, repo: string): Promise<{ date: string }[]> {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const allCommits: { date: string }[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${page}`,
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

  return allCommits;
}

/**
 * Calcule le streak de jours consécutifs avec au moins un commit,
 * en remontant à partir du dernier commit.
 */
function calculateStreak(commitDates: string[]): number {
  if (commitDates.length === 0) return 0;

  // Extraire les jours uniques (YYYY-MM-DD) et trier du plus récent au plus ancien
  const days = new Set(
    commitDates.map((d) => d.substring(0, 10))
  );
  const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

  let streak = 0;
  let expected = new Date(sortedDays[0]);

  for (const day of sortedDays) {
    const dayDate = new Date(day);
    // Comparer les dates (sans l'heure)
    const diffDays = Math.round(
      (expected.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      streak++;
      expected = new Date(dayDate);
      expected.setDate(expected.getDate() - 1);
    } else if (diffDays === 1) {
      // Jour manquant → streak cassé
      break;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Attribue un trophée à une mission s'il n'existe pas déjà.
 */
async function awardTrophyIfNew(missionId: string, type: string): Promise<void> {
  const existing = await prisma.trophy.findFirst({
    where: { missionId, type: type as any },
  });
  if (!existing) {
    await prisma.trophy.create({
      data: { missionId, type: type as any },
    });
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

  // Récupérer les commits
  const commits = await fetchAllCommits(repoInfo.owner, repoInfo.repo);
  const commitCount = commits.length;
  const lastCommitAt = commits.length > 0
    ? new Date(commits[0].date)
    : null;
  const streak = calculateStreak(commits.map((c) => c.date));

  // Mettre à jour la mission
  await prisma.mission.update({
    where: { id: missionId },
    data: {
      commitCount,
      currentStreak: streak,
      lastCommitAt,
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

  // Vérifier la deadline
  if (new Date() > mission.deadline && mission.status === "IN_PROGRESS") {
    await prisma.mission.update({
      where: { id: missionId },
      data: { status: "FAILED" },
    });
  }
}
