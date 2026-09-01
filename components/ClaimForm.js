"use client";

import { useState } from "react";

export default function ClaimForm({ initialAddress, initialNetwork }) {
  const [address, setAddress] = useState(initialAddress || "");
  const [network, setNetwork] = useState(initialNetwork || "BTC");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(Boolean(initialAddress));
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, network }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOk(false);
        setMsg(data.error || "Could not save. Please try again.");
        setLoading(false);
        return;
      }
      setOk(true);
      setMsg("Saved! Our team will send your reward to this address.");
    } catch {
      setOk(false);
      setMsg("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div
      className="claim-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 24,
        margin: "18px 0",
      }}
    >
      <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>💸 Claim your reward</h3>
      <p className="muted small" style={{ margin: "0 0 16px", lineHeight: 1.5 }}>
        Ready to be paid? Tell us where to send it. Enter the public wallet{" "}
        <strong>address</strong> for the coin you'd like to receive. We only ever
        need your receiving address — <strong>never</strong> your seed phrase or
        private key, and no one from Gamia23 will ask for those.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Payout network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-2)",
              color: "var(--text)",
              fontSize: 15,
            }}
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="USDT-TRC20">USDT (TRC-20)</option>
            <option value="USDT-ERC20">USDT (ERC-20)</option>
            <option value="LTC">Litecoin (LTC)</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Your wallet address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste your receiving address"
            required
          />
        </div>
        {msg && <div className={"form-msg " + (ok ? "ok" : "error")}>{msg}</div>}
        <button className="btn btn-accent btn-block" disabled={loading}>
          {loading ? "Saving…" : ok ? "Update payout address" : "Claim reward"}
        </button>
      </form>
    </div>
  );
}
