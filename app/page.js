import Link from "next/link";
import { redirect } from "next/navigation";
import { getHomeHtml } from "../lib/content";
import { getAdminSession, getPlayerSession } from "../lib/auth";
import LogoutButton from "../components/LogoutButton";

export const dynamic = "force-dynamic";

// The homepage body is admin-editable HTML, so its call-to-action buttons are
// whatever the admin last saved. For a player who is already signed in, a
// "sign up" link should lead to their dashboard instead, and a "log in" link
// is redundant — so rewrite the first and drop the second. These match on the
// href rather than the button text, so they keep working after the admin
// rewords the buttons in the site editor.
function retargetCtasForSignedInPlayer(html) {
  return html
    .replace(
      /<a\b[^>]*href="\/signup"[^>]*>[\s\S]*?<\/a>/gi,
      '<a href="/dashboard" class="btn btn-accent">Go to your dashboard</a>'
    )
    .replace(/<a\b[^>]*href="\/login"[^>]*>[\s\S]*?<\/a>/gi, "");
}

export default async function Home({ searchParams }) {
  // /?edit sends a logged-in admin straight to the site editor.
  if (searchParams && searchParams.edit !== undefined) {
    const admin = await getAdminSession();
    if (admin) redirect("/admin/editor");
    redirect("/admin/login");
  }

  const player = await getPlayerSession();
  const html = await getHomeHtml();

  return (
    <div className="container">
      <header className="topbar">
        <div className="logo">Gamia<span>23</span></div>
        <nav className="nav-actions">
          {/* Shown to everyone. A signed-out visitor who taps it is sent to
              the game, which bounces them to log in and then returns them
              here — so the button always does what it says. */}
          <Link href="/game" className="btn btn-accent">
            Play &amp; earn
          </Link>
          {player ? (
            <>
              <Link href="/dashboard" className="btn btn-primary">
                Account balance
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link href="/dashboard" className="btn">
                Account balance
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <div
        dangerouslySetInnerHTML={{
          __html: player ? retargetCtasForSignedInPlayer(html) : html,
        }}
      />

      {/* Kept as real markup below the editable block, rather than inside it,
          so an edit in the site editor can never remove the only route into
          the game. */}
      <Link href="/game" className="play-cta">
        <div>
          <strong>Play &amp; earn</strong>
          <span>Clear rows and columns in Block Puzzle to earn coins.</span>
        </div>
        <div className="play-arrow">→</div>
      </Link>
    </div>
  );
}
