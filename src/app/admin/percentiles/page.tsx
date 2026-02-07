import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminPercentilesClient from "./AdminPercentilesClient";

export const dynamic = "force-dynamic";

export default async function AdminPercentilesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <AdminPercentilesClient />;
}
