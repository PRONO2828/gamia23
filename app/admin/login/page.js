"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
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
      const res = await fetch("/api/admin/login", {
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
      router.push("/admin");
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
      </header>
      <div className="auth-wrap">
        <div className="auth-card">
          <h2>Admin sign in</h2>
          <p className="sub">Restricted to the Gamia23 team.</p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Admin email</label>
              <input type="email" value={form.email} onChange={update("email")} required />
            </div>
            <div className="field">
              <label>Admin password</label>
              <input type="password" value={form.password} onChange={update("password")} required />
            </div>
            {msg && <div className="form-msg error">{msg}</div>}
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
