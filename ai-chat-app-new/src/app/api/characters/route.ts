import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { enrichCharacterData, needsEnrichment, logEnrichmentDetails } from "@/utils/character-enrichment";

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

          // 各キャラクターファイルを読み込み（重複排除付き）
          const seenIds = new Set<string>();
          for (const filename of manifest) {
            const filePath = path.join(charactersDir, filename);
            if (fs.existsSync(filePath)) {
              try {
                let fileContent = fs.readFileSync(filePath, "utf8");
                // Remove BOM if present (fixes "Unexpected token '﻿'" error)
                if (fileContent.charCodeAt(0) === 0xfeff) {
                  fileContent = fileContent.slice(1);
                }
                let characterData = JSON.parse(fileContent);

                // ✨ 必須フィールドの自動補完
                if (needsEnrichment(characterData)) {
                  const enriched = enrichCharacterData(characterData, filename);
                  logEnrichmentDetails(characterData, enriched);
                  characterData = enriched;
                }

                // 🔧 重複チェック: idが既に存在する場合はスキップ
                if (characterData.id && seenIds.has(characterData.id)) {
                  console.warn(
                    `Characters API: Skipping duplicate character ID "${characterData.id}" from ${filename}`
                  );
                  continue;
                }

                if (characterData.id) {
                  seenIds.add(characterData.id);
                }
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
            `Characters API: Loaded ${characters.length} unique characters from manifest (${manifest.length} files checked)`
          );

          // ✅ キャッシュ制御ヘッダーを追加（デプロイごとに最新データを取得）
          return NextResponse.json(characters, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        } else {
          // Fallback: try to fetch from URL
          const baseUrl = request.url.replace("/api/characters", "");
          const manifestResponse = await fetch(
            `${baseUrl}/characters/manifest.json`
          );
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            const characters = [];

            // 各キャラクターファイルをURLから取得（重複排除付き）
            const seenIds = new Set<string>();
            for (const filename of manifest) {
              try {
                const characterResponse = await fetch(
                  `${baseUrl}/characters/${filename}`
                );
                if (characterResponse.ok) {
                  let characterData = await characterResponse.json();

                  // ✨ 必須フィールドの自動補完
                  if (needsEnrichment(characterData)) {
                    const enriched = enrichCharacterData(characterData, filename);
                    logEnrichmentDetails(characterData, enriched);
                    characterData = enriched;
                  }

                  // 🔧 重複チェック: idが既に存在する場合はスキップ
                  if (characterData.id && seenIds.has(characterData.id)) {
                    console.warn(
                      `Characters API: Skipping duplicate character ID "${characterData.id}" from ${filename}`
                    );
                    continue;
                  }

                  if (characterData.id) {
                    seenIds.add(characterData.id);
                  }
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
              `Characters API: Loaded ${characters.length} unique characters from URL manifest (${manifest.length} files checked)`
            );

            // ✅ キャッシュ制御ヘッダーを追加（デプロイごとに最新データを取得）
            return NextResponse.json(characters, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
              },
            });
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

      // ✅ ディレクトリ不在時もキャッシュ制御ヘッダーを追加
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
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
    const seenIds = new Set<string>();

    // 各キャラクターファイルを読み込み（重複排除付き）
    for (const filename of jsonFiles) {
      const filePath = path.join(charactersDir, filename);
      try {
        let fileContent = fs.readFileSync(filePath, "utf8");
        // Remove BOM if present (fixes "Unexpected token '﻿'" error)
        if (fileContent.charCodeAt(0) === 0xfeff) {
          fileContent = fileContent.slice(1);
        }
        let characterData = JSON.parse(fileContent);

        // ✨ 必須フィールドの自動補完
        if (needsEnrichment(characterData)) {
          const enriched = enrichCharacterData(characterData, filename);
          logEnrichmentDetails(characterData, enriched);
          characterData = enriched;
        }

        // 🔧 重複チェック: idが既に存在する場合はスキップ
        if (characterData.id && seenIds.has(characterData.id)) {
          console.warn(
            `Characters API: Skipping duplicate character ID "${characterData.id}" from ${filename}`
          );
          continue;
        }

        if (characterData.id) {
          seenIds.add(characterData.id);
        }
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
      `Characters API: Loaded ${characters.length} unique characters from filesystem (${jsonFiles.length} files checked)`
    );

    // ✅ キャッシュ制御ヘッダーを追加（デプロイごとに最新データを取得）
    return NextResponse.json(characters, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Characters API: Error reading characters:", error);

    // ✅ エラー時もキャッシュ制御ヘッダーを追加
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
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

    // 🔒 トラッカー保護: 元ファイルからトラッカー定義を読み取り、保持する
    const existingFilePath = path.join(charactersDir, `${character.id}.json`);
    let existingTrackers: Array<Record<string, unknown>> = [];

    if (fs.existsSync(existingFilePath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(existingFilePath, 'utf8'));
        if (existingData.trackers && Array.isArray(existingData.trackers) && existingData.trackers.length > 0) {
          existingTrackers = existingData.trackers;
          console.log(`🔒 Preserving ${existingTrackers.length} existing trackers from file`);
        }
      } catch (readError) {
        console.warn(`⚠️ Could not read existing trackers from ${character.id}.json:`, readError);
      }
    }

    // トラッカー定義から実行時の値を削除（定義は保持）
    if (character.trackers && Array.isArray(character.trackers) && character.trackers.length > 0) {
      character.trackers = character.trackers.map((tracker: Record<string, unknown> & { current_value?: unknown; value?: unknown }) => {
        // current_valueやその他の実行時データを削除
        const { current_value: _current_value, value: _value, ...trackerDefinition } = tracker;
        return trackerDefinition;
      });
      console.log(`✅ Cleaned ${character.trackers.length} trackers (removed runtime values)`);
    } else if (existingTrackers.length > 0) {
      // トラッカーが空または未定義の場合、元のファイルから復元
      character.trackers = existingTrackers;
      console.log(`🔄 Restored ${existingTrackers.length} trackers from existing file`);
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
