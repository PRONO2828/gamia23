import { Resend } from "resend";

// Sends the admin a notification when a new player signs up.
// If Resend isn't configured, we just log to the server console so the
// app keeps working during setup.
export async function notifyAdminOfSignup(user) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.EMAIL_FROM || "Gamia23 <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.log(
      `[Gamia23] New signup (email not configured): ${user.username} <${user.email}>`
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `New Gamia23 signup: ${user.username}`,
      text:
        `A new player just signed up on Gamia23.\n\n` +
        `Username: ${user.username}\n` +
        `Email: ${user.email}\n` +
        `Signed up: ${new Date(user.createdAt).toLocaleString()}\n\n` +
        `Check their points in the game backend, then log into the admin ` +
        `panel to set their coin balance.`,
    });
  } catch (err) {
    // Never let an email failure break the signup flow.
    console.error("[Gamia23] Failed to send signup email:", err);
  }
}
