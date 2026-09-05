// Where to send someone after they sign in.
//
// The value arrives in a query string, so it is attacker-controlled: an
// unchecked `?next=` is an open redirect, which is exactly the trick used to
// make a phishing link look like it came from this site. Only same-site paths
// are allowed through, and anything else quietly falls back.
//
// Rejected: absolute URLs ("https://evil.example"), protocol-relative ones
// ("//evil.example", which a browser treats as absolute), anything with a
// backslash (some parsers normalise "/\evil.example" to protocol-relative),
// and anything not starting with a single "/".
export function safeNext(value, fallback = "/dashboard") {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

// Reads ?next= straight from the address bar.
//
// Deliberately not `useSearchParams`: in the App Router that hook forces the
// whole route out of static rendering unless it sits inside a Suspense
// boundary, and getting that wrong fails the production build. Reading
// window.location during an effect sidesteps the issue entirely.
export function readNextFromLocation(fallback = "/dashboard") {
  if (typeof window === "undefined") return fallback;
  try {
    return safeNext(new URLSearchParams(window.location.search).get("next"), fallback);
  } catch {
    return fallback;
  }
}
