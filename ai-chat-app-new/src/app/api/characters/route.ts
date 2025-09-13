import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Production環境の場合はmanifestから読み取り
    if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
      console.log("Characters API: Using production mode (manifest)");
      try {
        const charactersDir = path.join(process.cwd(), "public", "characters");
        const manifestPath = path.join(charactersDir, "manifest.json");

        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          const characters = [];

          // 各キャラクターファイルを読み込み
          for (const filename of manifest) {
            const filePath = path.join(charactersDir, filename);
            if (fs.existsSync(filePath)) {
              try {
                let fileContent = fs.readFileSync(filePath, "utf8");
                // Remove BOM if present (fixes "Unexpected token '﻿'" error)
                if (fileContent.charCodeAt(0) === 0xfeff) {
                  fileContent = fileContent.slice(1);
                }
                const characterData = JSON.parse(fileContent);
                characters.push(characterData);
              } catch (parseError) {
                console.warn(
                  `Characters API: Failed to parse ${filename}:`,
                  parseError
                );
              }
            }
          }

          console.log(
            `Characters API: Loaded ${characters.length} characters from manifest`
          );
          return NextResponse.json(characters);
        } else {
          // Fallback: try to fetch from URL
          const baseUrl = request.url.replace("/api/characters", "");
          const manifestResponse = await fetch(
            `${baseUrl}/characters/manifest.json`
          );
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            const characters = [];

            // 各キャラクターファイルをURLから取得
            for (const filename of manifest) {
              try {
                const characterResponse = await fetch(
                  `${baseUrl}/characters/${filename}`
                );
                if (characterResponse.ok) {
                  const characterData = await characterResponse.json();
                  characters.push(characterData);
                }
              } catch (fetchError) {
                console.warn(
                  `Characters API: Failed to fetch ${filename}:`,
                  fetchError
                );
              }
            }

            console.log(
              `Characters API: Loaded ${characters.length} characters from URL manifest`
            );
            return NextResponse.json(characters);
          }
        }
      } catch (manifestError) {
        console.error(
          "Characters API: Manifest loading failed:",
          manifestError
        );
      }
    }

    // Development環境：ファイルシステムから読み取り
    console.log("Characters API: Using development mode (filesystem)");
    const charactersDir = path.join(process.cwd(), "public", "characters");

    // ディレクトリが存在するかチェック
    if (!fs.existsSync(charactersDir)) {
      console.warn("Characters API: Characters directory not found");
      return NextResponse.json([]);
    }

    // ディレクトリ内のJSONファイルを取得
    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter(
      (file) =>
        file.endsWith(".json") &&
        !file.startsWith(".") &&
        file !== "CHARACTER_MANAGEMENT_GUIDE.json" &&
        file !== "manifest.json"
    );

    // Debug: Log filtered files
    console.log(
      `Characters API: Found ${jsonFiles.length} JSON files:`,
      jsonFiles.slice(0, 10)
    );
    if (jsonFiles.includes("貴族令嬢.json")) {
      console.log("Characters API: 貴族令嬢.json found in filtered files");
    } else {
      console.log("Characters API: 貴族令嬢.json NOT found in filtered files");
    }

    const characters = [];

    // 各キャラクターファイルを読み込み
    for (const filename of jsonFiles) {
      const filePath = path.join(charactersDir, filename);
      try {
        let fileContent = fs.readFileSync(filePath, "utf8");
        // Remove BOM if present (fixes "Unexpected token '﻿'" error)
        if (fileContent.charCodeAt(0) === 0xfeff) {
          fileContent = fileContent.slice(1);
        }
        const characterData = JSON.parse(fileContent);
        characters.push(characterData);

        // Debug: Log specific character loading
        if (filename === "貴族令嬢.json") {
          console.log(
            `Characters API: Successfully loaded 貴族令嬢.json - name: ${characterData.name}`
          );
        }
      } catch (parseError) {
        console.warn(
          `Characters API: Failed to parse ${filename}:`,
          parseError
        );
      }
    }

    console.log(
      `Characters API: Loaded ${characters.length} characters from filesystem`
    );
    return NextResponse.json(characters);
  } catch (error) {
    console.error("Characters API: Error reading characters:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const character = await request.json();

    if (!character || !character.id) {
      return NextResponse.json(
        { error: "Invalid character data" },
        { status: 400 }
      );
    }

    // A simple security check to prevent directory traversal
    if (character.id.includes("..") || character.id.includes("/")) {
      return NextResponse.json(
        { error: "Invalid character ID" },
        { status: 400 }
      );
    }

    const charactersDir = path.join(process.cwd(), "public", "characters");
    const filePath = path.join(charactersDir, `${character.id}.json`);

    // Ensure the directory exists
    if (!fs.existsSync(charactersDir)) {
      fs.mkdirSync(charactersDir, { recursive: true });
    }

    // トラッカー定義から実行時の値を完全に削除
    // トラッカー定義にはtypeとinitial_valueだけを保存し、current_valueは保存しない
    if (character.trackers && Array.isArray(character.trackers)) {
      character.trackers = character.trackers.map((tracker: any) => {
        // current_valueやその他の実行時データを削除
        const { current_value, value, ...trackerDefinition } = tracker;
        return trackerDefinition;
      });
    }

    // メモリーカードは完全に削除（セッション固有のデータのため）
    if ('memory_cards' in character) {
      delete character.memory_cards;
    }
    if ('memoryCards' in character) {
      delete character.memoryCards;
    }

    // Write the character data to the file
    // We'll stringify with pretty-printing (2 spaces) to keep it readable
    fs.writeFileSync(filePath, JSON.stringify(character, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      message: `Character ${character.id} saved.`,
    });
  } catch (error) {
    console.error("Error saving character:", error);
    return NextResponse.json(
      { error: "Failed to save character" },
      { status: 500 }
    );
  }
}
