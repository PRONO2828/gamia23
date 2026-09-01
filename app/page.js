import Link from "next/link";
import { COINS_PER_DOLLAR } from "../lib/config";

export default function Home() {
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

      <section className="hero">
        <span className="badge">A thank-you to our longtime players</span>
        <h1>
          You played. You brought the crowd.<br />
          Now <span className="grad">claim your reward.</span>
        </h1>
        <p>
          Every game you played and every friend you invited earned you coins.
          Sign up to claim your account, and your reward balance will appear
          here — converted to real value at {COINS_PER_DOLLAR.toLocaleString()} coins&nbsp;=&nbsp;$1.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="btn btn-accent">Claim your reward</Link>
          <Link href="/login" className="btn btn-ghost">I already have an account</Link>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <div className="ico">🎮</div>
          <h3>1. Sign up</h3>
          <p>Create your Gamia23 account with the email you play under so we can match your activity.</p>
        </div>
        <div className="card">
          <div className="ico">🔎</div>
          <h3>2. We verify your coins</h3>
          <p>Our team checks your play history and referrals in the game backend and confirms your coin total.</p>
        </div>
        <div className="card">
          <div className="ico">💰</div>
          <h3>3. See your balance</h3>
          <p>Your coins appear on your dashboard, shown in real dollars at {COINS_PER_DOLLAR.toLocaleString()} coins = $1.</p>
        </div>
      </section>

      <div className="footer">
        Gamia23 · A loyalty reward for our community. We never ask for card,
        bank, or wallet details on this site.
      </div>
    </div>
  );
}
