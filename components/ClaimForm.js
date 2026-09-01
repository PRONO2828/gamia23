"use client";

import { useState } from "react";

const selectStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-2)",
  color: "var(--text)",
  fontSize: 15,
};

const METHOD_INFO = {
  Crypto: { label: "Your wallet address", placeholder: "Paste your receiving address" },
  PayPal: { label: "PayPal email", placeholder: "you@example.com" },
  "Cash App": { label: "Cash App $cashtag", placeholder: "$yourcashtag" },
  Venmo: { label: "Venmo username", placeholder: "@your-venmo" },
};

export default function ClaimForm({ initialMethod, initialNetwork, initialAddress }) {
  const [method, setMethod] = useState(initialMethod || "Crypto");
  const [network, setNetwork] = useState(initialNetwork || "BTC");
  const [address, setAddress] = useState(initialAddress || "");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(Boolean(initialAddress));
  const [loading, setLoading] = useState(false);

  const info = METHOD_INFO[method] || METHOD_INFO.Crypto;

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, network, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOk(false);
        setMsg(data.error || "Could not save. Please try again.");
        setLoading(false);
        return;
      }
      setOk(true);
      setMsg("Saved! Our team will send your reward here.");
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
        Ready to be paid? Pick how you'd like to receive your reward and enter
        your payout handle. We only ever need where to <strong>send</strong> the
        money — <strong>never</strong> your password, card or bank number, seed
        phrase, or private key, and no one from Gamia23 will ask for those.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Payout method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={selectStyle}>
            <option value="Crypto">Crypto wallet</option>
            <option value="PayPal">PayPal</option>
            <option value="Cash App">Cash App</option>
            <option value="Venmo">Venmo</option>
          </select>
        </div>

        {method === "Crypto" && (
          <div className="field">
            <label>Coin / network</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value)} style={selectStyle}>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="USDT-TRC20">USDT (TRC-20)</option>
              <option value="USDT-ERC20">USDT (ERC-20)</option>
              <option value="LTC">Litecoin (LTC)</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        <div className="field">
          <label>{info.label}</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={info.placeholder}
            required
          />
        </div>

        {msg && <div className={"form-msg " + (ok ? "ok" : "error")}>{msg}</div>}
        <button className="btn btn-accent btn-block" disabled={loading}>
          {loading ? "Saving…" : ok ? "Update payout details" : "Claim reward"}
        </button>
      </form>
    </div>
  );
}
