"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Login failed.");
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
          <Link href="/signup" className="btn btn-primary">Sign up</Link>
        </nav>
      </header>

      <div className="auth-wrap">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="sub">Log in to see your reward balance.</p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={update("password")} placeholder="Your password" required />
            </div>
            {msg && <div className="form-msg error">{msg}</div>}
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
          <div className="auth-foot">
            New here? <Link href="/signup">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
