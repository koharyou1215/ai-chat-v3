"use client";

import React, {
  useEffect,
  useState,
  useRef,
  Suspense,
  useMemo,
  useCallback,
} from "react";
import { ProgressiveMessage } from "@/types/progressive-message.types";
import { messageTransitionService } from "@/services/message-transition.service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotateCcw, Play, Copy, MoreHorizontal } from "lucide-react";
import { useAppStore } from "@/store";
import MessageEffects from "@/components/chat/MessageEffects";
import { ParticleText } from "@/components/chat/AdvancedEffects";

interface ProgressiveMessageBubbleProps {
  message: ProgressiveMessage;
  isLatest?: boolean;
}

export const ProgressiveMessageBubble: React.FC<
  ProgressiveMessageBubbleProps
> = ({ message, isLatest = false }) => {
  const [showFullActions, setShowFullActions] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null); // 選択された段階
  const { is_generating, effectSettings, appearanceSettings } = useAppStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);

  // プログレッシブデータへの安全なアクセス
  const progressiveData = (message as any).metadata?.progressiveData || message;
  const stages = useMemo(
    () => progressiveData.stages || {},
    [progressiveData.stages]
  );
  const currentStage = progressiveData.currentStage || "reflex";
  const ui = progressiveData.ui || {
    showIndicator: true,
    isUpdating: false,
    glowIntensity: "none",
    highlightChanges: false,
  };

  // デバッグログ
  console.log("📊 ProgressiveMessageBubble render:", {
    currentStage: currentStage,
    hasReflex: !!stages?.reflex?.content,
    hasContext: !!stages?.context?.content,
    hasIntelligence: !!stages?.intelligence?.content,
    showIndicator: ui?.showIndicator,
    displayedContent: displayedContent?.substring(0, 50),
    stages: stages,
    messageContent: message.content?.substring(0, 50),
    fullMessage: message, // 全体のメッセージオブジェクトも確認
    stagesType: typeof stages,
    stagesKeys: stages ? Object.keys(stages) : [],
  });

  // ステージ表示ヘルパー
  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "reflex":
        return "直感";
      case "context":
        return "文脈 ❤️";
      case "intelligence":
        return "知性";
      default:
        return stage;
    }
  };

  // ステージ詳細説明ヘルパー
  const getStageDescription = (stage: string) => {
    switch (stage) {
      case "reflex":
        return "瞬間的な反応と理解";
      case "context":
        return "心の声・内面の想い";
      case "intelligence":
        return "深い洞察と知識";
      default:
        return "";
    }
  };

  const getStageColor = (stage: string, isActive: boolean) => {
    if (isActive) {
      switch (stage) {
        case "reflex":
          return "bg-green-500 shadow-lg shadow-green-500/50";
        case "context":
          return "bg-pink-500 shadow-lg shadow-pink-500/50 animate-pulse";
        case "intelligence":
          return "bg-purple-500 shadow-lg shadow-purple-500/50";
        default:
          return "bg-gray-500";
      }
    }
    return "bg-gray-600";
  };

  const handleRegenerate = async () => {
    const { regenerateLastMessage } = useAppStore.getState();
    await regenerateLastMessage();
  };

  const handleContinue = async () => {
    const { continueLastMessage } = useAppStore.getState();
    await continueLastMessage();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  // 現在のステージに応じたコンテンツを取得（段階的表示）
  const getCurrentStageContent = useCallback(() => {
    // selectedStageが指定されている場合は、その段階の内容を表示
    if (selectedStage && stages[selectedStage]?.content) {
      console.log(
        `✅ Using ${selectedStage} content from stages:`,
        stages[selectedStage].content.substring(0, 50)
      );
      return stages[selectedStage].content;
    }

    // selectedStageがない場合は、message.contentがある場合はそれを優先的に使用
    // （サーバー側でもmessage.contentに最新の内容が設定されているため）
    if (!selectedStage && message.content) {
      console.log(
        "✅ Using message.content:",
        message.content.substring(0, 50)
      );
      return message.content;
    }

    // stagesがオブジェクトであることを確認
    if (!stages || typeof stages !== "object") {
      console.log("⚠️ No stages object and no content");
      return "";
    }

    let content = "";

    // 直感段階の内容をチェック
    if (stages.reflex?.content) {
      content = stages.reflex.content;
      console.log(
        "✅ Using reflex content from stages:",
        content.substring(0, 50)
      );
    }

    // 文脈段階に進んでいる場合、文脈の内容を表示
    if (
      (currentStage === "context" || currentStage === "intelligence") &&
      stages.context?.content
    ) {
      content = stages.context.content;
      console.log(
        "✅ Using context content from stages:",
        content.substring(0, 50)
      );
    }

    // 知性段階に進んでいる場合、知性の内容を表示
    if (currentStage === "intelligence" && stages.intelligence?.content) {
      content = stages.intelligence.content;
      console.log(
        "✅ Using intelligence content from stages:",
        content.substring(0, 50)
      );
    }

    return content || "";
  }, [selectedStage, stages, message.content, currentStage]);

  // タイプライター効果の実装（最新メッセージのみ）
  useEffect(() => {
    const currentContent = getCurrentStageContent();

    if (
      effectSettings.typewriterEffect &&
      currentContent &&
      message.role !== "user" &&
      isLatest
    ) {
      setIsTypewriterActive(true);
      setDisplayedContent("");

      const speed = Math.max(10, 100 - effectSettings.typewriterIntensity);

      // タイプライター効果を直接実装（messageTransitionServiceの代わりに）
      const typeText = async () => {
        const characters = currentContent.split("");
        let currentText = "";

        for (let i = 0; i < characters.length; i++) {
          currentText += characters[i];
          setDisplayedContent(currentText);
          await new Promise((resolve) => setTimeout(resolve, speed));
        }
        setIsTypewriterActive(false);
      };

      typeText();
    } else {
      setDisplayedContent(currentContent);
    }
  }, [
    getCurrentStageContent,
    effectSettings.typewriterEffect,
    effectSettings.typewriterIntensity,
    message.role,
    isLatest,
  ]);

  // 括弧内テキストの検出とエフェクト適用
  const processedContent = useMemo(() => {
    if (!displayedContent) return displayedContent;

    // 「」内のテキストを検出して特別なエフェクトを適用
    return displayedContent.replace(/「([^」]+)」/g, (match, text) => {
      // 感情に応じたエフェクトを決定
      let effectClass = "";
      let effectStyle = "";

      // ポジティブな感情
      if (
        /愛|好き|うれしい|楽しい|幸せ|最高|素晴らしい|ありがとう|嬉しい|ドキドキ|ワクワク|キラキラ/.test(
          text
        )
      ) {
        effectClass = "positive-emotion";
        effectStyle =
          "color: #ff6b9d; text-shadow: 0 0 10px rgba(255, 107, 157, 0.6); font-weight: bold;";
      }
      // ネガティブな感情
      else if (
        /悲しい|寂しい|つらい|苦しい|嫌い|最悪|うざい|むかつく|怒り|泣き/.test(
          text
        )
      ) {
        effectClass = "negative-emotion";
        effectStyle =
          "color: #4a90e2; text-shadow: 0 0 10px rgba(74, 144, 226, 0.6); font-weight: bold;";
      }
      // 驚き・興奮
      else if (
        /えっ|まさか|すごい|びっくり|驚き|興奮|ドキドキ|ハラハラ/.test(text)
      ) {
        effectClass = "surprise-emotion";
        effectStyle =
          "color: #f39c12; text-shadow: 0 0 10px rgba(243, 156, 18, 0.6); font-weight: bold; animation: pulse 1s infinite;";
      }
      // 疑問・困惑
      else if (
        /？|\?|なんで|なぜ|どうして|どう|何|どれ|いつ|どこ|誰/.test(text)
      ) {
        effectClass = "question-emotion";
        effectStyle =
          "color: #9b59b6; text-shadow: 0 0 10px rgba(155, 89, 182, 0.6); font-style: italic;";
      }
      // その他の感情表現
      else if (/！|!|〜|ー|…|\.\.\./.test(text)) {
        effectClass = "general-emotion";
        effectStyle =
          "color: #e74c3c; text-shadow: 0 0 8px rgba(231, 76, 60, 0.5); font-weight: bold;";
      }
      // デフォルト（感情が検出されない場合）
      else {
        effectClass = "default-emotion";
        effectStyle =
          "color: #95a5a6; text-shadow: 0 0 5px rgba(149, 165, 166, 0.4);";
      }

      return `<span class="${effectClass}" style="${effectStyle}">「${text}」</span>`;
    });
  }, [displayedContent]);

  // フォントエフェクトのスタイル計算（特殊装飾効果）
  const fontEffectStyles = useMemo(() => {
    if (!effectSettings.fontEffects) return {};

    const intensity = effectSettings.fontEffectsIntensity;
    return {
      // グラデーションテキスト効果
      background:
        intensity > 30
          ? `linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3)`
          : "none",
      backgroundClip: intensity > 30 ? "text" : "initial",
      WebkitBackgroundClip: intensity > 30 ? "text" : "initial",
      color: intensity > 30 ? "transparent" : "inherit",

      // アニメーション効果
      animation:
        intensity > 50 ? "rainbow-text 3s ease-in-out infinite" : "none",

      // テキストシャドウ（複数層）
      textShadow:
        intensity > 40
          ? `0 0 5px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3), 0 0 15px rgba(255,255,255,0.1)`
          : "none",

      // 変形効果
      transform: intensity > 60 ? "perspective(100px) rotateX(5deg)" : "none",

      // フィルター効果
      filter:
        intensity > 70
          ? "drop-shadow(0 0 8px rgba(255,255,255,0.6)) brightness(1.2) contrast(1.1)"
          : "none",
    };
  }, [effectSettings.fontEffects, effectSettings.fontEffectsIntensity]);

  const canRegenerate = isLatest && !is_generating;
  const canContinue = isLatest && !is_generating;

  return (
    <div className="progressive-message-bubble relative">
      <div className="progressive-container bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-400/20 overflow-hidden">
        {/* ステージインジケーター */}
        {ui.showIndicator && (
          <div className="stage-indicator p-3 border-b border-purple-400/20">
            <div className="flex flex-wrap gap-4">
              {(["reflex", "context", "intelligence"] as const).map(
                (stage, index) => (
                  <div
                    key={stage}
                    className="stage-item flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`stage-icon w-3 h-3 rounded-full transition-all duration-300 ${getStageColor(
                        stage,
                        currentStage === stage
                      )}`}
                    />
                    <div className="stage-info flex flex-col min-w-0">
                      <span className="stage-label text-sm font-medium text-gray-300">
                        {getStageLabel(stage)}
                      </span>
                      <span className="stage-description text-xs text-gray-500 truncate">
                        {stages[stage]?.content ? (
                          <span className="text-green-400 font-medium">
                            完了
                          </span>
                        ) : currentStage === stage ? (
                          <span className="text-yellow-400 font-medium animate-pulse">
                            処理中...
                          </span>
                        ) : (
                          <span className="text-gray-500">待機中</span>
                        )}
                      </span>
                    </div>
                    {index < 2 && (
                      <div className="stage-separator w-8 h-0.5 bg-gray-600 mx-2 flex-shrink-0" />
                    )}
                  </div>
                )
              )}
            </div>

            {/* Show Diff トグル */}
            {stages.context?.content && stages.reflex?.content && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${
                    showDiff
                      ? "bg-purple-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}>
                  {showDiff ? "✓ Show Diff" : "Show Diff"}
                </button>
                <span className="text-xs text-gray-500">
                  ステージ間の差分を表示
                </span>
              </div>
            )}
          </div>
        )}

        {/* 段階選択タブ - 複数の段階がある場合のみ表示 */}
        {(stages.reflex?.content ||
          stages.context?.content ||
          stages.intelligence?.content) && (
          <div className="stage-tabs flex gap-2 px-4 pb-2">
            {stages.reflex?.content && (
              <button
                onClick={() =>
                  setSelectedStage(selectedStage === "reflex" ? null : "reflex")
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStage === "reflex"
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title="Stage 1: 直感的な反応">
                Stage 1: 直感
              </button>
            )}
            {stages.context?.content && (
              <button
                onClick={() =>
                  setSelectedStage(
                    selectedStage === "context" ? null : "context"
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStage === "context"
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title="Stage 2: 文脈・心の声">
                Stage 2: 文脈 ❤️
              </button>
            )}
            {stages.intelligence?.content && (
              <button
                onClick={() =>
                  setSelectedStage(
                    selectedStage === "intelligence" ? null : "intelligence"
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStage === "intelligence"
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title="Stage 3: 知性・深い洞察">
                Stage 3: 知性
              </button>
            )}
            {selectedStage && (
              <button
                onClick={() => setSelectedStage(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
                title="最新の内容を表示">
                最新
              </button>
            )}
          </div>
        )}

        {/* メッセージ表示エリア */}
        <div className="message-area p-4 relative">
          {/* メッセージバブル */}
          <div
            ref={contentRef}
            className={`message-content px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 relative overflow-hidden ${
              ui.highlightChanges ? "highlight-changes" : ""
            } ${
              effectSettings.colorfulBubbles
                ? "bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-teal-500/20 border-purple-400/40 shadow-purple-500/20"
                : "bg-slate-800/60 border-slate-600/30"
            }`}
            style={{
              fontSize: effectSettings.fontEffects
                ? `${Math.max(
                    0.75,
                    1 + (effectSettings.fontEffectsIntensity - 50) / 100
                  )}rem`
                : undefined,
              fontWeight:
                effectSettings.fontEffects &&
                effectSettings.fontEffectsIntensity > 70
                  ? "bold"
                  : undefined,
              textShadow:
                effectSettings.fontEffects &&
                effectSettings.fontEffectsIntensity > 50
                  ? "0 0 10px rgba(255,255,255,0.3)"
                  : undefined,
              opacity: effectSettings.bubbleOpacity
                ? effectSettings.bubbleOpacity / 100
                : 0.85,
            }}>
            {/* メッセージ内容 */}
            <div
              className="message-text prose prose-sm prose-invert max-w-none"
              style={fontEffectStyles}>
              {displayedContent ? (
                <>
                  <div
                    className="prose prose-sm prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                  />
                  {effectSettings.typewriterEffect && isTypewriterActive && (
                    <span className="typewriter-cursor animate-pulse ml-1 text-purple-400">
                      |
                    </span>
                  )}
                </>
              ) : (
                <div className="text-gray-400 italic">
                  {currentStage === "reflex" && "直感ステージを処理中..."}
                  {currentStage === "context" && "文脈ステージを処理中..."}
                  {currentStage === "intelligence" && "知性ステージを処理中..."}
                </div>
              )}
            </div>

            {/* メッセージメニュー - 常に最新メッセージに表示 */}
            {isLatest && (
              <div
                ref={menuRef}
                className="message-menu absolute bottom-2 right-2 flex items-center gap-1 bg-gray-800/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-gray-600/30 z-10">
                {/* 再生成ボタン */}
                {canRegenerate && (
                  <button
                    onClick={handleRegenerate}
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
                    title="再生成">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                {/* 続きボタン */}
                {canContinue && (
                  <button
                    onClick={handleContinue}
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
                    title="続きを生成">
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {/* コピーボタン */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
                  title="コピー">
                  <Copy className="w-4 h-4" />
                </button>
                {/* その他メニュー */}
                <button
                  onClick={() => setShowFullActions(!showFullActions)}
                  className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
                  title="その他">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* エフェクト統合 */}
            {effectSettings.particleEffects && (
              <Suspense fallback={null}>
                <ParticleText
                  text={displayedContent}
                  trigger={isLatest && !isTypewriterActive}
                />
              </Suspense>
            )}

            {(effectSettings.particleEffects ||
              effectSettings.colorfulBubbles) && (
              <Suspense fallback={null}>
                <MessageEffects
                  trigger={displayedContent}
                  position={{ x: 50, y: 50 }}
                />
              </Suspense>
            )}
          </div>

          {/* Diff表示エリア */}
          {showDiff && stages.context?.content && stages.reflex?.content && (
            <div className="diff-display mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="text-xs font-medium text-gray-400 mb-2">
                ステージ間の変化
              </div>
              <div className="space-y-3">
                {/* 直感 → 文脈 */}
                <div className="diff-section">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-green-400">直感</span>
                    <span className="text-xs text-gray-500">→</span>
                    <span className="text-xs text-pink-400">文脈</span>
                  </div>
                  <div className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded">
                    {stages.context.content.length >
                    stages.reflex.content.length
                      ? `+${
                          stages.context.content.length -
                          stages.reflex.content.length
                        } 文字追加`
                      : "内容を調整"}
                  </div>
                </div>

                {/* 文脈 → 知性 */}
                {stages.intelligence?.content && (
                  <div className="diff-section">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-pink-400">文脈</span>
                      <span className="text-xs text-gray-500">→</span>
                      <span className="text-xs text-purple-400">知性</span>
                    </div>
                    <div className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded">
                      {stages.intelligence.content.length >
                      stages.context.content.length
                        ? `+${
                            stages.intelligence.content.length -
                            stages.context.content.length
                          } 文字追加`
                        : "内容を洗練"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* メタデータ表示（開発モード） - 折りたたみ可能 */}
        {process.env.NODE_ENV === "development" && message.metadata && (
          <div className="metadata mt-3 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700 text-xs">
            <div
              className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => setShowMetadata(!showMetadata)}>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-xs">メタデータ</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>{message.metadata.totalTime}ms</span>
                  <span>•</span>
                  <span>{message.metadata.totalTokens}トークン</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <span className="text-xs">詳細</span>
                <div
                  className={`transition-transform duration-200 ${
                    showMetadata ? "rotate-180" : ""
                  }`}>
                  •••
                </div>
              </div>
            </div>

            {/* 詳細メタデータ（折りたたみ可能） */}
            {showMetadata && (
              <div className="p-3 border-t border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-gray-300">
                  <div className="stat-item">
                    <span className="label">総生成時間:</span>
                    <span className="value">
                      {message.metadata.totalTime}ms
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="label">総トークン:</span>
                    <span className="value">
                      {message.metadata.totalTokens}トークン
                    </span>
                  </div>
                  {message.metadata.userSatisfactionPoint && (
                    <div className="stat-item">
                      <span className="label">満足度ポイント:</span>
                      <span className="value">
                        {message.metadata.userSatisfactionPoint}
                      </span>
                    </div>
                  )}
                </div>
                {message.metadata.stageTimings && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <span className="label text-gray-400">
                      ステージタイミング:
                    </span>
                    <div className="stage-timings grid grid-cols-3 gap-2 mt-1 text-xs">
                      {message.metadata.stageTimings.reflex && (
                        <div>
                          直感: {message.metadata.stageTimings.reflex}ms
                        </div>
                      )}
                      {message.metadata.stageTimings.context && (
                        <div>
                          文脈: {message.metadata.stageTimings.context}ms
                        </div>
                      )}
                      {message.metadata.stageTimings.intelligence && (
                        <div>
                          知性: {message.metadata.stageTimings.intelligence}ms
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 生成中インジケーター */}
      {ui.isUpdating && (
        <div className="updating-indicator absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-full">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-400">
            {currentStage === "reflex" && "記憶を検索中..."}
            {currentStage === "context" && "心の声を紡いでいる... 💭"}
            {currentStage === "intelligence" && "最終調整中..."}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressiveMessageBubble;
