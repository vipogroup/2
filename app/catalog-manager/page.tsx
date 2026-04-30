import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { isSuperAdminUser } from "@/lib/superAdmins";

export default async function Page() {
  const user = await requireAdmin();
  if (!isSuperAdminUser(user)) {
    redirect("/admin");
  }
  redirect("/admin/catalog-manager/standalone");
}
