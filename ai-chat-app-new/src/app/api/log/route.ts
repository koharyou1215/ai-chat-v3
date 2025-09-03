import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { label, details, ts } = body || {};
    const timestamp = ts || new Date().toISOString();
    // サーバー側に出力（ターミナル）
    // eslint-disable-next-line no-console
    console.log(`🪵 [DEVLOG] ${timestamp} - ${label}`, details ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ /api/log failed:", error);
    return NextResponse.json(
      { ok: false, error: "log-failed" },
      { status: 500 }
    );
  }
}
