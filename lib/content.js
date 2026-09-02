import { prisma } from "./prisma";

// Homepage content (below the top nav bar).
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

// The dashboard is assembled as:
//
//   [ dashboard_top_html ]   <- admin-editable (greeting, intro, anything)
//   [ balance card       ]   <- PROTECTED, per-player, never editable
//   [ payout form        ]   <- PROTECTED, per-player, never editable
//   [ dashboard_html     ]   <- admin-editable (notices, reminders, anything)
//
// So the admin controls every word on the page except the two protected blocks,
// which are personal to each player and can never be reached from the editor.

// Editable region ABOVE the balance card.
export const DEFAULT_DASHBOARD_TOP_HTML = `<div class="greeting">Here's your Gamia23 balance.</div>`;

// Editable region BELOW the payout form.
export const DEFAULT_DASHBOARD_HTML = `<div class="notice">Your coins are verified from your play history and the friends you brought in. When you're ready to be paid, add your payout details above and our team will send your reward.</div>
<div class="notice">Reminder: Gamia23 will never ask for your password, card or bank number, seed phrase, or private key. If anyone asks you to pay in order to receive a reward, it isn't us.</div>`;

export const DEFAULTS = {
  home_html: DEFAULT_HOME_HTML,
  dashboard_top_html: DEFAULT_DASHBOARD_TOP_HTML,
  dashboard_html: DEFAULT_DASHBOARD_HTML,
};
export const EDITABLE_KEYS = Object.keys(DEFAULTS);

export async function getContent(key) {
  const fallback = DEFAULTS[key] || "";
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    return row?.value || fallback;
  } catch {
    return fallback;
  }
}

export async function getHomeHtml() {
  return getContent("home_html");
}
export async function getDashboardTopHtml() {
  return getContent("dashboard_top_html");
}
export async function getDashboardHtml() {
  return getContent("dashboard_html");
}
