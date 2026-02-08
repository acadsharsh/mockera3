import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import AdminPercentilesClient from "./AdminPercentilesClient";

export const dynamic = "force-dynamic";

export default async function AdminPercentilesPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.includes(session.user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  return <AdminPercentilesClient />;
}
