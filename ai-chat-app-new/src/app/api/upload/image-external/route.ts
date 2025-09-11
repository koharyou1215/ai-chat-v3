import { NextRequest, NextResponse } from "next/server";

// ImgBB APIを使用した外部画像アップロード
// 無料プランで32MBまでの画像をアップロード可能
export async function POST(request: NextRequest) {
  console.log("🔄 External Upload API: Request received");

  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      console.error("❌ External Upload API: No file provided");
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    console.log(
      `📄 External Upload API: Processing file - Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
    );

    // ImgBB API keyを環境変数から取得（無料アカウントで取得可能）
    const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    
    if (imgbbApiKey && imgbbApiKey !== "your_imgbb_api_key_here") {
      // ImgBB APIを使用
      try {
        const formData = new FormData();
        const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
        formData.append("image", base64);
        
        const imgbbResponse = await fetch(
          `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!imgbbResponse.ok) {
          throw new Error(`ImgBB API error: ${imgbbResponse.statusText}`);
        }

        const imgbbData = await imgbbResponse.json();
        
        if (imgbbData.success) {
          console.log(`✅ External Upload API: ImgBB upload successful`);
          return NextResponse.json({
            success: true,
            url: imgbbData.data.url,
            deleteUrl: imgbbData.data.delete_url,
            filename: file.name,
            size: file.size,
            type: file.type,
            provider: "imgbb"
          });
        } else {
          throw new Error(imgbbData.error?.message || "ImgBB upload failed");
        }
      } catch (imgbbError) {
        console.error("❌ ImgBB upload failed:", imgbbError);
        // フォールバックとしてデータURLを返す
      }
    }

    // Cloudflare Images API（オプション）
    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    
    if (cloudflareAccountId && cloudflareApiToken) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const cfResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${cloudflareApiToken}`,
            },
            body: formData,
          }
        );

        if (cfResponse.ok) {
          const cfData = await cfResponse.json();
          if (cfData.success) {
            console.log(`✅ External Upload API: Cloudflare Images upload successful`);
            return NextResponse.json({
              success: true,
              url: cfData.result.variants[0],
              filename: file.name,
              size: file.size,
              type: file.type,
              provider: "cloudflare"
            });
          }
        }
      } catch (cfError) {
        console.error("❌ Cloudflare Images upload failed:", cfError);
      }
    }

    // フォールバック: データURLを返す（ブラウザ間共有はできないが、少なくとも現在のブラウザでは動作する）
    console.log("📱 External Upload API: Falling back to data URL");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      isDataUrl: true,
      warning: "画像はデータURLとして保存されます。ブラウザ間で共有されません。ImgBB APIキーを設定することで、永続的な画像保存が可能になります。"
    });

  } catch (error) {
    console.error("💥 External Upload API: Critical error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "ファイルアップロードに失敗しました";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}