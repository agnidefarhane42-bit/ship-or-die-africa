import { prisma } from "@/lib/prisma";

/**
 * Retourne la mission active d'un user (IN_PROGRESS la plus récente,
 * sinon la dernière créée).
 */
export async function getActiveMission(userId: string) {
  const inProgress = await prisma.mission.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    include: { trophies: true },
    orderBy: { createdAt: "desc" },
  });
  if (inProgress) return inProgress;

  return prisma.mission.findFirst({
    where: { userId },
    include: { trophies: true },
    orderBy: { createdAt: "desc" },
  });
}
