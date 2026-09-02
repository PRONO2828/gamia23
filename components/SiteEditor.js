"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const PAGES = [
  { key: "home_html", label: "Home page" },
  { key: "dashboard_html", label: "User dashboard message" },
];

// Shrink an uploaded image so it fits inline without bloating the page.
function downscale(file, maxW = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch {
          resolve(reader.result); // fallback: original data URL
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SiteEditor() {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const savedRange = useRef(null);

  const [pageKey, setPageKey] = useState("home_html");
  const [raw, setRaw] = useState(false);
  const [rawHtml, setRawHtml] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [vidUrl, setVidUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [caret, setCaret] = useState({ show: false, top: 0, left: 0 });

  const load = useCallback(async (key) => {
    setMsg("");
    try {
      const res = await fetch("/api/admin/content?key=" + encodeURIComponent(key));
      const data = await res.json();
      const html = data.html || "";
      setRawHtml(html);
      if (ref.current) ref.current.innerHTML = html;
    } catch {
      setMsg("Could not load content.");
    }
  }, []);

  useEffect(() => {
    load(pageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current && ref.current.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
      const rect = savedRange.current.getBoundingClientRect();
      const top = rect.top || rect.bottom || 120;
      const left = rect.left || rect.right || 120;
      setCaret({ show: true, top: Math.max(56, top - 6), left: Math.min(window.innerWidth - 52, left + 8) });
    }
  }
  function restoreSelection() {
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (ref.current) {
      ref.current.focus();
    }
  }

  function exec(cmd, val) {
    restoreSelection();
    document.execCommand(cmd, false, val);
    ref.current && ref.current.focus();
    saveSelection();
  }
  function insertHTML(html) {
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    saveSelection();
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    const sel = window.getSelection();
    if (sel && sel.toString()) exec("createLink", url);
    else insertHTML(`<a href="${url}">${url}</a>`);
    setLinkUrl("");
  }
  function addImageUrl() {
    const url = imgUrl.trim();
    if (!url) return;
    insertHTML(`<img src="${url}" alt="" style="max-width:100%;border-radius:12px;margin:12px 0;" />`);
    setImgUrl("");
  }
  function addVideo() {
    const url = vidUrl.trim();
    if (!url) return;
    const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
    const embed = yt
      ? `<div style="position:relative;padding-top:56.25%;margin:12px 0;"><iframe src="https://www.youtube.com/embed/${yt[1]}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;" allowfullscreen></iframe></div>`
      : `<video controls src="${url}" style="max-width:100%;border-radius:12px;margin:12px 0;"></video>`;
    insertHTML(embed);
    setVidUrl("");
  }

  async function onPickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setMsg("Adding image…");
    try {
      const dataUrl = await downscale(file);
      insertHTML(`<img src="${dataUrl}" alt="" style="max-width:100%;border-radius:12px;margin:12px 0;" />`);
      setMsg("");
    } catch {
      setMsg("Couldn't read that image.");
    }
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const html = raw ? rawHtml : ref.current ? ref.current.innerHTML : "";
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: pageKey, html }),
      });
      const data = await res.json();
      setMsg(res.ok ? "Saved! Your changes are now live for everyone." : data.error || "Could not save.");
    } catch {
      setMsg("Network error. Please try again.");
    }
    setSaving(false);
  }

  const tbtn = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 14, cursor: "pointer" };
  const inp = { flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 14 };
  const selStyle = { ...inp, flex: "unset", minWidth: 180 };

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />

      {/* Cursor-following image button */}
      {caret.show && !raw && (
        <button
          type="button"
          title="Upload an image here"
          onMouseDown={(e) => { e.preventDefault(); }}
          onClick={() => fileRef.current && fileRef.current.click()}
          style={{
            position: "fixed",
            top: caret.top,
            left: caret.left,
            zIndex: 50,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, var(--brand-2), #37e6bb)",
            color: "#052018",
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          }}
        >
          📷
        </button>
      )}

      <header className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>Gamia<span>23</span></Link>
        <nav className="nav-actions">
          <Link href="/admin" className="btn btn-ghost">Admin</Link>
          <Link href="/" className="btn btn-ghost">View site</Link>
        </nav>
      </header>

      <h1 style={{ margin: "6px 0" }}>✏️ Site editor</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Tap into the text and type to change any wording. A 📷 button follows
        your cursor — tap it to upload an image right where you're typing. Use
        the tools for links and videos. Press <strong>Save</strong> and everyone
        sees your changes.
      </p>

      <div className="field" style={{ maxWidth: 320 }}>
        <label>What are you editing?</label>
        <select value={pageKey} onChange={(e) => setPageKey(e.target.value)} style={selStyle}>
          {PAGES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      {pageKey === "dashboard_html" && (
        <div className="notice">
          You're editing the message users see on their dashboard. Their coin
          balance and their payout form are protected — those stay personal to
          each user and can't be changed here.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
        <button style={tbtn} onClick={() => exec("bold")}><b>B</b></button>
        <button style={tbtn} onClick={() => exec("italic")}><i>I</i></button>
        <button style={tbtn} onClick={() => exec("formatBlock", "H2")}>Heading</button>
        <button style={tbtn} onClick={() => exec("insertUnorderedList")}>• List</button>
        <button style={tbtn} onClick={() => fileRef.current && fileRef.current.click()}>📷 Image</button>
        <button style={tbtn} onClick={() => exec("removeFormat")}>Clear</button>
        <button style={tbtn} onClick={() => { if (!raw && ref.current) setRawHtml(ref.current.innerHTML); setRaw((r) => !r); }}>
          {raw ? "Visual editor" : "Edit HTML"}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        <input style={inp} placeholder="Link URL (https://…)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <button style={tbtn} onClick={addLink}>Add link</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        <input style={inp} placeholder="Image URL (or use 📷 to upload)" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
        <button style={tbtn} onClick={addImageUrl}>Add image URL</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <input style={inp} placeholder="Video URL (YouTube or .mp4)" value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} />
        <button style={tbtn} onClick={addVideo}>Add video</button>
      </div>

      {raw ? (
        <textarea
          value={rawHtml}
          onChange={(e) => setRawHtml(e.target.value)}
          style={{ width: "100%", minHeight: 360, padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontFamily: "ui-monospace, monospace", fontSize: 13 }}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onInput={saveSelection}
          style={{ minHeight: 320, border: "1px dashed var(--brand)", borderRadius: 12, padding: 16, outline: "none" }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button className="btn btn-accent" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className={"form-msg " + (msg.startsWith("Saved") ? "ok" : "error")} style={{ margin: 0 }}>{msg}</span>}
      </div>
    </div>
  );
}
