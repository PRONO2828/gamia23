import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getPlayerSession } from "../../../lib/auth";

// Lets a logged-in player submit the PUBLIC wallet address they want their
// reward paid to. We deliberately store only a receiving address — never a
// private key or seed phrase.
export async function POST(request) {
  const session = await getPlayerSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  try {
    const { address, network } = await request.json();
    const addr = (address || "").trim();

    if (!addr) {
      return NextResponse.json({ error: "Enter your wallet address." }, { status: 400 });
    }
    if (addr.length > 200) {
      return NextResponse.json({ error: "That address looks too long." }, { status: 400 });
    }
    // Safety guard: a real receiving address is a single token. A string of
    // many words is almost certainly a seed phrase — refuse it.
    if (addr.split(/\s+/).length >= 8) {
      return NextResponse.json(
        {
          error:
            "Enter only your public wallet ADDRESS. Never share your seed phrase or private key with anyone.",
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.uid },
      data: {
        payoutAddress: addr,
        payoutNetwork: (network || "").trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] claim error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
