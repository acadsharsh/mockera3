import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
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
          <div className="mt-8">
            <SignIn
              path="/login"
              appearance={{
                variables: {
                  colorPrimary: "#4f46e5",
                  colorText: "#ffffff",
                  colorBackground: "#0d0f13",
                },
                elements: {
                  card: "shadow-none border border-white/10 bg-white/5",
                  headerTitle: "text-white",
                  headerSubtitle: "text-white/60",
                  formButtonPrimary: "bg-[#4f46e5] hover:bg-[#4338ca]",
                  formFieldInput:
                    "bg-white/5 border-white/10 text-white placeholder:text-white/30",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
