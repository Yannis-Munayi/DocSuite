import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listFiles } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const files = listFiles(session.user.id);
  return NextResponse.json(files);
}
