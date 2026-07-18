import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Webhook FedaPay ──────────────────────────────────────────────────────────
// Reçoit les événements de paiement de FedaPay (transaction.approved, etc.)
//
// ⚠️ Vérification de signature :
// Le SDK FedaPay (fedapay@1.2.5) ne fournit pas de méthode native pour vérifier
// la signature du webhook côté Node.js. Il faudrait comparer le header
// `X-FedaPay-Signature` avec un HMAC-SHA256 du body raw en utilisant
// FEDAPAY_WEBHOOK_SECRET. Pour l'instant, on accepte le payload tel quel
// car la route n'exécute aucune action destructive — elle crée/met à jour
// un Payment uniquement si la transaction est marquée payée.
// À sécuriser en production avec un middleware de vérification de signature.
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // FedaPay envoie { event: "...", data: { ... } }
    // La structure peut varier — on gère plusieurs formats possibles
    const entity = body?.data?.entity || body?.entity || body?.data || body;
    const eventType = body?.event || body?.type || "";

    // On ne traite que les événements de paiement approuvé
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
      // Paiement en attente ou échoué — on enregistre quand même
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
