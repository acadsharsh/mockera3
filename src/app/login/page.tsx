import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInButton from "@/components/SignInButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0d0f13] text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
          <p className="text-xs uppercase text-white/60">Welcome Back</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in to your Creator Studio</h1>
          <p className="mt-2 text-sm text-white/60">
            Upload PDFs, build CBT mock tests, and unlock advanced analytics.
          </p>
          <div className="mt-6">
            <SignInButton />
          </div>
        </div>
      </div>
    </div>
  );
}
