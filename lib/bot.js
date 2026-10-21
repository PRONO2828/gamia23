import { SIZE, fits, fitsAnywhere, applyMove } from "./blocks";

// ---------------------------------------------------------------------------
// The auto-play solver.
//
// Picks a placement by scoring every legal option on the current board. It is
// greedy with one cheap bit of foresight — it checks whether the pieces still
// in the tray would survive the move — which is what stops it walking into a
// dead board two moves later.
//
// It plays by the same rules in lib/blocks.js that the server replays against,
// so everything it does is a legal game. That matters: the server recomputes
// the score from the moves, so a bot that cheated would simply be rejected.
// ---------------------------------------------------------------------------

// How the heuristic weighs things. Clearing lines dominates everything else;
// after that, keep the board empty, keep the empty space in big connected
// pieces rather than scattered holes, and keep the tray playable.
const W = {
  cleared: 10000,
  empty: 40,
  survivors: 1200,
  biggestRegion: 18,
  holes: -140,
  edge: 6,
};

// Counts empty cells, how big the largest connected empty region is, and how
// many empty cells are stranded in a region too small to take any real piece.
// Fragmentation is what actually kills a block-puzzle board: you can have
// twenty free cells and still be unable to place a 1x3.
function shape(grid) {
  const seen = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let empty = 0;
  let biggest = 0;
  let holes = 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] || seen[r][c]) continue;
      // Flood-fill this empty region.
      let size = 0;
      const stack = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop();
        size++;
        const next = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
        for (const [ny, nx] of next) {
          if (ny < 0 || ny >= SIZE || nx < 0 || nx >= SIZE) continue;
          if (grid[ny][nx] || seen[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
      empty += size;
      if (size > biggest) biggest = size;
      // A pocket of one or two cells can only ever take the smallest pieces.
      if (size <= 2) holes += size;
    }
  }
  return { empty, biggest, holes };
}

// Placements that hug what is already on the board, or the board's edges,
// leave the middle open. Cheap to compute and it measurably lengthens games.
function contact(grid, piece, row, col) {
  let touches = 0;
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r === 0 || r === SIZE - 1) touches++;
    if (c === 0 || c === SIZE - 1) touches++;
    const around = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [y, x] of around) {
      if (y < 0 || y >= SIZE || x < 0 || x >= SIZE) continue;
      if (grid[y][x]) touches++;
    }
  }
  return touches;
}

/**
 * Chooses the next move.
 *
 * `tray` is the three slots, with null for ones already played this round.
 * Returns { slot, row, col, gained, cleared } or null when nothing fits —
 * which is the game-over condition.
 */
export function bestMove(grid, tray, combo) {
  let best = null;

  for (let slot = 0; slot < tray.length; slot++) {
    const piece = tray[slot];
    if (!piece) continue;

    for (let row = 0; row <= SIZE - piece.h; row++) {
      for (let col = 0; col <= SIZE - piece.w; col++) {
        if (!fits(grid, piece, row, col)) continue;

        const res = applyMove(grid, piece, row, col, combo);
        const s = shape(res.after);

        // Will the pieces still waiting in the tray have somewhere to go?
        let survivors = 0;
        for (let o = 0; o < tray.length; o++) {
          if (o === slot || !tray[o]) continue;
          if (fitsAnywhere(res.after, tray[o])) survivors++;
        }

        const value =
          res.cleared * W.cleared +
          s.empty * W.empty +
          survivors * W.survivors +
          s.biggest * W.biggestRegion +
          s.holes * W.holes +
          contact(grid, piece, row, col) * W.edge;

        if (!best || value > best.value) {
          best = { slot, row, col, value, gained: res.gained, cleared: res.cleared };
        }
      }
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Pacing.
//
// This is the part that is easy to get wrong and expensive to get wrong. The
// server refuses a game that arrives faster than it could have been played:
// every game must last at least GAME_MIN_MS (20s), and its score must not
// have accrued faster than GAME_MAX_SCORE_PER_SECOND (25/s). A bot that
// places pieces as fast as it can think would have every single game thrown
// out and earn exactly nothing.
//
// So the solver deliberately waits. These two helpers keep it on the right
// side of both limits, with a margin for clock skew between the browser and
// the server.
// ---------------------------------------------------------------------------

const MIN_GAME_MS = 20000;
const MAX_SCORE_PER_SECOND = 25;
const MARGIN_MS = 2500;

// How long this game must have been running before it is safe to cash in.
export function requiredElapsedMs(score) {
  const forRate = (score / MAX_SCORE_PER_SECOND) * 1000;
  return Math.max(MIN_GAME_MS, forRate) + MARGIN_MS;
}

// A per-move pause. Spread the required time across the moves so the game
// looks and feels like it is being played rather than freezing and then
// suddenly finishing.
export function moveDelayMs() {
  // A typical game runs ~35 moves; 650ms each puts it comfortably past the
  // 20s floor on its own.
  return 650;
}
