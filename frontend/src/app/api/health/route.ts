import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Kinetix Next.js Edge & App Router",
    timestamp: new Date().toISOString(),
  });
}
