import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { getUploadOffset } from "@/lib/googleDrive";

/** Where Google got to on an interrupted upload, so it can pick up from there. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { uploadUrl?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const size = Number(body.size);
  if (typeof body.uploadUrl !== "string" || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getUploadOffset(body.uploadUrl, size));
  } catch (err) {
    console.error("garage upload status failed", err);
    return NextResponse.json({ error: "Couldn't check the upload." }, { status: 502 });
  }
}
