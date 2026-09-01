import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { COINS_PER_DOLLAR } from "../../lib/config";
import AdminTable from "../../components/AdminTable";
import LogoutButton from "../../components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      coins: true,
      payoutMethod: true,
      payoutNetwork: true,
      payoutAddress: true,
      createdAt: true,
    },
  });

  const rows = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

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

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>Admin · Players</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {rows.length} signup{rows.length === 1 ? "" : "s"} · conversion {COINS_PER_DOLLAR.toLocaleString()} coins = $1
          </p>
        </div>
      </div>

      <div className="notice">
        Enter each player's coin total from the game backend, then click Save.
        The dollar value updates automatically. The payout address is what the
        player submitted to receive their reward.
      </div>

      <AdminTable initialRows={rows} coinsPerDollar={COINS_PER_DOLLAR} />
    </div>
  );
}
