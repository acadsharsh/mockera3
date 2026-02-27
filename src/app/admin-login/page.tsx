"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { emailOtp, signIn, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { toast } from "sonner";

const getAdminEmails = () =>
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

type Step = "request" | "verify";
type Mode = "otp" | "password";

export default function AdminLoginPage() {
  const { data } = useSession();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("request");
  const [mode, setMode] = useState<Mode>("otp");

  const adminEmails = useMemo(() => getAdminEmails(), []);

  useEffect(() => {
    if (data?.user) {
      window.location.href = "/admin";
    }
  }, [data]);

  const isAdminEmail = adminEmails.includes(email.trim().toLowerCase());

  const requestOtp = async () => {
    if (!email.trim()) {
      toast.error("Enter your admin email.");
      return;
    }
    if (adminEmails.length && !isAdminEmail) {
      toast.error("This email is not allowed for admin access.");
      return;
    }

    await emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          toast.error(ctx.error.message || "Failed to send OTP.");
        },
        onSuccess: () => {
          setStep("verify");
          toast.success("OTP sent to your email.");
        },
      },
    });
  };

  const signInWithPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your admin email.");
      return;
    }
    if (!password.trim()) {
      toast.error("Enter your password.");
      return;
    }
    if (adminEmails.length && !isAdminEmail) {
      toast.error("This email is not allowed for admin access.");
      return;
    }

    await signIn.email({
      email: email.trim(),
      password,
      callbackURL: "/admin",
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          toast.error(ctx.error.message || "Incorrect email or password.");
        },
        onSuccess: () => {
          window.location.href = "/admin";
        },
      },
    });
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter the OTP sent to your email.");
      return;
    }

    await signIn.emailOtp({
      email: email.trim(),
      otp: otp.trim(),
      callbackURL: "/admin",
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          toast.error(ctx.error.message || "Invalid OTP.");
        },
        onSuccess: () => {
          window.location.href = "/admin";
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 pb-16 pt-24">
        <div className="max-w-md rounded-md border border-white/10 bg-white/5 p-6 text-white shadow-2xl">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold md:text-xl">Admin One-Time Password</h1>
            <p className="text-xs text-white/70 md:text-sm">
              Enter your admin email to receive a one-time code.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("otp");
                  setStep("request");
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  mode === "otp" ? "bg-white/15 text-white" : "border border-white/10 text-white/60"
                }`}
                disabled={loading}
              >
                OTP
              </button>
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  mode === "password" ? "bg-white/15 text-white" : "border border-white/10 text-white/60"
                }`}
                disabled={loading}
              >
                Password
              </button>
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm text-white/80">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                onChange={(event) => setEmail(event.target.value)}
                value={email}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>

            {mode === "otp" && step === "verify" && (
              <div className="grid gap-2">
                <label htmlFor="otp" className="text-sm text-white/80">
                  OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </div>
            )}

            {mode === "password" && (
              <div className="grid gap-2">
                <label htmlFor="password" className="text-sm text-white/80">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {mode === "otp" && step === "request" ? (
                <button
                  type="button"
                  className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  disabled={loading}
                  onClick={requestOtp}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Send OTP"}
                </button>
              ) : mode === "otp" ? (
                <button
                  type="button"
                  className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  disabled={loading}
                  onClick={verifyOtp}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Sign In"}
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  disabled={loading}
                  onClick={signInWithPassword}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
                </button>
              )}

              {mode === "otp" && step === "verify" && (
                <button
                  type="button"
                  className="w-full rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
                  disabled={loading}
                  onClick={() => setStep("request")}
                >
                  Use a different email
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex w-full justify-center border-t border-white/10 py-4">
            <p className="text-center text-xs text-neutral-500">
              Not an admin?{" "}
              <Link href="/login" className="underline">
                Go to user login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
