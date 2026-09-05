// ---------------------------------------------------------------------------
// The rules of the block puzzle, shared verbatim by the browser and the server.
//
// This module is the reason the game can pay real coins. The browser does not
// report a score — it reports where it put each piece. The server owns the
// piece sequence (generated here from a seed) and replays those placements
// through this exact code to work out what the game was worth.
//
// So a forged submission has to be a legal sequence of placements that really
// does score what it claims. There is no way to write that down without solving
// the puzzle, which is to say: without playing the game.
//
// Both sides MUST stay byte-identical in behaviour. If you change the shape
// table, the scoring, or the random number generator, you change it for both,
// and any game in flight at that moment will fail to replay.
// ---------------------------------------------------------------------------

export const SIZE = 8;

// `w` is how often a shape comes up relative to the others. Small pieces are
// common and awkward big ones are rare, which is what keeps a game going long
// enough to be worth playing.
export const SHAPES = [
  { w: 5, g: ["X"] },
  { w: 8, g: ["XX"] },
  { w: 8, g: ["X", "X"] },
  { w: 7, g: ["XXX"] },
  { w: 7, g: ["X", "X", "X"] },
  { w: 4, g: ["XXXX"] },
  { w: 4, g: ["X", "X", "X", "X"] },
  { w: 2, g: ["XXXXX"] },
  { w: 2, g: ["X", "X", "X", "X", "X"] },
  { w: 6, g: ["XX", "XX"] },
  { w: 1, g: ["XXX", "XXX", "XXX"] },
  { w: 4, g: ["XX", "X."] },
  { w: 4, g: ["XX", ".X"] },
  { w: 4, g: ["X.", "XX"] },
  { w: 4, g: [".X", "XX"] },
  { w: 2, g: ["X..", "X..", "XXX"] },
  { w: 2, g: ["XXX", "X..", "X.."] },
  { w: 2, g: ["XXX", "..X", "..X"] },
  { w: 2, g: ["..X", "..X", "XXX"] },
  { w: 2, g: ["XXX", "XXX"] },
  { w: 2, g: ["XX", "XX", "XX"] },
  { w: 3, g: [".XX", "XX."] },
  { w: 3, g: ["XX.", ".XX"] },
  { w: 3, g: ["XXX", ".X."] },
  { w: 3, g: [".X.", "XXX"] },
];

export const COLORS = ["#6d5efc", "#22d3a6", "#f7b955", "#ff5c72", "#3fa9ff", "#c084fc"];

const BAG = SHAPES.flatMap((s, i) => Array(s.w).fill(i));

function cellsOf(shape) {
  const out = [];
  shape.g.forEach((row, r) =>
    row.split("").forEach((ch, c) => {
      if (ch === "X") out.push([r, c]);
    })
  );
  return out;
}

// mulberry32 — small, fast, and identical in every JS engine, which is the only
// property that matters here: the server must draw exactly the pieces the
// player was shown.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The nth piece of a game is fixed the moment the seed is. Both sides call this
// with the same seed and the same index and get the same piece.
export function pieceAt(seed, index) {
  const r = rng(seed + index * 2654435761);
  const shape = SHAPES[BAG[Math.floor(r() * BAG.length)]];
  return {
    cells: cellsOf(shape),
    h: shape.g.length,
    w: shape.g[0].length,
    color: COLORS[Math.floor(r() * COLORS.length)],
  };
}

export const newGrid = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

export function fits(grid, piece, row, col) {
  if (!piece) return false;
  return piece.cells.every(([r, c]) => {
    const rr = row + r;
    const cc = col + c;
    return rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && !grid[rr][cc];
  });
}

export function fitsAnywhere(grid, piece) {
  if (!piece) return false;
  for (let r = 0; r <= SIZE - piece.h; r++) {
    for (let c = 0; c <= SIZE - piece.w; c++) {
      if (fits(grid, piece, r, c)) return true;
    }
  }
  return false;
}

// Places a piece and clears whatever that completes.
//
// A cleared line is worth 10 x the current combo, and combo tops out at 4.
// That ceiling is not cosmetic: it means the most any single move can be worth
// is 9 placed cells + 6 lines x 10 x 4 = 249, a number small enough that no
// legitimate game ever looks extreme.
export function applyMove(grid, piece, row, col, combo) {
  const next = grid.map((r) => r.slice());
  piece.cells.forEach(([r, c]) => {
    next[row + r][col + c] = piece.color;
  });

  const fullRows = [];
  const fullCols = [];
  for (let r = 0; r < SIZE; r++) if (next[r].every(Boolean)) fullRows.push(r);
  for (let c = 0; c < SIZE; c++) {
    let full = true;
    for (let r = 0; r < SIZE; r++) {
      if (!next[r][c]) { full = false; break; }
    }
    if (full) fullCols.push(c);
  }

  const cleared = fullRows.length + fullCols.length;
  const nextCombo = cleared > 0 ? Math.min(4, combo + 1) : 0;
  const gained = piece.cells.length + cleared * 10 * Math.max(1, nextCombo);

  const after = next.map((r) => r.slice());
  fullRows.forEach((r) => { for (let c = 0; c < SIZE; c++) after[r][c] = null; });
  fullCols.forEach((c) => { for (let r = 0; r < SIZE; r++) after[r][c] = null; });

  return { placed: next, after, fullRows, fullCols, cleared, gained, nextCombo };
}

// Replays a whole game from its seed and its list of placements.
//
// This is the authority on what a game scored. Every move is checked for
// legality — right tray slot, piece not already used, actually fits — and the
// first illegal one ends the replay with a reason. A caller that gets `ok:
// false` should pay nothing.
//
// `moves` is an array of { t, r, c }: which of the three tray slots, and where.
export function replay(seed, moves, limit = 2000) {
  let grid = newGrid();
  let score = 0;
  let combo = 0;
  let lines = 0;
  let round = 0;
  // Which of the current three tray slots have been used.
  let used = [false, false, false];

  if (!Array.isArray(moves)) return { ok: false, reason: "moves not a list" };
  if (moves.length > limit) return { ok: false, reason: "too many moves" };

  const trayPiece = (slot) => pieceAt(seed, round * 3 + slot);

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i] || {};
    const t = Number(m.t);
    const r = Number(m.r);
    const c = Number(m.c);

    if (!Number.isInteger(t) || t < 0 || t > 2) return { ok: false, reason: `move ${i}: bad slot` };
    if (!Number.isInteger(r) || !Number.isInteger(c)) return { ok: false, reason: `move ${i}: bad position` };
    if (used[t]) return { ok: false, reason: `move ${i}: slot already played` };

    const piece = trayPiece(t);
    if (!fits(grid, piece, r, c)) return { ok: false, reason: `move ${i}: piece does not fit there` };

    const res = applyMove(grid, piece, r, c, combo);
    grid = res.after;
    score += res.gained;
    combo = res.nextCombo;
    lines += res.cleared;
    used[t] = true;

    if (used.every(Boolean)) {
      round += 1;
      used = [false, false, false];
    }
  }

  // Was the player actually stuck at the end? Used to tell a finished game from
  // one cashed out early — both are allowed, this is just recorded.
  const remaining = [0, 1, 2].filter((s) => !used[s]).map(trayPiece);
  const stuck = remaining.length > 0 && !remaining.some((p) => fitsAnywhere(grid, p));

  return { ok: true, score, lines, moves: moves.length, stuck };
}
