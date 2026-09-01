import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getPlayerSession } from "../../../lib/auth";

const METHODS = ["Crypto", "PayPal", "Cash App", "Venmo"];

function bad(error) {
  return NextResponse.json({ error }, { status: 400 });
}

// Lets a logged-in player submit a SAFE payout destination — a public
// identifier that only says where to send their reward. We never collect
// bank/card numbers, private keys, or seed phrases.
export async function POST(request) {
  const session = await getPlayerSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const method = (body.method || "").trim();
    const network = (body.network || "").trim();
    const addr = (body.address || "").trim();

    if (!METHODS.includes(method)) return bad("Choose a payout method.");
    if (!addr) return bad("Enter your payout details.");
    if (addr.length > 200) return bad("That value looks too long.");

    // ---- Safety guards: reject anything that isn't a safe public identifier ----
    const digits = addr.replace(/[\s-]/g, "");
    if (/^\d{13,19}$/.test(digits)) {
      return bad("Don't enter card or bank account numbers. Use a PayPal email, Cash App $tag, Venmo handle, or crypto address instead.");
    }
    if (/\b(cvv|routing|iban|swift|ssn|seed phrase|private key|mnemonic)\b/i.test(addr)) {
      return bad("Please enter only a safe payout handle or address — never card, bank, seed phrase, or private-key details.");
    }
    if (addr.split(/\s+/).length >= 8) {
      return bad("That looks like a seed phrase. Enter only your public payout handle or wallet address.");
    }

    // ---- Per-method sanity checks ----
    if (method === "PayPal" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      return bad("Enter the email address linked to your PayPal.");
    }

    await prisma.user.update({
      where: { id: session.uid },
      data: {
        payoutMethod: method,
        payoutNetwork: method === "Crypto" ? network || null : null,
        payoutAddress: addr,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] claim error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
