/**
 * Device Detection Utility
 * デバイス検出ユーティリティ
 *
 * モバイル/デスクトップを判定して、適切な背景画像を選択する
 */

/**
 * デバイスがモバイルかどうかを判定
 *
 * 判定基準:
 * 1. User Agent による判定（iOS, Android, Windows Phone, etc.）
 * 2. ビューポート幅による判定（768px未満をモバイルとする）
 * 3. Touch Events のサポート状況
 *
 * @returns {boolean} モバイルデバイスの場合true
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR環境ではfalse
  }

  // User Agent による判定
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase());

  // User Agentがモバイルであれば、確実にモバイル
  if (isMobileUA) {
    return true;
  }

  // デスクトップUser Agentの場合、ビューポート幅のみで判定
  // タッチスクリーン搭載デスクトップPCでの誤判定を防ぐため、
  // 640px未満の場合のみモバイルと判定（768pxから変更）
  const isMobileViewport = window.innerWidth < 640;

  return isMobileViewport;
}

/**
 * 背景画像URLを選択
 *
 * 優先順位:
 * 1. モバイル → mobile URL（設定されていれば）
 * 2. デスクトップ → desktop URL（設定されていれば）
 * 3. フォールバック → url（共通URL）
 *
 * @param {string} url - 共通URL（後方互換性）
 * @param {string} desktop - デスクトップ用URL
 * @param {string} mobile - モバイル用URL
 * @returns {string} 選択されたURL
 */
export function selectBackgroundImageURL(
  url: string,
  desktop: string,
  mobile: string
): string {
  const isMobile = isMobileDevice();

  console.log('🖼️ [Device Detection] Background Image URL Selection:', {
    isMobile,
    urls: {
      common: url,
      desktop: desktop,
      mobile: mobile,
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  // デバイスに応じてURLを選択
  if (isMobile && mobile && mobile.trim() !== '') {
    console.log('✅ [Device Detection] Selected: Mobile URL');
    return mobile.trim();
  }

  if (!isMobile && desktop && desktop.trim() !== '') {
    console.log('✅ [Device Detection] Selected: Desktop URL');
    return desktop.trim();
  }

  // フォールバック: 共通URL
  console.log('✅ [Device Detection] Selected: Common URL (fallback)');
  return url.trim();
}

/**
 * 🎬 背景動画URLを選択
 *
 * 優先順位:
 * 1. モバイル → mobile URL（設定されていれば）
 * 2. デスクトップ → desktop URL（設定されていれば）
 * 3. フォールバック → url（共通URL）
 *
 * @param {string} url - 共通URL（後方互換性）
 * @param {string} desktop - デスクトップ用URL
 * @param {string} mobile - モバイル用URL
 * @returns {string} 選択されたURL
 */
export function selectBackgroundVideoURL(
  url: string,
  desktop: string,
  mobile: string
): string {
  const isMobile = isMobileDevice();

  console.log('🎬 [Device Detection] Background Video URL Selection:', {
    isMobile,
    urls: {
      common: url,
      desktop: desktop,
      mobile: mobile,
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  // デバイスに応じてURLを選択
  if (isMobile && mobile && mobile.trim() !== '') {
    console.log('✅ [Device Detection] Selected: Mobile Video URL');
    return mobile.trim();
  }

  if (!isMobile && desktop && desktop.trim() !== '') {
    console.log('✅ [Device Detection] Selected: Desktop Video URL');
    return desktop.trim();
  }

  // フォールバック: 共通URL
  console.log('✅ [Device Detection] Selected: Common Video URL (fallback)');
  return url.trim();
}

/**
 * デバイス情報を取得（デバッグ用）
 *
 * @returns {object} デバイス情報
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      userAgent: 'SSR',
      viewportWidth: 0,
      isTouchDevice: false,
    };
  }

  return {
    isMobile: isMobileDevice(),
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };
}
