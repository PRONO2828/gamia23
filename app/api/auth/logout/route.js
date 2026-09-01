import { NextResponse } from "next/server";
import { clearPlayerSession, clearAdminSession } from "../../../../lib/auth";

export async function POST() {
  clearPlayerSession();
  clearAdminSession();
  return NextResponse.json({ ok: true });
}
