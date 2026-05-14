import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const user = await createUser(username.trim(), password);
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    const status = message === "Username already taken" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
