import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/resend";
import { sendTelegramMessage } from "@/lib/telegram";
import crypto from "crypto";

/**
 * Webhook FedaPay — confirmation de paiement.
 *
 * Signature : HMAC-SHA256 (hex) du body brut, header X-FEDAPAY-SIGNATURE
 * (variantes de casse acceptées). Fail-closed si FEDAPAY_WEBHOOK_SECRET absent.
 *
 * Doc FedaPay webhooks :
 * https://docs.fedapay.com/integration-api/v1/webhooks
 */

/**
 * Vérifie la signature du webhook FedaPay.
 * Le header contient un HMAC-SHA256 hex du body raw,
 * calculé avec FEDAPAY_WEBHOOK_SECRET.
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("FEDAPAY_WEBHOOK_SECRET non configuré — webhook refusé (fail-closed)");
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

function getFedaPaySignature(req: NextRequest): string | null {
  // Accepte les variantes de casse / noms documentés sans inventer un format Stripe
  return (
    req.headers.get("x-fedapay-signature") ||
    req.headers.get("X-FEDAPAY-SIGNATURE") ||
    req.headers.get("x-fedapay-signature".toUpperCase()) ||
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. Body brut (pas req.json() qui consomme le stream)
    const rawBody = await req.text();

    // 2. Signature — fail-closed si secret absent ou HMAC invalide
    const signature = getFedaPaySignature(req);
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

    const fedapayId = String(entity?.id || entity?.transaction_id || "").trim();
    if (!fedapayId) {
      console.error("FedaPay webhook: entity.id manquant", entity);
      return NextResponse.json({ error: "fedapayId manquant" }, { status: 400 });
    }

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

    // Était-il déjà PAID ? (évite email/Telegram en double sur retry webhook)
    const existing = await prisma.payment.findUnique({
      where: { fedapayId },
      select: { status: true },
    });
    const wasAlreadyPaid = existing?.status === "PAID";

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

    // Notifications post-paiement uniquement sur transition → PAID
    if (!wasAlreadyPaid) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true, telegramChatId: true },
        });

        if (user?.email) {
          try {
            await sendWelcomeEmail(user.email, user.name || undefined);
          } catch (emailErr) {
            console.error("Welcome email after FedaPay paid failed:", emailErr);
          }
        }

        if (user?.telegramChatId) {
          try {
            await sendTelegramMessage(
              user.telegramChatId,
              "🌳 <b>Paiement confirmé !</b>\n\nBienvenue sous le baobab. Tu peux maintenant créer ta mission de 30 jours."
            );
          } catch (tgErr) {
            console.error("Welcome Telegram after FedaPay paid failed:", tgErr);
          }
        }
      } catch (notifyErr) {
        console.error("Post-paid notifications error:", notifyErr);
      }
    }

    return NextResponse.json({ received: true, status: "paid" });
  } catch (err) {
    console.error("FedaPay webhook error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
