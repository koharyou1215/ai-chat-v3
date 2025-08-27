import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';

export async function POST(request: NextRequest) {
  console.log('🔄 Upload API (Vercel Blob): Request received');
  
  // Check if BLOB_READ_WRITE_TOKEN is configured
  const isDevelopment = process.env.NODE_ENV === 'development';
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const hasValidBlobToken = blobToken && 
                          blobToken !== 'vercel_blob_rw_placeholder_token_for_development';
  
  console.log('🔍 Upload API: Environment check', { 
    isDevelopment, 
    hasToken: !!blobToken,
    tokenPrefix: blobToken?.substring(0, 20) + '...' || 'none'
  });

  if (!hasValidBlobToken) {
    console.error('❌ Upload API: BLOB_READ_WRITE_TOKEN not configured properly');
    return NextResponse.json({ 
      success: false, 
      error: 'Vercel Blob: No token found. Either configure the `BLOB_READ_WRITE_TOKEN` environment variable, or pass a `token` option to your calls.',
      details: `Error: Vercel Blob token not configured. Environment: ${isDevelopment ? 'development' : 'production'}`
    }, { status: 500 });
  }
  
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      console.error('❌ Upload API: No file provided');
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    console.log(`📄 Upload API: Processing file - Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Check file type and size (omitting for brevity, but should be kept)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'video/avi'
    ];
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ Upload API: Unsupported file type: ${file.type}`);
      return NextResponse.json({ 
        success: false, 
        error: `サポートされていないファイル形式です: ${file.type}` 
      }, { status: 400 });
    }
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error(`❌ Upload API: File too large: ${file.size} bytes`);
      return NextResponse.json({ 
        success: false, 
        error: `ファイルサイズが大きすぎます。最大サイズ: 50MB` 
      }, { status: 400 });
    }

    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100);
    
    const filename = `${Date.now()}-${sanitizedName}`;
    
    console.log(`📝 Upload API: Uploading with filename: ${filename}`);

    // Always try Vercel Blob first if token is available
    console.log('🚀 Upload API: Using Vercel Blob');
    const blob = await put(filename, file, {
      access: 'public',
    });

    console.log(`✅ Upload API: File successfully uploaded to Vercel Blob. URL: ${blob.url}`);
    
    return NextResponse.json({ 
      success: true, 
      url: blob.url,
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
