import { NextResponse } from "next/server";
import { checkAdminCredentials, createAdminSession } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const result = checkAdminCredentials(email, password);

    if (result === "not_configured") {
      // Distinct from a bad password on purpose — this one is a server config
      // problem and no password will ever get you in until it is fixed.
      console.error(
        "[Gamia23] admin login blocked: ADMIN_EMAIL and/or ADMIN_PASSWORD are " +
          "missing from this environment."
      );
      return NextResponse.json(
        {
          error:
            "Admin sign-in isn't configured on the server. ADMIN_EMAIL and " +
            "ADMIN_PASSWORD need to be set for this environment, then redeployed.",
        },
        { status: 503 }
      );
    }

    if (result !== "ok") {
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
