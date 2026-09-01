import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAdminSession } from "../../../../lib/auth";

// List all players (admin only).
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      coins: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

// Update a player's coin total (admin only).
export async function PATCH(request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, coins } = await request.json();
    if (!id || coins === undefined || coins === null) {
      return NextResponse.json(
        { error: "id and coins are required." },
        { status: 400 }
      );
    }
    const coinInt = Math.max(0, Math.round(Number(coins)));
    if (Number.isNaN(coinInt)) {
      return NextResponse.json({ error: "coins must be a number." }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { coins: coinInt },
      select: { id: true, coins: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error("[Gamia23] update coins error:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
