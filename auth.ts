import authConfig from "@/auth.config";
import { UserRole } from "@/lib/types";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

import { getUserById } from "@/lib/user";

// Inline Prisma initialization to avoid module resolution issues in production
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// More info: https://authjs.dev/getting-started/typescript#module-augmentation
// Module augmentation is handled in types/next-auth.d.ts

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  cookies: {
    sessionToken: {
      name: `__Secure-cz2.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    },
    callbackUrl: {
      name: `__Secure-cz2.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    },
    csrfToken: {
      name: `__Host-cz2.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    // @ts-ignore // Inherit authorized callback from auth.config
    ...authConfig.callbacks,
    async session({ token, session }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }

        if (token.email) {
          session.user.email = token.email;
        }

        if (token.role) {
          session.user.role = token.role;
        }

        // Pass credits to session
        session.user.credits = (token.credits as number) || 0;

        // Pass emoji to session
        session.user.emoji = (token.emoji as string) || null;

        // Pass email verification status
        session.user.emailVerified = token.emailVerified as Date | null;

        session.user.name = token.name;
        session.user.image = token.picture;
      }

      return session;
    },

    async jwt({ token }) {
      if (!token.sub) return token;

      const dbUser = await getUserById(token.sub);

      if (!dbUser) return token;

      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      token.role = dbUser.role as UserRole;
      token.credits = dbUser.credits;
      token.emailVerified = dbUser.emailVerified;
      token.emoji = dbUser.emoji;

      return token;
    },
    async signIn({ user, account, profile }) {
      console.log('[Auth] signIn callback triggered', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        accountType: account?.type,
        profileEmail: profile?.email
      });

      // Auto-verify email for OAuth providers (Google, Yandex)
      // Note: For NEW users, the adapter creates the user AFTER signIn returns true.
      // So we only auto-verify here if the user already exists in DB.
      if (account?.type === 'oidc' && user?.email) {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, emailVerified: true }
          });
          if (existing && !existing.emailVerified) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { emailVerified: new Date() }
            });
            console.log(`[Auth] Auto-verified email for OAuth user ${existing.id}`);
          }
        } catch (e) {
          // Non-critical: don't block login if auto-verify fails
          console.error('[Auth] Failed to auto-verify OAuth user:', e);
        }
      }

      return true
    },
    // Redirect to dashboard after successful Google OAuth
    async redirect({ url, baseUrl }) {
      // After successful OAuth, redirect to dashboard
      if (url.startsWith(baseUrl) && url.includes("/api/auth/callback")) {
        return `${baseUrl}/dashboard`
      }
      // Allow callback URLs
      if (url.startsWith(baseUrl)) return url
      // Fallback to dashboard
      return `${baseUrl}/dashboard`
    }
  },

  // debug: process.env.NODE_ENV !== "production",
  events: {
    async createUser({ user }) {
      if (user.id) {
        try {
          // 1. Generate Referral Code and Random Emoji
          const { nanoid } = await import("nanoid");
          const referralCode = nanoid(6);

          // Random emoji for user avatar
          const userEmojis = ["🚀", "⚡", "🔥", "💎", "🌟", "🎯", "💫", "🦊", "🐱", "🦁", "🐼", "🐨", "🦄", "🐸", "🦋", "🌈", "🍀", "🌸", "🎨", "🎭"];
          const randomEmoji = userEmojis[Math.floor(Math.random() * userEmojis.length)];

          await prisma.user.update({
            where: { id: user.id },
            data: { referralCode, emoji: randomEmoji }
          });
          console.log(`[Auth] Generated referral code for ${user.id}: ${referralCode}, emoji: ${randomEmoji}`);

          // 2. Check for Referrer Cookie
          const { cookies } = await import("next/headers");
          const cookieStore = cookies();
          const refCode = cookieStore.get("referral_code")?.value;

          if (refCode) {
            const referrer = await prisma.user.findUnique({
              where: { referralCode: refCode }
            });

            if (referrer && referrer.id !== user.id) {
              await prisma.user.update({
                where: { id: user.id },
                data: { referrerId: referrer.id }
              });
              console.log(`[Auth] User ${user.id} referred by ${referrer.id} (${refCode})`);

              // Optional: Notify referrer via email (TODO)
            }
          }

          // Welcome Bonus: 100 Credits ($0.10)
          const { CreditManager } = await import("@/lib/services/credit-manager");
          await CreditManager.addCredits(user.id, 100, "welcome-bonus", { note: "Registration gift" });
          console.log(`[Auth] Welcomed user ${user.id} with 100 credits.`);
        } catch (error) {
          console.error("[Auth] Failed to setup user/bonus:", error);
        }
      }
    },
  },
});
