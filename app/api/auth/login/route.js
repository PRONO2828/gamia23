import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { createPlayerSession } from "../../../../lib/auth";
import { countryFromRequest } from "../../../../lib/geo";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email and password." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "No account found with that email and password." },
        { status: 401 }
      );
    }

    // One visit per successful sign-in. Country is backfilled here so accounts
    // created before country capture existed still get one the next time they
    // log in. Never blocks the login: a stats write failing shouldn't lock a
    // player out of their own dashboard.
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          visits: { increment: 1 },
          lastVisitAt: new Date(),
          ...(user.country ? {} : { country: countryFromRequest(request) }),
        },
      });
    } catch (statsErr) {
      console.error("[Gamia23] could not record visit:", statsErr);
    }

    await createPlayerSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
