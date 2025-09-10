import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Persona } from '@/types';

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
    
    // 各JSONファイルの内容を読み取り、新旧フォーマットに対応
    const personas: Persona[] = [];
    
    for (const file of jsonFiles) {
      try {
        console.log(`Personas API: Processing file ${file}`);
        const filePath = path.join(personasDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        let persona: Persona;
        
        // 新フォーマット（name, role, other_settings, avatar_path）をチェック
        if (jsonData.name && jsonData.role !== undefined) {
          console.log(`Personas API: Using new format for ${file}`);
          persona = {
            id: path.basename(file, '.json'),
            name: jsonData.name,
            role: jsonData.role,
            other_settings: jsonData.other_settings || '',
            avatar_path: jsonData.avatar_path || null,
            created_at: jsonData.created_at || new Date().toISOString(),
          };
        }
        // 旧フォーマット（persona_information.Name等）をチェック
        else if (jsonData.persona_information && jsonData.persona_information.Name) {
          console.log(`Personas API: Using old format for ${file}`);
          const info = jsonData.persona_information;
          persona = {
            id: path.basename(file, '.json'),
            name: info.Name,
            role: info.Role || 'user',
            other_settings: info['Other Settings'] || '',
            avatar_path: null,
            created_at: jsonData.created_at || new Date().toISOString(),
          };
        }
        // どちらでもない場合はスキップ
        else {
          console.warn(`Personas API: Invalid format in file ${file}`, Object.keys(jsonData));
          continue;
        }
        
        console.log(`Personas API: Successfully processed ${persona.name} from ${file}`);
        personas.push(persona);
      } catch (fileError) {
        console.error(`Personas API: Error reading file ${file}:`, fileError);
      }
    }
    
    console.log(`Personas API: Loaded ${personas.length} personas from filesystem`);
    return NextResponse.json(personas);
  } catch (error) {
    console.error('Personas API: Error reading personas:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const persona: Persona = await request.json();
    
    if (!persona.id || !persona.name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Persona must have id and name' 
      }, { status: 400 });
    }

    // Development環境でのみファイル保存を試行
    if (process.env.NODE_ENV === 'development') {
      try {
        const personasDir = path.join(process.cwd(), 'public', 'personas');
        
        // ディレクトリが存在しなければ作成
        if (!fs.existsSync(personasDir)) {
          fs.mkdirSync(personasDir, { recursive: true });
        }
        
        const filename = `${persona.id}.json`;
        const filePath = path.join(personasDir, filename);
        
        // タイムスタンプを更新
        const updatedPersona = {
          ...persona,
          updated_at: new Date().toISOString()
        };
        
        fs.writeFileSync(filePath, JSON.stringify(updatedPersona, null, 2));
        
        console.log(`✅ Persona saved to file: ${filename}`);
        return NextResponse.json({ 
          success: true, 
          message: 'Persona saved successfully',
          persona: updatedPersona
        });
      } catch (fileError) {
        console.error('❌ Failed to save persona to file:', fileError);
        // ファイル保存に失敗してもエラーにしない（開発環境のみ）
      }
    }

    // 本番環境またはファイル保存失敗時は成功レスポンスのみ返す
    console.log(`📝 Persona processed: ${persona.name} (${persona.id})`);
    return NextResponse.json({ 
      success: true, 
      message: 'Persona received successfully',
      persona: {
        ...persona,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing persona:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process persona',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}