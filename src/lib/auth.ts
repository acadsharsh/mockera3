import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, emailOTP, username } from "better-auth/plugins";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

type SocialProviderConfig = {
  clientId: string;
  clientSecret: string;
  prompt?: string;
  accessType?: string;
};

const socialProviders: Record<string, SocialProviderConfig> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account",
  };
}

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  socialProviders.discord = {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    async sendResetPassword() {
      // TODO: wire email delivery for password resets.
    },
  },
  socialProviders,
  plugins: [
    username(),
    admin(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.EMAIL_FROM;
        if (!apiKey || !from) {
          throw new Error("Missing RESEND_API_KEY or EMAIL_FROM.");
        }

        const resend = new Resend(apiKey);
        const subject =
          type === "sign-in"
            ? "Your sign-in code"
            : type === "email-verification"
              ? "Verify your email"
              : "Reset your password";

        await resend.emails.send({
          from,
          to: email,
          subject,
          html: `
            <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5;">
              <p>Your verification code is:</p>
              <p style="font-size: 20px; font-weight: 700; letter-spacing: 2px;">${otp}</p>
              <p>This code expires in a few minutes.</p>
            </div>
          `,
        });
      },
    }),
    nextCookies(),
  ],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: { modelName: "User" },
  session: { modelName: "Session" },
  account: { modelName: "Account" },
  verification: { modelName: "Verification" },
});
