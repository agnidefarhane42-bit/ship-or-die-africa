import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Vérifie la signature du webhook FedaPay.
 * Le header X-FEDAPAY-SIGNATURE contient un HMAC-SHA256 du body raw,
 * calculé avec FEDAPAY_WEBHOOK_SECRET.
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("FEDAPAY_WEBHOOK_SECRET non configuré");
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Récupérer le body brut (pas req.json() qui consomme le stream)
    const rawBody = await req.text();

    // 2. Vérifier la signature
    const signature = req.headers.get("X-FEDAPAY-SIGNATURE");
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    // 3. Parser le JSON manuellement
    const body = JSON.parse(rawBody);

    // FedaPay envoie { event: "...", data: { ... } }
    const entity = body?.data?.entity || body?.entity || body?.data || body;
    const eventType = body?.event || body?.type || "";

    if (!eventType.includes("approved") && !eventType.includes("paid") && !eventType.includes("transaction")) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Récupérer le userId depuis custom_metadata
    const metadata = entity?.custom_metadata;
    const userId =
      typeof metadata === "string"
        ? (() => { try { return JSON.parse(metadata).userId; } catch { return null; } })()
        : metadata?.userId;

    if (!userId) {
      return NextResponse.json({ error: "userId manquant dans metadata" }, { status: 400 });
    }

    const fedapayId = String(entity?.id || entity?.transaction_id || "");
    const isPaid =
      entity?.status === "approved" ||
      entity?.status === "paid" ||
      entity?.status === "completed";

    if (!isPaid) {
      await prisma.payment.upsert({
        where: { fedapayId },
        create: {
          userId,
          amount: entity?.amount || 0,
          status: "PENDING",
          fedapayId,
        },
        update: {},
      });
      return NextResponse.json({ received: true, status: "pending" });
    }

    // Paiement confirmé
    await prisma.payment.upsert({
      where: { fedapayId },
      create: {
        userId,
        amount: entity?.amount || 0,
        status: "PAID",
        fedapayId,
        paidAt: new Date(),
      },
      update: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    return NextResponse.json({ received: true, status: "paid" });
  } catch (err) {
    console.error("FedaPay webhook error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
