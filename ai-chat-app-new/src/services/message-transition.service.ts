/**
 * Message Transition Service
 * メッセージの段階的更新とアニメーション制御
 */

import { TextDiff, TransitionAnimation } from '@/types/progressive-message.types';

export class MessageTransitionService {
  /**
   * テキストの差分を検出
   */
  detectChanges(oldText: string, newText: string): TextDiff {
    // 簡易的な差分検出（実際の実装では diff-match-patch ライブラリを使用）
    const oldWords = oldText.split(' ');
    const newWords = newText.split(' ');
    
    const additions: string[] = [];
    const deletions: string[] = [];
    const unchanged: string[] = [];
    
    // 新しく追加された部分を検出
    newWords.forEach(word => {
      if (!oldWords.includes(word)) {
        additions.push(word);
      } else {
        unchanged.push(word);
      }
    });
    
    // 削除された部分を検出
    oldWords.forEach(word => {
      if (!newWords.includes(word)) {
        deletions.push(word);
      }
    });
    
    const totalChanges = additions.length + deletions.length;
    const totalWords = Math.max(oldWords.length, newWords.length);
    const changeRatio = totalWords > 0 ? totalChanges / totalWords : 0;
    
    return {
      additions,
      deletions,
      unchanged,
      changeRatio
    };
  }
  
  /**
   * 段階的なテキスト表示（タイプライター効果）
   */
  async typewriterEffect(
    element: HTMLElement,
    text: string,
    speed: number = 50
  ): Promise<void> {
    const characters = text.split('');
    element.textContent = '';
    
    for (let i = 0; i < characters.length; i++) {
      element.textContent += characters[i];
      await this.sleep(speed);
    }
  }
  
  /**
   * フェードイン・フェードアウトトランジション
   */
  async fadeTransition(
    element: HTMLElement,
    newContent: string,
    duration: number = 500
  ): Promise<void> {
    // フェードアウト
    element.style.transition = `opacity ${duration / 2}ms ease-out`;
    element.style.opacity = '0.3';
    
    await this.sleep(duration / 2);
    
    // コンテンツ更新
    element.innerHTML = this.highlightNewContent(newContent);
    
    // フェードイン
    element.style.opacity = '1';
    
    await this.sleep(duration / 2);
    
    // トランジション削除
    element.style.transition = '';
  }
  
  /**
   * スライドトランジション
   */
  async slideTransition(
    element: HTMLElement,
    newContent: string,
    direction: 'up' | 'down' = 'up',
    duration: number = 500
  ): Promise<void> {
    const parent = element.parentElement;
    if (!parent) return;
    
    // 新しい要素を作成
    const newElement = element.cloneNode(true) as HTMLElement;
    newElement.innerHTML = this.highlightNewContent(newContent);
    
    // 初期位置設定
    newElement.style.position = 'absolute';
    newElement.style.width = '100%';
    newElement.style.transform = `translateY(${direction === 'up' ? '100%' : '-100%'})`;
    newElement.style.transition = `transform ${duration}ms ease-out`;
    
    parent.appendChild(newElement);
    
    // アニメーション開始
    element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.transform = `translateY(${direction === 'up' ? '-100%' : '100%'})`;
    element.style.opacity = '0';
    
    newElement.style.transform = 'translateY(0)';
    
    await this.sleep(duration);
    
    // 古い要素を削除
    element.remove();
    newElement.style.position = '';
    newElement.style.transition = '';
  }
  
  /**
   * モーフィングトランジション（差分ベース）
   */
  async morphTransition(
    element: HTMLElement,
    oldText: string,
    newText: string,
    duration: number = 700
  ): Promise<void> {
    const diff = this.detectChanges(oldText, newText);
    
    // 変更がない場合はスキップ
    if (diff.changeRatio === 0) return;
    
    // 小さな変更の場合はシンプルなフェード
    if (diff.changeRatio < 0.3) {
      await this.fadeTransition(element, newText, duration * 0.5);
      return;
    }
    
    // 大きな変更の場合は段階的に更新
    const steps = 3;
    const stepDuration = duration / steps;
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const intermediateText = this.interpolateText(oldText, newText, progress);
      
      element.style.transition = `opacity ${stepDuration}ms ease-in-out`;
      element.style.opacity = String(0.7 + (0.3 * progress));
      element.innerHTML = this.highlightNewContent(intermediateText);
      
      await this.sleep(stepDuration);
    }
    
    element.style.transition = '';
    element.style.opacity = '1';
  }
  
  /**
   * 波紋エフェクト
   */
  async rippleEffect(
    element: HTMLElement,
    newContent: string,
    duration: number = 600
  ): Promise<void> {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-overlay';
    ripple.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(100,200,255,0.3) 0%, transparent 70%);
      transform: scale(0);
      opacity: 1;
      transition: transform ${duration}ms ease-out, opacity ${duration}ms ease-out;
      pointer-events: none;
      z-index: 1;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    // アニメーション開始
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(2)';
      ripple.style.opacity = '0';
    });
    
    // コンテンツ更新
    setTimeout(() => {
      element.innerHTML = this.highlightNewContent(newContent) + ripple.outerHTML;
    }, duration / 2);
    
    // クリーンアップ
    setTimeout(() => {
      const rippleElement = element.querySelector('.ripple-overlay');
      rippleElement?.remove();
    }, duration);
  }
  
  /**
   * グロー効果の適用
   */
  applyGlowEffect(
    element: HTMLElement,
    intensity: 'soft' | 'medium' | 'strong',
    duration: number = 1000
  ): void {
    const glowClass = `glow-${intensity}`;
    element.classList.add(glowClass);
    
    setTimeout(() => {
      element.classList.remove(glowClass);
    }, duration);
  }
  
  /**
   * 新しいコンテンツをハイライト
   */
  private highlightNewContent(content: string): string {
    // 新しく追加された部分を span でラップしてハイライト
    // 実際の実装では、差分情報を基により精密にハイライト
    return `<span class="content-updated">${content}</span>`;
  }
  
  /**
   * テキストの補間（モーフィング用）
   */
  private interpolateText(oldText: string, newText: string, progress: number): string {
    const oldLength = oldText.length;
    const newLength = newText.length;
    const targetLength = Math.round(oldLength + (newLength - oldLength) * progress);
    
    if (progress < 0.5) {
      // 前半：古いテキストから削除
      return oldText.slice(0, targetLength);
    } else {
      // 後半：新しいテキストを追加
      return newText.slice(0, targetLength);
    }
  }
  
  /**
   * スリープユーティリティ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * トランジションアニメーションの実行
   */
  async executeTransition(
    element: HTMLElement,
    oldContent: string,
    newContent: string,
    animation: TransitionAnimation
  ): Promise<void> {
    const duration = animation.duration || 500;
    
    if (animation.delay) {
      await this.sleep(animation.delay);
    }
    
    switch (animation.type) {
      case 'fade':
        await this.fadeTransition(element, newContent, duration);
        break;
      
      case 'slide':
        await this.slideTransition(element, newContent, 'up', duration);
        break;
      
      case 'morph':
        await this.morphTransition(element, oldContent, newContent, duration);
        break;
      
      case 'ripple':
        await this.rippleEffect(element, newContent, duration);
        break;
      
      default:
        // フォールバック：即座に更新
        element.innerHTML = newContent;
    }
  }
  
  /**
   * プログレスインジケーターの更新
   */
  updateProgressIndicator(
    element: HTMLElement,
    stage: 'reflex' | 'context' | 'intelligence',
    status: 'pending' | 'active' | 'complete'
  ): void {
    const indicator = element.querySelector(`.stage-indicator .stage-${stage}`);
    if (!indicator) return;
    
    // 既存のクラスを削除
    indicator.classList.remove('pending', 'active', 'complete');
    
    // 新しいステータスを追加
    indicator.classList.add(status);
    
    // アニメーション効果
    if (status === 'complete') {
      indicator.classList.add('pulse-success');
      setTimeout(() => {
        indicator.classList.remove('pulse-success');
      }, 1000);
    }
  }
  
  /**
   * ローディング状態の表示
   */
  showLoadingState(element: HTMLElement, message: string): void {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-state';
    loadingDiv.innerHTML = `
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="loading-message">${message}</span>
    `;
    
    element.appendChild(loadingDiv);
  }
  
  /**
   * ローディング状態の削除
   */
  hideLoadingState(element: HTMLElement): void {
    const loadingDiv = element.querySelector('.loading-state');
    if (loadingDiv) {
      loadingDiv.classList.add('fade-out');
      setTimeout(() => loadingDiv.remove(), 300);
    }
  }
}

// シングルトンインスタンス
export const messageTransitionService = new MessageTransitionService();