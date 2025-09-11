#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * アップロードディレクトリのセットアップスクリプト
 * 本番環境でもローカルファイルシステムを使用できるようにする
 */

const uploadDirs = [
  "public/uploads",
  "public/uploads/images",
  "public/uploads/videos",
  "public/uploads/avatars",
  "public/uploads/backgrounds",
];

console.log("📁 Setting up upload directories...");

uploadDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);

  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`📁 Directory already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create directory ${dir}:`, error.message);
  }
});

// .gitkeepファイルを作成してディレクトリをGitに含める
uploadDirs.forEach((dir) => {
  const gitkeepPath = path.join(process.cwd(), dir, ".gitkeep");

  try {
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(
        gitkeepPath,
        "# This file ensures the directory is included in Git\n"
      );
      console.log(`📄 Created .gitkeep in: ${dir}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create .gitkeep in ${dir}:`, error.message);
  }
});

console.log("🎉 Upload directories setup complete!");
