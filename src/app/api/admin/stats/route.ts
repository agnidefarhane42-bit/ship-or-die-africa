import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/stats — vue d'ensemble pour le dashboard admin
// Accès restreint : role === ADMIN uniquement.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
  }

  // ── Stats globales ──
  const [totalUsers, totalMissions, inProgressMissions, shippedMissions, failedMissions, totalPayments, paidPayments, totalTrophies] = await Promise.all([
    prisma.user.count(),
    prisma.mission.count(),
    prisma.mission.count({ where: { status: "IN_PROGRESS" } }),
    prisma.mission.count({ where: { status: "SHIPPED" } }),
    prisma.mission.count({ where: { status: "FAILED" } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.trophy.count(),
  ]);

  // ── Liste des utilisateurs ──
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      githubUsername: true,
      githubVerified: true,
      role: true,
      createdAt: true,
      missions: {
        select: { id: true, title: true, status: true },
      },
      payments: {
        select: { id: true, status: true, amount: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Liste des missions ──
  const missions = await prisma.mission.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      commitCount: true,
      startedAt: true,
      deadline: true,
      url: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Revenus ──
  const payments = await prisma.payment.findMany({
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const revenue = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return NextResponse.json({
    stats: {
      totalUsers,
      totalMissions,
      inProgressMissions,
      shippedMissions,
      failedMissions,
      totalPayments,
      paidPayments,
      totalTrophies,
      revenue,
    },
    users,
    missions,
    payments,
  });
}
