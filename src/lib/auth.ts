import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** Profil GitHub minimal (login) — le type Profile de NextAuth ne l'expose pas toujours. */
type GitHubProfile = {
  login?: string;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          telegramChatId: user.telegramChatId,
        };
      },
    }),
    // ──────────────────────────────────────────────────────────────────────
    // GitHub : allowDangerousEmailAccountLinking est activé VOLONTAIREMENT.
    // Ici l'utilisateur est déjà authentifié sur son compte Ship or Die Africa
    // avant de cliquer "Connecter mon GitHub". Il confirme volontairement son
    // propre email en se connectant à GitHub. Il n'y a donc pas de risque
    // de prise de contrôle par un tiers (l'attaquant devrait déjà être
    // connecté sur le compte Ship or Die Africa de la victime).
    // ──────────────────────────────────────────────────────────────────────
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        // ── Récupérer l'email s'il est absent (email GitHub privé) ──
        if (!user.email && account.access_token) {
          try {
            const res = await fetch("https://api.github.com/user/emails", {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
                Accept: "application/vnd.github+json",
              },
            });
            if (res.ok) {
              const emails = (await res.json()) as GitHubEmail[];
              const primaryVerified = emails.find((e) => e.primary && e.verified);
              if (primaryVerified?.email) {
                user.email = primaryVerified.email;
              }
            }
          } catch {
            // silencieux — on gère l'absence d'email ci-dessous
          }
        }

        // Si toujours pas d'email vérifié → refuser proprement
        if (!user.email) {
          console.error("GitHub login: no verified email found");
          return false;
        }

        // ── Liaison du compte GitHub à un utilisateur existant ──
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existing && !existing.githubVerified) {
          const gh = profile as GitHubProfile | null | undefined;
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              githubUsername: gh?.login || existing.githubUsername,
              githubVerified: true,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        if (user.telegramChatId) {
          token.telegramChatId = user.telegramChatId;
        }
      }

      // Charger telegramChatId depuis la DB si absent (ex: après liaison Telegram)
      if (token.id && (trigger === "update" || !token.telegramChatId)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              telegramChatId: true,
              githubUsername: true,
              githubVerified: true,
            },
          });
          if (dbUser) {
            token.telegramChatId = dbUser.telegramChatId ?? null;
            if (dbUser.githubUsername) token.githubUsername = dbUser.githubUsername;
            if (dbUser.githubVerified) token.githubVerified = true;
          }
        } catch {
          // silencieux
        }
      }

      if (account?.provider === "github" && profile) {
        const gh = profile as GitHubProfile;
        token.githubUsername = gh.login;
        token.githubVerified = true;

        if (token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          });
          if (dbUser && !dbUser.githubVerified) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                githubUsername: gh.login,
                githubVerified: true,
              },
            });
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.githubUsername = token.githubUsername ?? null;
        session.user.githubVerified = token.githubVerified ?? false;
        session.user.telegramChatId = token.telegramChatId ?? null;
      }
      return session;
    },
  },
});
