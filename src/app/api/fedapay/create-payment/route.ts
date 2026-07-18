import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCohortPaymentUrl } from "@/lib/fedapay";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { callbackUrl } = await req.json().catch(() => ({ callbackUrl: "" }));

    const amount = parseInt(process.env.COHORT_PRICE_XOF || "10000");

    const result = await createCohortPaymentUrl({
      userId: session.user.id,
      amount,
      customerEmail: session.user.email || "",
      callbackUrl: callbackUrl || `${process.env.NEXTAUTH_URL}/dashboard`,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Create payment error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
