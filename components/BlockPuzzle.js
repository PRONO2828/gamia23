"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SIZE,
  pieceAt,
  newGrid,
  fits,
  fitsAnywhere,
  applyMove,
} from "../lib/blocks";

const NO_CLEAR = { rows: [], cols: [] };

// The board draws itself from the same rules the server scores with
// (lib/blocks.js). The score shown here is only ever a preview: when the game
// ends, what gets sent is the list of placements, and the server works out the
// real number. If the two ever disagree, the server is right.
export default function BlockPuzzle({ scorePerCoin = 50 }) {
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
  const [drag, setDrag] = useState(null);

  // Held while a line-clear animation is mid-flight. During those ~180ms the
  // grid on screen is the pre-clear board, so a second placement landing in
  // that window would be computed against a board that is about to change —
  // and the server, replaying without animations, would score it differently
  // and reject the game. Cheap guard, avoids a bug that would look random.
  const busy = useRef(false);

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

  const cellSize = useCallback(() => {
    const rect = boardRef.current?.getBoundingClientRect();
    return rect ? rect.width / SIZE : 40;
  }, []);

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
        }
      } catch {
        setError("You went offline before that game could be saved.");
        setResult({ coins: 0 });
      } finally {
        setToken(null);
        setPhase("done");
      }
    },
    [token]
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

  // ---- placing a piece -----------------------------------------------------

  function place(slot, row, col) {
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
  }

  // ---- drag ----------------------------------------------------------------

  const onPointerDown = (slot) => (e) => {
    if (phase !== "playing" || !tray[slot]) return;
    e.preventDefault();
    setDrag({ slot, x: e.clientX, y: e.clientY, target: null, valid: false });
  };

  useEffect(() => {
    if (!drag) return;

    // The ghost sits above the finger so the piece is not hidden by the hand
    // placing it — on a phone this is the difference between playable and not.
    const LIFT = 58;

    function locate(x, y) {
      const piece = tray[drag.slot];
      const rect = boardRef.current?.getBoundingClientRect();
      if (!piece || !rect) return { target: null, valid: false };
      const size = rect.width / SIZE;
      const left = x - (piece.w * size) / 2;
      const top = y - LIFT - (piece.h * size) / 2;
      const col = Math.round((left - rect.left) / size);
      const row = Math.round((top - rect.top) / size);
      return { target: { row, col }, valid: fits(grid, piece, row, col) };
    }

    function move(e) {
      e.preventDefault();
      const { target, valid } = locate(e.clientX, e.clientY);
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, target, valid } : d));
    }

    function up(e) {
      const { target, valid } = locate(e.clientX, e.clientY);
      if (valid && target) place(drag.slot, target.row, target.col);
      setDrag(null);
    }

    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, grid, tray]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    if (!drag?.target || !tray[drag.slot]) return null;
    const set = new Set();
    tray[drag.slot].cells.forEach(([r, c]) =>
      set.add(`${drag.target.row + r}:${drag.target.col + c}`)
    );
    return { set, valid: drag.valid };
  }, [drag, tray]);

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
          const dead = phase === "playing" && piece && !fitsAnywhere(grid, piece);
          return (
            <div
              key={slot}
              className={
                "bp-slot" +
                (drag?.slot === slot ? " is-dragging" : "") +
                (dead ? " is-dead" : "")
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

      {drag && tray[drag.slot] && (
        <div
          className="bp-ghost"
          style={{ left: drag.x, top: drag.y - 58, transform: "translate(-50%, -50%)" }}
        >
          <MiniPiece piece={tray[drag.slot]} unit={cellSize()} dim={!drag.valid} />
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
