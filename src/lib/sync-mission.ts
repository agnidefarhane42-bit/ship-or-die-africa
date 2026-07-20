// ============================================================================
// sync-mission.ts — CŒUR DE LA MÉCANIQUE PRODUIT
// ============================================================================
// Timezone : Africa/Lagos (WAT, UTC+1, sans DST).
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { TrophyType } from "@prisma/client";
import { sendTelegramMessage, sendGroupMessage, escapeHtml } from "@/lib/telegram";

const DEFAULT_TZ = "Africa/Lagos";

const TROPHY_LABELS: Record<string, string> = {
  FIRST_COMMIT: "Première Graine plantée 🌱",
  FIRST_DEPLOY: "Première Pousse",
  FIFTY_COMMITS: "Racines qui s'enfoncent",
  HUNDRED_COMMITS: "Feuillage dense",
  SHIPPED: "Fruit récolté",
  EARLY_BIRD: "Premier au Cercle",
};

function toLocalDayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysToKey(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + n * 86_400_000;
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

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

  if (since) {
    const sinceMs = since.getTime();
    return allCommits.filter((c) => new Date(c.date).getTime() >= sinceMs);
  }

  return allCommits;
}

function calculateStreak(commitDates: string[]): number {
  if (commitDates.length === 0) return 0;

  const days = new Set(commitDates.map((d) => toLocalDayKey(d)));
  const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

  const today = toLocalDayKey(new Date());
  const yesterday = addDaysToKey(today, -1);

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

function buildCommitsByDay(
  commitDates: string[],
  startedAt: Date,
  deadline: Date
): Record<string, number> {
  const result: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const d of commitDates) {
    const day = toLocalDayKey(d);
    counts[day] = (counts[day] || 0) + 1;
  }

  const startKey = toLocalDayKey(startedAt);
  const endKey = toLocalDayKey(deadline);

  let cursor = startKey;
  let guard = 0;
  while (cursor <= endKey && guard < 400) {
    result[cursor] = counts[cursor] || 0;
    cursor = addDaysToKey(cursor, 1);
    guard++;
  }

  return result;
}

async function awardTrophyIfNew(missionId: string, type: string): Promise<void> {
  try {
    await prisma.trophy.create({
      data: { missionId, type: type as unknown as TrophyType },
    });

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
    }
  } catch {
    // déjà existant
  }
}

export async function syncMission(missionId: string): Promise<void> {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { user: true },
  });

  if (!mission || !mission.repoUrl || !mission.user?.githubUsername || !mission.user?.githubVerified) return;
  if (mission.status !== "IN_PROGRESS") return;

  const repoInfo = parseRepoUrl(mission.repoUrl);
  if (!repoInfo) return;

  const commits = await fetchAllCommits(repoInfo.owner, repoInfo.repo, mission.startedAt);
  const commitCount = commits.length;
  const lastCommitAt =
    commits.length > 0 ? new Date(commits[0].date) : null;
  const streak = calculateStreak(commits.map((c) => c.date));

  const commitsByDay = buildCommitsByDay(
    commits.map((c) => c.date),
    mission.startedAt,
    mission.deadline
  );

  await prisma.mission.update({
    where: { id: missionId },
    data: {
      commitCount,
      currentStreak: streak,
      lastCommitAt,
      commitsByDay,
    },
  });

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

  if (new Date() > mission.deadline && mission.status === "IN_PROGRESS") {
    await prisma.mission.update({
      where: { id: missionId },
      data: { status: "FAILED" },
    });

    // Opt-in par défaut pour les users Mongo sans le champ
    if (mission.user?.notifyGroupOnShipFail ?? true) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "";
        const builderName = escapeHtml(mission.user?.name || "Un bâtisseur");
        const safeTitle = escapeHtml(mission.title);
        const builderLink = `${baseUrl}/builders/${mission.user.id}`;

        const groupMsg =
          `🍂 <b>${builderName}</b> n'a pas eu le temps de finir <b>${safeTitle}</b> dans les 30 jours.\n\n` +
          `Ça arrive à tout le monde sous le baobab — on est là pour la prochaine tentative 💪\n` +
          `${builderLink}`;

        await sendGroupMessage(groupMsg);
      } catch (groupErr) {
        console.error("Group announcement (fail) error:", groupErr);
      }
    }
  }
}
