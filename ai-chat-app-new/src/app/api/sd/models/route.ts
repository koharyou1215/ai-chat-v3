import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const sdApiUrl =
    process.env.NEXT_PUBLIC_SD_API_URL || "http://localhost:7860";
  const apiKey = process.env.SD_API_KEY; // 必要であればAPIキーも環境変数から取得

  try {
    const response = await fetch(`${sdApiUrl}/sdapi/v1/sd-models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Proxy to SD models API failed: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `Failed to fetch SD models: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error in SD models API route:", error);
    return NextResponse.json(
      { error: "Internal server error when fetching SD models" },
      { status: 500 }
    );
  }
}

