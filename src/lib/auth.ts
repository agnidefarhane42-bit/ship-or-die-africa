import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Quand un utilisateur se connecte via GitHub OAuth, on renseigne
    // githubUsername et githubVerified automatiquement.
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existing) {
          // L'utilisateur existe déjà (preorder ou credentials) → on lie GitHub
          if (!existing.githubVerified) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                githubUsername: (profile as any)?.login || existing.githubUsername,
                githubVerified: true,
              },
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Au login credentials : injecter l'id user dans le token JWT
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      // Au login GitHub : stocker le githubUsername et githubVerified
      if (account?.provider === "github" && profile) {
        token.githubUsername = (profile as any).login;
        token.githubVerified = true;

        // Mettre à jour l'utilisateur en base s'il a été créé par l'adapter
        if (token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          });
          if (dbUser && !dbUser.githubVerified) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                githubUsername: (profile as any).login,
                githubVerified: true,
              },
            });
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Propager l'id du token vers la session côté client
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      // Exposer githubUsername et githubVerified dans la session
      if (token.githubUsername) {
        (session.user as any).githubUsername = token.githubUsername;
      }
      if (token.githubVerified) {
        (session.user as any).githubVerified = true;
      }
      return session;
    },
  },
});
