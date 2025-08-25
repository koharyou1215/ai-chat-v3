import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Production環境の場合はmanifestから読み取り
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      console.log('Characters API: Using production mode (manifest)');
      try {
        const manifestPath = path.join(process.cwd(), 'public', 'characters', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`Characters API: Loaded ${manifest.length} characters from manifest`);
          return NextResponse.json(manifest);
        } else {
          // Fallback: try to fetch from URL
          const baseUrl = request.url.replace('/api/characters', '');
          const manifestResponse = await fetch(`${baseUrl}/characters/manifest.json`);
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            console.log(`Characters API: Loaded ${manifest.length} characters from URL manifest`);
            return NextResponse.json(manifest);
          }
        }
      } catch (manifestError) {
        console.error('Characters API: Manifest loading failed:', manifestError);
      }
    }

    // Development環境：ファイルシステムから読み取り
    console.log('Characters API: Using development mode (filesystem)');
    const charactersDir = path.join(process.cwd(), 'public', 'characters');
    
    // ディレクトリが存在するかチェック
    if (!fs.existsSync(charactersDir)) {
      console.warn('Characters API: Characters directory not found');
      return NextResponse.json([]);
    }
    
    // ディレクトリ内のJSONファイルを取得
    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.startsWith('.') &&
      file !== 'CHARACTER_MANAGEMENT_GUIDE.json' &&
      file !== 'manifest.json'
    );
    
    console.log(`Characters API: Loaded ${jsonFiles.length} characters from filesystem`);
    return NextResponse.json(jsonFiles);
  } catch (error) {
    console.error('Characters API: Error reading characters:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const character = await request.json();

    if (!character || !character.id) {
      return NextResponse.json({ error: 'Invalid character data' }, { status: 400 });
    }

    // A simple security check to prevent directory traversal
    if (character.id.includes('..') || character.id.includes('/')) {
        return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
    }

    const charactersDir = path.join(process.cwd(), 'public', 'characters');
    const filePath = path.join(charactersDir, `${character.id}.json`);

    // Ensure the directory exists
    if (!fs.existsSync(charactersDir)) {
      fs.mkdirSync(charactersDir, { recursive: true });
    }
    
    // Write the character data to the file
    // We'll stringify with pretty-printing (2 spaces) to keep it readable
    fs.writeFileSync(filePath, JSON.stringify(character, null, 2), 'utf8');

    return NextResponse.json({ success: true, message: `Character ${character.id} saved.` });
  } catch (error) {
    console.error('Error saving character:', error);
    return NextResponse.json({ error: 'Failed to save character' }, { status: 500 });
  }
}