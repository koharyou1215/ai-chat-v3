import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

// ディレクトリが存在しない場合は作成
function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

// GET: 履歴一覧を取得
export async function GET(request: NextRequest) {
  try {
    ensureHistoryDir();
    
    // クエリパラメータから制限数を取得
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // 履歴ファイルの一覧を取得
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(HISTORY_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          id: file.replace('.json', ''),
          filename: file,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, limit);
    
    // 各ファイルのメタデータを読み込み
    const histories = files.map(file => {
      try {
        const content = fs.readFileSync(path.join(HISTORY_DIR, file.filename), 'utf8');
        const data = JSON.parse(content);
        return {
          id: file.id,
          title: data.session_info?.title || 'Untitled Session',
          character: data.participants?.characters?.[0]?.name || 'Unknown',
          messageCount: data.messages?.length || 0,
          created: file.created,
          modified: file.modified,
          size: file.size,
          isPinned: data.isPinned || false
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    return NextResponse.json({ 
      histories, 
      total: histories.length,
      storageUsed: files.reduce((sum, f) => sum + f.size, 0)
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// POST: セッションを履歴として保存
export async function POST(request: NextRequest) {
  try {
    ensureHistoryDir();
    
    const session = await request.json();
    
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }
    
    // セキュリティチェック
    if (session.id.includes('..') || session.id.includes('/')) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }
    
    const filename = `${session.id}.json`;
    const filePath = path.join(HISTORY_DIR, filename);
    
    // セッションデータに追加情報を付与
    const historyData = {
      ...session,
      savedAt: new Date().toISOString(),
      version: 1
    };
    
    // ファイルに保存
    fs.writeFileSync(filePath, JSON.stringify(historyData, null, 2), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Session saved to history',
      id: session.id 
    });
  } catch (error) {
    console.error('Error saving history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

// DELETE: 履歴を削除
export async function DELETE(request: NextRequest) {
  try {
    ensureHistoryDir();
    
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    // セキュリティチェック
    if (sessionId.includes('..') || sessionId.includes('/')) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }
    
    const filename = `${sessionId}.json`;
    const filePath = path.join(HISTORY_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }
    
    fs.unlinkSync(filePath);
    
    return NextResponse.json({ 
      success: true, 
      message: 'History deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting history:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}

// PATCH: 履歴を更新（ピン留めなど）
export async function PATCH(request: NextRequest) {
  try {
    ensureHistoryDir();
    
    const { id, updates } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    // セキュリティチェック
    if (id.includes('..') || id.includes('/')) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }
    
    const filename = `${id}.json`;
    const filePath = path.join(HISTORY_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 });
    }
    
    // 既存のデータを読み込み
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // 更新を適用
    const updatedData = {
      ...data,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // ファイルに保存
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'History updated successfully' 
    });
  } catch (error) {
    console.error('Error updating history:', error);
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
  }
}