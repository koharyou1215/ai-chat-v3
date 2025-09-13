export const debugLog = (message: string, data?: any) => {
  // ブラウザ環境では fs モジュールを使用できないため、コンソールログのみ
  if (typeof window === 'undefined') {
    // Node.js環境（サーバーサイド）の場合のみファイル書き込み
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'debug.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n---\n`;
      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error(`Failed to write to debug.log: ${error}`);
    }
  } else {
    // ブラウザ環境の場合はコンソールログのみ
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
  }
};
