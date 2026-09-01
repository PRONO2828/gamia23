import Link from "next/link";
import { redirect } from "next/navigation";
import { getHomeHtml } from "../lib/content";
import { getAdminSession } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  // /?edit sends a logged-in admin straight to the site editor.
  if (searchParams && searchParams.edit !== undefined) {
    const admin = await getAdminSession();
    if (admin) redirect("/admin/editor");
    redirect("/admin/login");
  }

  const html = await getHomeHtml();

  return (
    <div className="container">
      <header className="topbar">
        <div className="logo">Gamia<span>23</span></div>
        <nav className="nav-actions">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/dashboard" className="btn">Account balance</Link>
          <Link href="/signup" className="btn btn-primary">Sign up</Link>
        </nav>
      </header>

      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
