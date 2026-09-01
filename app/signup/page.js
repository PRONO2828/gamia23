"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Signup failed.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setMsg("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          Gamia<span>23</span>
        </Link>
        <nav className="nav-actions">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
        </nav>
      </header>

      <div className="auth-wrap">
        <div className="auth-card">
          <h2>Claim your reward</h2>
          <p className="sub">Sign up with the email you play under so we can match your coins.</p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Username</label>
              <input value={form.username} onChange={update("username")} placeholder="Your player name" required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={update("password")} placeholder="At least 6 characters" required />
            </div>
            {msg && <div className="form-msg error">{msg}</div>}
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <div className="notice">
            We only ask for a username, email, and password. Gamia23 never
            requests card, bank, or crypto details.
          </div>
          <div className="auth-foot">
            Already have an account? <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
