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

/**
 * Crée une transaction FedaPay pour le paiement unique du frais d'entrée
 * dans la cohorte Ship or Die Africa.
 *
 * @param params.userId   - ID de l'utilisateur (stocké dans custom_metadata)
 * @param params.amount    - Montant en XOF (FCFA)
 * @param params.customerEmail - Email de l'utilisateur
 * @param params.callbackUrl - URL de redirection après paiement
 * @returns URL de paiement FedaPay
 */
export async function createCohortPaymentUrl(params: {
  userId: string;
  amount: number;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{ transactionId: string; paymentUrl: string }> {
  ensureFedapayInit();
  const { userId, amount, customerEmail, callbackUrl } = params;

  const transaction = await Transaction.create({
    description: "Frais d'entrée — Ship or Die Africa (cohorte)",
    amount,
    currency: { iso: "XOF" },
    callback_url: callbackUrl,
    customer: { email: customerEmail },
    custom_metadata: { userId },
  });

  const tokenResponse = await transaction.generateToken();

  return {
    transactionId: String(transaction.id),
    paymentUrl: tokenResponse.url,
  };
}
