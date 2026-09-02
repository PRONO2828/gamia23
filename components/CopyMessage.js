"use client";

import { useEffect, useState } from "react";

// One constant for the sentence shown and the sentence copied, so what a player
// reads and what lands on their clipboard can never drift apart.
const MESSAGE = "Congratulations for your earnings.";

export default function CopyMessage() {
  const [copied, setCopied] = useState(false);

  // Clear the tick after a moment so the control invites a second copy rather
  // than looking permanently "done".
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    // The async clipboard API needs a secure context and permission, so fall
    // back to the old execCommand path — that keeps copy working on older
    // mobile browsers and anywhere the page isn't served over HTTPS.
    try {
      await navigator.clipboard.writeText(MESSAGE);
      setCopied(true);
      return;
    } catch {
      // fall through to the legacy approach
    }
    try {
      const scratch = document.createElement("textarea");
      scratch.value = MESSAGE;
      scratch.setAttribute("readonly", "");
      scratch.style.position = "fixed";
      scratch.style.top = "-1000px";
      scratch.style.opacity = "0";
      document.body.appendChild(scratch);
      scratch.select();
      document.execCommand("copy");
      document.body.removeChild(scratch);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  // The whole row is a single button, so clicking the sentence and clicking
  // "copy" do the same thing — and it stays keyboard reachable for free.
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy this message"
      aria-label={copied ? "Copied: " + MESSAGE : "Copy: " + MESSAGE}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        width: "100%",
        margin: "6px 0 14px",
        padding: "12px 14px",
        textAlign: "left",
        borderRadius: 12,
        border: "1px solid " + (copied ? "var(--brand-2)" : "var(--border)"),
        background: "var(--card)",
        color: "var(--text)",
        font: "inherit",
        fontSize: 16,
        cursor: "pointer",
        transition: "border-color .15s ease",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          padding: "3px 7px",
          borderRadius: 6,
          background: "rgba(34, 211, 166, 0.18)",
        }}
      >
        {MESSAGE}
      </span>

      <span
        aria-live="polite"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid " + (copied ? "var(--brand-2)" : "var(--border)"),
          background: "var(--bg-2)",
          color: copied ? "var(--brand-2)" : "var(--muted)",
          fontSize: 13,
          fontWeight: 600,
          transition: "color .15s ease, border-color .15s ease",
        }}
      >
        {copied ? (
          <>
            <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
              ✓
            </span>
            copied
          </>
        ) : (
          "copy"
        )}
      </span>
    </button>
  );
}
