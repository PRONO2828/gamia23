import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlayerSession } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { formatDollars } from "../../lib/config";
import { SCORE_PER_COIN, DAILY_COIN_CAP } from "../../lib/game";
import LogoutButton from "../../components/LogoutButton";
import BlockPuzzle from "../../components/BlockPuzzle";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  // Someone arriving from a "Play & earn" button while signed out should land
  // back on the game once they've logged in, not on a generic dashboard —
  // otherwise the button silently doesn't do what it says.
  const session = await getPlayerSession();
  if (!session) redirect("/login?next=%2Fgame");

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) redirect("/login?next=%2Fgame");

  // How much of today's allowance is already gone. Showing this up front is
  // kinder than letting someone play for an hour and then discovering their
  // last twenty games were worth nothing.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const earned = await prisma.gameSession.aggregate({
    where: { userId: user.id, status: "closed", finishedAt: { gte: since } },
    _sum: { coinsAwarded: true },
  });
  const earnedToday = earned._sum.coinsAwarded || 0;
  const remaining = Math.max(0, DAILY_COIN_CAP - earnedToday);

  return (
    <div className="container">
      <header className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          Gamia<span>23</span>
        </Link>
        <nav className="nav-actions">
          <Link href="/dashboard" className="btn">Balance</Link>
          <LogoutButton />
        </nav>
      </header>

      <div style={{ maxWidth: 560, margin: "10px auto 40px" }}>
        <div className="bp-header">
          <div>
            <div className="muted small">YOUR BALANCE</div>
            <div className="bp-balance-big">{formatDollars(user.coins)}</div>
          </div>
          <div className="bp-allowance">
            <div className="muted small">TODAY&apos;S REMAINING</div>
            <div>
              <strong>{remaining.toLocaleString()}</strong>
              <span className="muted"> / {DAILY_COIN_CAP.toLocaleString()} coins</span>
            </div>
          </div>
        </div>

        <BlockPuzzle scorePerCoin={SCORE_PER_COIN} />

        <div className="notice" style={{ marginTop: 18 }}>
          Coins are added to your balance when a game ends. There is a daily
          limit on how much play can earn, and games that can&apos;t be verified
          earn nothing — so play it straight and it&apos;ll always count.
        </div>
      </div>
    </div>
  );
}
