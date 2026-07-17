import { FedaPay, Transaction } from "fedapay";

// ── Initialisation lazy ─────────────────────────────────────────────────────
// FedaPay.setApiKey() et setEnvironment() sont appelés une seule fois,
// lors du premier import effectif dans un contexte runtime (pas au build).
// Les variables FEDAPAY_* ne sont pas requises pour que le build Next.js
// réussisse — elles sont uniquement nécessaires à l'exécution.
let _fedapayInitialized = false;

function ensureFedapayInit() {
  if (_fedapayInitialized) return;
  FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY || "");
  FedaPay.setEnvironment(process.env.FEDAPAY_ENVIRONMENT || "sandbox");
  _fedapayInitialized = true;
}

export type CreditPackage = {
  id: string;
  credits: number;
  amount: number; // en XOF
  label: string;
  popular?: boolean;
};

// Packs de crédits disponibles à l'achat.
// Plafonnés à 5000 FCFA — au-delà, le compte FedaPay refuse la transaction
// (plafond de transaction configuré à 5000 FCFA max sur ce compte).
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "pack_100", credits: 100, amount: 1000, label: "100 crédits" },
  { id: "pack_500", credits: 500, amount: 3000, label: "500 crédits", popular: true },
  { id: "pack_1000", credits: 1000, amount: 5000, label: "1000 crédits" },
];

export function getPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId);
}

export function formatXOF(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

/**
 * Crée une transaction FedaPay et retourne l'URL de paiement (token url)
 * vers laquelle rediriger l'utilisateur.
 */
export async function createPaymentUrl(params: {
  pkg: CreditPackage;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{ transactionId: string; paymentUrl: string }> {
  ensureFedapayInit();
  const { pkg, customerEmail, callbackUrl } = params;

  const transaction = await Transaction.create({
    description: `Achat de ${pkg.credits} crédits`,
    amount: pkg.amount,
    currency: { iso: "XOF" },
    callback_url: callbackUrl,
    customer: { email: customerEmail },
  });

  const tokenResponse = await transaction.generateToken();

  return {
    transactionId: String(transaction.id),
    paymentUrl: tokenResponse.url,
  };
}

/**
 * Métadonnées portées par une transaction FedaPay d'abonnement Vendia Pro —
 * c'est ce qui permet au webhook de distinguer un paiement d'abonnement
 * d'un achat de pack ponctuel, sans dépendre d'une table Payment (le modèle
 * Subscription ne mémorise pas de transactions individuelles).
 */
export type SubscriptionMetadata = {
  type: "subscription";
  userId: string;
};

/**
 * Crée une transaction FedaPay pour l'abonnement mensuel Vendia Pro et
 * retourne l'URL de paiement (checkout hébergé par FedaPay) — même pattern
 * que createPaymentUrl(), avec des custom_metadata permettant au webhook de
 * relier le paiement à l'utilisateur et de savoir qu'il s'agit d'un
 * abonnement (pas d'un pack de crédits).
 */
export async function createSubscriptionPaymentUrl(params: {
  userId: string;
  amount: number;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{ transactionId: string; paymentUrl: string }> {
  ensureFedapayInit();
  const { userId, amount, customerEmail, callbackUrl } = params;

  const metadata: SubscriptionMetadata = { type: "subscription", userId };

  const transaction = await Transaction.create({
    description: "Abonnement mensuel Vendia Pro",
    amount,
    currency: { iso: "XOF" },
    callback_url: callbackUrl,
    customer: { email: customerEmail },
    custom_metadata: metadata,
  });

  const tokenResponse = await transaction.generateToken();

  return {
    transactionId: String(transaction.id),
    paymentUrl: tokenResponse.url,
  };
}

/**
 * Lit les custom_metadata d'une entité de transaction reçue via webhook
 * FedaPay (typage volontairement permissif : le SDK FedaPay ne type pas
 * l'objet `entity` d'un événement webhook).
 */
export function readSubscriptionMetadata(
  entity: Record<string, unknown>
): SubscriptionMetadata | null {
  const raw = entity.custom_metadata;
  // FedaPay renvoie normalement un objet déjà parsé, mais certaines
  // intégrations le renvoient en chaîne JSON — on gère les deux cas.
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;

  if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).type === "subscription") {
    const userId = (parsed as Record<string, unknown>).userId;
    if (typeof userId === "string") {
      return { type: "subscription", userId };
    }
  }
  return null;
}

export type FedaPayPaymentMethod = "card" | "mobile_money";

/**
 * Déduit "carte" vs "mobile money" à partir du champ `mode` que FedaPay
 * renvoie sur une transaction (ex : "mtn_open", "moov", "card", "flooz"...).
 * Tout ce qui n'est pas explicitement "card" est considéré mobile money —
 * c'est de très loin le mode de paiement dominant sur ce marché.
 */
export function determinePaymentMethod(mode: unknown): FedaPayPaymentMethod {
  const modeStr = typeof mode === "string" ? mode.toLowerCase() : "";
  return modeStr.includes("card") ? "card" : "mobile_money";
}

/**
 * Tentative de prélèvement automatique sur une carte déjà utilisée par le
 * client FedaPay (identifié par fedapayCustomerId), pour le renouvellement
 * d'abonnement — utilisée uniquement par le cron de renouvellement.
 *
 * ⚠️ HONNÊTETÉ IMPORTANTE : le SDK FedaPay (fedapay@1.2.5, utilisé ici)
 * n'expose aucune méthode documentée de "charge d'une carte enregistrée
 * sans redirection" (pas de vault / payment-method-on-file explicite côté
 * API Node). On crée donc une transaction rattachée au client FedaPay
 * existant, mais RIEN NE GARANTIT qu'elle soit marquée payée immédiatement
 * sans interaction de l'utilisateur (3-D Secure, etc.). C'est un
 * "best-effort expérimental" : si la transaction n'est pas retournée comme
 * payée (wasPaid() === false), l'appelant doit traiter ça comme un échec de
 * prélèvement automatique — exactement comme pour le Mobile Money — et ne
 * jamais afficher "paiement automatique réussi" tant que ce n'est pas
 * confirmé.
 */
export async function attemptCardAutoCharge(params: {
  userId: string;
  fedapayCustomerId: string;
  amount: number;
  description: string;
}): Promise<{ success: boolean; transactionId: string; paymentUrl?: string }> {
  ensureFedapayInit();
  const { userId, fedapayCustomerId, amount, description } = params;

  // Mêmes custom_metadata que le paiement initial : si cette transaction
  // finit par déclencher un webhook (ex : validation asynchrone après coup),
  // il sera traité par le même chemin de code que n'importe quel paiement
  // d'abonnement.
  const metadata: SubscriptionMetadata = { type: "subscription", userId };

  const transaction = await Transaction.create({
    description,
    amount,
    currency: { iso: "XOF" },
    customer: { id: fedapayCustomerId },
    custom_metadata: metadata,
  });

  if (transaction.wasPaid()) {
    return { success: true, transactionId: String(transaction.id) };
  }

  // Pas payée immédiatement : on ne peut pas la considérer comme un
  // prélèvement automatique réussi. On génère quand même un lien de
  // paiement pour permettre un paiement manuel de secours si l'appelant en
  // a besoin, mais success reste false.
  const tokenResponse = await transaction.generateToken();
  return {
    success: false,
    transactionId: String(transaction.id),
    paymentUrl: tokenResponse.url,
  };
}
