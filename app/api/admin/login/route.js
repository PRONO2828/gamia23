import { NextResponse } from "next/server";
import { checkAdminCredentials, createAdminSession } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!checkAdminCredentials(email || "", password || "")) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }
    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gamia23] admin login error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
