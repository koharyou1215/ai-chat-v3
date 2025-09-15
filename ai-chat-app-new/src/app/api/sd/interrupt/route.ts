import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const sdApiUrl =
    process.env.NEXT_PUBLIC_SD_API_URL || "http://localhost:7860";
  const apiKey = process.env.SD_API_KEY;

  try {
    const response = await fetch(`${sdApiUrl}/sdapi/v1/interrupt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: "{}", // 空のJSONボディが必要な場合がある
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Proxy to SD interrupt API failed: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `Failed to interrupt SD generation: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: "SD generation interrupted" });
  } catch (error) {
    console.error("❌ Error in SD interrupt API route:", error);
    return NextResponse.json(
      { error: "Internal server error when interrupting SD generation" },
      { status: 500 }
    );
  }
}
