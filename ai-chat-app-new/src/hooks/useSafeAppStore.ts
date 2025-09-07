import { useAppStore } from '@/store';

// 安全なZustandストアフック
export const useSafeAppStore = () => {
  try {
    const store = useAppStore;
    
    // ストアが存在し、getStateメソッドが利用可能かチェック
    if (!store || typeof store.getState !== 'function') {
      console.error('Store is not properly initialized');
      return null;
    }
    
    return store;
  } catch (error) {
    console.error('Error accessing store:', error);
    return null;
  }
};

// 安全なgetState呼び出し
export const useSafeGetState = () => {
  const store = useSafeAppStore();
  
  if (!store) {
    return null;
  }
  
  try {
    return store.getState();
  } catch (error) {
    console.error('Error calling getState:', error);
    return null;
  }
};
