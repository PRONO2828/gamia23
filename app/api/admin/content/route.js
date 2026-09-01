import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAdminSession } from "../../../../lib/auth";
import { DEFAULT_HOME_HTML } from "../../../../lib/content";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.siteContent.findUnique({ where: { key: "home_html" } });
  return NextResponse.json({ html: row?.value || DEFAULT_HOME_HTML });
}

export async function POST(request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { html } = await request.json();
    if (typeof html !== "string") {
      return NextResponse.json({ error: "Invalid content." }, { status: 400 });
    }
    if (html.length > 200000) {
      return NextResponse.json({ error: "Content is too large." }, { status: 400 });
    }
    await prisma.siteContent.upsert({
      where: { key: "home_html" },
      update: { value: html },
      create: { key: "home_html", value: html },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] content save error:", err);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
