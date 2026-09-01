import { redirect } from "next/navigation";
import { getAdminSession } from "../../../lib/auth";
import { getHomeHtml } from "../../../lib/content";
import SiteEditor from "../../../components/SiteEditor";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const html = await getHomeHtml();
  return <SiteEditor initialHtml={html} />;
}
