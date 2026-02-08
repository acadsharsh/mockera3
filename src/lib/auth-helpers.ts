import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

const parseAdminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const getSession = async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
};

export const requireUser = async () => {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
};

export const requireAdmin = async () => {
  const session = await requireUser();
  const admins = parseAdminEmails();
  const email = session.user?.email?.toLowerCase();
  if (!email || !admins.includes(email)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
};
