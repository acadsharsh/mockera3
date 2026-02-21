import { requireAdmin } from "@/lib/auth-helpers";
import AdminConsoleClient from "@/components/AdminConsoleClient";

export default async function AdminPage() {
  await requireAdmin();
  return <AdminConsoleClient />;
}
