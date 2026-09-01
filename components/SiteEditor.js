"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function SiteEditor({ initialHtml }) {
  const ref = useRef(null);
  const [raw, setRaw] = useState(false);
  const [rawHtml, setRawHtml] = useState(initialHtml);
  const [linkUrl, setLinkUrl] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [vidUrl, setVidUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ref.current && !raw) ref.current.innerHTML = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd, val) {
    document.execCommand(cmd, false, val);
    ref.current && ref.current.focus();
  }
  function insertHTML(html) {
    ref.current && ref.current.focus();
    document.execCommand("insertHTML", false, html);
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      exec("createLink", url);
    } else {
      insertHTML(`<a href="${url}">${url}</a>`);
    }
    setLinkUrl("");
  }
  function addImage() {
    const url = imgUrl.trim();
    if (!url) return;
    insertHTML(`<img src="${url}" alt="" style="max-width:100%;border-radius:12px;margin:12px 0;" />`);
    setImgUrl("");
  }
  function addVideo() {
    let url = vidUrl.trim();
    if (!url) return;
    const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
    let embed;
    if (yt) {
      embed = `<div style="position:relative;padding-top:56.25%;margin:12px 0;"><iframe src="https://www.youtube.com/embed/${yt[1]}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;" allowfullscreen></iframe></div>`;
    } else {
      embed = `<video controls src="${url}" style="max-width:100%;border-radius:12px;margin:12px 0;"></video>`;
    }
    insertHTML(embed);
    setVidUrl("");
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const html = raw ? rawHtml : (ref.current ? ref.current.innerHTML : "");
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not save.");
      } else {
        setMsg("Saved! Your changes are now live for everyone.");
      }
    } catch {
      setMsg("Network error. Please try again.");
    }
    setSaving(false);
  }

  const tbtn = {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontSize: 14,
    cursor: "pointer",
  };
  const inp = {
    flex: 1,
    minWidth: 120,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text)",
    fontSize: 14,
  };

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <header className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          Gamia<span>23</span>
        </Link>
        <nav className="nav-actions">
          <Link href="/admin" className="btn btn-ghost">Admin</Link>
          <Link href="/" className="btn btn-ghost">View site</Link>
        </nav>
      </header>

      <h1 style={{ margin: "6px 0" }}>✏️ Site editor</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Edit the homepage right here — on your phone or computer. Tap into the
        text below and type. Use the tools to format, or add a link, image, or
        video. Press <strong>Save</strong> and everyone sees your changes.
      </p>

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
        <button style={tbtn} onClick={() => exec("bold")}><b>B</b></button>
        <button style={tbtn} onClick={() => exec("italic")}><i>I</i></button>
        <button style={tbtn} onClick={() => exec("formatBlock", "H2")}>Heading</button>
        <button style={tbtn} onClick={() => exec("insertUnorderedList")}>• List</button>
        <button style={tbtn} onClick={() => exec("removeFormat")}>Clear</button>
        <button style={tbtn} onClick={() => setRaw((r) => !r)}>
          {raw ? "Visual editor" : "Edit HTML"}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        <input style={inp} placeholder="Link URL (https://…)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <button style={tbtn} onClick={addLink}>Add link</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        <input style={inp} placeholder="Image URL (https://…)" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
        <button style={tbtn} onClick={addImage}>Add image</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <input style={inp} placeholder="Video URL (YouTube or .mp4)" value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} />
        <button style={tbtn} onClick={addVideo}>Add video</button>
      </div>

      {raw ? (
        <textarea
          value={rawHtml}
          onChange={(e) => setRawHtml(e.target.value)}
          style={{
            width: "100%",
            minHeight: 360,
            padding: 14,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg-2)",
            color: "var(--text)",
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
          }}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          style={{
            minHeight: 320,
            border: "1px dashed var(--brand)",
            borderRadius: 12,
            padding: 16,
            outline: "none",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button className="btn btn-accent" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {msg && (
          <span className={"form-msg " + (msg.startsWith("Saved") ? "ok" : "error")} style={{ margin: 0 }}>
            {msg}
          </span>
        )}
      </div>

      <div className="notice" style={{ marginTop: 20 }}>
        Tip: switch between the visual editor and <strong>Edit HTML</strong> if
        you want fine control. To move a picture, cut and paste it where you
        want it. Changes are saved to the live site the moment you press Save.
      </div>
    </div>
  );
}
