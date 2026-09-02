"use client";

import { useState } from "react";
import { flagEmoji, countryName } from "../lib/geo";

function shortDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

function dollars(coins, perDollar) {
  return (Number(coins || 0) / (perDollar || 1000)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function AdminTable({ initialRows, coinsPerDollar }) {
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState(
    Object.fromEntries(initialRows.map((r) => [r.id, String(r.coins)]))
  );
  const [status, setStatus] = useState({}); // id -> "saving" | "saved" | "error"

  function setDraft(id, val) {
    setDrafts((d) => ({ ...d, [id]: val.replace(/[^0-9]/g, "") }));
  }

  async function save(id) {
    setStatus((s) => ({ ...s, [id]: "saving" }));
    try {
      const coins = Number(drafts[id] || 0);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, coins }),
      });
      if (!res.ok) throw new Error();
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, coins } : r)));
      setStatus((s) => ({ ...s, [id]: "saved" }));
      setTimeout(() => setStatus((s) => ({ ...s, [id]: undefined })), 2000);
    } catch {
      setStatus((s) => ({ ...s, [id]: "error" }));
    }
  }

  if (rows.length === 0) {
    return (
      <div className="panel" style={{ padding: 30, textAlign: "center" }}>
        <p className="muted">No players have signed up yet.</p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Email</th>
            <th>Country</th>
            <th>Visits</th>
            <th>Signed up</th>
            <th>Coins</th>
            <th>Value</th>
            <th>Payout</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const draft = drafts[r.id] ?? "";
            const st = status[r.id];
            const changed = String(r.coins) !== draft;
            return (
              <tr key={r.id}>
                <td><strong>{r.username}</strong></td>
                <td className="muted small">{r.email}</td>
                <td className="small">
                  {r.country ? (
                    <span title={countryName(r.country)}>
                      {flagEmoji(r.country)} {countryName(r.country)}
                    </span>
                  ) : (
                    <span className="muted" title="No country recorded yet — older accounts get one on their next sign-in">
                      —
                    </span>
                  )}
                </td>
                <td className="small">
                  <strong>{Number(r.visits || 0).toLocaleString()}</strong>
                  {shortDate(r.lastVisitAt) && (
                    <div className="muted" style={{ fontSize: 11 }}>
                      last {shortDate(r.lastVisitAt)}
                    </div>
                  )}
                </td>
                <td className="muted small">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <input
                    className="coin-input"
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDraft(r.id, e.target.value)}
                  />
                </td>
                <td style={{ color: "var(--brand-2)", fontWeight: 700 }}>
                  {dollars(draft, coinsPerDollar)}
                </td>
                <td className="small">
                  {r.payoutAddress ? (
                    <div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {[r.payoutMethod, r.payoutNetwork].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <code
                        title={r.payoutAddress}
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          wordBreak: "break-all",
                          display: "inline-block",
                          maxWidth: 220,
                        }}
                      >
                        {r.payoutAddress}
                      </code>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn"
                    onClick={() => save(r.id)}
                    disabled={st === "saving" || !changed}
                    style={{ padding: "8px 14px", fontSize: 14 }}
                  >
                    {st === "saving"
                      ? "Saving…"
                      : st === "saved"
                      ? "Saved ✓"
                      : st === "error"
                      ? "Retry"
                      : "Save"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
