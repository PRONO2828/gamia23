import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAdminSession } from "../../../../lib/auth";
import { DEFAULTS, EDITABLE_KEYS } from "../../../../lib/content";

export async function GET(request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key") || "home_html";
  if (!EDITABLE_KEYS.includes(key)) {
    return NextResponse.json({ error: "Unknown content." }, { status: 400 });
  }
  const row = await prisma.siteContent.findUnique({ where: { key } });
  return NextResponse.json({ key, html: row?.value || DEFAULTS[key] });
}

export async function POST(request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { key, html } = await request.json();
    if (!EDITABLE_KEYS.includes(key)) {
      return NextResponse.json({ error: "Unknown content." }, { status: 400 });
    }
    if (typeof html !== "string") {
      return NextResponse.json({ error: "Invalid content." }, { status: 400 });
    }
    if (html.length > 4000000) {
      return NextResponse.json(
        { error: "That's too much content — try smaller or fewer images." },
        { status: 400 }
      );
    }
    await prisma.siteContent.upsert({
      where: { key },
      update: { value: html },
      create: { key, value: html },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] content save error:", err);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
