import { StateCreator } from 'zustand';
import { 
  TrackerDefinition, 
  TrackerInstance, 
  TrackerHistoryEntry, 
  TrackerCategory, 
  TrackerType,
  UUID 
} from '@/types';

export interface TrackerSlice {
  tracker_definitions: Map<UUID, TrackerDefinition>;
  tracker_instances: Map<UUID, TrackerInstance>;
  tracker_history: Map<UUID, TrackerHistoryEntry[]>;
  
  // トラッカー定義の管理
  createTrackerDefinition: (definition: Omit<TrackerDefinition, 'id' | 'created_at' | 'updated_at' | 'version'>) => TrackerDefinition;
  updateTrackerDefinition: (id: UUID, updates: Partial<TrackerDefinition>) => void;
  deleteTrackerDefinition: (id: UUID) => void;
  
  // トラッカーインスタンスの管理
  createTrackerInstance: (definition_id: UUID, session_id: UUID, character_id?: UUID) => TrackerInstance;
  updateTrackerValue: (instance_id: UUID, new_value: unknown, reason?: string) => void;
  getTrackerInstance: (id: UUID) => TrackerInstance | undefined;
  getTrackersBySession: (session_id: UUID) => TrackerInstance[];
  getTrackersByCharacter: (character_id: UUID) => TrackerInstance[];
  
  // 履歴管理
  getTrackerHistory: (instance_id: UUID) => TrackerHistoryEntry[];
  getTrackerHistoryByDate: (instance_id: UUID, start_date: Date, end_date: Date) => TrackerHistoryEntry[];
  
  // 検索・フィルタリング
  getTrackersByCategory: (category: TrackerCategory) => TrackerDefinition[];
  getTrackersByType: (type: TrackerType) => TrackerDefinition[];
  searchTrackers: (query: string) => TrackerDefinition[];
}

export const createTrackerSlice: StateCreator<TrackerSlice, [], [], TrackerSlice> = (set, get) => ({
  tracker_definitions: new Map(),
  tracker_instances: new Map(),
  tracker_history: new Map(),
  
  createTrackerDefinition: (definition) => {
    const newDefinition: TrackerDefinition = {
      id: `tracker-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      ...definition
    };
    
    set(state => {
      const newDefinitions = new Map(state.tracker_definitions);
      newDefinitions.set(newDefinition.id, newDefinition);
      return { tracker_definitions: newDefinitions };
    });
    
    return newDefinition;
  },
  
  updateTrackerDefinition: (id, updates) => {
    set(state => {
      const definition = state.tracker_definitions.get(id);
      if (!definition) return state;
      
      const updatedDefinition = {
        ...definition,
        ...updates,
        updated_at: new Date().toISOString(),
        version: definition.version + 1
      };
      
      const newDefinitions = new Map(state.tracker_definitions);
      newDefinitions.set(id, updatedDefinition);
      return { tracker_definitions: newDefinitions };
    });
  },
  
  deleteTrackerDefinition: (id) => {
    set(state => {
      const newDefinitions = new Map(state.tracker_definitions);
      newDefinitions.delete(id);
      
      // 関連するインスタンスも削除
      const newInstances = new Map(state.tracker_instances);
      Array.from(newInstances.keys()).forEach(instanceId => {
        const instance = newInstances.get(instanceId);
        if (instance?.definition_id === id) {
          newInstances.delete(instanceId);
        }
      });
      
      return { 
        tracker_definitions: newDefinitions,
        tracker_instances: newInstances
      };
    });
  },
  
  createTrackerInstance: (definition_id, session_id, character_id) => {
    const definition = get().tracker_definitions.get(definition_id);
    if (!definition) {
      throw new Error(`Tracker definition not found: ${definition_id}`);
    }
    
    let initial_value: unknown;
    
    // 型に応じて初期値を設定
    switch (definition.config.type) {
      case 'numeric':
        initial_value = (definition.config as any).initial_value || 0;
        break;
      case 'state':
        initial_value = (definition.config as any).initial_state || '';
        break;
      case 'boolean':
        initial_value = (definition.config as any).initial_value || false;
        break;
      case 'text':
        initial_value = (definition.config as any).initial_value || '';
        break;
      default:
        initial_value = null;
    }
    
    const newInstance: TrackerInstance = {
      id: `instance-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      definition_id,
      session_id,
      character_id,
      current_value: initial_value,
      metadata: {}
    };
    
    set(state => {
      const newInstances = new Map(state.tracker_instances);
      newInstances.set(newInstance.id, newInstance);
      return { tracker_instances: newInstances };
    });
    
    return newInstance;
  },
  
  updateTrackerValue: (instance_id, new_value, reason = '手動更新') => {
    set(state => {
      const instance = state.tracker_instances.get(instance_id);
      if (!instance) return state;
      
      const old_value = instance.current_value;
      const timestamp = new Date().toISOString();
      
      // インスタンスを更新
      const updatedInstance = {
        ...instance,
        current_value: new_value,
        updated_at: timestamp,
        version: instance.version + 1
      };
      
      // 履歴エントリを作成
      const historyEntry: TrackerHistoryEntry = {
        id: `history-${Date.now()}`,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
        timestamp: timestamp,
        value: new_value,
        changed_by: 'user',
        reason,
        metadata: { old_value, instance_id: instance_id }
      };
      
      const newInstances = new Map(state.tracker_instances);
      newInstances.set(instance_id, updatedInstance);
      
      const newHistory = new Map(state.tracker_history);
      const instanceHistory = newHistory.get(instance_id) || [];
      instanceHistory.push(historyEntry);
      newHistory.set(instance_id, instanceHistory);
      
      return {
        tracker_instances: newInstances,
        tracker_history: newHistory
      };
    });
  },
  
  getTrackerInstance: (id) => {
    return get().tracker_instances.get(id);
  },
  
  getTrackersBySession: (session_id) => {
    const instances = Array.from(get().tracker_instances.values());
    return instances.filter(instance => instance.session_id === session_id);
  },
  
  getTrackersByCharacter: (character_id) => {
    const instances = Array.from(get().tracker_instances.values());
    return instances.filter(instance => instance.character_id === character_id);
  },
  
  getTrackerHistory: (instance_id) => {
    return get().tracker_history.get(instance_id) || [];
  },
  
  getTrackerHistoryByDate: (instance_id, start_date, end_date) => {
    const history = get().tracker_history.get(instance_id) || [];
    return history.filter(entry => {
      const entryDate = new Date(entry.created_at);
      return entryDate >= start_date && entryDate <= end_date;
    });
  },
  
  getTrackersByCategory: (category) => {
    const definitions = Array.from(get().tracker_definitions.values());
    return definitions.filter(definition => definition.category === category);
  },
  
  getTrackersByType: (type) => {
    const definitions = Array.from(get().tracker_definitions.values());
    return definitions.filter(definition => definition.type === type);
  },
  
  searchTrackers: (query) => {
    const definitions = Array.from(get().tracker_definitions.values());
    const lowerQuery = query.toLowerCase();
    
    return definitions.filter(definition => 
      definition.name.toLowerCase().includes(lowerQuery) ||
      definition.display_name.toLowerCase().includes(lowerQuery) ||
      definition.description.toLowerCase().includes(lowerQuery)
    );
  }
});









