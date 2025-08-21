const http = require('http');

console.log('VoiceVoxエンジンの接続テストを開始します...');

// 接続テスト
const testConnection = () => {
  const options = {
    hostname: 'localhost',
    port: 50021,
    path: '/version',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ 接続成功！ステータス: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const version = JSON.parse(data);
        console.log('📋 VoiceVoxバージョン情報:', version);
      } catch (e) {
        console.log('📄 レスポンス内容:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ 接続エラー:', err.message);
    
    if (err.code === 'ECONNREFUSED') {
      console.log('💡 解決方法:');
      console.log('   1. VoiceVoxエンジンが起動しているか確認');
      console.log('   2. ポート50021が正しく設定されているか確認');
      console.log('   3. ファイアウォールの設定を確認');
    }
  });

  req.on('timeout', () => {
    console.error('⏰ タイムアウト: 5秒以内に応答がありません');
    req.destroy();
  });

  req.end();
};

testConnection();
