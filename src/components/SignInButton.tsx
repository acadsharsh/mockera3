"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      className="rounded-full bg-[#4f46e5] px-5 py-2 text-sm font-semibold text-white"
      onClick={() => signIn("google", { callbackUrl: "/" })}
    >
      Continue with Google
    </button>
  );
}
