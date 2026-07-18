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
      async authorize(credentials: any) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existing) {
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
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      if (account?.provider === "github" && profile) {
        token.githubUsername = (profile as any).login;
        token.githubVerified = true;

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
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
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
