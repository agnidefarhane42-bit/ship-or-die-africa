import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Ship or Die Africa <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient() {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");
    client = new Resend(key);
  }
  return client;
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { data, error } = await getClient().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ""),
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Email send failed:", err);
    throw err;
  }
}

export async function sendWelcomeEmail(to: string, name?: string) {
  return sendEmail(
    to,
    "Bienvenue sous le baobab ! 🌳",
    `<p>Salut ${name || "bâtisseur"},</p>
     <p>Ta place est réservée pour la première cohorte de Ship or Die Africa.</p>
     <p>Tu recevras bientôt les détails pour rejoindre le groupe Telegram privé — le Cercle.</p>
     <p>En attendant, prépare ton idée. Tu n'auras que 30 jours pour la faire grandir. 🌱</p>
     <p>— La communauté du baobab</p>`
  );
}
