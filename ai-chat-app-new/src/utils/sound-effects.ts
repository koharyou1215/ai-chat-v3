/**
 * Sound Effects Utility
 *
 * Web Audio APIを使用して効果音を生成・再生します
 */

// グローバルなAudioContextインスタンス（再利用）
let audioContext: AudioContext | null = null;

/**
 * AudioContextを取得（遅延初期化）
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * タイプライター開始時の効果音（ピコッという音）
 *
 * @param volume - 音量（0.0 ~ 1.0）デフォルト: 0.3
 */
export function playTypewriterStartSound(volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();

    // オシレーター（音源）を作成
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // ピコッという音のための設定
    oscillator.type = 'sine'; // 正弦波
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime); // 高い音（1200Hz）
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05); // 少し下がる

    // 音量エンベロープ（短く鋭い音）
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    // 接続
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 再生
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);

  } catch (error) {
    console.warn('効果音の再生に失敗しました:', error);
  }
}

/**
 * タイプライター完了時の効果音（ポンという音）
 *
 * @param volume - 音量（0.0 ~ 1.0）デフォルト: 0.25
 */
export function playTypewriterCompleteSound(volume: number = 0.25): void {
  try {
    const ctx = getAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // ポンという音のための設定
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

    // 音量エンベロープ
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    // 接続
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 再生
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);

  } catch (error) {
    console.warn('効果音の再生に失敗しました:', error);
  }
}

/**
 * 汎用効果音再生関数
 *
 * @param frequency - 周波数（Hz）
 * @param duration - 持続時間（秒）
 * @param volume - 音量（0.0 ~ 1.0）
 * @param type - 波形タイプ
 */
export function playSoundEffect(
  frequency: number,
  duration: number,
  volume: number = 0.3,
  type: OscillatorType = 'sine'
): void {
  try {
    const ctx = getAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

  } catch (error) {
    console.warn('効果音の再生に失敗しました:', error);
  }
}

/**
 * AudioContextをクリーンアップ（メモリ解放）
 */
export function cleanupAudioContext(): void {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
