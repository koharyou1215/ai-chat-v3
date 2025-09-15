import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const sdApiUrl =
    process.env.NEXT_PUBLIC_SD_API_URL || "http://localhost:7860";
  const apiKey = process.env.SD_API_KEY;

  try {
    const { modelName } = await request.json();

    if (!modelName) {
      return NextResponse.json(
        { error: "modelName is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${sdApiUrl}/sdapi/v1/options`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        sd_model_checkpoint: modelName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Proxy to SD switch-model API failed: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `Failed to switch SD model: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: `Switched to model ${modelName}` });
  } catch (error) {
    console.error("❌ Error in SD switch-model API route:", error);
    return NextResponse.json(
      { error: "Internal server error when switching SD model" },
      { status: 500 }
    );
  }
}
