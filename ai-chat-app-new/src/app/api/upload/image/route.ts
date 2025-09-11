import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import fs from "fs/promises";

export async function POST(request: NextRequest) {
  console.log("🔄 Upload API: Request received");

  // Check if BLOB_READ_WRITE_TOKEN is configured
  const isDevelopment = process.env.NODE_ENV === "development";
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const hasValidBlobToken =
    blobToken &&
    blobToken !== "vercel_blob_rw_placeholder_token_for_development";

  console.log("🔍 Upload API: Environment check", {
    isDevelopment,
    hasToken: !!blobToken,
    tokenPrefix: blobToken?.substring(0, 20) + "..." || "none",
  });

  // In production without Blob token, use data URL approach for mobile compatibility
  const useDataUrl = !isDevelopment && !hasValidBlobToken;
  const useLocalStorage = isDevelopment && !hasValidBlobToken;

  if (useLocalStorage) {
    console.log(
      "⚠️ Upload API: Vercel Blob not available - using local file system fallback"
    );
  }

  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      console.error("❌ Upload API: No file provided");
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    console.log(
      `📄 Upload API: Processing file - Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
    );

    // Check file type and size (omitting for brevity, but should be kept)
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      "video/mp4",
      "video/webm",
      "video/mov",
      "video/quicktime",
      "video/avi",
    ];
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ Upload API: Unsupported file type: ${file.type}`);
      return NextResponse.json(
        {
          success: false,
          error: `サポートされていないファイル形式です: ${file.type}`,
        },
        { status: 400 }
      );
    }
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error(`❌ Upload API: File too large: ${file.size} bytes`);
      return NextResponse.json(
        {
          success: false,
          error: `ファイルサイズが大きすぎます。最大サイズ: 50MB`,
        },
        { status: 400 }
      );
    }

    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 100);

    const filename = `${Date.now()}-${sanitizedName}`;

    console.log(`📝 Upload API: Uploading with filename: ${filename}`);

    // For production without Blob storage - return data URL for mobile compatibility
    if (useDataUrl) {
      console.log("📱 Upload API: Using data URL for mobile production");
      
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;
        
        console.log(`✅ Upload API: Created data URL. Size: ${base64.length} bytes`);
        
        return NextResponse.json({
          success: true,
          url: dataUrl,
          filename: filename,
          size: file.size,
          type: file.type,
          isDataUrl: true,
        });
      } catch (dataUrlError) {
        console.error("❌ Upload API: Data URL creation failed:", dataUrlError);
        throw new Error(
          `データURL作成に失敗しました: ${
            dataUrlError instanceof Error ? dataUrlError.message : "不明なエラー"
          }`
        );
      }
    }
    
    // ローカルファイルシステムを使用する場合（開発環境）
    if (useLocalStorage) {
      console.log("📁 Upload API: Using local file system fallback");

      try {
        // ローカルファイルシステムのアプローチ
        const uploadDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "images"
        );

        // ディレクトリが存在しない場合は作成
        await fs.mkdir(uploadDir, { recursive: true });

        // ファイルを保存
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, buffer);

        const url = `/uploads/images/${filename}`;
        console.log(`✅ Upload API: File saved locally. URL: ${url}`);

        return NextResponse.json({
          success: true,
          url: url,
          filename: filename,
          size: file.size,
          type: file.type,
        });
      } catch (localError) {
        console.error("❌ Upload API: Local storage failed:", localError);
        throw new Error(
          `ローカルストレージへの保存に失敗しました: ${
            localError instanceof Error ? localError.message : "不明なエラー"
          }`
        );
      }
    }

    // Vercel Blobを使用する場合
    console.log("🚀 Upload API: Using Vercel Blob");
    try {
      const blob = await put(filename, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      console.log(
        `✅ Upload API: File successfully uploaded to Vercel Blob. URL: ${blob.url}`
      );

      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: filename,
        size: file.size,
        type: file.type,
      });
    } catch (blobError) {
      console.error(
        "❌ Upload API: Vercel Blob failed, falling back to local storage:",
        blobError
      );

      // Vercel Blobが失敗した場合はローカルストレージにフォールバック
      try {
        const uploadDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "images"
        );
        await fs.mkdir(uploadDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, buffer);

        const url = `/uploads/images/${filename}`;
        console.log(
          `✅ Upload API: Fallback to local storage successful. URL: ${url}`
        );

        return NextResponse.json({
          success: true,
          url: url,
          filename: filename,
          size: file.size,
          type: file.type,
        });
      } catch (fallbackError) {
        console.error(
          "❌ Upload API: Both Vercel Blob and local storage failed:",
          fallbackError
        );
        throw new Error(
          `ファイルアップロードに失敗しました。Vercel Blob: ${
            blobError instanceof Error ? blobError.message : "不明なエラー"
          }, ローカルストレージ: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : "不明なエラー"
          }`
        );
      }
    }
  } catch (error) {
    console.error("💥 Upload API: Critical error:", error);
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
