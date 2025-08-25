import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  console.log('🔄 Upload API: Request received');
  
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      console.error('❌ Upload API: No file provided');
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    console.log(`📄 Upload API: Processing file - Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Check file type and size
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'video/avi'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ Upload API: Unsupported file type: ${file.type}`);
      return NextResponse.json({ 
        success: false, 
        error: `サポートされていないファイル形式です: ${file.type}\n対応形式: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error(`❌ Upload API: File too large: ${file.size} bytes (max: ${maxSize} bytes)`);
      return NextResponse.json({ 
        success: false, 
        error: `ファイルサイズが大きすぎます。最大サイズ: 50MB（現在: ${Math.round(file.size / 1024 / 1024)}MB）` 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a safe filename
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // 特殊文字を_に置換
      .replace(/_{2,}/g, '_') // 連続する_を単一に
      .slice(0, 100); // 長すぎるファイル名を制限
    
    const filename = `${Date.now()}-${sanitizedName}`;
    
    console.log(`📝 Upload API: Generated filename: ${filename}`);
    
    // Define the upload directory based on file type
    const isVideo = file.type.startsWith('video/');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', isVideo ? 'videos' : 'images');
    
    try {
      await mkdir(uploadDir, { recursive: true });
      console.log(`📁 Upload API: Directory ensured: ${uploadDir}`);
    } catch (mkdirError) {
      console.error('❌ Upload API: Directory creation failed:', mkdirError);
      throw new Error('アップロードディレクトリの作成に失敗しました');
    }

    // Define the full file path
    const filePath = path.join(uploadDir, filename);

    try {
      // Write the file to the filesystem
      await writeFile(filePath, buffer);
      console.log(`✅ Upload API: File successfully written to ${filePath}`);
    } catch (writeError) {
      console.error('❌ Upload API: File write failed:', writeError);
      throw new Error('ファイルの保存に失敗しました');
    }

    // Return the public URL of the uploaded file
    const publicUrl = `/uploads/${isVideo ? 'videos' : 'images'}/${filename}`;
    console.log(`🌐 Upload API: Public URL: ${publicUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('💥 Upload API: Critical error:', error);
    const errorMessage = error instanceof Error ? error.message : 'ファイルアップロードに失敗しました';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
