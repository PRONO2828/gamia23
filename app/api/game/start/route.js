import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getPlayerSession } from "../../../../lib/auth";
import { signGameToken, newSeed } from "../../../../lib/game";

export const dynamic = "force-dynamic";

// Opens a game. The row is created here, server-side, so startedAt is a server
// clock reading the client can never influence — that timestamp is what the
// finish route measures the game's duration against.
//
// Only one game can be open at a time per player. Without that, a client could
// open a hundred sessions, play one, and cash in all hundred with the same
// result. Opening a new game abandons whatever was open before.
export async function POST() {
  try {
    const session = await getPlayerSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in to play." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.uid } });
    if (!user) {
      return NextResponse.json({ error: "Please log in to play." }, { status: 401 });
    }

    // Abandon any game the player left open. Not an error — people close tabs.
    await prisma.gameSession.updateMany({
      where: { userId: user.id, status: "open" },
      data: { status: "abandoned", finishedAt: new Date() },
    });

    const seed = newSeed();
    const game = await prisma.gameSession.create({
      data: { userId: user.id, status: "open", seed },
    });

    const token = await signGameToken(game.id, user.id);
    return NextResponse.json({ ok: true, token, seed });
  } catch (err) {
    console.error("[Gamia23] game start error:", err);
    return NextResponse.json(
      { error: "Could not start a game. Please try again." },
      { status: 500 }
    );
  }
}
