import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(_request: NextRequest) {
  try {
    const personasDir = path.join(process.cwd(), 'public', 'personas');
    
    // ディレクトリが存在するかチェック
    if (!fs.existsSync(personasDir)) {
      return NextResponse.json([]);
    }
    
    // ディレクトリ内のJSONファイルを取得
    const files = fs.readdirSync(personasDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.startsWith('.')
    );
    
    return NextResponse.json(jsonFiles);
  } catch (error) {
    console.error('Error reading personas directory:', error);
    return NextResponse.json([]);
  }
}