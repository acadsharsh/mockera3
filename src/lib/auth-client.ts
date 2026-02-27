"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [usernameClient(), emailOTPClient(), adminClient()],
});

export const { signIn, signOut, signUp, useSession, emailOtp } = authClient;
