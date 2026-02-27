import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import AdminConsoleClient from "@/components/AdminConsoleClient";

const parseAdminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin-login");
  }
  const admins = parseAdminEmails();
  const email = session.user?.email?.toLowerCase();
  if (!email || !admins.includes(email)) {
    redirect("/");
  }
  return <AdminConsoleClient />;
}
