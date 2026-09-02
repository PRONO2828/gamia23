import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { createPlayerSession } from "../../../../lib/auth";
import { notifyAdminOfSignup } from "../../../../lib/email";
import { countryFromRequest } from "../../../../lib/geo";

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are all required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: normalizedEmail,
        password: hashed,
        country: countryFromRequest(request),
        // Signing up is itself the first visit.
        visits: 1,
        lastVisitAt: new Date(),
      },
    });

    // Notify the admin (non-blocking failure).
    await notifyAdminOfSignup(user);

    await createPlayerSession(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
