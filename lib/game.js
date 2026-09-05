import { SignJWT, jwtVerify } from "jose";

// ---------------------------------------------------------------------------
// Coin rules for the block puzzle.
//
// The important thing about this file is what it does NOT do: it never accepts
// a score from the browser. The client reports where it put each piece, and
// lib/blocks.js replays those placements against the server's own piece
// sequence to work out the score. So the numbers below are applied to a figure
// the server calculated itself.
//
// What remains after that is not score forgery — that is structurally closed —
// but automation: a script that genuinely plays the game, well, forever. The
// timing floor and the daily cap are aimed squarely at that.
//
// Every value is tunable from the environment, with conservative defaults,
// because these coins are real money on the payout side.
// ---------------------------------------------------------------------------

const num = (name, fallback) => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

// How much score buys one coin. Simulated play scores a median of ~360 and a
// very good game ~1800, so this pays roughly 7 coins for an ordinary game and
// around 36 for an excellent one.
export const SCORE_PER_COIN = num("GAME_SCORE_PER_COIN", 50);

// Most a single game can ever pay. Simulated strong play topped out at 36
// coins across 8000 games, so this sits at nearly three times the best game
// anyone is likely to have — generous to a real player, while bounding what
// any one session can be worth.
export const MAX_COINS_PER_GAME = num("GAME_MAX_COINS_PER_GAME", 100);

// Most a player can earn from games in a rolling 24 hours. This is the control
// that actually bounds automated play: whatever a bot manages, it cannot be
// worth more than this per account per day. At the default 1000 coins to the
// dollar, that is $1.
export const DAILY_COIN_CAP = num("GAME_DAILY_COIN_CAP", 1000);

// A game must last at least this long. A replay that is legal but arrived in
// three seconds was computed, not played.
export const MIN_GAME_MS = num("GAME_MIN_MS", 20000);

// Simulated play at a superhuman 1.2 seconds per move averaged 9.2 points a
// second. This leaves generous room for a fast player on a good streak while
// still refusing a solver that submits a perfect game at machine speed.
export const MAX_SCORE_PER_SECOND = num("GAME_MAX_SCORE_PER_SECOND", 25);

// Hard ceiling on the length of a submission, so nobody can post a 50MB move
// list and tie up the replay.
export const MAX_MOVES = num("GAME_MAX_MOVES", 2000);

// A session token is good for one game and expires with it.
export const SESSION_TTL_SECONDS = num("GAME_SESSION_TTL_SECONDS", 60 * 60);

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "insecure-dev-secret-change-me"
);

export async function signGameToken(gameId, userId) {
  return await new SignJWT({ gid: gameId, uid: userId, kind: "game" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(SECRET);
}

export async function verifyGameToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.kind !== "game" || !payload.gid || !payload.uid) return null;
    return payload;
  } catch {
    return null;
  }
}

// The seed is not a secret. Knowing which pieces are coming does not let anyone
// forge a score — the server still replays the actual placements — it only
// lets the browser draw the same pieces the server will check against.
export function newSeed() {
  return Math.floor(Math.random() * 2147483647) + 1;
}

// What is left to check once the score is server-derived: whether the game took
// a human amount of time. Returns null when it looks fine, or a short reason.
// The reason is stored on the session row for the admin but deliberately not
// spelled out to the client — telling an attacker which check they tripped is
// free tuning.
export function implausibleTiming({ score, elapsedMs }) {
  if (elapsedMs < MIN_GAME_MS) return "game too short";
  const seconds = Math.max(1, elapsedMs / 1000);
  if (score / seconds > MAX_SCORE_PER_SECOND) return "score too fast";
  return null;
}

// What a finished game is worth, before the daily cap is applied.
export function coinsForScore(score) {
  const earned = Math.floor(Math.max(0, score) / SCORE_PER_COIN);
  return Math.min(earned, MAX_COINS_PER_GAME);
}
