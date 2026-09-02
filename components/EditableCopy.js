"use client";

import { useEffect, useRef } from "react";

// Copy text to the clipboard. The async API needs a secure context and can be
// blocked, so fall back to the old execCommand path — that keeps copying
// working on older mobile browsers and anywhere the page isn't on HTTPS.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through
  }
  try {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.top = "-1000px";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    document.body.removeChild(scratch);
    return true;
  } catch {
    return false;
  }
}

// Renders an admin-editable block and turns any element the admin marked with
// class "copyable" into click-to-copy, with a "copy" chip injected right after
// it. The sentence itself lives in the editable HTML, so whatever the admin
// writes is exactly what players see and exactly what gets copied.
export default function EditableCopy({ html }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const chips = [];
    const bound = [];
    const timers = [];

    root.querySelectorAll(".copyable").forEach((el) => {
      const label = el.textContent.trim();
      if (!label) return;

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "copy-chip";
      chip.textContent = "copy";
      chip.setAttribute("aria-label", "Copy: " + label);
      el.insertAdjacentElement("afterend", chip);
      chips.push(chip);

      let timer = null;

      async function onCopy(event) {
        event.preventDefault();
        const ok = await copyText(el.textContent.trim());
        if (!ok) return;

        // Green tick, on both the chip and the highlighted sentence.
        chip.textContent = "✓ copied";
        chip.classList.add("is-copied");
        el.classList.add("is-copied");

        clearTimeout(timer);
        timer = setTimeout(() => {
          chip.textContent = "copy";
          chip.classList.remove("is-copied");
          el.classList.remove("is-copied");
        }, 2200);
        timers.push(timer);
      }

      // Clicking the sentence and clicking the chip do the same thing.
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.addEventListener("click", onCopy);
      chip.addEventListener("click", onCopy);
      bound.push([el, onCopy], [chip, onCopy]);
    });

    return () => {
      timers.forEach(clearTimeout);
      bound.forEach(([node, fn]) => node.removeEventListener("click", fn));
      chips.forEach((chip) => chip.remove());
    };
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
