import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Check file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: `Unsupported file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 50MB' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${Date.now()}-${file.name.replaceAll(' ', '_')}`;
    
    // Define the upload directory based on file type
    const isVideo = file.type.startsWith('video/');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', isVideo ? 'videos' : 'images');
    await mkdir(uploadDir, { recursive: true });

    // Define the full file path
    const filePath = path.join(uploadDir, filename);

    // Write the file to the filesystem
    await writeFile(filePath, buffer);

    console.log(`File uploaded to ${filePath}`);

    // Return the public URL of the uploaded file
    const publicUrl = `/uploads/${isVideo ? 'videos' : 'images'}/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'File upload failed' }, { status: 500 });
  }
}
