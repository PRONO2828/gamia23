import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getPlayerSession } from "../../../../lib/auth";
import { replay } from "../../../../lib/blocks";
import {
  verifyGameToken,
  implausibleTiming,
  coinsForScore,
  DAILY_COIN_CAP,
  MAX_MOVES,
} from "../../../../lib/game";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Cashes in a finished game.
//
// The client sends the list of placements it made — nothing else. This route
// replays them against the session's own piece sequence and calculates the
// score itself, so there is no number here that the browser could have
// inflated. A placement that isn't legal ends the replay and pays nothing.
//
// Order matters: identity, then single-use, then replay, then timing, then the
// daily cap.
export async function POST(request) {
  try {
    const session = await getPlayerSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in to play." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "");
    const moves = Array.isArray(body.moves) ? body.moves : null;

    if (!moves) {
      return NextResponse.json({ error: "That game couldn't be read." }, { status: 400 });
    }
    if (moves.length > MAX_MOVES) {
      return NextResponse.json({ error: "That game was too long to check." }, { status: 413 });
    }

    const claim = await verifyGameToken(token);
    if (!claim) {
      return NextResponse.json({ error: "This game has expired." }, { status: 400 });
    }

    // The token must belong to the player holding the login cookie. Without
    // this, a token lifted from one account could be cashed into another.
    if (claim.uid !== session.uid) {
      return NextResponse.json({ error: "This game has expired." }, { status: 400 });
    }

    const game = await prisma.gameSession.findUnique({ where: { id: claim.gid } });
    if (!game || game.userId !== session.uid) {
      return NextResponse.json({ error: "This game has expired." }, { status: 400 });
    }

    // Single use. Claiming the row by flipping it out of "open" is what makes
    // replay attacks impossible: two identical requests race here and exactly
    // one wins, because the update only matches while the status is "open".
    const claimed = await prisma.gameSession.updateMany({
      where: { id: game.id, status: "open" },
      data: { status: "closing" },
    });
    if (claimed.count !== 1) {
      return NextResponse.json(
        { error: "This game has already been collected." },
        { status: 409 }
      );
    }

    const finishedAt = new Date();
    const elapsedMs = finishedAt.getTime() - new Date(game.startedAt).getTime();

    const reject = async (reason, score = 0, mv = 0, ln = 0) => {
      await prisma.gameSession.update({
        where: { id: game.id },
        data: {
          status: "rejected",
          finishedAt,
          durationMs: elapsedMs,
          score,
          moves: mv,
          linesCleared: ln,
          coinsAwarded: 0,
          rejectedReason: reason,
        },
      });
      return NextResponse.json({
        ok: true,
        coins: 0,
        message: "That game couldn't be verified, so it earned nothing.",
      });
    };

    // The score is computed here, from the player's own placements.
    const run = replay(game.seed, moves, MAX_MOVES);
    if (!run.ok) return await reject(`replay: ${run.reason}`);

    const timing = implausibleTiming({ score: run.score, elapsedMs });
    if (timing) return await reject(timing, run.score, run.moves, run.lines);

    // Rolling 24h cap across everything this player has been paid for games.
    const since = new Date(finishedAt.getTime() - DAY_MS);
    const earnedToday = await prisma.gameSession.aggregate({
      where: { userId: session.uid, status: "closed", finishedAt: { gte: since } },
      _sum: { coinsAwarded: true },
    });
    const alreadyEarned = earnedToday._sum.coinsAwarded || 0;
    const remaining = Math.max(0, DAILY_COIN_CAP - alreadyEarned);

    const deserved = coinsForScore(run.score);
    const award = Math.min(deserved, remaining);
    const cappedByDaily = award < deserved;

    const [, updatedUser] = await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: game.id },
        data: {
          status: "closed",
          finishedAt,
          durationMs: elapsedMs,
          score: run.score,
          moves: run.moves,
          linesCleared: run.lines,
          coinsAwarded: award,
          cappedByDaily,
        },
      }),
      prisma.user.update({
        where: { id: session.uid },
        data: { coins: { increment: award } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      coins: award,
      score: run.score,
      balance: updatedUser?.coins ?? 0,
      cappedByDaily,
      dailyRemaining: Math.max(0, remaining - award),
      message: cappedByDaily
        ? "You've hit today's earning limit — come back tomorrow for more."
        : null,
    });
  } catch (err) {
    console.error("[Gamia23] game finish error:", err);
    return NextResponse.json(
      { error: "Could not save that game. Please try again." },
      { status: 500 }
    );
  }
}
