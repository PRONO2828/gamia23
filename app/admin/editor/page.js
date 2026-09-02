import { redirect } from "next/navigation";
import { getAdminSession } from "../../../lib/auth";
import SiteEditor from "../../../components/SiteEditor";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  return <SiteEditor />;
}
