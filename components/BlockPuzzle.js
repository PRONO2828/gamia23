"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SIZE,
  pieceAt,
  newGrid,
  fits,
  fitsAnywhere,
  applyMove,
} from "../lib/blocks";

const NO_CLEAR = { rows: [], cols: [] };

// How far above the finger the dragged piece floats, so a hand doesn't cover
// the square it is about to land on. On a phone this is the difference between
// playable and not.
const LIFT = 58;

// The board draws itself from the same rules the server scores with
// (lib/blocks.js). The score shown here is only ever a preview: when the game
// ends, what gets sent is the list of placements, and the server works out the
// real number. If the two ever disagree, the server is right.
export default function BlockPuzzle({ scorePerCoin = 50 }) {
  const router = useRouter();

  const [seed, setSeed] = useState(0);
  const [grid, setGrid] = useState(newGrid);
  const [round, setRound] = useState(0);
  const [used, setUsed] = useState([false, false, false]);
  const [log, setLog] = useState([]);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lines, setLines] = useState(0);
  const [best, setBest] = useState(0);

  // idle | starting | playing | over | sending | done
  const [phase, setPhase] = useState("idle");
  const [token, setToken] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [clearing, setClearing] = useState(NO_CLEAR);
  const [floating, setFloating] = useState(null);

  const boardRef = useRef(null);
  const ghostRef = useRef(null);

  // ---- drag state -----------------------------------------------------------
  //
  // Dragging is deliberately split in two. Which slot is moving, and which
  // square is highlighted, live in React state because they change the picture.
  // The pointer's actual position lives in a ref and never triggers a render.
  //
  // That split is the whole performance story. Keeping the pointer in state
  // meant a render of all 64 cells plus the tray on every pixel of movement,
  // and — because the listener effect depended on that state — tearing down and
  // re-attaching the pointer listeners just as often. The board felt laggy and
  // heavy. Now the ghost is moved by writing a transform straight to the DOM
  // inside a requestAnimationFrame, and React only hears about it when the
  // target square actually changes: a handful of renders per drag instead of
  // hundreds.
  const [dragSlot, setDragSlot] = useState(null);
  const [target, setTarget] = useState(null); // { row, col, valid }

  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const lastTarget = useRef("");
  const metrics = useRef(null); // measured once per drag, not per move

  // Held while a line-clear animation is mid-flight. During those ~180ms the
  // grid on screen is the pre-clear board, so a second placement landing in
  // that window would be computed against a board that is about to change —
  // and the server, replaying without animations, would score it differently
  // and reject the game.
  const busy = useRef(false);

  // Latest values for the pointer handlers, which are attached once per drag
  // and must not close over stale state.
  const live = useRef({});

  // Personal best is a local nicety and is never trusted for anything paid.
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("gamia_block_best"));
      if (Number.isFinite(saved)) setBest(saved);
    } catch {
      /* private mode or storage disabled — the game works fine without it */
    }
  }, []);

  const tray = useMemo(
    () => [0, 1, 2].map((s) => (used[s] ? null : pieceAt(seed, round * 3 + s))),
    [seed, round, used]
  );

  // Which tray pieces have nowhere to go. Recomputed only when the board or the
  // tray changes — it used to run on every render, which during a drag meant
  // three full board scans per pixel of movement.
  const dead = useMemo(
    () => tray.map((p) => (p ? !fitsAnywhere(grid, p) : false)),
    [grid, tray]
  );

  async function startGame() {
    setError("");
    setPhase("starting");
    try {
      const res = await fetch("/api/game/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start a game.");
        setPhase("idle");
        return;
      }
      setToken(data.token);
      setSeed(data.seed);
      setGrid(newGrid());
      setRound(0);
      setUsed([false, false, false]);
      setLog([]);
      setScore(0);
      setCombo(0);
      setLines(0);
      setResult(null);
      setClearing(NO_CLEAR);
      setPhase("playing");
    } catch {
      setError("You appear to be offline. Reconnect and try again.");
      setPhase("idle");
    }
  }

  const submit = useCallback(
    async (moveList) => {
      if (!token) return;
      setPhase("sending");
      try {
        const res = await fetch("/api/game/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, moves: moveList }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not save that game.");
          setResult({ coins: 0 });
        } else {
          setResult(data);
          // Re-render the server component around this one so the balance and
          // today's remaining allowance in the page header show the new total
          // straight away, without the player reloading to see what they won.
          router.refresh();
        }
      } catch {
        setError("You went offline before that game could be saved.");
        setResult({ coins: 0 });
      } finally {
        setToken(null);
        setPhase("done");
      }
    },
    [token, router]
  );

  const endGame = useCallback(
    (moveList, finalScore) => {
      setPhase("over");
      try {
        if (finalScore > best) {
          setBest(finalScore);
          window.localStorage.setItem("gamia_block_best", String(finalScore));
        }
      } catch {
        /* ignore */
      }
      submit(moveList);
    },
    [best, submit]
  );

  // ---- placing a piece ------------------------------------------------------

  const place = useCallback(
    (slot, row, col) => {
      const piece = tray[slot];
      if (busy.current) return;
      if (phase !== "playing" || !piece || !fits(grid, piece, row, col)) return;

      const res = applyMove(grid, piece, row, col, combo);
      const nextLog = [...log, { t: slot, r: row, c: col }];
      const nextScore = score + res.gained;

      setScore(nextScore);
      setCombo(res.nextCombo);
      setLines(lines + res.cleared);
      setLog(nextLog);

      const nextUsed = used.map((u, i) => (i === slot ? true : u));
      const refill = nextUsed.every(Boolean);
      const nextRound = refill ? round + 1 : round;
      const settledUsed = refill ? [false, false, false] : nextUsed;

      const settle = () => {
        setGrid(res.after);
        setUsed(settledUsed);
        setRound(nextRound);

        const nextTray = [0, 1, 2].map((s) =>
          settledUsed[s] ? null : pieceAt(seed, nextRound * 3 + s)
        );
        const alive = nextTray.some((p) => p && fitsAnywhere(res.after, p));
        if (!alive) window.setTimeout(() => endGame(nextLog, nextScore), 400);
      };

      if (res.cleared > 0) {
        busy.current = true;
        setFloating({ id: Date.now(), text: `+${res.gained}`, combo: res.nextCombo });
        setClearing({ rows: res.fullRows, cols: res.fullCols });
        setGrid(res.placed);
        window.setTimeout(() => {
          setClearing(NO_CLEAR);
          settle();
          busy.current = false;
        }, 180);
      } else {
        settle();
      }
    },
    [tray, phase, grid, combo, log, score, lines, used, round, seed, endGame]
  );

  // Keep the handlers' view of the world current without re-attaching them.
  live.current = { tray, grid, place };

  // ---- drag -----------------------------------------------------------------

  const onPointerDown = (slot) => (e) => {
    if (phase !== "playing" || !tray[slot]) return;
    e.preventDefault();

    const rect = boardRef.current?.getBoundingClientRect();
    const piece = tray[slot];
    if (!rect || !piece) return;

    // Measured once, here, rather than on every pointermove: a
    // getBoundingClientRect per move forces the browser to re-do layout.
    const cell = rect.width / SIZE;
    metrics.current = {
      slot,
      cell,
      left: rect.left,
      top: rect.top,
      halfW: (piece.w * cell) / 2,
      halfH: (piece.h * cell) / 2,
    };

    pointer.current = { x: e.clientX, y: e.clientY };
    lastTarget.current = "";
    setDragSlot(slot);
    setTarget(null);
  };

  useEffect(() => {
    if (dragSlot === null) return;

    const paint = () => {
      frame.current = 0;
      const m = metrics.current;
      if (!m) return;
      const { x, y } = pointer.current;

      // The ghost is moved by writing to the DOM directly. Routing this through
      // React state is what made the old version feel heavy.
      if (ghostRef.current) {
        ghostRef.current.style.transform =
          `translate3d(${x}px, ${y - LIFT}px, 0) translate(-50%, -50%)`;
      }

      const col = Math.round((x - m.halfW - m.left) / m.cell);
      const row = Math.round((y - LIFT - m.halfH - m.top) / m.cell);
      const key = row + ":" + col;
      if (key === lastTarget.current) return; // same square — nothing to redraw

      lastTarget.current = key;
      const { grid: g, tray: t } = live.current;
      setTarget({ row, col, valid: fits(g, t[m.slot], row, col) });
    };

    const move = (e) => {
      e.preventDefault();
      pointer.current = { x: e.clientX, y: e.clientY };
      // Coalesce to one update per animation frame. A phone can fire pointer
      // events far faster than it can paint, and doing the work per event just
      // builds a backlog that shows up as lag.
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    };

    const up = (e) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      const m = metrics.current;
      if (m) {
        const col = Math.round((e.clientX - m.halfW - m.left) / m.cell);
        const row = Math.round((e.clientY - LIFT - m.halfH - m.top) / m.cell);
        const { grid: g, tray: t, place: p } = live.current;
        if (fits(g, t[m.slot], row, col)) p(m.slot, row, col);
      }
      finish();
    };

    const finish = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      metrics.current = null;
      setDragSlot(null);
      setTarget(null);
    };

    // Pointer coordinates are viewport-relative and so is the cached board
    // rect, so anything that moves the viewport under the drag invalidates the
    // cache and would silently put pieces in the wrong square. Re-measuring on
    // those two events costs nothing and keeps the fast path fast.
    const remeasure = () => {
      const rect = boardRef.current?.getBoundingClientRect();
      const m = metrics.current;
      if (!rect || !m) return;
      m.cell = rect.width / SIZE;
      m.left = rect.left;
      m.top = rect.top;
      const piece = live.current.tray[m.slot];
      if (piece) {
        m.halfW = (piece.w * m.cell) / 2;
        m.halfH = (piece.h * m.cell) / 2;
      }
      lastTarget.current = ""; // force the highlight to be recomputed
    };

    // Attached once per drag, not once per movement.
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    paint(); // place the ghost before the first move, so it never flashes at 0,0
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, [dragSlot]);

  const preview = useMemo(() => {
    if (!target || dragSlot === null || !tray[dragSlot]) return null;
    const set = new Set();
    tray[dragSlot].cells.forEach(([r, c]) =>
      set.add(`${target.row + r}:${target.col + c}`)
    );
    return { set, valid: target.valid };
  }, [target, dragSlot, tray]);

  const isClearing = (r, c) =>
    clearing.rows.includes(r) || clearing.cols.includes(c);

  const coinsSoFar = Math.floor(score / scorePerCoin);

  return (
    <div className="bp">
      <div className="bp-stats">
        <div className="bp-stat">
          <span>SCORE</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        <div className="bp-stat">
          <span>COINS THIS GAME</span>
          <strong className="bp-coin">{coinsSoFar}</strong>
        </div>
        <div className="bp-stat">
          <span>BEST</span>
          <strong>{best.toLocaleString()}</strong>
        </div>
      </div>

      <div className="bp-boardwrap">
        <div className="bp-board" ref={boardRef}>
          {grid.map((row, r) =>
            row.map((colour, c) => {
              const key = `${r}:${c}`;
              const ghost = preview?.set.has(key);
              return (
                <div
                  key={key}
                  className={
                    "bp-cell" +
                    (colour ? " is-filled" : "") +
                    (isClearing(r, c) ? " is-clearing" : "") +
                    (ghost ? (preview.valid ? " is-ok" : " is-no") : "")
                  }
                  style={colour ? { background: colour } : undefined}
                />
              );
            })
          )}
        </div>

        {phase !== "playing" && (
          <div className="bp-overlay">
            {phase === "idle" && (
              <>
                <h2>Block Puzzle</h2>
                <p>
                  Drag pieces onto the board. Fill a whole row or column to clear
                  it. Every {scorePerCoin} points earns you a coin.
                </p>
                <button className="btn btn-accent" onClick={startGame}>Play</button>
              </>
            )}
            {phase === "starting" && <p className="bp-loading">Starting…</p>}
            {phase === "over" && <h2>No moves left</h2>}
            {phase === "sending" && <p className="bp-loading">Checking your game…</p>}
            {phase === "done" && (
              <>
                <h2>{result?.coins > 0 ? `+${result.coins} coins` : "Game over"}</h2>
                <p>
                  You scored <strong>{(result?.score ?? score).toLocaleString()}</strong>.
                  {result?.message ? ` ${result.message}` : ""}
                </p>
                {typeof result?.balance === "number" && (
                  <p className="bp-balance">
                    Balance: <strong>{result.balance.toLocaleString()} coins</strong>
                  </p>
                )}
                <button className="btn btn-accent" onClick={startGame}>Play again</button>
              </>
            )}
            {error && <p className="bp-error">{error}</p>}
          </div>
        )}

        {floating && phase === "playing" && (
          <div className="bp-float" key={floating.id}>
            {floating.text}
            {floating.combo > 1 && <em>combo x{floating.combo}</em>}
          </div>
        )}
      </div>

      <div className="bp-tray">
        {[0, 1, 2].map((slot) => {
          const piece = tray[slot];
          return (
            <div
              key={slot}
              className={
                "bp-slot" +
                (dragSlot === slot ? " is-dragging" : "") +
                (phase === "playing" && dead[slot] ? " is-dead" : "")
              }
              onPointerDown={onPointerDown(slot)}
            >
              {piece && <MiniPiece piece={piece} unit={22} />}
            </div>
          );
        })}
      </div>

      {phase === "playing" && (
        <button className="btn bp-cashout" onClick={() => endGame(log, score)}>
          End game &amp; collect
        </button>
      )}

      {dragSlot !== null && tray[dragSlot] && (
        <div className="bp-ghost" ref={ghostRef}>
          <MiniPiece
            piece={tray[dragSlot]}
            unit={metrics.current?.cell || 40}
            dim={target ? !target.valid : false}
          />
        </div>
      )}
    </div>
  );
}

function MiniPiece({ piece, unit, dim }) {
  return (
    <div
      className="bp-piece"
      style={{
        gridTemplateColumns: `repeat(${piece.w}, ${unit}px)`,
        gridTemplateRows: `repeat(${piece.h}, ${unit}px)`,
        opacity: dim ? 0.45 : 1,
      }}
    >
      {Array.from({ length: piece.h * piece.w }, (_, i) => {
        const r = Math.floor(i / piece.w);
        const c = i % piece.w;
        const on = piece.cells.some(([pr, pc]) => pr === r && pc === c);
        return (
          <div
            key={i}
            className={on ? "bp-pcell is-on" : "bp-pcell"}
            style={on ? { background: piece.color } : undefined}
          />
        );
      })}
    </div>
  );
}
