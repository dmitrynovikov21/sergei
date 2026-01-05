import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";

import { env } from "@/env.mjs";


export default {
  providers: [
    Credentials({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        // MOCK USER FOR DEV
        return {
          id: "clq1234560000abcde1234567",
          name: "Dev User",
          email: "dev@example.com",
          role: "ADMIN",
          image: "https://avatar.vercel.sh/dev"
        };
      }
    }),
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    Resend({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      // sendVerificationRequest,
    }),
  ],
} satisfies NextAuthConfig;
