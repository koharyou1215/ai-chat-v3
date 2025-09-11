import fs from 'fs';
import path from 'path';

export const debugLog = (message: string, data?: any) => {
  const logPath = path.join(process.cwd(), 'debug.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n---\n`;
  
  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (error) {
    console.error(`Failed to write to debug.log: ${error}`);
  }
};
