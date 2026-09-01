import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "insecure-dev-secret-change-me"
);

const PLAYER_COOKIE = "gamia_session";
const ADMIN_COOKIE = "gamia_admin";

async function sign(payload, maxAgeSeconds) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(SECRET);
}

async function verify(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ---------- Player session ----------

export async function createPlayerSession(userId) {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const token = await sign({ uid: userId, role: "player" }, maxAge);
  cookies().set(PLAYER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getPlayerSession() {
  const token = cookies().get(PLAYER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify(token);
  if (!payload || payload.role !== "player") return null;
  return payload;
}

export function clearPlayerSession() {
  cookies().set(PLAYER_COOKIE, "", { path: "/", maxAge: 0 });
}

// ---------- Admin session ----------

export async function createAdminSession() {
  const maxAge = 60 * 60 * 8; // 8 hours
  const token = await sign({ role: "admin" }, maxAge);
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getAdminSession() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export function clearAdminSession() {
  cookies().set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
}

// ---------- Admin credential check ----------

export function checkAdminCredentials(email, password) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
  if (!adminEmail || !adminPassword) return false;
  return (
    email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
    password.trim() === adminPassword
  );
}
