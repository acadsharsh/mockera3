"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const { data } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data?.user) {
      window.location.href = "/dashboard";
    }
  }, [data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode") === "signup" ? "signup" : "signin";
    setMode(nextMode);
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitSignIn = async () => {
    await signIn.email({
      email,
      password,
      rememberMe,
      callbackURL: "/dashboard",
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onSuccess: () => {
          window.location.href = "/dashboard";
        },
      },
    });
  };

  const submitSignUp = async () => {
    if (password !== passwordConfirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    await signUp.email({
      email,
      password,
      name: `${firstName} ${lastName}`.trim(),
      image: image ? await convertImageToBase64(image) : "",
      callbackURL: "/dashboard",
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          window.location.href = "/dashboard";
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 pb-16 pt-24">
        <div className="max-w-md rounded-md rounded-t-none border border-white/10 bg-white/5 p-6 text-white shadow-2xl">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold md:text-xl">
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </h1>
            <p className="text-xs text-white/70 md:text-sm">
              {mode === "signin"
                ? "Enter your email below to login to your account"
                : "Enter your information to create an account"}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                mode === "signin"
                  ? "bg-white/15 text-white"
                  : "border border-white/10 text-white/60"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                mode === "signup"
                  ? "bg-white/15 text-white"
                  : "border border-white/10 text-white/60"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="first-name" className="text-sm text-white/80">
                    First name
                  </label>
                  <input
                    id="first-name"
                    placeholder="Max"
                    required
                    onChange={(event) => setFirstName(event.target.value)}
                    value={firstName}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="last-name" className="text-sm text-white/80">
                    Last name
                  </label>
                  <input
                    id="last-name"
                    placeholder="Robinson"
                    required
                    onChange={(event) => setLastName(event.target.value)}
                    value={lastName}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm text-white/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                onChange={(event) => setEmail(event.target.value)}
                value={email}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <label htmlFor="password" className="text-sm text-white/80">
                  Password
                </label>
                {mode === "signin" && (
                  <Link href="#" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </Link>
                )}
              </div>
              <input
                id="password"
                type="password"
                placeholder="password"
                autoComplete={mode === "signin" ? "password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>

            {mode === "signup" && (
              <div className="grid gap-2">
                <label htmlFor="password_confirmation" className="text-sm text-white/80">
                  Confirm Password
                </label>
                <input
                  id="password_confirmation"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Confirm Password"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </div>
            )}

            {mode === "signup" && (
              <div className="grid gap-2">
                <label htmlFor="image" className="text-sm text-white/80">
                  Profile Image (optional)
                </label>
                <div className="flex items-end gap-4">
                  {imagePreview && (
                    <div className="relative h-16 w-16 overflow-hidden rounded-sm">
                      <Image src={imagePreview} alt="Profile preview" fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex w-full items-center gap-2">
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
                    />
                    {imagePreview && (
                      <X
                        className="cursor-pointer"
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {mode === "signin" && (
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  id="remember"
                  type="checkbox"
                  onChange={() => setRememberMe((prev) => !prev)}
                />
                Remember me
              </label>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              disabled={loading}
              onClick={mode === "signin" ? submitSignIn : submitSignUp}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === "signin" ? (
                "Login"
              ) : (
                "Create your account"
              )}
            </button>

            {mode === "signin" && (
              <div className="flex w-full flex-col items-center gap-2">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
                  disabled={loading}
                  onClick={async () => {
                    await signIn.social({
                      provider: "google",
                      callbackURL: "/dashboard",
                      fetchOptions: {
                        onRequest: () => setLoading(true),
                        onResponse: () => setLoading(false),
                      },
                    });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 262">
                    <path
                      fill="#4285F4"
                      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                    ></path>
                    <path
                      fill="#EB4335"
                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    ></path>
                  </svg>
                  Sign in with Google
                </button>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
                  disabled={loading}
                  onClick={async () => {
                    await signIn.social({
                      provider: "discord",
                      callbackURL: "/dashboard",
                      fetchOptions: {
                        onRequest: () => setLoading(true),
                        onResponse: () => setLoading(false),
                      },
                    });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                    <path
                      fill="#5865F2"
                      d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12"
                    ></path>
                  </svg>
                  Sign in with Discord
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex w-full justify-center border-t border-white/10 py-4">
            <p className="text-center text-xs text-neutral-500">
              built with{" "}
              <Link href="https://better-auth.com" className="underline" target="_blank">
                <span className="cursor-pointer dark:text-white/70">better-auth.</span>
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
