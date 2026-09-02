import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlayerSession } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { COINS_PER_DOLLAR, formatDollars } from "../../lib/config";
import { getDashboardHtml } from "../../lib/content";
import LogoutButton from "../../components/LogoutButton";
import ClaimForm from "../../components/ClaimForm";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getPlayerSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login");

  // Admin-editable message shown to every logged-in player. The coin balance
  // and payout form below are NOT editable here — they stay personal to each user.
  const dashboardHtml = await getDashboardHtml();

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
        <div className="greeting">Hi {user.username} 👋</div>
        <p className="muted">Here's your Gamia23 reward balance.</p>

        {/* Protected: each player's own coin balance */}
        <div className="balance-card">
          <div className="muted small">YOUR COIN BALANCE</div>
          <div className="coins">{user.coins.toLocaleString()} 🪙</div>
          <div className="dollars">{formatDollars(user.coins)}</div>
          <div className="rate">{COINS_PER_DOLLAR.toLocaleString()} coins = $1</div>
        </div>

        {/* Admin-editable message area */}
        <div dangerouslySetInnerHTML={{ __html: dashboardHtml }} />

        {/* Protected: each player's own payout details */}
        <ClaimForm
          initialMethod={user.payoutMethod || "Crypto"}
          initialNetwork={user.payoutNetwork || "BTC"}
          initialAddress={user.payoutAddress || ""}
        />
      </div>
    </div>
  );
}
