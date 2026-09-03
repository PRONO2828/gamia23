import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlayerSession } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { formatDollars } from "../../lib/config";
import {
  getDashboardTopHtml,
  getDashboardNoteHtml,
  getDashboardHtml,
} from "../../lib/content";
import LogoutButton from "../../components/LogoutButton";
import ClaimForm from "../../components/ClaimForm";
import EditableCopy from "../../components/EditableCopy";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getPlayerSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login");

  // Everything on this page is admin-editable EXCEPT the balance card and the
  // payout form below. Those two are personal to each player, so they are
  // rendered from the player's own record and are not reachable from the site
  // editor at all.
  const [topHtml, noteHtml, bottomHtml] = await Promise.all([
    getDashboardTopHtml(),
    getDashboardNoteHtml(),
    getDashboardHtml(),
  ]);

  return (
    <div className="container">
      <header className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          Gamia<span>23</span>
        </Link>
        <nav className="nav-actions">
          <LogoutButton />
        </nav>
      </header>

      <div style={{ maxWidth: 560, margin: "20px auto" }}>
        {/* Admin-editable: greeting and anything above the balance */}
        <div dangerouslySetInnerHTML={{ __html: topHtml }} />

        {/* PROTECTED: this player's own balance */}
        <div className="balance-card">
          <div className="muted small">YOUR BALANCE</div>
          <div className="dollars">{formatDollars(user.coins)}</div>
        </div>

        {/* PROTECTED: this player's own payout details */}
        <ClaimForm
          initialMethod={user.payoutMethod || "Crypto"}
          initialNetwork={user.payoutNetwork || "BTC"}
          initialAddress={user.payoutAddress || ""}
        />

        {/* Admin-editable: the congratulations note, directly after the claim
            card. EditableCopy makes anything marked copyable click-to-copy. */}
        <EditableCopy html={noteHtml} />

        {/* Admin-editable: notices and anything below the payout form. Also
            through EditableCopy, so the admin can mark copyable text here too. */}
        <EditableCopy html={bottomHtml} />
      </div>
    </div>
  );
}
