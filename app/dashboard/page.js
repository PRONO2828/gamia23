import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlayerSession } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { COINS_PER_DOLLAR, formatDollars } from "../../lib/config";
import LogoutButton from "../../components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getPlayerSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login");

  const verified = user.coins > 0;

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

        <div className="balance-card">
          <div className="muted small">YOUR COIN BALANCE</div>
          <div className="coins">{user.coins.toLocaleString()} 🪙</div>
          <div className="dollars">{formatDollars(user.coins)}</div>
          <div className="rate">{COINS_PER_DOLLAR.toLocaleString()} coins = $1</div>
        </div>

        {verified ? (
          <div className="notice">
            Your coins have been verified from your play history and referrals.
            Our team will contact you at <strong>{user.email}</strong> with the
            details for receiving your reward.
          </div>
        ) : (
          <div className="notice">
            Thanks for signing up! Our team is reviewing your play history and
            referrals. Your coin balance will appear here once it's confirmed —
            check back soon.
          </div>
        )}

        <div className="notice">
          Reminder: Gamia23 will never ask you to enter card, bank, or crypto
          details on this site. If anyone asks you to pay to receive a reward,
          it's not us.
        </div>
      </div>
    </div>
  );
}
