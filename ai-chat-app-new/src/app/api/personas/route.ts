import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Production環境の場合はmanifestから読み取り
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      console.log('Personas API: Using production mode (manifest)');
      try {
        const manifestPath = path.join(process.cwd(), 'public', 'personas', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`Personas API: Loaded ${manifest.length} personas from manifest`);
          return NextResponse.json(manifest);
        } else {
          // Fallback: try to fetch from URL
          const baseUrl = request.url.replace('/api/personas', '');
          const manifestResponse = await fetch(`${baseUrl}/personas/manifest.json`);
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            console.log(`Personas API: Loaded ${manifest.length} personas from URL manifest`);
            return NextResponse.json(manifest);
          }
        }
      } catch (manifestError) {
        console.error('Personas API: Manifest loading failed:', manifestError);
      }
    }

    // Development環境：ファイルシステムから読み取り
    console.log('Personas API: Using development mode (filesystem)');
    const personasDir = path.join(process.cwd(), 'public', 'personas');
    
    // ディレクトリが存在するかチェック
    if (!fs.existsSync(personasDir)) {
      console.warn('Personas API: Personas directory not found');
      return NextResponse.json([]);
    }
    
    // ディレクトリ内のJSONファイルを取得
    const files = fs.readdirSync(personasDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.startsWith('.') &&
      file !== 'manifest.json'
    );
    
    console.log(`Personas API: Loaded ${jsonFiles.length} personas from filesystem`);
    return NextResponse.json(jsonFiles);
  } catch (error) {
    console.error('Personas API: Error reading personas:', error);
    return NextResponse.json([]);
  }
}