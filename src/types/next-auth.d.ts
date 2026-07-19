import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      githubUsername?: string | null;
      githubVerified?: boolean;
      telegramChatId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    githubUsername?: string | null;
    githubVerified?: boolean;
    telegramChatId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    githubUsername?: string | null;
    githubVerified?: boolean;
    telegramChatId?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    githubUsername?: string | null;
    githubVerified?: boolean;
    telegramChatId?: string | null;
  }
}

export {};
