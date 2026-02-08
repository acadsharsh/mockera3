"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function AuthNav() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user;

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore sign-out errors to avoid blocking UI.
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/60">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/login"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/80 transition hover:border-white/30 hover:text-white"
        >
          Sign in
        </Link>
        <Link
          href="/login?mode=signup"
          className="rounded-full bg-[#2D5BFF] px-3 py-2 font-semibold text-white shadow-[0_12px_30px_rgba(45,91,255,0.35)]"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-white/80">
      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
        {user.name ?? user.email ?? "Signed in"}
      </div>
      <button
        type="button"
        onClick={signOut}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/80 transition hover:border-white/30 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
