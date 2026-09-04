import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "mun-session-hub", time: new Date().toISOString() });
}
