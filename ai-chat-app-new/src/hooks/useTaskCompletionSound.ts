/**
 * Hook for playing task completion sounds
 * Used when Claude Code or other system tasks complete
 */

import { useEffect } from 'react';
import { soundService } from '@/services/SoundService';

export function useTaskCompletionSound() {
  const playTaskComplete = () => {
    soundService.playTaskComplete();
  };

  const playError = () => {
    soundService.playError();
  };

  const playClick = () => {
    soundService.playClick();
  };

  return {
    playTaskComplete,
    playError,
    playClick
  };
}

/**
 * Global task completion notifier
 * Can be called from anywhere in the app
 */
export const notifyTaskComplete = () => {
  soundService.playTaskComplete();

  // Visual feedback (optional)
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast('✅ タスクが完了しました', 'success');
  }
};

export const notifyError = () => {
  soundService.playError();
};

export const notifyClick = () => {
  soundService.playClick();
};