"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { emailOtp } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 pb-16 pt-24">
        <div className="max-w-md rounded-md rounded-t-none border border-white/10 bg-white/5 p-6 text-white shadow-2xl">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold md:text-xl">Reset password</h1>
            <p className="text-xs text-white/70 md:text-sm">
              We will send a one-time code to your email.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm text-white/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>

            {!otpSent ? (
              <button
                type="button"
                className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                disabled={loading}
                onClick={async () => {
                    await emailOtp.requestPasswordReset({
                      email,
                      fetchOptions: {
                        onRequest: () => setLoading(true),
                        onResponse: () => setLoading(false),
                        onError: (ctx) => {
                          toast.error(ctx.error.message);
                        },
                        onSuccess: () => {
                          setOtpSent(true);
                          toast.success("OTP sent to your email.");
                        },
                      },
                  });
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Send OTP"}
              </button>
            ) : (
              <>
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
                <div className="grid gap-2">
                  <label htmlFor="newPassword" className="text-sm text-white/80">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  disabled={loading}
                  onClick={async () => {
                    await emailOtp.resetPassword({
                      email,
                      otp,
                      password: newPassword,
                      fetchOptions: {
                        onRequest: () => setLoading(true),
                        onResponse: () => setLoading(false),
                        onError: (ctx) => {
                          toast.error(ctx.error.message);
                        },
                        onSuccess: () => {
                          toast.success("Password reset. Please sign in.");
                          window.location.href = "/login";
                        },
                      },
                    });
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
                </button>
              </>
            )}
          </div>

          <div className="mt-6 flex w-full justify-center border-t border-white/10 py-4">
            <Link href="/login" className="text-xs text-white/70 underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
