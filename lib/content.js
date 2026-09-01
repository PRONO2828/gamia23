import { prisma } from "./prisma";

// The homepage content below the top navigation bar. The admin can edit this
// freely in the Site Editor; this is what shows until they save changes.
export const DEFAULT_HOME_HTML = `<section class="hero">
  <span class="badge">A thank-you to our longtime players</span>
  <h1>You played. You brought the crowd.<br>Now <span class="grad">claim your reward.</span></h1>
  <p>Every game you played and every friend you invited earned you coins. Sign up to claim your account, and your reward balance will appear here — converted to real value at 1,000 coins&nbsp;=&nbsp;$1.</p>
  <div class="hero-actions">
    <a href="/signup" class="btn btn-accent">Claim your reward</a>
    <a href="/login" class="btn btn-ghost">I already have an account</a>
  </div>
</section>
<section class="grid">
  <div class="card"><div class="ico">🎮</div><h3>1. Sign up</h3><p>Create your Gamia23 account with the email you play under so we can match your activity.</p></div>
  <div class="card"><div class="ico">🔎</div><h3>2. We verify your coins</h3><p>Our team checks your play history and referrals and confirms your coin total.</p></div>
  <div class="card"><div class="ico">💰</div><h3>3. See your balance</h3><p>Your coins appear on your dashboard, shown in real dollars at 1,000 coins = $1.</p></div>
</section>
<div class="footer">Gamia23 · A loyalty reward for our community. We never ask for card, bank, or wallet details on this site.</div>`;

export async function getHomeHtml() {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: "home_html" } });
    return row?.value || DEFAULT_HOME_HTML;
  } catch {
    return DEFAULT_HOME_HTML;
  }
}
