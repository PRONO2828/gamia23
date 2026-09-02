// Country helpers. `countryFromRequest` runs on the server at signup/login;
// the two display helpers are pure and safe to import into client components.

// Vercel injects the visitor's country as a two-letter ISO code. The Cloudflare
// header is checked too, so putting a proxy in front of the app later doesn't
// silently stop country capture.
export function countryFromRequest(request) {
  const raw =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    "";
  const code = raw.trim().toUpperCase();
  // "XX" and "T1" are the usual stand-ins for unknown / Tor — treat as no data
  // rather than storing a country that doesn't exist.
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return null;
  return code;
}

// "US" -> "🇺🇸". Built from regional indicator symbols, so every valid code works
// without a lookup table.
export function flagEmoji(code) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  const BASE = 0x1f1e6; // regional indicator "A"
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((ch) => BASE + ch.charCodeAt(0) - 65)
  );
}

let displayNames = null;

// "US" -> "United States". Intl does the naming, so there is no country list to
// keep up to date; if it's unavailable we fall back to showing the raw code.
export function countryName(code) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  try {
    if (!displayNames) {
      displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    }
    return displayNames.of(code.toUpperCase()) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
