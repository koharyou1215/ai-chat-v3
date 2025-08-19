import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(_request: NextRequest) {
  try {
    const charactersDir = path.join(process.cwd(), 'public', 'characters');
    
    // ディレクトリが存在するかチェック
    if (!fs.existsSync(charactersDir)) {
      return NextResponse.json([]);
    }
    
    // ディレクトリ内のJSONファイルを取得
    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.startsWith('.') &&
      file !== 'CHARACTER_MANAGEMENT_GUIDE.json'
    );
    
    return NextResponse.json(jsonFiles);
  } catch (error) {
    console.error('Error reading characters directory:', error);
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